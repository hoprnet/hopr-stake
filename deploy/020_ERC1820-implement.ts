import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import {
  ERC1820_REGISTRY_ADDRESS,
  ERC1820_REGISTRY_ABI,
} from "@openzeppelin/test-helpers/src/data.js";
import { HoprStake } from "../lib/types/HoprStake";

const main: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, ethers } = hre;
  const HoprStake = await deployments.get("HoprStake");

  // We fetch the contract registry from the current provider (network)
  const ERC1820Registry = new ethers.Contract(
    ERC1820_REGISTRY_ADDRESS,
    ERC1820_REGISTRY_ABI,
    ethers.getDefaultProvider()
  );

  // We obtain the just deployed HoprStake contract address based on the tx
  const stakeContract = (await ethers.getContractAt(
    "HoprStake",
    HoprStake.address
  )) as HoprStake;

  // We allow the registry to interface with our HoprStake contract on behalf of ERC777 tokens
  await ERC1820Registry.getInterfaceImplementer(
    stakeContract.address,
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ERC777TokensRecipient"))
  );

  // We log information about the staking contract to be sure about it
  console.log(
    `The staking contract was deployed with xHOPR (${await stakeContract.LOCK_TOKEN()}) as LOCK_TOKEN`
  );
  console.log(
    `The stakig contract was deployed with wxHOPR (${await stakeContract.REWARD_TOKEN()}) as REWARD_TOKEN`
  );
};

export default main;
export const dependencies = ["xHOPR_Minting"];
export const tags = ["ERC1820_Implements"];
