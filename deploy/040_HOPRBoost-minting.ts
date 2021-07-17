import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { BADGES } from "../utils/constants";
import { HoprBoost } from "../lib/types/HoprBoost"

const main: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { admin, alice } = await getNamedAccounts();

  const HoprBoost = await deployments.get("HoprBoost");

  // We obtain the just deployed HoprBoost contract address based on the tx
  const boostContract = await ethers.getContractAt("HoprBoost", HoprBoost.address) as HoprBoost;

  // We mint a single NFT to alice, and pass the proper values
  const mintTx = await boostContract
    .connect(await ethers.getSigner(admin))
    .mint(
      alice,
      BADGES[0].type,
      BADGES[0].rank,
      BADGES[0].nominator,
      BADGES[0].deadline
    );

  await mintTx.wait()

  // We log the transaction hash and verify the NFTs from the contract
  console.log(`${admin} minted NFT in the ${mintTx.hash} transaction`);

  // We obtain the nomiator and deadline to log them later and verify them
  const [nominator, deadline] = await boostContract.boostOf(ethers.constants.Zero);

  // We verify that the NFT supply has indeed been increased
  console.log(`We minted ${await boostContract.totalSupply()} NFTs`);
  console.log(`The boost contract (${boostContract.address}) nominator is ${nominator} with ${deadline} as deadline`);
};
export default main;
export const dependencies = ["wxHOPR_Minting"];
export const tags = ["HoprBoost_Minting"];