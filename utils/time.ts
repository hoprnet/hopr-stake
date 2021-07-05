// import { BigNumber, utils } from 'ethers'
import hre from "hardhat";
import colors from "ansi-colors";


const latestBlock = async () => {
    return hre.ethers.provider.getBlockNumber();
}

const advanceBlock = async() => {
  try {
    await hre.ethers.provider.send("evm_mine", [new Date().getTime()]);
  } catch (error) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(hre.ethers.provider.send("evm_mine", [new Date().getTime()])), 50)
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

export { latestBlock, advanceBlockTo};