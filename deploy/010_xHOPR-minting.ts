import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ERC677Mock as xHOPR } from "../lib/types/ERC677Mock";

const main: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deployer, alice } = await getNamedAccounts();

  const xHOPR = await deployments.get("xHOPR");

  // We obtain the just deployed xHOPR contract address based on the tx
  const xHOPRContract = (await ethers.getContractAt(
    "ERC677Mock",
    xHOPR.address
  )) as xHOPR;

  // We make it rain for Alice and mint 10k xHOPR as the deployer
  const mintTx = await xHOPRContract
    .connect(await ethers.getSigner(deployer))
    .batchMintInternal([alice], ethers.utils.parseUnits("10000", "ether"));

 await mintTx.wait()

  // We log the transaction hash and verify the balance of Alice
  console.log(
    `Minted ${ethers.utils.formatEther(
      await xHOPRContract.balanceOf(alice)
    )} xHOPR (${xHOPR.address}) for Alice on ${mintTx.hash}`
  );
};
export default main;
export const tags = ['xHOPR_Minting'];
