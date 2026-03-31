import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, beginCell } from '@ton/core';
import { NftCollection, NftItem, buildCollectionContentCell } from '../wrappers/NftCollection';
import '@ton/test-utils';

describe('NftCollection', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let collection: SandboxContract<NftCollection>;
    let otherUser: SandboxContract<TreasuryContract>;

    const ROYALTY_NUMERATOR = 50n;   // 5% royalty
    const ROYALTY_DENOMINATOR = 1000n;
    const BASE_URL = 'https://deutsche-onlyfans.blog/nft/layla/';

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        otherUser = await blockchain.treasury('other');

        const content = buildCollectionContentCell(BASE_URL);

        collection = blockchain.openContract(
            await NftCollection.fromInit(
                deployer.address,
                content,
                { $$type: 'RoyaltyParams', numerator: ROYALTY_NUMERATOR, denominator: ROYALTY_DENOMINATOR, destination: deployer.address }
            )
        );

        const deployResult = await collection.send(deployer.getSender(), { value: toNano('0.25') }, {
            $$type: 'MintNft',
            query_id: 0n,
            item_index: 0n,
            item_owner: deployer.address,
            individual_content: beginCell().storeStringTail(BASE_URL).endCell(),
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: collection.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy and mint first NFT', async () => {
        const data = await collection.getGetCollectionData();
        expect(data.next_item_index).toBe(1n);
        expect(data.owner_address.equals(deployer.address)).toBe(true);
    });

    it('should return correct next_item_index', async () => {
        const index = await collection.getNextItemIndex();
        expect(index).toBe(1n);
    });

    it('should mint multiple NFTs sequentially', async () => {
        // Mint item #1
        await collection.send(deployer.getSender(), { value: toNano('0.25') }, {
            $$type: 'MintNft',
            query_id: 1n,
            item_index: 1n,
            item_owner: otherUser.address,
            individual_content: beginCell().storeStringTail(BASE_URL).endCell(),
        });

        // Mint item #2
        await collection.send(deployer.getSender(), { value: toNano('0.25') }, {
            $$type: 'MintNft',
            query_id: 2n,
            item_index: 2n,
            item_owner: otherUser.address,
            individual_content: beginCell().storeStringTail(BASE_URL).endCell(),
        });

        const index = await collection.getNextItemIndex();
        expect(index).toBe(3n);
    });

    it('should reject mint from non-owner', async () => {
        const result = await collection.send(otherUser.getSender(), { value: toNano('0.25') }, {
            $$type: 'MintNft',
            query_id: 0n,
            item_index: 1n,
            item_owner: otherUser.address,
            individual_content: beginCell().storeStringTail(BASE_URL).endCell(),
        });

        expect(result.transactions).toHaveTransaction({
            from: otherUser.address,
            to: collection.address,
            success: false,
        });
    });

    it('should return correct NFT address by index', async () => {
        const addr = await collection.getGetNftAddressByIndex(0n);
        expect(addr).toBeDefined();
    });

    it('should return royalty params', async () => {
        const royalty = await collection.getRoyaltyParams();
        expect(royalty.numerator).toBe(ROYALTY_NUMERATOR);
        expect(royalty.denominator).toBe(ROYALTY_DENOMINATOR);
    });

    it('should mint 12 stickers (full collection)', async () => {
        // Already minted #0 in beforeEach
        for (let i = 1; i < 12; i++) {
            await collection.send(deployer.getSender(), { value: toNano('0.25') }, {
                $$type: 'MintNft',
                query_id: BigInt(i),
                item_index: BigInt(i),
                item_owner: i < 3 ? deployer.address : otherUser.address,
                individual_content: beginCell().storeStringTail(BASE_URL).endCell(),
            });
        }

        const index = await collection.getNextItemIndex();
        expect(index).toBe(12n);
    });
});
