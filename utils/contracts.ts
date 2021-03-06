import { Signer, Contract } from "ethers";
import hre from "hardhat";

const deployFromBytecode = async (deployer: Signer, abi: any, bytecode: string, arg: any) => {
    const contract = new hre.ethers.ContractFactory(abi, bytecode);
    const artifact = await contract.connect(deployer).deploy(arg);
    return artifact.deployed();
}

const deployContract = async (deployer: Signer, contractName: string, arg?: any): Promise<Contract> => {
    const contract = await hre.ethers.getContractFactory(contractName);
    const artifact = !arg? await contract.connect(deployer).deploy() : await contract.connect(deployer).deploy(arg);
    return artifact.deployed();
}

const deployContract2 = async (deployer: Signer, contractName: string, arg1:any, arg?: any): Promise<Contract> => {
    const contract = await hre.ethers.getContractFactory(contractName);
    const artifact = await contract.connect(deployer).deploy(arg1, arg);
    return artifact.deployed();
}

const deployContract3 = async (deployer: Signer, contractName: string, arg1: any, arg2: any, arg?: any): Promise<Contract> => {
    const contract = await hre.ethers.getContractFactory(contractName);
    const artifact = await contract.connect(deployer).deploy(arg1, arg2, arg);
    return artifact.deployed();
}

const deployContract4 = async (deployer: Signer, contractName: string, arg1: any, arg2: any, arg3: any, ...arg: any): Promise<Contract> => {
    const contract = await hre.ethers.getContractFactory(contractName);
    const artifact = await contract.connect(deployer).deploy(arg1, arg2, arg3, ...arg);
    return artifact.deployed();
}

const connectContract = async (contractName: string, contractAddress: string): Promise<Contract> => {
    const contract = await hre.ethers.getContractFactory(contractName)
    return contract.attach(contractAddress);
}

export {deployFromBytecode, deployContract, deployContract2, deployContract3, deployContract4, connectContract};