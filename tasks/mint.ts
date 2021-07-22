import type { HardhatRuntimeEnvironment, RunSuperFunction } from 'hardhat/types'
import { BADGES } from "../utils/constants";
import { HoprBoost } from "../lib/types/HoprBoost"


/**
 * Mints a Demo NFT to a specific account
 */
async function main(
  { address }: { address: string },
  { ethers, deployments, getNamedAccounts }: HardhatRuntimeEnvironment,
  _runSuper: RunSuperFunction<any>
) {

  if (!address) {
    console.log('No address was given, exiting')
    return;
  }

  const HoprBoost = await deployments.get("HoprBoost");
  const { admin } = await getNamedAccounts();

  // We obtain the just deployed HoprBoost contract address based on the tx
  const boostContract = await ethers.getContractAt("HoprBoost", HoprBoost.address) as HoprBoost;

  // We mint a single NFT to alice, and pass the proper values
  const mintTx = await boostContract
    .connect(await ethers.getSigner(admin))
    .mint(
      address,
      'demo',
      BADGES[0].rank,
      BADGES[0].nominator,
      BADGES[0].deadline
    );

  await mintTx.wait()

  // We log the transaction hash and verify the NFTs from the contract
  console.log(`${admin} minted NFT in the ${mintTx.hash} transaction`);
}

export default main