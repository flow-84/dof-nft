import "./messages";
import "./nft_item";

// DOF NFT Collection — Public Mint with Editions
// TEP-62 + TEP-64 + TEP-66 compliant
//
// 12 sticker types per model, each mintable up to max_per_sticker times.
// Stickers #0..free_sticker_count-1: free (owner airdrop only)
// Stickers #free_sticker_count..total_stickers-1: public mint for mint_price

contract NftCollection {
    next_item_index: Int as uint32 = 0;
    owner_address: Address;
    royalty_params: RoyaltyParams;
    collection_content: Cell;

    // Mint configuration
    mint_price: Int as coins;
    max_per_sticker: Int as uint32;
    total_stickers: Int as uint32;
    free_sticker_count: Int as uint32;
    sticker_minted: map<Int, Int>;  // sticker_id -> minted count
    is_active: Bool;

    init(
        owner_address: Address,
        collection_content: Cell,
        royalty_params: RoyaltyParams,
        mint_price: Int,
        max_per_sticker: Int,
        total_stickers: Int,
        free_sticker_count: Int
    ) {
        self.owner_address = owner_address;
        self.collection_content = collection_content;
        self.royalty_params = royalty_params;
        self.mint_price = mint_price;
        self.max_per_sticker = max_per_sticker;
        self.total_stickers = total_stickers;
        self.free_sticker_count = free_sticker_count;
        self.is_active = true;
    }

    // ── Public Mint ─────────────────────────────────────────────
    // Anyone can mint premium stickers by paying mint_price + gas.
    // Free stickers (#0..#2) are owner-only (airdrop via bot).
    receive(msg: PublicMint) {
        let ctx: Context = context();
        require(self.is_active, "Mint paused");
        require(msg.sticker_id >= 0 && msg.sticker_id < self.total_stickers, "Invalid sticker");
        require(msg.sticker_id >= self.free_sticker_count, "Free stickers: use bot");

        let minted: Int = self.getMinted(msg.sticker_id);
        require(minted < self.max_per_sticker, "Sold out");
        require(ctx.value >= self.mint_price + ton("0.05"), "Not enough TON");

        self.doMint(ctx.sender, msg.sticker_id, ctx.value);
        self.sticker_minted.set(msg.sticker_id, minted + 1);
    }

    // ── Owner Airdrop ───────────────────────────────────────────
    // Owner can mint any sticker to any address (for free drops via bot).
    receive(msg: MintNft) {
        let ctx: Context = context();
        require(ctx.sender == self.owner_address, "Not owner");
        require(msg.sticker_id >= 0 && msg.sticker_id < self.total_stickers, "Invalid sticker");

        let minted: Int = self.getMinted(msg.sticker_id);
        require(minted < self.max_per_sticker, "Sold out");

        self.doMint(msg.item_owner, msg.sticker_id, ctx.value);
        self.sticker_minted.set(msg.sticker_id, minted + 1);
    }

    // ── Withdraw ────────────────────────────────────────────────
    // Owner withdraws collected TON (from sales).
    receive(msg: Withdraw) {
        let ctx: Context = context();
        require(ctx.sender == self.owner_address, "Not owner");
        let balance: Int = myBalance() - ton("0.1"); // keep reserve for storage
        require(balance > 0, "Nothing to withdraw");
        send(SendParameters{
            to: self.owner_address,
            value: balance,
            mode: SendIgnoreErrors,
            bounce: false,
            body: Excesses{ query_id: msg.query_id }.toCell()
        });
    }

    // ── Toggle Mint ─────────────────────────────────────────────
    receive(msg: ToggleMint) {
        let ctx: Context = context();
        require(ctx.sender == self.owner_address, "Not owner");
        self.is_active = !self.is_active;
    }

    // ── TEP-66: Royalty params ──────────────────────────────────
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

    // ── Internal: mint an NFT item ──────────────────────────────
    fun doMint(item_owner: Address, sticker_id: Int, msgValue: Int) {
        let nft_init: StateInit = self.getNftItemInit(self.next_item_index);
        let tonBalanceBeforeMsg: Int = myBalance() - msgValue;
        let storageFee: Int = ton("0.02") - min(tonBalanceBeforeMsg, ton("0.02"));
        let deployValue: Int = ton("0.04") + storageFee;

        // Build individual_content: sticker_id as string (e.g. "5")
        let b: StringBuilder = beginString();
        b.append(sticker_id.toString());
        let content: Cell = b.toCell();

        send(SendParameters{
            to: contractAddress(nft_init),
            value: deployValue,
            bounce: false,
            mode: SendIgnoreErrors,
            body: Transfer{
                query_id: 0,
                new_owner: item_owner,
                response_destination: item_owner,
                custom_payload: content,
                forward_amount: 0,
                forward_payload: emptySlice()
            }.toCell(),
            code: nft_init.code,
            data: nft_init.data
        });

        emit(LogEventMintRecord{
            minter: item_owner,
            item_id: self.next_item_index,
            generate_number: nativeRandom()
        }.toCell());

        self.next_item_index = self.next_item_index + 1;
    }

    // ── Helper: get minted count for a sticker ──────────────────
    fun getMinted(sticker_id: Int): Int {
        let val: Int? = self.sticker_minted.get(sticker_id);
        if (val == null) {
            return 0;
        }
        return val!!;
    }

    // ── TEP-62: get_collection_data ─────────────────────────────
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

    // ── TEP-62: get_nft_address_by_index ────────────────────────
    get fun get_nft_address_by_index(item_index: Int): Address? {
        let initCode: StateInit = self.getNftItemInit(item_index);
        return contractAddress(initCode);
    }

    get fun getNftItemInit(item_index: Int): StateInit {
        return initOf NftItem(myAddress(), item_index);
    }

    // ── TEP-64: get_nft_content ─────────────────────────────────
    // Combines collection base URL + sticker_id + ".json"
    get fun get_nft_content(index: Int, individual_content: Cell): Cell {
        let b: StringBuilder = beginString();
        let baseUrl: String = self.collection_content.asSlice().asString();
        b.append(baseUrl);
        let ic: String = individual_content.asSlice().asString();
        b.append(ic);
        b.append(".json");
        return b.toCell();
    }

    // ── Custom getters ──────────────────────────────────────────
    get fun royalty_params(): RoyaltyParams {
        return self.royalty_params;
    }

    get fun next_item_index(): Int {
        return self.next_item_index;
    }

    get fun sticker_supply(sticker_id: Int): Int {
        return self.getMinted(sticker_id);
    }

    get fun get_config(): MintConfig {
        return MintConfig{
            mint_price: self.mint_price,
            max_per_sticker: self.max_per_sticker,
            total_stickers: self.total_stickers,
            free_sticker_count: self.free_sticker_count,
            is_active: self.is_active,
            next_item_index: self.next_item_index
        };
    }
}
