// TEP-62 NFT Standard Messages

message(0x5fcc3d14) Transfer {
    query_id: Int as uint64;
    new_owner: Address;
    response_destination: Address?;
    custom_payload: Cell?;
    forward_amount: Int as coins;
    forward_payload: Slice as remaining;
}

message(0x05138d91) OwnershipAssigned {
    query_id: Int as uint64;
    prev_owner: Address;
    forward_payload: Slice as remaining;
}

message(0xd53276db) Excesses {
    query_id: Int as uint64;
}

message(0x2fcb26a2) GetStaticData {
    query_id: Int as uint64;
}

message(0x8b771735) ReportStaticData {
    query_id: Int as uint64;
    index_id: Int;
    collection: Address;
}

// TEP-66 Royalty Messages
message(0x693d3950) GetRoyaltyParams {
    query_id: Int as uint64;
}

message(0xa8cb00ad) ReportRoyaltyParams {
    query_id: Int as uint64;
    numerator: Int as uint16;
    denominator: Int as uint16;
    destination: Address;
}

// Custom: Owner-controlled minting
message MintNft {
    query_id: Int as uint64;
    item_index: Int as uint32;
    item_owner: Address;
    individual_content: Cell;
}

message BatchMint {
    query_id: Int as uint64;
    items: map<Int, MintItem>;
    items_count: Int as uint32;
}

struct MintItem {
    item_owner: Address;
    individual_content: Cell;
}

// Logging
message LogEventMintRecord {
    minter: Address;
    item_id: Int;
    generate_number: Int;
}

// Data structs
struct CollectionData {
    next_item_index: Int;
    collection_content: Cell;
    owner_address: Address;
}

struct RoyaltyParams {
    numerator: Int;
    denominator: Int;
    destination: Address;
}

struct GetNftData {
    is_initialized: Bool;
    index: Int;
    collection_address: Address;
    owner_address: Address;
    individual_content: Cell;
}
