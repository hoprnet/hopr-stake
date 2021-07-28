import type { HardhatRuntimeEnvironment, RunSuperFunction } from 'hardhat/types'
import { HoprBoost } from "../lib/types/HoprBoost"
// import { DIAMONDS } from "../json/diamond";
// import { GOLD } from "../json/gold";
// import { SILVER } from "../json/silver";
// import { BRONZE } from "../json/bronze";
// import { DIAMONDS } from "../json/diamondPatch1";
import { SILVER } from "../json/silverPatch1";
import { ContractTransaction } from 'ethers';

const BOOST_CONTRACT = '0x43d13D7B83607F14335cF2cB75E87dA369D056c7';
const DEADLINE = 1627992000;
const TYPE = "HODLr";
const BOOST = {
    "diamond": 3170,
    "gold": 2378,
    "silver": 1585,
    "bronze": 792
};
// const LIST = {
//     "diamond": DIAMONDS,
//     "gold": GOLD,
//     "silver": SILVER,
//     "bronze": BRONZE
// };

/**
 * Batch mint HODLr NFTs
 * Please change L.40 to a json file.
 */
async function main(
    { rank }: { rank: string },
  { ethers, network}: HardhatRuntimeEnvironment,
  _runSuper: RunSuperFunction<any>
) {

    const signers = await ethers.getSigners();
    const minter = signers[0];
    // const list = LIST[rank];
    const list = SILVER;
    console.log(list.length, list[0].length);

    // boost
    const HoprBoost = await ethers.getContractFactory("HoprBoost");
    const hoprBoost = await HoprBoost.attach(BOOST_CONTRACT) as HoprBoost;

    console.log('Running task "mintTokens" with config:', {
        network: network.name,
        executor: minter.address
    })

const currentNonce = await minter.getTransactionCount();
console.log("nonce", currentNonce);

const mintTxs = await Promise.all(list.map(async (batch, index) => {
    return hoprBoost
    .connect(minter)
    .batchMint(
        batch,
        TYPE,
        rank,
        BOOST[rank],
        DEADLINE,
        {
            nonce: currentNonce + index
        }
    );
})) as ContractTransaction[];

await Promise.all(mintTxs.map(mintTx => mintTx.wait()));

  // We log the transaction hash and verify the NFTs from the contract
  console.log(`NFTs minted NFT in the ${JSON.stringify(mintTxs.map(mintTx => mintTx.hash), null, 2)} transaction`);
}

export default main