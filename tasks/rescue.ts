import parse, { Parser } from 'csv-parse'
import {createReadStream} from 'fs'
import type { HardhatRuntimeEnvironment, RunSuperFunction } from 'hardhat/types'
import { getGasPrice } from '../utils/mint';
import { ContractTransaction } from 'ethers';

const HOPR_WHITEHAT = "0x153Aa74a8588606f134B2d35eB6e707a7d550705";
// nft comes from https://dune.xyz/queries/361265
const INPUT_FILE = `${process.cwd()}/rescue/deadlocked.csv`;    // location where rawdata gets stored
// airdrop data comes from https://dune.xyz/queries/361192

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
        // build functions
        const rescueTxs = accounts.map((account: string, accountIndex: number) => {
            const nonce = currentNonce + accountIndex;
            console.log('\n   >> Transaction Nr.%d, data payload:', nonce)
            console.log(whitehat.interface.encodeFunctionData("ownerRescueBoosterNftInBatch", [
                account
            ]))
            return whitehat.connect(admin).ownerRescueBoosterNftInBatch(
                account,
                {
                    nonce,
                    gasPrice
                }
            )
        });

        const flatMintTxs = await Promise.all(rescueTxs.flat()) as ContractTransaction[];
        console.log('\nContract tx hashs')
        console.table(flatMintTxs.map(tx => {return {url: `https://blockscout.com/xdai/mainnet/tx/${tx.hash}`}}))
        await Promise.all(flatMintTxs.map(mintTx => mintTx.wait()));

        // We log the transaction hash and verify the NFTs from the contract
        console.log(`\nNFTs rescued in ${JSON.stringify(flatMintTxs.map(mintTx => mintTx.hash), null, 2)} transaction`);
    } catch (error) {
        console.error(error)
    }
}

export default main