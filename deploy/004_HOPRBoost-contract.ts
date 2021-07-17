import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const main: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;

  const { deploy } = deployments;
  const { deployer, admin } = await getNamedAccounts();

  await deploy("HoprBoost", {
    from: deployer,
    args: [admin, ""],
    log: true,
  });
};
export default main;
