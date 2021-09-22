import type { HardhatRuntimeEnvironment, RunSuperFunction } from 'hardhat/types'
import { PUZZLE_BADGE } from "../utils/constants";
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

  const addresses = [
    "0xfc91FC0CCBd62c9D0517E5a6b337c99109292b13",
    "0x934FEa85C7bfa0d5E75822945f96b603Af4B134A",
    "0x0e3199513bcDbBc7D3DE5190BF10dA4241009e9D",
    "0x813215E430A063EBe3d17C7a19045bE46b7d8948",
    "0x31878C978e41Ed1324C2605d5800A8C77cCee94a",
    "0xb01FA6a95E988B9e19dB2523Df580fC796197C1E",
    "0x1279249174eC07a2Cb3f057bDc43414106183d4c",
    "0xDaa9e7d3a6CC6151DF9C69fE7483eE30dB1eC963",
    "0xe2F3c30B753F71BDBF1258D6e09FD3D2adF549dB"
  ]

  const PromiseEach = function(arr, fn) { // take an array and a function
    // invalid input
    if(!Array.isArray(arr)) return Promise.reject(new Error("Non array passed to each"));
    // empty case
    if(arr.length === 0) return Promise.resolve();
    return arr.reduce(function(prev, cur) {
      return prev.then(() => fn(cur))
    }, Promise.resolve());
  }

  // We mint a single NFT to alice, and pass the proper values
  const transactionResolver = async (address) => {
    console.log(`Minting for ${address}...`)
    const mintTx = await boostContract
    .connect(await ethers.getSigner(admin))
    .mint(
      address,
      PUZZLE_BADGE.bronze.type,
      PUZZLE_BADGE.bronze.rank,
      PUZZLE_BADGE.bronze.nominator,
      PUZZLE_BADGE.bronze.deadline
    );

    await mintTx.wait()

    // We log the transaction hash and verify the NFTs from the contract
    console.log(`Minted NFT in the ${mintTx.hash} transaction`);
  }

  await PromiseEach(addresses, transactionResolver);
  console.log("All tokens had been minted.")

}

export default main