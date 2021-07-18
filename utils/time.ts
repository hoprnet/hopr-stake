// import { BigNumber, utils } from 'ethers'
import hre from "hardhat";
import colors from "ansi-colors";


const latestBlock = async () => {
    return hre.ethers.provider.getBlockNumber();
}

const latestBlockTime = async ():Promise<[number, number]> => {
  const latest = await latestBlock();
  const block = await hre.ethers.provider.getBlock(latest);
  return [block.timestamp, block.number];
}

const advanceBlock = async() => {
  try {
    await hre.ethers.provider.send("evm_mine", []);
  } catch (error) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(hre.ethers.provider.send("evm_mine", [])), 50)
    });
  }
}

const advanceBlockTo = async (target: number) => {
    const currentBlock = await latestBlock();
    const start = Date.now();

    let notified;
    if (target < currentBlock) throw Error(`Target block #(${target}) is lower than current block #(${currentBlock})`);
   
    while ((await latestBlock()) < target) {
        if (!notified && Date.now() - start >= 5000) {
          notified = true;
          console.log(`\
    ${colors.white.bgBlack('@openzeppelin/test-helpers')} ${colors.black.bgYellow('WARN')} advanceBlockTo: Advancing too ` +
          'many blocks is causing this test to be slow.');
        }
        await advanceBlock();
      }
}

const advanceTimeForNextBlock = async (blockTimestampInSec: number) => {
  await hre.ethers.provider.send("evm_setNextBlockTimestamp", [blockTimestampInSec])
  await hre.ethers.provider.send("evm_mine", [blockTimestampInSec])
  // await hre.ethers.provider.send("evm_mine", [new Date().getTime()])
}

export { latestBlock, latestBlockTime, advanceBlockTo, advanceTimeForNextBlock};