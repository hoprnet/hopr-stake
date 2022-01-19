import parse, { Parser } from 'csv-parse'
import {createReadStream} from 'fs'
import { utils } from 'ethers'
import axios from 'axios'

type DuneExportType = {
    eoa: string,
    grade: string
}
export const MAX_BATCH_MINT_FOR = 50; // can pass max. 50 addresses for batch mint
export const GAS_ESTIMATION_PER_BATCH = 10500000;
export const SAFE_GAS_PRICE = 5;

export const getGasPrice = async () => {
    let price: number;
    try {
        const gasObj = await axios.get('https://blockscout.com/xdai/mainnet/api/v1/gas-price-oracle');
        console.log("\nCurrent network price", gasObj.data);
        price = gasObj.status === 200 ? gasObj.data.average : SAFE_GAS_PRICE
    } catch (error) {
        price = SAFE_GAS_PRICE
    }
    return Number(utils.parseUnits(price.toString(), 'gwei'));
}

export const parseCsv = async (path: string): Promise<Record<string, string[]>> => {
    const records: Record<string, string[]> = {};
    let parser: Parser;
    try {
        parser = createReadStream(path).pipe(parse({
            delimiter: ',',
            columns: true
        }));
    } catch (error) {
        console.error(error)
        throw error
    }
    const errorRecord: Record<string, string[]> = {};
    for await (const record of parser) {
        const {eoa, grade} = record as Required<DuneExportType>;
        if (!Object.keys(records).find(key => key === grade)) {
            records[grade] = [];
        }
        // Work with each record
        try {
            const extractedAddress = utils.getAddress(eoa.match(/(?<=\>)0x.{40}(?=\<)/g).join(''))
            records[grade].push(extractedAddress)
        } catch (error) {
            if (!Object.keys(errorRecord).find(key => key === grade)) {
                errorRecord[grade] = [];
            }
            errorRecord[grade].push(eoa)
        }
    }
    if (Object.keys(errorRecord).length > 0) {
        console.error("error!!!")
        console.error(JSON.stringify(errorRecord, null, 2))
    }
    return records
};

/**
 * Split the long address list into small arrays
 */
export const splitArray = (array: string[], maxLength: number): string[][] => {
    return array.reduce((acc, _cur, i, arr) => i % maxLength === 0 ? acc.concat([arr.slice(i, i + maxLength)]) : acc, [])
}

/**
 * Return the number of days between now and Jan 17
 */
export const daysUntilStakeEnd = (programEnd: number) =>  Math.floor((programEnd - Date.now() / 1000) / (3600 * 24)) + 1;

/**
 * With a denominator of 1e12
 * @param apy APY in percentage. Put `5` for a `5%` APY
 * @returns Boost numerator per second
 */
export const rate = (apy: number) => Math.round(1e10 * apy / (3600 * 24 * 365));

/**
 * Calculate APY [%] based on rate
 * @param rate reward rate per second
 * @returns APY in percentage
 */
export const apy = (rate: number) => rate / 1e10 * (3600 * 24 * 365);
