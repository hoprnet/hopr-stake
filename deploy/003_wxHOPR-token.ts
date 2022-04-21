import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const main: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;

  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("wxHOPR", {
    contract: "ERC777Mock",
    from: deployer,
    log: true,
  });
};
main.tags = ['wxHOPR'];
main.skip = async (env: HardhatRuntimeEnvironment) => !!env.network.tags.production || !!env.network.tags.staging

export default main;
