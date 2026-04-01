import "./messages";

const minTonsForStorage: Int = ton("0.02");
const gasConsumption: Int = ton("0.02");

contract NftItem {
    collection_address: Address;
    item_index: Int;
    is_initialized: Bool;
    owner: Address?;
    individual_content: Cell?;

    init(collection_address: Address, item_index: Int) {
        self.collection_address = collection_address;
        self.item_index = item_index;
        self.is_initialized = false;
    }

    receive(msg: Transfer) {
        let ctx: Context = context();
        let remain: Int = self.msgValue(ctx.value);

        if (self.is_initialized == false) {
            require(ctx.sender == self.collection_address, "Not from collection");
            self.is_initialized = true;
            self.owner = msg.new_owner;
            self.individual_content = msg.custom_payload;
            send(SendParameters{
                to: msg.response_destination!!,
                value: remain,
                mode: SendPayGasSeparately,
                body: Excesses{ query_id: msg.query_id }.toCell()
            });
        } else {
            require(ctx.sender == self.owner!!, "Not owner");
            self.owner = msg.new_owner;

            if (msg.forward_amount > 0) {
                send(SendParameters{
                    to: msg.new_owner,
                    value: msg.forward_amount,
                    mode: SendPayGasSeparately,
                    bounce: true,
                    body: OwnershipAssigned{
                        query_id: msg.query_id,
                        prev_owner: ctx.sender,
                        forward_payload: msg.forward_payload
                    }.toCell()
                });
            }

            remain = remain - ctx.readForwardFee();
            if (msg.response_destination != null) {
                send(SendParameters{
                    to: msg.response_destination!!,
                    value: remain - msg.forward_amount,
                    mode: SendPayGasSeparately,
                    bounce: true,
                    body: Excesses{ query_id: msg.query_id }.toCell()
                });
            }
        }
    }

    receive(msg: GetStaticData) {
        let ctx: Context = context();
        send(SendParameters{
            to: ctx.sender,
            value: 0,
            mode: 64,
            bounce: true,
            body: ReportStaticData{
                query_id: msg.query_id,
                index_id: self.item_index,
                collection: self.collection_address
            }.toCell()
        });
    }

    fun msgValue(value: Int): Int {
        let tonBalanceBeforeMsg: Int = myBalance() - value;
        let storageFee: Int = minTonsForStorage - min(tonBalanceBeforeMsg, minTonsForStorage);
        return value - (storageFee + gasConsumption);
    }

    // Returns raw individual_content (sticker_id as string).
    // The collection's get_nft_content() combines base_url + sticker_id + ".json".
    get fun get_nft_data(): GetNftData {
        return GetNftData{
            is_initialized: self.is_initialized,
            index: self.item_index,
            collection_address: self.collection_address,
            owner_address: self.owner!!,
            individual_content: self.individual_content!!
        };
    }
}
