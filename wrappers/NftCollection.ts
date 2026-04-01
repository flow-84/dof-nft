export {
    NftCollection,
    PublicMint, storePublicMint,
    MintNft, storeMintNft,
    Withdraw,
    ToggleMint,
    MintConfig,
} from '../build/NftCollection/tact_NftCollection';
export { NftItem } from '../build/NftCollection/tact_NftItem';

import { beginCell, Cell } from '@ton/core';

export function buildCollectionContentCell(baseUrl: string): Cell {
    return beginCell()
        .storeUint(0x01, 8) // TEP-64 off-chain prefix
        .storeStringTail(baseUrl)
        .endCell();
}
