require("dotenv").config();
import { task } from "hardhat/config";
import { HardhatUserConfig } from "hardhat/types"
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-solhint";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-solhint";
import "solidity-coverage";

import { PRIVATE_KEY_ALICE } from "./utils/constants";

const { ETHERSCAN , MINTER_KEY, DEPLOYER_PRIVATE_KEY } = process.env;

const hardhatConfig: HardhatUserConfig = {
  defaultNetwork: "localhost",
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      chainId: 1337,
      initialBaseFeePerGas: 10000000000,
      initialDate: '2021-07-27',
      tags: ["test"]
    },
    xdai: {
      chainId: 100,
      url: `https://provider-proxy.hoprnet.workers.dev/xdai_mainnet`,
      accounts: [MINTER_KEY || [], DEPLOYER_PRIVATE_KEY || []].flat(),
      tags: ["production"]
    },
    goerli: {
      chainId: 5,
      url: `https://provider-proxy.hoprnet.workers.dev/eth_goerli`,
      accounts: [MINTER_KEY || [], DEPLOYER_PRIVATE_KEY || []].flat(),
      tags: ["staging"]
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
      "goerli": 1,
      "xdai": 1
    },
    admin: {
      default: 1,
      "goerli": '0xA18732DC751BE0dB04157eb92C92BA9d0fC09FC5',
      "xdai": '0xE9131488563776DE7FEa238d6112c5dA46be9a9F'
    },
    alice: {
      default: `privateKey://${PRIVATE_KEY_ALICE}`,
      "goerli": '0x3dA21EB3D7d40fEA6bd78c627Cc9B1F59E7481E1',
      "xdai": '0x3dA21EB3D7d40fEA6bd78c627Cc9B1F59E7481E1'
    }
  },
  solidity: {
    compilers: [
      {
        version: "0.8.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./hardhat/cache",
    artifacts: "./hardhat/artifacts",
  },
  typechain: {
    outDir: "./lib/types",
    target: "ethers-v5",
  },
  etherscan: {
    apiKey: ETHERSCAN,
  },
};

task("extract", "Extract ABIs to specified folder", async (...args: any[]) => {
  return (await import("./tasks/extract")).default(args[0], args[1], args[2]);
}).addFlag("target", "Folder to output contents to");

task('mint', "Mints a demo NFT to a specific account", async (...args: any[]) => {
  return (await import('./tasks/mint')).default(args[0], args[1], args[2])
})
  .addParam<string>('address', 'Ethereum address')
task('batchMint', "Mints a demo NFT to a specific account", async (...args: any[]) => {
  return (await import('./tasks/batchMint')).default(args[0], args[1], args[2])
})
.addParam<boolean>('log', 'If the encoded data is logged in the console')
.addParam<string>('type', 'NFT type')
task('rescue', "Rescue NFTs", async (...args: any[]) => {
    return (await import('./tasks/rescue')).default(args[0], args[1], args[2])
})

task('updateBaseURI', "Updates the base URI of all the NFTs in the smart contract", async (...args: any[]) => {
  return (await import('./tasks/updateBaseURI')).default(args[0], args[1], args[2])
})
  .addParam<string>('url', 'Base URL')

export default hardhatConfig;
