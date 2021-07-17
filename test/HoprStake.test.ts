import { ethers } from 'hardhat'
import { BigNumber, constants, Contract, Signer, utils } from 'ethers'
import { it } from 'mocha';
import{ expect } from "chai";
import expectRevert from "../utils/exception";
import { deployContract, deployContract2, deployContract4 } from "../utils/contracts";
import { deployRegistry } from '../utils/registry';
// import { shouldSupportInterfaces } from '../utils/interface';
import { getParamFromTxResponse } from '../utils/events';
import { advanceTimeForNextBlock, latestBlock, latestBlockTime } from '../utils/time';

describe('HoprStake', function () {
    let deployer: Signer;
    let admin: Signer;
    let participants: Signer[];

    let deployerAddress: string;
    let adminAddress: string;
    let participantAddresses: string[];

    let nftContract: Contract;
    let stakeContract: Contract;
    let erc1820: Contract;
    let erc677: Contract;
    let erc777: Contract;

    const BASIC_START = 1627387200; // July 27 2021 14:00 CET.
    const PROGRAM_END = 1642424400; // Jan 17 2022 14:00 CET.
    const BADGES = [
        {
            type: "HODLr",
            rank: "silver",
            deadline: BASIC_START,
            nominator: "158" // 0.5% APY
        },
        {
            type: "Testnet participant",
            rank: "platinum",
            deadline: PROGRAM_END,
            nominator: "317" // 1% APY
        },
        {
            type: "Past",
            rank: "gold",
            deadline: 123456, // sometime long long ago
            nominator: "100"
        }
    ];

    const reset = async () => {
        let signers: Signer[];
        [deployer, admin, ...signers] = await ethers.getSigners();
        participants = signers.slice(3,6); // 3 participants

        deployerAddress = await deployer.getAddress();
        adminAddress = await admin.getAddress();
        participantAddresses = await Promise.all(participants.map(h => h.getAddress()));

        // set 1820 registry
        erc1820 = await deployRegistry(deployer);
        // set stake and reward tokens
        erc677 = await deployContract(deployer, "ERC677Mock");
        erc777 = await deployContract(deployer, "ERC777Mock");

        // create NFT and stake contract
        nftContract = await deployContract2(deployer, "HoprBoost", adminAddress, "");
        stakeContract = await deployContract4(deployer, "HoprStake", nftContract.address, adminAddress, erc677.address, erc777.address);
        // airdrop some NFTs to participants
        await nftContract.connect(admin).batchMint(participantAddresses.slice(0, 2), BADGES[0].type, BADGES[0].rank, BADGES[0].nominator, BADGES[0].deadline);
        await nftContract.connect(admin).mint(participantAddresses[0], BADGES[1].type, BADGES[1].rank, BADGES[1].nominator, BADGES[1].deadline);
        // airdrop some ERC677 to participants
        await erc677.batchMintInternal(participantAddresses, utils.parseUnits('10000', 'ether')); // each participant holds 10k xHOPR
        await erc777.mintInternal(adminAddress, utils.parseUnits('5000000', 'ether'), '0x', '0x'); // admin account holds 5 million wxHOPR

        // -----logs
        console.table([
            ["Deployer", deployerAddress],
            ["Admin", adminAddress],
            ["NFT Contract", nftContract.address],
            ["Stake Contract", stakeContract.address],
            ["participant", JSON.stringify(participantAddresses)],
        ]);
    }

    describe('integration tests', function () {
        before(async function () {
            await reset();
        })

        it('implements ERC777 tokensReceived hook', async function () {
            const interfaceHash = utils.keccak256(utils.toUtf8Bytes('ERC777TokensRecipient'));
            const implementer = await erc1820.getInterfaceImplementer(stakeContract.address, interfaceHash)
            expect(interfaceHash).to.equal("0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b");
            expect(implementer).to.equal(stakeContract.address);
        })

        it('participants have received ERC721', async function () {
            expect((await nftContract.tokenOfOwnerByIndex(participantAddresses[0], 0)).toString()).to.equal(constants.Zero.toString());
        });

        describe('LOCK_TOKEN and other ERC677 token', () => {
                let randomERC677;
                let tx;
                
                it('cannot receive random 677 with `transferAndCall()`', async () => {
                    randomERC677 = await deployContract(deployer, "ERC677Mock");
                    await randomERC677.batchMintInternal(participantAddresses, utils.parseUnits('10000', 'ether')); // each participant holds 10k randomERC677
                    // Revert message was bubbled up, showing only the one from ERC677Mock
                    expectRevert(randomERC677.connect(participants[2]).transferAndCall(stakeContract.address, constants.One, '0x'), 'ERC677Mock: failed when calling onTokenTransfer');
                }); 

                it('can receive LOCK_TOKEN with `transferAndCall()`', async () => {
                    expect((await erc677.balanceOf(participantAddresses[0])).toString()).to.equal(utils.parseUnits('10000', 'ether').toString());
                    tx = await erc677.connect(participants[0]).transferAndCall(stakeContract.address, constants.One, '0x'); // stake LOCK_TOKEN
                    expect((await erc677.balanceOf(participantAddresses[0])).toString()).to.equal(utils.parseUnits('10000', 'ether').sub(constants.One).toString());
                });

                it('updates accounts value', async () => {
                    const currentAccount = await stakeContract.accounts(participantAddresses[0]);
                    expect(currentAccount[0].toString()).to.equal('1'); // actualLockedTokenAmount
                    expect(currentAccount[1].toString()).to.equal('0'); // virtualLockedTokenAmount
                    // skip checking lastSyncTimestamp
                    expect(currentAccount[3].toString()).to.equal('0'); // cumulatedRewards
                    expect(currentAccount[4].toString()).to.equal('0'); // claimedRewards
                });

                it('emits Staked event', async function () {
                    const receipt = await ethers.provider.waitForTransaction(tx.hash);
                    const from = await getParamFromTxResponse(
                        receipt, stakeContract.interface.getEvent("Staked").format(), 1, stakeContract.address.toLowerCase(), "Stake LOCK_TOKEN"
                    );
                    const actualAmount = await getParamFromTxResponse(
                        receipt, stakeContract.interface.getEvent("Staked").format(), 2, stakeContract.address.toLowerCase(), "Stake LOCK_TOKEN"
                    );
                    const virtualAmount = await getParamFromTxResponse(
                        receipt, stakeContract.interface.getEvent("Staked").format(), 3, stakeContract.address.toLowerCase(), "Stake LOCK_TOKEN"
                    );
    
                    expect(from.toString().slice(-40).toLowerCase()).to.equal(participantAddresses[0].slice(2).toLowerCase()); // compare bytes32 like address
                    expect(BigNumber.from(actualAmount).toString()).to.equal(constants.One.toString());
                    expect(BigNumber.from(virtualAmount).toString()).to.equal(constants.Zero.toString()); 
                });
        });

        describe('REWARD_TOKEN and other ERC777 token', () => {
                let randomERC777;
                let tx;
                
                it('cannot receive random 777 with `send()`', async () => {
                    randomERC777 = await deployContract(deployer, "ERC777Mock");
                    await randomERC777.mintInternal(participantAddresses[2], utils.parseUnits('5000000', 'ether'), '0x', '0x'); // admin account holds 5 million random erc777
                    expectRevert(randomERC777.connect(participants[2]).send(stakeContract.address, constants.One, '0x'), "HoprStake: Sender must be wxHOPR token");
                });

                it('cannot receive REWARD_TOKEN from a random account', async () => {
                    await erc777.mintInternal(participantAddresses[2], constants.One, '0x', '0x'); // admin account holds 1 random REWARD_TOKEN
                    expectRevert(erc777.connect(participants[2]).send(stakeContract.address, constants.One, '0x'),  "HoprStake: Only accept owner to provide rewards");
                }); 

                it('can receive REWARD_TOKEN with `send()`', async () => {
                    expect((await erc777.balanceOf(adminAddress)).toString()).to.equal(utils.parseUnits('5000000', 'ether').toString());
                    tx = await erc777.connect(admin).send(stakeContract.address, utils.parseUnits('5000000', 'ether'), '0x'); // propide 5 million REWARD_TOKEN
                    expect((await erc777.balanceOf(adminAddress)).toString()).to.equal(constants.Zero.toString());
                });

                it('emits RewardFueled event', async function () {
                    const receipt = await ethers.provider.waitForTransaction(tx.hash);
                    const amount = await getParamFromTxResponse(
                        receipt, stakeContract.interface.getEvent("RewardFueled").format(), 1, stakeContract.address.toLowerCase(), "Fuel REWARD_TOKEN"
                    );
    
                    expect(BigNumber.from(amount).toString()).to.equal(utils.parseUnits('5000000', 'ether'));
                });
        });
        
        describe('nftBoost and other ERC721 tokens', function () {
            let randomERC721;
            it ('cannot receive an boost-like random ERC721 token', async () => {
                randomERC721 = await deployContract2(deployer, "HoprBoost", adminAddress, "");
                await randomERC721.connect(admin).mint(participantAddresses[0], BADGES[1].type, BADGES[1].rank, BADGES[1].nominator, BADGES[1].deadline);
                expectRevert(randomERC721.connect(participants[0]).functions["safeTransferFrom(address,address,uint256)"](participantAddresses[0], stakeContract.address, 0), "HoprStake: Cannot SafeTransferFrom tokens other than HoprBoost.");
            });
            it ('cannot redeem a boost when the deadline has passed', async () => {
                // create the 3th NFT.
                await nftContract.connect(admin).mint(participantAddresses[2], BADGES[2].type, BADGES[2].rank, BADGES[2].nominator, BADGES[2].deadline);
                expectRevert(nftContract.connect(participants[2]).functions["safeTransferFrom(address,address,uint256)"](participantAddresses[2], stakeContract.address, 3), "HoprStake: Cannot redeem an expired boost.");
            });
        });

        describe('Before program starts', function () {
            let tx;
            it('checks current block', async function () {
                const block = await latestBlock();
                console.log(`currentBlock is ${block}, ${BigNumber.from(block).lte(BADGES[0].deadline)}`)
            })

            it('can redeem HODLr token', async function () {
                tx = await nftContract.connect(participants[0]).functions["safeTransferFrom(address,address,uint256)"](participantAddresses[0], stakeContract.address, 0);
            });

            it('emits SetCreated event', async function () {
                const receipt = await ethers.provider.waitForTransaction(tx.hash);
                const from = await getParamFromTxResponse(
                    receipt, stakeContract.interface.getEvent("Redeemed").format(), 1, stakeContract.address.toLowerCase(), "Redeem the token"
                );
                const tokenId = await getParamFromTxResponse(
                    receipt, stakeContract.interface.getEvent("Redeemed").format(), 2, stakeContract.address.toLowerCase(), "Redeem the token"
                );
                const isReplaced = await getParamFromTxResponse(
                    receipt, stakeContract.interface.getEvent("Redeemed").format(), 3, stakeContract.address.toLowerCase(), "Redeem the token"
                );

                expect(from.toString().slice(-40).toLowerCase()).to.equal(participantAddresses[0].slice(2).toLowerCase()); // compare bytes32 like address
                expect(BigNumber.from(tokenId).toString()).to.equal(constants.Zero.toString());
                expect(BigNumber.from(isReplaced).toString()).to.equal(constants.Zero.toString());  // true
            });
        });
        describe('At BASIC_START', function () {
            it('advance block to BASIC_START', async function () {
                const [lastBlockTime, lastBlockNumber] = await latestBlockTime();
                console.log(`lastBlock ${lastBlockNumber} is at time ${lastBlockTime}.`)
                await advanceTimeForNextBlock(BASIC_START);
                const [blockTime, blockNumber] = await latestBlockTime();
                console.log(`currentBlock ${blockNumber} is at time ${blockTime}.`)
            });
            it('gets the cumulated rewards after BASIC_START', async function () {
                const reward = await stakeContract.getCumulatedRewardsIncrement(participantAddresses[0]);
                const [blockTime, blockNumber] = await latestBlockTime();
                console.log(`Reward is ${reward.toString()}. currentBlock ${blockNumber} is at time ${blockTime}.`)
            });
            // 1626517819.
            // 1627387200
            // 1626517783153.
        });
    });
});
