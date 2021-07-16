require("dotenv").config();
import { HardhatUserConfig, task } from "hardhat/config";
// import { HardhatUserConfig, task, types } from 'hardhat/config'
// import 'hardhat-typechain'
import "@typechain/hardhat";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-solhint";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-solhint";
import "hardhat-deploy";
import "solidity-coverage";
const { DEPLOYER_PRIVATE_KEY, ADMIN_ACCOUNT, ALICE, QUIKNODE_KEY } = process.env;

// // This is a sample Hardhat task. To learn how to create your own go to
// // https://hardhat.org/guides/create-task.html
// task("accounts", "Prints the list of accounts", async (args, hre) => {
//   const accounts = await hre.ethers.getSigners();

//   for (const account of accounts) {
//     console.log(await account.address);
//   }
// });

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
      accounts: DEPLOYER_PRIVATE_KEY
        ? [DEPLOYER_PRIVATE_KEY, ADMIN_ACCOUNT, ALICE]
        : [],
    },
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
    deployments: "./deployments",
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

export default hardhatConfig;
