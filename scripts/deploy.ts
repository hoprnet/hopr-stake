import { Contract, constants } from 'ethers';
import { config, ethers } from 'hardhat';
import fs from 'fs';
import { HoprBoost__factory } from '../types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BADGES, MINTER_ROLE } from '../utils/constants';

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  const HOPR_BOOST_CONTRACT = 'HoprBoost'

  // Remove previously known address written on build time.
  // fs.unlinkSync(`${config.paths.artifacts}/contracts/contractAddress.ts`);

  // We get the contract to deploy
  const [_, admin, minter, alice]: SignerWithAddress[] = await ethers.getSigners();
  const HoprBoostContractFactory: HoprBoost__factory = await ethers.getContractFactory(HOPR_BOOST_CONTRACT);
  const contract = await HoprBoostContractFactory.deploy(await admin.getAddress(), '');
  await contract.deployed();

  // We allow a minter, although the admin can also mint as well.
  await contract.connect(admin).grantRole(MINTER_ROLE, await minter.getAddress())
  // We mint a single NFT, and pass the proper values
  const aliceAddress = await alice.getAddress()
  await contract.connect(minter).mint(aliceAddress, BADGES[0].type, BADGES[0].rank, BADGES[0].nominator, BADGES[0].deadline)

  // We review the boost factor
  const [nominator, deadline] = (await contract.boostOf(constants.Zero))
  console.log(`We minted ${await contract.totalSupply()} NFTs, to ${aliceAddress} which has a nominator boost of ${nominator} by ${deadline}`) 
  saveFrontendFiles(contract, HOPR_BOOST_CONTRACT);

  console.log(`${HOPR_BOOST_CONTRACT} deployed to: ${contract.address}`);
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
