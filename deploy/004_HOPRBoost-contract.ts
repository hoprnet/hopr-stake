import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const main: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;

  const { deploy } = deployments;
  const { deployer, admin } = await getNamedAccounts();

  console.log(`hoprbost ${admin}`)
  await deploy("HoprBoost", {
    from: deployer,
    args: [admin, ""],
    log: true,
  });
};
main.tags = ['HoprBoost'];
main.skip = async (env: HardhatRuntimeEnvironment) => !!env.network.tags.production || !!env.network.tags.staging

export default main;
