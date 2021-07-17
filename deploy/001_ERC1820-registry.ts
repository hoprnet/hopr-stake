import type { HardhatRuntimeEnvironment } from 'hardhat/types'
import type { DeployFunction } from "hardhat-deploy/types";
import {
    ERC1820_REGISTRY_ADDRESS,
    ERC1820_REGISTRY_DEPLOY_TX,
} from "@openzeppelin/test-helpers/src/data.js";
import type { Signer } from 'ethers'

const main: DeployFunction = async function (hre: HardhatRuntimeEnvironment, signer?: Signer) {
  const { ethers, getNamedAccounts } = hre

  // Hardcoded address for the pre-generated 1820 registry
  const ERC1820_DEPLOYER = '0xa990077c3205cbDf861e17Fa532eeB069cE9fF96'

  // We either take a deployer or use one of our given deployers
  const deployer = signer || (await getNamedAccounts().then((o) => ethers.getSigner(o.deployer)))

  // We don't do anything if there is an already a 1820 registry in our network
  if ((await ethers.provider.getCode(ERC1820_REGISTRY_ADDRESS)).length > '0x'.length) {
    console.log('ERC1820 registry already exists')
    return
  }

  // We need 0.08 ether in the known account that will deploy the contract.
  await deployer.sendTransaction({
    to: ERC1820_DEPLOYER,
    value: ethers.utils.parseEther('0.08')
  })

  // Actually deploy the registry by publishing a pre-signed raw transaction with the adequate amount
  await ethers.provider.sendTransaction(ERC1820_REGISTRY_DEPLOY_TX)
  console.log(`"ERC1820Registry" deployed at ${ERC1820_REGISTRY_ADDRESS}`)
}

export default main