
import { BigNumber } from '@ethersproject/bignumber';
import { assert } from 'console';
import type { HardhatRuntimeEnvironment, RunSuperFunction } from 'hardhat/types'
import { BOOST_CONTRACT_XDAI_PROD } from '../utils/constants';
import { apy, GAS_ESTIMATION_PER_BATCH, GAS_PRICE, MAX_BATCH_MINT_FOR, parseCsv, rate, splitArray } from '../utils/mint';
import { ContractTransaction, utils } from 'ethers';

const CSV_PATH = `${process.cwd()}/json/export.csv`;    // export from DuneAnalytics

const deadline = 1642424400; // Jan 17th 2022, 14:00
const type = "Wildhorn_v2";
// Diamond: 7.5% Gold: 6% Silver: 4.5% Bronze: 3%
const boost = {
    "diamond": rate(7.5),
    "gold": rate(6),
    "silver": rate(4.5),
    "bronze": rate(3)
};

/**
 * Batch mint NFTs
 * Please provide the exported csv from DuneAnalytics
 * E.g. export https://dune.xyz/queries/140878/278035
 */
async function main(
    { path }: { path?: string },
  { ethers, network}: HardhatRuntimeEnvironment,
  _runSuper: RunSuperFunction<any>
) {

    const signers = await ethers.getSigners();
    const minter = signers[0];

    // parse export from DuneAnalytics
    const csvPath = path ?? CSV_PATH;
    const results = await parseCsv(csvPath);

    // each rank has a boost
    Object.keys(boost).forEach(b => {
        assert(Object.keys(results).includes(b), `Missing boost rate for type ${b}`)
    })
    const overview = Object.keys(results).map(key => ({rank:key, apy: apy(boost[key]), count: results[key].length}));
    console.log("\nNeed to mint NFTs:")
    console.table(overview);

    // boost contract
    const hoprBoost = await ethers.getContractAt("HoprBoost", BOOST_CONTRACT_XDAI_PROD, minter);
    console.log('Running task "mintTokens" with config:', {
        network: network.name,
        executor: minter.address,
        hoprBoost: hoprBoost.address
    })

    const currentNonce = await minter.getTransactionCount();
    const rankStartNonce = overview.reduce((acc, cur, i) => {
        const l = Math.floor((cur.count-1)/MAX_BATCH_MINT_FOR)+1;
        return acc.concat(i === 0 ? l : acc[i] + l)
    }, [0]);
    const numTx = rankStartNonce.pop();

    // compare native balance with estimated cost
    const estimatedGas = BigNumber.from(GAS_ESTIMATION_PER_BATCH)
                            .mul(BigNumber.from(numTx))
                            .mul(BigNumber.from(GAS_PRICE)).toString();
    const minterBalance = await minter.getBalance();
    assert(minterBalance.gte(estimatedGas), `Not enough balance for gas. Please get at least ${utils.formatEther(estimatedGas)}`)
    console.log(`There will be ${numTx} transactions.`);

    try {
        // build batch functions
        const mintTxs = Object.keys(results).map((boostRank: string, rankIndex: number) => {
            const startNonce = currentNonce + rankStartNonce[rankIndex];
            const recipients = results[boostRank];
            const groupedRecipients = splitArray(recipients, MAX_BATCH_MINT_FOR);
            return groupedRecipients.map((batch: string[], batchIndex: number) => {
                return hoprBoost.connect(minter).batchMint(
                    batch,
                    type,
                    boostRank,
                    boost[boostRank],
                    deadline,
                    {
                        nonce: startNonce + batchIndex,
                        gasPrice: GAS_PRICE
                    }
                )
            })
        });

        const flatMintTxs = await Promise.all(mintTxs.flat()) as ContractTransaction[];

        await Promise.all(flatMintTxs.map(mintTx => mintTx.wait()));

        // We log the transaction hash and verify the NFTs from the contract
        console.log(`NFTs minted NFT in the ${JSON.stringify(flatMintTxs.map(mintTx => mintTx.hash), null, 2)} transaction`);
    } catch (error) {
        console.error(error)
    }
}

export default main