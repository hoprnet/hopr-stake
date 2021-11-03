
import parse from 'csv-parse'
import {createReadStream} from 'fs'
import { utils } from 'ethers'

type DuneExportType = {
    eoa: string,
    grade: string
}
export const MAX_BATCH_MINT_FOR = 50; // can pass max. 50 addresses for batch mint
export const GAS_ESTIMATION_PER_BATCH = 10500000;
export const GAS_PRICE = Number(utils.parseUnits('1', 'gwei'));

export const parseCsv = async (path: string): Promise<Record<string, string[]>> => {
    const records: Record<string, string[]> = {};
    const parser = createReadStream(path).pipe(parse({
        delimiter: ',',
        columns: true
    }));
    for await (const record of parser) {
        const {eoa, grade} = record as Required<DuneExportType>;
        if (!Object.keys(records).find(key => key === grade)) {
            records[grade] = [];
        }
        // Work with each record
        records[grade].push(
            eoa.match(/(?<=\>).*(?=\<)/g).join('')
        )
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
