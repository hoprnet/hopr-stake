import type { HardhatRuntimeEnvironment, RunSuperFunction } from 'hardhat/types'
import { HoprBoost } from "../lib/types/HoprBoost"


/**
 * Mints a Demo NFT to a specific account
 */
async function main(
  { url }: { url: string },
  { ethers, deployments, getNamedAccounts }: HardhatRuntimeEnvironment,
  _runSuper: RunSuperFunction<any>
) {

  if (!url) {
    console.log('No url was given, exiting')
    return;
  }

  const HoprBoost = await deployments.get("HoprBoost");
  const { admin } = await getNamedAccounts();

  // We obtain the just deployed HoprBoost contract address based on the tx
  const boostContract = await ethers.getContractAt("HoprBoost", HoprBoost.address) as HoprBoost;

  // We update the base URI of all the NFTs
  const updateTx = await boostContract
    .connect(await ethers.getSigner(admin))
    .updateBaseURI(url)

  await updateTx.wait()

  // We log the transaction hash and verify the URL updated
  console.log(`${admin} updated BASE URI to ${url} NFT in the ${updateTx.hash} transaction`);
}

export default main