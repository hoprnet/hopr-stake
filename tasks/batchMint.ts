
import { BigNumber } from '@ethersproject/bignumber';
import { assert } from 'console';
import type { HardhatRuntimeEnvironment, RunSuperFunction } from 'hardhat/types'
import { HoprBoost } from "../lib/types/HoprBoost"
import { BOOST_CONTRACT_XDAI_PROD } from '../utils/constants';
import { apy, GAS_ESTIMATION_PER_BATCH, GAS_PRICE, MAX_BATCH_MINT_FOR, parseCsv, rate, splitArray } from '../utils/mint';
import { utils } from 'ethers';

const CSV_PATH = `${process.cwd()}/json/export.csv`;    // export from DuneAnalytics

const deadline = 1642424400; // Jan 17th 2022, 14:00
const type = "Wildhorn_v1"; // 
// Diamond: 5% Gold: 3% Silver: 2% Bronze: 1%
const boost = {
    "diamond": rate(5),
    "gold": rate(3),
    "silver": rate(2),
    "bronze": rate(1)
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
    const HoprBoost = await ethers.getContractFactory("HoprBoost");
    const hoprBoost = await HoprBoost.attach(BOOST_CONTRACT_XDAI_PROD) as HoprBoost;
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
    const estimatedGas = utils.parseUnits(BigNumber.from(GAS_ESTIMATION_PER_BATCH)
                            .mul(BigNumber.from(numTx))
                            .mul(BigNumber.from(GAS_PRICE)).toString(), 'gwei');
    const minterBalance = await minter.getBalance();
    assert(minterBalance.gte(estimatedGas), `Not enough balance for gas. Please get at least ${utils.formatEther(estimatedGas)}`)
    console.log(`There will be ${numTx} transactions.`);

    try {
        // build batch functions
        let startNonce = currentNonce
        for await (const boostRank of Object.keys(results)) {
            const recipients = results[boostRank];
            const groupedRecipients = splitArray(recipients, MAX_BATCH_MINT_FOR);
            let mintTxs = [];
            groupedRecipients.forEach(async (batch: string[], batchIndex: number) => {
                console.log(`Sending minting tx for rank ${boostRank} Nr. ${batchIndex} at nonce ${startNonce + batchIndex}.`)
                const mintTx = await hoprBoost.connect(minter).batchMint(
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
                mintTxs.push(mintTx);
            })
            startNonce += mintTxs.length;
            const mintTxReceipts = await Promise.all(mintTxs.map(mintTx => mintTx.wait()));
            // We log the transaction hash and verify the NFTs from the contract
            console.log(`${boostRank} NFTs are minted NFT in the ${JSON.stringify(mintTxReceipts.map(receipt => receipt.blockHash), null, 2)} transaction`);
        }
    } catch (error) {
        console.error(error)
    }
}

export default main