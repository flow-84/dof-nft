import "./messages";
import "./nft_item";

// DOF NFT Collection - Model Sticker Collection
// TEP-62 compliant, owner-only minting, royalties

contract NftCollection {
    next_item_index: Int as uint32 = 0;
    owner_address: Address;
    royalty_params: RoyaltyParams;
    collection_content: Cell;

    init(owner_address: Address, collection_content: Cell, royalty_params: RoyaltyParams) {
        self.owner_address = owner_address;
        self.collection_content = collection_content;
        self.royalty_params = royalty_params;
    }

    // Mint single NFT - only owner
    receive(msg: MintNft) {
        let ctx: Context = context();
        require(ctx.sender == self.owner_address, "Not owner");

        self.mintItem(msg.item_owner, msg.individual_content, ctx.value);

        emit(LogEventMintRecord{
            minter: ctx.sender,
            item_id: self.next_item_index - 1,
            generate_number: nativeRandom()
        }.toCell());
    }

    // Batch mint multiple NFTs - only owner
    receive(msg: BatchMint) {
        let ctx: Context = context();
        require(ctx.sender == self.owner_address, "Not owner");

        let valuePerItem: Int = ctx.value / msg.items_count;
        let i: Int = 0;
        while (i < msg.items_count) {
            let item: MintItem? = msg.items.get(i);
            if (item != null) {
                self.mintItem((item!!).item_owner, (item!!).individual_content, valuePerItem);
            }
            i = i + 1;
        }
    }

    // Internal mint function
    fun mintItem(item_owner: Address, individual_content: Cell, msgValue: Int) {
        require(self.next_item_index >= 0, "Invalid index");

        let nft_init: StateInit = self.getNftItemInit(self.next_item_index);
        let tonBalanceBeforeMsg: Int = myBalance() - msgValue;
        let storageFee: Int = ton("0.02") - min(tonBalanceBeforeMsg, ton("0.02"));
        let remain: Int = msgValue - (storageFee + ton("0.02"));

        send(SendParameters{
            to: contractAddress(nft_init),
            value: remain,
            bounce: false,
            mode: SendIgnoreErrors,
            body: Transfer{
                query_id: 0,
                new_owner: item_owner,
                response_destination: self.owner_address,
                custom_payload: individual_content,
                forward_amount: 0,
                forward_payload: emptySlice()
            }.toCell(),
            code: nft_init.code,
            data: nft_init.data
        });

        self.next_item_index = self.next_item_index + 1;
    }

    // TEP-66: Royalty params
    receive(msg: GetRoyaltyParams) {
        let ctx: Context = context();
        send(SendParameters{
            to: ctx.sender,
            value: 0,
            mode: 64,
            bounce: false,
            body: ReportRoyaltyParams{
                query_id: msg.query_id,
                numerator: self.royalty_params.numerator,
                denominator: self.royalty_params.denominator,
                destination: self.owner_address
            }.toCell()
        });
    }

    // TEP-62: get_collection_data
    get fun get_collection_data(): CollectionData {
        let b: StringBuilder = beginString();
        let collectionDataString: String = self.collection_content.asSlice().asString();
        b.append(collectionDataString);
        b.append("meta.json");
        return CollectionData{
            next_item_index: self.next_item_index,
            collection_content: b.toCell(),
            owner_address: self.owner_address
        };
    }

    // TEP-62: get_nft_address_by_index
    get fun get_nft_address_by_index(item_index: Int): Address? {
        let initCode: StateInit = self.getNftItemInit(item_index);
        return contractAddress(initCode);
    }

    get fun getNftItemInit(item_index: Int): StateInit {
        return initOf NftItem(myAddress(), item_index);
    }

    // TEP-62: get_nft_content
    get fun get_nft_content(index: Int, individual_content: Cell): Cell {
        let b: StringBuilder = beginString();
        let ic: String = individual_content.asSlice().asString();
        b.append(ic);
        return b.toCell();
    }

    get fun royalty_params(): RoyaltyParams {
        return self.royalty_params;
    }

    get fun next_item_index(): Int {
        return self.next_item_index;
    }
}
