import { ethers } from "ethers";
import{ assert } from "chai";

export const getParamFromTxResponse = async (
    transaction: ethers.providers.TransactionReceipt, 
    eventTopicIdentifier: string, 
    paramIndex: number, 
    contract: string, 
    subject: string
): Promise<string> => {
    assert.isObject(transaction)
    if (subject != null) {
        logCumulatedGasUsageFromReceipt(subject, transaction)
    }
    const topic = ethers.utils.hexZeroPad(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(eventTopicIdentifier)), 32);
    let logs = transaction.logs
    if(topic != null) {
        logs = logs.filter((l) => l.topics[0].toLowerCase() === topic && l.address.toLowerCase() === contract.toLowerCase())
    }
    assert.equal(logs.length, 1, 'too many logs found!')
    return paramIndex > 4 ? logs[0].data :logs[0].topics[paramIndex]
}

export const logDataToAddress = (logData: string) => '0x'+logData.slice(-40);

const logCumulatedGasUsageFromReceipt = (subject: string, transactionOrReceipt: ethers.providers.TransactionReceipt) => {
    const {cumulativeGasUsed} = transactionOrReceipt
    console.log("    Gas costs for " + subject + ": " + cumulativeGasUsed.toString())
}
