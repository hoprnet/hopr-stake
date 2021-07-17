import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ERC777Mock as wxHOPR } from "../lib/types/ERC777Mock";
import { ERC677Mock as xHOPR } from "../lib/types/ERC677Mock";
import { HoprStake } from "../lib/types/HoprStake";

const main: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;

  const { admin } = await getNamedAccounts();

  const HoprStake = await deployments.get("HoprStake");
  const wxHOPR = await deployments.get("wxHOPR");
  const xHOPR = await deployments.get("xHOPR");

  // We obtain our wxHOPR contract and send 1M to our staking contract
  const wxHOPRContract = (await ethers.getContractAt(
    "ERC777Mock",
    wxHOPR.address
  )) as wxHOPR;
  const xHOPRContract = (await ethers.getContractAt(
    "ERC677Mock",
    xHOPR.address
  )) as xHOPR;
  const stakeContract = (await ethers.getContractAt(
    "HoprStake",
    HoprStake.address
  )) as HoprStake;


  // We verify the addresses we will be using in our contract and their balances for our admin account
  console.table([
    ['admin', 'Addresses', 'Balance'],
    ['wxHOPR', wxHOPRContract.address, ethers.utils.formatEther(await wxHOPRContract.balanceOf(admin))],
    ['xHOPR', xHOPRContract.address, ethers.utils.formatEther(await xHOPRContract.balanceOf(admin))]
  ])

  console.log(
    `The staking contract now has ${await stakeContract.availableReward()} wxHOPR tokens as available rewards`
  );

  // Sending 1 million wxHOPR to Staking contract
  const mintTx = await wxHOPRContract
  .connect(await ethers.getSigner(admin))
    .send(
      HoprStake.address,
      ethers.utils.parseUnits("1000000", "ether"),
      ethers.constants.HashZero
    );

  await mintTx.wait()

  // We log everything to make sure balances are right
  console.log(
    `The staking contract now has ${await stakeContract.availableReward()} wxHOPR tokens as available rewards`
  );
  console.log(
    `The admin (${admin}) now has ${await wxHOPRContract.balanceOf(admin)}`
  );
};

export default main;
