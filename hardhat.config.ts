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
const { MINTER_KEY, QUIKNODE_KEY, ADMIN_ACCOUNT } = process.env;

const { ETHERSCAN } = process.env;

const hardhatConfig: HardhatUserConfig = {
  defaultNetwork: "localhost",
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      chainId: 1337,
    },
    xdai: {
      chainId: 100,
      url: `https://still-patient-forest.xdai.quiknode.pro/${QUIKNODE_KEY}/`,
      accounts: MINTER_KEY
        ? [MINTER_KEY, MINTER_KEY]
        : [],
    },
    goerli: {
      chainId: 5,
      url: `https://goerli.infura.io/v3/de898745bd39430f9cf6e359b911257a`,
      accounts: ADMIN_ACCOUNT
        ? [ADMIN_ACCOUNT, ADMIN_ACCOUNT]
        : [],
    },
  },
  namedAccounts: {
    deployer: 0,
    admin: 1,
    alice: 2
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
.addOptionalParam<string>('path', 'Path to the DuneAnalytics export in csv')


task('updateBaseURI', "Updates the base URI of all the NFTs in the smart contract", async (...args: any[]) => {
  return (await import('./tasks/updateBaseURI')).default(args[0], args[1], args[2])
})
  .addParam<string>('url', 'Base URL')

export default hardhatConfig;
