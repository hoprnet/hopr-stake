import parse, { Parser } from 'csv-parse'
import {createReadStream} from 'fs'
import type { HardhatRuntimeEnvironment, RunSuperFunction } from 'hardhat/types'
import { getGasPrice } from '../utils/mint';
import { ContractTransaction } from 'ethers';

const HOPR_WHITEHAT = "0x153Aa74a8588606f134B2d35eB6e707a7d550705";
// nft comes from https://dune.xyz/queries/361265
const INPUT_FILE = `${process.cwd()}/rescue/deadlocked.csv`;    // location where rawdata gets stored
// airdrop data comes from https://dune.xyz/queries/361192
// const BATCH_SIZE = 10; // cut in batches to avoid provider error
// const PAUSE_BETWEEN_BATCH = 10000; // 10s

type DuneExportType = {
    account: string
}

const readAndParseExport = async () => {
    const records: string[] = [];
    let parser: Parser;
    try {
        parser = createReadStream(INPUT_FILE).pipe(parse({
            delimiter: ',',
            columns: true
        }));
    } catch (error) {
        console.error(error)
        throw error
    }
    for await (const record of parser) {
        const {account} = record as Required<DuneExportType>;
        // Work with each record
        records.push(account)
    }
    console.log(records.length, "accounts")
    return records
}

async function main(
    _args: any, 
  { ethers, network}: HardhatRuntimeEnvironment,
  _runSuper: RunSuperFunction<any>
) {
    const signers = await ethers.getSigners();
    const admin = signers[0];
    // parse input
    const accounts = await readAndParseExport()
    // whitehat contract
    const whitehat = await ethers.getContractAt("HoprWhitehat", HOPR_WHITEHAT, admin);
    console.log('\nRunning task "mintTokens" with config:', {
        network: network.name,
        executor: admin.address,
        whitehat: whitehat.address
    })
    
    const currentNonce = await admin.getTransactionCount();
    
    // compare native balance with estimated cost
    const gasPrice = await getGasPrice();

    try {
        // rpc provider may have trottle. 
        // Submit transactions in order
        for (let accountIndex = 0; accountIndex < accounts.length; accountIndex++) {
            // if (accountIndex % BATCH_SIZE === 0) {
            //     await new Promise(resolve => setTimeout(resolve, PAUSE_BETWEEN_BATCH))
            // }
            const account = accounts[accountIndex];
            const nonce = currentNonce + accountIndex;
            console.log('\n   >> Transaction Nr.%d, data payload:', nonce)
            console.log(whitehat.interface.encodeFunctionData("ownerRescueBoosterNftInBatch", [
                account
            ]))
            const tx: ContractTransaction = await whitehat.connect(admin).ownerRescueBoosterNftInBatch(
                account,
                {
                    nonce,
                    gasPrice
                }
            )
            const receipt = await tx.wait()
            console.log(`\n ${receipt.events.length} NFTs rescued in transaction ${tx.hash} for account ${account}`);
        }
    } catch (error) {
        console.error(error)
    }
}

export default main