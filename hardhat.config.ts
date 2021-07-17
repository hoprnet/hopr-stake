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
const { DEPLOYER_PRIVATE_KEY, ADMIN_ACCOUNT, ALICE, QUIKNODE_KEY, INFURA_KEY } = process.env;

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
    goerli: {
      chainId: 5,
      url: `https://goerli.infura.io/v3/${INFURA_KEY}`,
      accounts: DEPLOYER_PRIVATE_KEY
        ? [DEPLOYER_PRIVATE_KEY, ADMIN_ACCOUNT, ALICE]
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

export default hardhatConfig;
