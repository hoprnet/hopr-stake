import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";


const main: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;

  const { deploy } = deployments;
  const { deployer, admin } = await getNamedAccounts();

  const HoprBoost = await deployments.get("HoprBoost");
  const xHOPR = await deployments.get("xHOPR");
  const wxHOPR = await deployments.get("wxHOPR");

  await deploy("HoprStakeSeason4", {
    from: deployer,
    args: [HoprBoost.address, admin, xHOPR.address, wxHOPR.address],
    log: true,
  });
};

main.tags = ['HoprStakeSeason4'];
main.dependencies = ['xHOPR', 'wxHOPR', 'HoprBoost'];
// main.skip = async (env: HardhatRuntimeEnvironment) => !!env.network.tags.production
export default main;