import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const main: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;

  const xHOPR = await deployments.get("xHOPR");
  const wxHOPR = await deployments.get("wxHOPR");
  const HoprBoost = await deployments.get("HoprBoost");
  const HoprStake = await deployments.get("HoprStake");
  const HoprStake2 = await deployments.get("HoprStake2");

  console.table([
    ["xHOPR", xHOPR.address],
    ["wxHOPR", wxHOPR.address],
    ["HoprBoost", HoprBoost.address],
    ["HoprStake", HoprStake.address],
    ["HoprStake2", HoprStake2.address],
  ]);
};
export default main;
