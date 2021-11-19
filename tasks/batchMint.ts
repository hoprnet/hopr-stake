
import { BigNumber } from '@ethersproject/bignumber';
import { assert } from 'console';
import type { HardhatRuntimeEnvironment, RunSuperFunction } from 'hardhat/types'
import { BOOST_CONTRACT_XDAI_PROD } from '../utils/constants';
import { apy, GAS_ESTIMATION_PER_BATCH, getGasPrice, MAX_BATCH_MINT_FOR, parseCsv, rate, splitArray } from '../utils/mint';
import { ContractTransaction, utils } from 'ethers';

const INPUT_PATH = `${process.cwd()}/inputs/`;    // location where rawdata gets stored

const deadline = 1642424400; // Jan 17th 2022, 14:00
const boost = {
    "diamond": rate(10),
    "gold": rate(7.5),
    "silver": rate(6),
    "bronze": rate(4.5)
};

/**
 * Batch mint NFTs
 * Please provide the exported csv from DuneAnalytics
 * E.g. export https://dune.xyz/queries/140878/278035
 */
async function main(
    { log, type }: { log: boolean, type: string },
  { ethers, network}: HardhatRuntimeEnvironment,
  _runSuper: RunSuperFunction<any>
) {

    const signers = await ethers.getSigners();
    const minter = signers[0];

    // parse inputs
    const csvPath = INPUT_PATH+type+'.csv';
    console.log('log', log)
    console.log('csvPath', csvPath)
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
    console.log('\nRunning task "mintTokens" with config:', {
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
    const gasPrice = await getGasPrice();
    const estimatedGas = BigNumber.from(GAS_ESTIMATION_PER_BATCH)
                            .mul(BigNumber.from(numTx))
                            .mul(BigNumber.from(gasPrice)).toString();
    const minterBalance = await minter.getBalance();
    assert(minterBalance.gte(estimatedGas), `Not enough balance for gas. Please get at least ${utils.formatEther(estimatedGas)}`)
    console.log(`\nThere will be ${numTx} transactions.`);

    try {
        // build batch functions
        const mintTxs = Object.keys(results).map((boostRank: string, rankIndex: number) => {
            const startNonce = currentNonce + rankStartNonce[rankIndex];
            const recipients = results[boostRank];
            const groupedRecipients = splitArray(recipients, MAX_BATCH_MINT_FOR);
            return groupedRecipients.map((batch: string[], batchIndex: number) => {
                if (log) {
                    // encode function data
                    console.log('\n   >> Transaction Nr.%d, data payload:', startNonce + batchIndex)
                    console.log(hoprBoost.interface.encodeFunctionData("batchMint", [
                        batch,
                        type,
                        boostRank,
                        boost[boostRank],
                        deadline
                    ]))
                }
                return hoprBoost.connect(minter).batchMint(
                    batch,
                    type,
                    boostRank,
                    boost[boostRank],
                    deadline,
                    {
                        nonce: startNonce + batchIndex,
                        gasPrice
                    }
                )
            })
        });

        const flatMintTxs = await Promise.all(mintTxs.flat()) as ContractTransaction[];
        console.log('\nContract tx hashs')
        console.table(flatMintTxs.map(tx => {return {url: `https://blockscout.com/xdai/mainnet/tx/${tx.hash}`}}))
        await Promise.all(flatMintTxs.map(mintTx => mintTx.wait()));

        // We log the transaction hash and verify the NFTs from the contract
        console.log(`\nNFTs minted NFT in the ${JSON.stringify(flatMintTxs.map(mintTx => mintTx.hash), null, 2)} transaction`);
    } catch (error) {
        console.error(error)
    }
}

export default main