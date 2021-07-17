import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ERC777Mock as wxHOPR } from "../lib/types/ERC777Mock";

const main: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deployer, admin } = await getNamedAccounts();

  const wxHOPR = await deployments.get("wxHOPR");

  // We obtain the just deployed wxHOPR contract address based on the tx
  const wxHOPRContract = (await ethers.getContractAt(
    "ERC777Mock",
    wxHOPR.address
  )) as wxHOPR;

  // We make it rain for the Admin and mint 5m wxHOPR as the deployer
  const mintTx = await wxHOPRContract
    .connect(await ethers.getSigner(deployer))
    .mintInternal(
      admin,
      ethers.utils.parseUnits("5000000", "ether"),
      ethers.constants.HashZero,
      ethers.constants.HashZero
    );

    await mintTx.wait()

  // We log the transaction hash and verify the balance of the Admin
  console.log(
    `Minted ${ethers.utils.formatEther(
      await wxHOPRContract.balanceOf(admin)
    )} wxHOPR (${wxHOPR.address}) for Admin on ${mintTx.hash}`
  );
};
export default main;
export const dependencies = ["ERC1820_Implements"];
export const tags = ["wxHOPR_Minting"];
