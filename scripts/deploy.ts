import { Contract, constants, utils } from 'ethers';
import { config, ethers } from 'hardhat';
import fs from 'fs';
import { HoprBoost__factory, HoprStake__factory } from '../types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BADGES, MINTER_ROLE } from '../utils/constants';
import { deployRegistry } from '../utils/registry';
import { deployContract } from '../utils/contracts';

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  const HOPR_BOOST_CONTRACT = 'HoprBoost'
  const HOPR_STAKE_CONTRACT = 'HoprStake'

  // Remove previously known address written on build time.
  // fs.unlinkSync(`${config.paths.artifacts}/contracts/contractAddress.ts`);

  // We get the contract to deploy
  const [deployer, admin, minter, alice]: SignerWithAddress[] = await ethers.getSigners();
  const HoprBoostContractFactory: HoprBoost__factory = await ethers.getContractFactory(HOPR_BOOST_CONTRACT);
  const boostContract = await HoprBoostContractFactory.deploy(await admin.getAddress(), '');
  await boostContract.deployed();

  // We allow a minter, although the admin can also mint as well.
  await boostContract.connect(admin).grantRole(MINTER_ROLE, await minter.getAddress())
  // We mint a single NFT, and pass the proper values
  const aliceAddress = await alice.getAddress()
  await boostContract.connect(minter).mint(aliceAddress, BADGES[0].type, BADGES[0].rank, BADGES[0].nominator, BADGES[0].deadline)

  // We review the boost factor
  const [nominator, deadline] = (await boostContract.boostOf(constants.Zero))
  console.log(`We minted ${await boostContract.totalSupply()} NFTs, to ${aliceAddress} which has a nominator boost of ${nominator} by ${deadline}`) 
  saveFrontendFiles(boostContract, HOPR_BOOST_CONTRACT);

  console.log(`${HOPR_BOOST_CONTRACT} deployed to: ${boostContract.address}`);

  // EIP-1820 registry
  const registry = await deployRegistry(deployer);
  // Mock contracts
  const erc677 = await deployContract(deployer, "ERC677Mock");
  await erc677.deployed()
  const erc777 = await deployContract(deployer, "ERC777Mock");
  await erc777.deployed()

  const adminAddress = await admin.getAddress()

  // We deploy the staking contract with a given Boost smart contract using specific (wx)HOPR and (x)HOPR token
  const HoprStakingContractFactory: HoprStake__factory = await ethers.getContractFactory(HOPR_STAKE_CONTRACT);
  const stakeContract = await HoprStakingContractFactory.deploy(boostContract.address, adminAddress, erc677.address, erc777.address);
  await stakeContract.deployed();

  // Alice now has 10 xHOPR
  await erc677.batchMintInternal([aliceAddress], utils.parseUnits('10000', 'ether'));
  // Admin now has 5 million wxHOPR
  await erc777.mintInternal(adminAddress, utils.parseUnits('5000000', 'ether'), constants.HashZero, constants.HashZero);
  // Allow staking contract to interface with ERC777 tokens via registry
  await registry.getInterfaceImplementer(stakeContract.address, utils.keccak256(utils.toUtf8Bytes('ERC777TokensRecipient')))

  // Sending 1 million wxHOPR to Staking contract
  await erc777.connect(admin).send(stakeContract.address,utils.parseUnits('1000000', 'ether'), constants.HashZero)
  
  // Printing the deployed contracts information
  console.log(`ERC677 - wxHOPR (mock) was deployed at ${erc677.address}`)
  console.log(`ERC777 - xHOPR (mock) was deployed at ${erc777.address}`)
  console.log(`${HOPR_STAKE_CONTRACT} was deployed with ${await stakeContract.LOCK_TOKEN()} as LOCK_TOKEN`)
  console.log(`${HOPR_STAKE_CONTRACT} was deployed with ${await stakeContract.REWARD_TOKEN()} as REWARD_TOKEN`) 
  // Showcasing the initial state of the staking contract and admin account
  console.log(`Sending ${utils.parseUnits('1000000', 'ether')} from ${adminAddress} (admin) to ${stakeContract.address} (staking contract)`)
  console.log(`${HOPR_STAKE_CONTRACT} has ${await stakeContract.availableReward()} available rewards`)
  console.log(`${adminAddress} (admin) has now ${await erc777.balanceOf(adminAddress)}`)
  saveFrontendFiles(stakeContract, HOPR_STAKE_CONTRACT);
  console.log(`${HOPR_STAKE_CONTRACT} deployed to: ${stakeContract.address}`);
}

// https://github.com/nomiclabs/hardhat-hackathon-boilerplate/blob/master/scripts/deploy.js
function saveFrontendFiles(contract: Contract, contractName: string) {
  fs.appendFileSync(
    `${config.paths.artifacts}/contracts/contractAddress.ts`,
    `export const ${contractName} = '${contract.address}'\n`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

