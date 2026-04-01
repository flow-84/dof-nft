import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { NftCollection, buildCollectionContentCell } from '../wrappers/NftCollection';
import '@ton/test-utils';

describe('NftCollection', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let collection: SandboxContract<NftCollection>;
    let buyer: SandboxContract<TreasuryContract>;

    const ROYALTY_NUM = 50n;
    const ROYALTY_DEN = 1000n;
    const BASE_URL = 'https://raw.githubusercontent.com/flow-84/dof-nft/main/metadata/layla/';
    const MINT_PRICE = toNano('1');
    const MAX_PER_STICKER = 100n;
    const TOTAL_STICKERS = 12n;
    const FREE_STICKER_COUNT = 3n;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        buyer = await blockchain.treasury('buyer');

        const content = buildCollectionContentCell(BASE_URL);

        collection = blockchain.openContract(
            await NftCollection.fromInit(
                deployer.address,
                content,
                { $$type: 'RoyaltyParams', numerator: ROYALTY_NUM, denominator: ROYALTY_DEN, destination: deployer.address },
                MINT_PRICE,
                MAX_PER_STICKER,
                TOTAL_STICKERS,
                FREE_STICKER_COUNT,
            )
        );

        // Deploy collection with an owner airdrop of sticker #0
        const deployResult = await collection.send(deployer.getSender(), { value: toNano('0.25') }, {
            $$type: 'MintNft',
            query_id: 0n,
            sticker_id: 0n,
            item_owner: deployer.address,
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: collection.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy and mint first NFT via airdrop', async () => {
        const data = await collection.getGetCollectionData();
        expect(data.next_item_index).toBe(1n);
        expect(data.owner_address.equals(deployer.address)).toBe(true);
    });

    it('should track sticker supply', async () => {
        const supply = await collection.getStickerSupply(0n);
        expect(supply).toBe(1n);

        // Sticker #1 not minted yet
        const supply1 = await collection.getStickerSupply(1n);
        expect(supply1).toBe(0n);
    });

    it('should allow public mint of premium stickers', async () => {
        const result = await collection.send(buyer.getSender(), { value: toNano('1.1') }, {
            $$type: 'PublicMint',
            query_id: 1n,
            sticker_id: 5n,
        });

        expect(result.transactions).toHaveTransaction({
            from: buyer.address,
            to: collection.address,
            success: true,
        });

        const index = await collection.getNextItemIndex();
        expect(index).toBe(2n); // 1 from deploy + 1 from public mint

        const supply = await collection.getStickerSupply(5n);
        expect(supply).toBe(1n);
    });

    it('should reject public mint of free stickers', async () => {
        const result = await collection.send(buyer.getSender(), { value: toNano('1.1') }, {
            $$type: 'PublicMint',
            query_id: 1n,
            sticker_id: 0n, // free sticker
        });

        expect(result.transactions).toHaveTransaction({
            from: buyer.address,
            to: collection.address,
            success: false,
        });
    });

    it('should reject public mint with insufficient payment', async () => {
        const result = await collection.send(buyer.getSender(), { value: toNano('0.5') }, {
            $$type: 'PublicMint',
            query_id: 1n,
            sticker_id: 5n,
        });

        expect(result.transactions).toHaveTransaction({
            from: buyer.address,
            to: collection.address,
            success: false,
        });
    });

    it('should reject public mint of invalid sticker_id', async () => {
        const result = await collection.send(buyer.getSender(), { value: toNano('1.1') }, {
            $$type: 'PublicMint',
            query_id: 1n,
            sticker_id: 15n, // invalid
        });

        expect(result.transactions).toHaveTransaction({
            from: buyer.address,
            to: collection.address,
            success: false,
        });
    });

    it('should allow owner to airdrop any sticker', async () => {
        // Airdrop free sticker #1 to buyer
        const result = await collection.send(deployer.getSender(), { value: toNano('0.15') }, {
            $$type: 'MintNft',
            query_id: 1n,
            sticker_id: 1n,
            item_owner: buyer.address,
        });

        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: collection.address,
            success: true,
        });

        const supply = await collection.getStickerSupply(1n);
        expect(supply).toBe(1n);
    });

    it('should reject airdrop from non-owner', async () => {
        const result = await collection.send(buyer.getSender(), { value: toNano('0.15') }, {
            $$type: 'MintNft',
            query_id: 1n,
            sticker_id: 0n,
            item_owner: buyer.address,
        });

        expect(result.transactions).toHaveTransaction({
            from: buyer.address,
            to: collection.address,
            success: false,
        });
    });

    it('should enforce max supply per sticker', async () => {
        // Create collection with max 2 per sticker for testing
        const smallCollection = blockchain.openContract(
            await NftCollection.fromInit(
                deployer.address,
                buildCollectionContentCell(BASE_URL),
                { $$type: 'RoyaltyParams', numerator: ROYALTY_NUM, denominator: ROYALTY_DEN, destination: deployer.address },
                MINT_PRICE,
                2n, // max 2 per sticker
                TOTAL_STICKERS,
                FREE_STICKER_COUNT,
            )
        );

        // Deploy
        await smallCollection.send(deployer.getSender(), { value: toNano('0.25') }, {
            $$type: 'MintNft', query_id: 0n, sticker_id: 5n, item_owner: deployer.address,
        });

        // Mint #2
        await smallCollection.send(buyer.getSender(), { value: toNano('1.1') }, {
            $$type: 'PublicMint', query_id: 1n, sticker_id: 5n,
        });

        // Mint #3 — should fail (sold out)
        const result = await smallCollection.send(buyer.getSender(), { value: toNano('1.1') }, {
            $$type: 'PublicMint', query_id: 2n, sticker_id: 5n,
        });

        expect(result.transactions).toHaveTransaction({
            from: buyer.address,
            to: smallCollection.address,
            success: false,
        });
    });

    it('should toggle mint on/off', async () => {
        // Toggle off
        await collection.send(deployer.getSender(), { value: toNano('0.05') }, {
            $$type: 'ToggleMint', query_id: 0n,
        });

        // Public mint should fail when paused
        const result = await collection.send(buyer.getSender(), { value: toNano('1.1') }, {
            $$type: 'PublicMint', query_id: 1n, sticker_id: 5n,
        });

        expect(result.transactions).toHaveTransaction({
            from: buyer.address,
            to: collection.address,
            success: false,
        });

        // Toggle back on
        await collection.send(deployer.getSender(), { value: toNano('0.05') }, {
            $$type: 'ToggleMint', query_id: 0n,
        });

        // Should work again
        const result2 = await collection.send(buyer.getSender(), { value: toNano('1.1') }, {
            $$type: 'PublicMint', query_id: 2n, sticker_id: 5n,
        });

        expect(result2.transactions).toHaveTransaction({
            from: buyer.address,
            to: collection.address,
            success: true,
        });
    });

    it('should return correct config', async () => {
        const config = await collection.getGetConfig();
        expect(config.mint_price).toBe(MINT_PRICE);
        expect(config.max_per_sticker).toBe(MAX_PER_STICKER);
        expect(config.total_stickers).toBe(TOTAL_STICKERS);
        expect(config.free_sticker_count).toBe(FREE_STICKER_COUNT);
        expect(config.is_active).toBe(true);
    });

    it('should return correct royalty params', async () => {
        const royalty = await collection.getRoyaltyParams();
        expect(royalty.numerator).toBe(ROYALTY_NUM);
        expect(royalty.denominator).toBe(ROYALTY_DEN);
    });

    it('should allow owner to withdraw', async () => {
        // First, some sales to build up balance
        for (let i = 3; i < 8; i++) {
            await collection.send(buyer.getSender(), { value: toNano('1.1') }, {
                $$type: 'PublicMint', query_id: BigInt(i), sticker_id: BigInt(i),
            });
        }

        const result = await collection.send(deployer.getSender(), { value: toNano('0.05') }, {
            $$type: 'Withdraw', query_id: 0n,
        });

        expect(result.transactions).toHaveTransaction({
            from: collection.address,
            to: deployer.address,
            success: true,
        });
    });

    it('should mint multiple copies of same sticker to different buyers', async () => {
        const buyer2 = await blockchain.treasury('buyer2');
        const buyer3 = await blockchain.treasury('buyer3');

        // 3 different buyers mint sticker #5
        await collection.send(buyer.getSender(), { value: toNano('1.1') }, {
            $$type: 'PublicMint', query_id: 1n, sticker_id: 5n,
        });
        await collection.send(buyer2.getSender(), { value: toNano('1.1') }, {
            $$type: 'PublicMint', query_id: 2n, sticker_id: 5n,
        });
        await collection.send(buyer3.getSender(), { value: toNano('1.1') }, {
            $$type: 'PublicMint', query_id: 3n, sticker_id: 5n,
        });

        const supply = await collection.getStickerSupply(5n);
        expect(supply).toBe(3n);

        const index = await collection.getNextItemIndex();
        expect(index).toBe(4n); // 1 from deploy + 3 from public mints
    });
});
