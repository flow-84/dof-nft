export { NftCollection, MintNft, storeMintNft } from '../build/NftCollection/tact_NftCollection';
export { NftItem } from '../build/NftCollection/tact_NftItem';

import { beginCell, Cell } from '@ton/core';

export function buildCollectionContentCell(baseUrl: string): Cell {
    return beginCell()
        .storeUint(0x01, 8) // off-chain prefix
        .storeStringTail(baseUrl)
        .endCell();
}

export function buildItemContentCell(baseUrl: string): Cell {
    return beginCell()
        .storeUint(0x01, 8)
        .storeStringTail(baseUrl)
        .endCell();
}
