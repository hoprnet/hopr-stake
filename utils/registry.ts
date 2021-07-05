import {
    ERC1820_REGISTRY_ABI,
    ERC1820_REGISTRY_ADDRESS,
    ERC1820_REGISTRY_DEPLOY_TX,
} from "@openzeppelin/test-helpers/src/data.js";
import { Contract, Signer, utils } from 'ethers'
import hre from "hardhat";

export const deployRegistry = async (deployer: Signer) => {
    // Check if ERC1820 registry is deployed
    if ((await deployer.provider.getCode(ERC1820_REGISTRY_ADDRESS)).length <= '0x0'.length) {

        const signer = "0xa990077c3205cbDf861e17Fa532eeB069cE9fF96";
        // fund the ERC1820 deployer
        const fundTx = {
            to: signer,
            value: utils.parseEther("0.08")
        }
        await deployer.sendTransaction(fundTx);

        await hre.ethers.provider.send("eth_sendRawTransaction", [ERC1820_REGISTRY_DEPLOY_TX])
    }
    
    return new Contract(ERC1820_REGISTRY_ADDRESS, ERC1820_REGISTRY_ABI, hre.ethers.provider);
}
