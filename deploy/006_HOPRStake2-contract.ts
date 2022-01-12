import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";


const main: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;

  const { deploy } = deployments;
  const { deployer, admin, alice } = await getNamedAccounts();

  const HoprBoost = await deployments.get("HoprBoost");
  const xHOPR = await deployments.get("xHOPR");
  const wxHOPR = await deployments.get("wxHOPR");

  // We verify the address we will be passing to our contract
  console.table([
    ['From Deployments', 'Addresses'], 
    ['wxHOPR', wxHOPR.address],
    ['xHOPR', xHOPR.address],
    ['HoprBoost', HoprBoost.address],
    ['Deployer', deployer],
    ['Admin', admin],
    ['Alice', alice]
  ])

  await deploy("HoprStake2", {
    from: deployer,
    args: [HoprBoost.address, admin, xHOPR.address, wxHOPR.address],
    log: true,
  });
};

export default main;
