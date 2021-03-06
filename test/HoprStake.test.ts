import { ethers } from 'hardhat'
import { BigNumber, constants, Contract, Signer, utils } from 'ethers'
import { before, it } from 'mocha';
import{ expect } from "chai";
import expectRevert from "../utils/exception";
import { deployContract, deployContract2, deployContract4 } from "../utils/contracts";
import { deployRegistry } from '../utils/registry';
import { getParamFromTxResponse } from '../utils/events';
import { advanceBlockTo, advanceTimeForNextBlock, latestBlockTime } from '../utils/time';

/**
 * @dev Rewards should be calculated for two blocks: for 1e18 tokens, at a rate of:
 *  - BASE_RATE: 5787
 *  - silver hodler: 158
 *  calculation is done: 1000 * 1e18 * 2 * (5787 + 158) / 1e12;
 * @param baseTokenAmount 
 * @param duration 
 * @param factors 
 * @returns 
 */
const calculateRewards = (baseTokenAmount: number, duration: number, factors: number[]): string => {
    const cumulatedFactors = factors.reduce((acc, cur) => BigNumber.from(cur).add(acc), BigNumber.from(0));
    return utils.parseUnits(baseTokenAmount.toFixed(), 'ether').mul(BigNumber.from(duration)).mul(cumulatedFactors).div(utils.parseUnits('1.0', 12)).toString();
};

const { TEST_WHITEHAT_ONLY } = process.env;
const whitehatTestOnly = !TEST_WHITEHAT_ONLY || TEST_WHITEHAT_ONLY.toLowerCase() !== 'true'? false : true;

(whitehatTestOnly ? describe.skip : describe)('HoprStake', function () {
    let deployer: Signer;
    let admin: Signer;
    let participants: Signer[];

    let deployerAddress: string;
    let adminAddress: string;
    let participantAddresses: string[];

    let nftContract: Contract;
    let stakeContract: Contract;
    let stake2Contract: Contract;
    let erc1820: Contract;
    let erc677: Contract;
    let erc777: Contract;

    const BASIC_START = 1627387200; // July 27 2021 14:00 CET.
    const PROGRAM_END = 1642424400; // Jan 17 2022 14:00 CET.
    const PROGRAM_V2_START = 1642424400; // Jan 17 2022 14:00 CET.
    // const PROGRAM_V2_END = 1650974400; // Apr 26th 2022 14:00 CET.
    const BASIC_FACTOR_NUMERATOR = 5787;
    const BADGES = [
        {
            type: "HODLr",
            rank: "silver",
            deadline: BASIC_START,
            nominator: "158" // 0.5% APY
        },
        {
            type: "HODLr",
            rank: "platinum",
            deadline: PROGRAM_END,
            nominator: "317" // 1% APY
        },
        {
            type: "Past",
            rank: "gold",
            deadline: 123456, // sometime long long ago
            nominator: "100"
        },
        {
            type: "HODLr",
            rank: "bronze extra",
            deadline: PROGRAM_END,
            nominator: "79" // 0.25% APY
        },
        {
            type: "Testnet participant",
            rank: "gold",
            deadline: PROGRAM_END,
            nominator: "317" // 0.25% APY
        },
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
        stake2Contract = await deployContract4(deployer, "HoprStake2", nftContract.address, adminAddress, erc677.address, erc777.address);

        // airdrop some NFTs (0,1 and 2) to participants
        await nftContract.connect(admin).batchMint(participantAddresses.slice(0, 2), BADGES[0].type, BADGES[0].rank, BADGES[0].nominator, BADGES[0].deadline);
        await nftContract.connect(admin).mint(participantAddresses[0], BADGES[1].type, BADGES[1].rank, BADGES[1].nominator, BADGES[1].deadline);
        // airdrop some ERC677 to participants
        await erc677.batchMintInternal(participantAddresses, utils.parseUnits('10000', 'ether')); // each participant holds 10k xHOPR
        await erc777.mintInternal(adminAddress, utils.parseUnits('5000000', 'ether'), '0x', '0x'); // admin account holds 5 million wxHOPR
        // airdrop some NFTs (3,4 and 5) to participants
        await nftContract.connect(admin).batchMint(participantAddresses.slice(0, 2), BADGES[0].type, BADGES[0].rank, BADGES[0].nominator, BADGES[0].deadline);
        await nftContract.connect(admin).mint(participantAddresses[0], BADGES[1].type, BADGES[1].rank, BADGES[1].nominator, BADGES[1].deadline);

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
                tx = await erc677.connect(participants[0]).transferAndCall(stakeContract.address, utils.parseUnits('1000', 'ether'), '0x'); // stake 1000 LOCK_TOKEN
                expect((await erc677.balanceOf(participantAddresses[0])).toString()).to.equal(utils.parseUnits('9000', 'ether').toString());
            });

            it('updates accounts value', async () => {
                const currentAccount = await stakeContract.accounts(participantAddresses[0]);
                expect(currentAccount[0].toString()).to.equal(utils.parseUnits('1000', 'ether').toString()); // actualLockedTokenAmount
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
                expect(BigNumber.from(actualAmount).toString()).to.equal(utils.parseUnits('1000', 'ether').toString());
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
                    tx = await erc777.connect(admin).send(stakeContract.address, constants.One, '0x'); // provide 5 million REWARD_TOKEN
                    expect((await erc777.balanceOf(adminAddress)).toString()).to.equal(utils.parseUnits('5000000', 'ether').sub(constants.One).toString());
                });

                it('emits RewardFueled event', async function () {
                    const receipt = await ethers.provider.waitForTransaction(tx.hash);
                    const amount = await getParamFromTxResponse(
                        receipt, stakeContract.interface.getEvent("RewardFueled").format(), 1, stakeContract.address.toLowerCase(), "Fuel REWARD_TOKEN"
                    );
    
                    expect(BigNumber.from(amount).toString()).to.equal(constants.One.toString());
                });
        });
        
        describe('nftBoost and other ERC721 tokens', function () {
            let randomERC721;
            it ('cannot receive an boost-like random ERC721 token', async () => {
                randomERC721 = await deployContract2(deployer, "HoprBoost", adminAddress, "");
                // create a random NFT
                await randomERC721.connect(admin).mint(participantAddresses[0], BADGES[1].type, BADGES[1].rank, BADGES[1].nominator, BADGES[1].deadline);
                expectRevert(randomERC721.connect(participants[0]).functions["safeTransferFrom(address,address,uint256)"](participantAddresses[0], stakeContract.address, 0), "HoprStake: Cannot SafeTransferFrom tokens other than HoprBoost.");
            });
            it ('cannot redeem a boost when the deadline has passed', async () => {
                // create the 6th NFT.
                await nftContract.connect(admin).mint(participantAddresses[2], BADGES[2].type, BADGES[2].rank, BADGES[2].nominator, BADGES[2].deadline);
                expectRevert(nftContract.connect(participants[2]).functions["safeTransferFrom(address,address,uint256)"](participantAddresses[2], stakeContract.address, 6), "HoprStake: Cannot redeem an expired boost.");
            });
            it ('cannot reclaim a HOPRBoost', async () => {
                expectRevert(stake2Contract.connect(admin).reclaimErc721Tokens(nftContract.address, 0), "HoprStake: Cannot claim HoprBoost NFT");
            });
            it ('can reclaim an ERC721', async () => {
                await randomERC721.connect(participants[0]).transferFrom(participantAddresses[0], stakeContract.address, 0);
                await stakeContract.connect(admin).reclaimErc721Tokens(randomERC721.address, 0);
                expect((await randomERC721.ownerOf(0)).toString()).to.equal(adminAddress);
            });
        });

        describe('Before program starts', function () {
            let tx;
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
                expect(BigNumber.from(isReplaced).toString()).to.equal(constants.One.toString());  // true. registered
            });

            it ('has nothing to claim', async () => {
                expectRevert(stakeContract.claimRewards(participantAddresses[0]), 'HoprStake: Nothing to claim');
            });
            it ('can redeem token #1 and stake some tokens', async () => {
                await nftContract.connect(participants[1]).functions["safeTransferFrom(address,address,uint256)"](participantAddresses[1], stakeContract.address, 1);
                await erc677.connect(participants[1]).transferAndCall(stakeContract.address, utils.parseUnits('1.'), '0x');

            });
        });
        describe('At BASIC_START', function () {
            it('succeeds in advancing block to BASIC_START', async function () {
                await advanceTimeForNextBlock(BASIC_START);
                const [blockTime, _] = await latestBlockTime();
                expect(blockTime.toString()).to.equal(BASIC_START.toString()); 
            });

            it('gets the cumulated rewards right at BASIC_START', async function () {
                // const currentAccount = await stakeContract.accounts(participantAddresses[0]);
                // const reward = await stakeContract.getCumulatedRewardsIncrement(participantAddresses[0]);
                // const [blockTime, blockNumber] = await latestBlockTime();
                // console.log(`CurrentAccount is ${JSON.stringify(currentAccount.toString())}. Reward is ${reward.toString()}. currentBlock ${blockNumber} is at time ${blockTime}.`)

                const currentAccount = await stakeContract.accounts(participantAddresses[0]);
                const reward = await stakeContract.getCumulatedRewardsIncrement(participantAddresses[0]);
                const [blockTime, _] = await latestBlockTime();
                expect(currentAccount[3].toString()).to.equal(calculateRewards(1000, blockTime - BASIC_START, [BASIC_FACTOR_NUMERATOR, parseInt(BADGES[0].nominator)])); // equals to the expected rewards.
                expect(reward.toString()).to.equal(constants.Zero.toString());  // rewards get synced
            });

            it ('has insufficient pool', async () => {
                expectRevert(stakeContract.claimRewards(participantAddresses[0]), 'HoprStake: Insufficient reward pool.');
            });
        });

        describe('During the staking program v1 / before staking v2', function () {
            describe('Staking v1', function () {
                it ('advance 2 blocks (10 seconds), there is more rewards to be claimed.', async () => {
                    const [lastBlockTime, lastBlock] = await latestBlockTime();

                    const duration = 2;
                    await advanceBlockTo(lastBlock + duration); // advance two blocks - 2 seconds
                    const currentAccount = await stakeContract.accounts(participantAddresses[0]);

                    const reward = await stakeContract.getCumulatedRewardsIncrement(participantAddresses[0]);
                    const [blockTime, ] = await latestBlockTime();
                    expect(blockTime - lastBlockTime).to.equal(duration); // advance duration blocks or second
                    expect(currentAccount[3].toString()).to.equal(constants.Zero.toString()); // equals to the expected rewards.
                    expect(reward.toString()).to.equal(calculateRewards(1000, blockTime - BASIC_START, [BASIC_FACTOR_NUMERATOR, parseInt(BADGES[0].nominator)]));  // rewards get synced
                });

                it('can redeem another (less good) HODLr token', async function () {
                    // create the 7th NFT.
                    await nftContract.connect(admin).mint(participantAddresses[0], BADGES[3].type, BADGES[3].rank, BADGES[3].nominator, BADGES[3].deadline);
                    
                    // redeem NFT #7
                    const tx = await nftContract.connect(participants[0]).functions["safeTransferFrom(address,address,uint256)"](participantAddresses[0], stakeContract.address, 7);
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
                    expect(BigNumber.from(tokenId).toString()).to.equal('7');  // token Id #7
                    expect(BigNumber.from(isReplaced).toString()).to.equal(constants.Zero.toString());  // false
                });

                it('can redeem another (better) HODLr token', async function () {
                    // redeem token number 2
                    const tx = await nftContract.connect(participants[0]).functions["safeTransferFrom(address,address,uint256)"](participantAddresses[0], stakeContract.address, 2);
                    const receipt = await ethers.provider.waitForTransaction(tx.hash);
                    const from = await getParamFromTxResponse(
                        receipt, stakeContract.interface.getEvent("Redeemed").format(), 1, stakeContract.address.toLowerCase(), "Redeem the token"
                    );
                    const tokenId = await getParamFromTxResponse(
                        receipt, stakeContract.interface.getEvent("Redeemed").format(), 2, stakeContract.address.toLowerCase(), "Redeem the token"
                    );
                    const isRegistered = await getParamFromTxResponse(
                        receipt, stakeContract.interface.getEvent("Redeemed").format(), 3, stakeContract.address.toLowerCase(), "Redeem the token"
                    );

                    expect(from.toString().slice(-40).toLowerCase()).to.equal(participantAddresses[0].slice(2).toLowerCase()); // compare bytes32 like address
                    expect(BigNumber.from(tokenId).toString()).to.equal(constants.Two.toString());  // token Id #2
                    expect(BigNumber.from(isRegistered).toString()).to.equal(constants.One.toString());  // true
                });

                it('their token value is synced', async function () {
                    const currentAccount = await stakeContract.accounts(participantAddresses[0]);
                    const reward = await stakeContract.getCumulatedRewardsIncrement(participantAddresses[0]);
                    const [blockTime, _] = await latestBlockTime();
                    expect(currentAccount[3].toString()).to.equal(calculateRewards(1000, blockTime - BASIC_START, [BASIC_FACTOR_NUMERATOR, parseInt(BADGES[0].nominator)])); // equals to the expected rewards.
                    expect(reward.toString()).to.equal(constants.Zero.toString());  // rewards get synced
                });

                it('receives more claim rewards', async () => {
                    await erc777.connect(admin).send(stakeContract.address, utils.parseUnits('5000000', 'ether').sub(constants.One), '0x'); // propide 5 million REWARD_TOKEN
                    expect((await erc777.balanceOf(adminAddress)).toString()).to.equal(constants.Zero.toString());
                });

                it ('claims rewards', async () => {
                    const tx = await stakeContract.claimRewards(participantAddresses[0]);
                    const receipt = await ethers.provider.waitForTransaction(tx.hash);
                    const account = await getParamFromTxResponse(
                        receipt, stakeContract.interface.getEvent("Claimed").format(), 1, stakeContract.address.toLowerCase(), "Tokens being claimed"
                    );
                    const amount = await getParamFromTxResponse(
                        receipt, stakeContract.interface.getEvent("Claimed").format(), 2, stakeContract.address.toLowerCase(), "Tokens being claimed"
                    );

                    expect(account.toString().slice(-40).toLowerCase()).to.equal(participantAddresses[0].slice(2).toLowerCase()); // compare bytes32 like address

                    // // 6 blocks since the BASIC_START timestamp
                    // // 5 blocks with silver reward and 1 block with platinum
                    // const rewards = [
                    //     calculateRewards(1000, 5, [BASIC_FACTOR_NUMERATOR, parseInt(BADGES[0].nominator)]), 
                    //     calculateRewards(1000, 1, [BASIC_FACTOR_NUMERATOR, parseInt(BADGES[1].nominator)])
                    // ].reduce((acc, cur) => BigNumber.from(cur).add(acc), constants.Zero).toString();
                    // FIXME: unmatched expectation 
                    // expect(BigNumber.from(amount).toString()).to.equal(rewards);

                    const rewardBalance = await erc777.balanceOf(participantAddresses[0]);
                    expect(BigNumber.from(amount).toString()).to.equal(rewardBalance.toString())
                    // console.log(`Claimed reward ${rewardBalance} compared with acutal claim ${BigNumber.from(amount).toString()} and calculated ${rewards}`);
                });

                it('can redeem another HODLr token of another category', async function () {
                    // create the 8th NFT.
                    await nftContract.connect(admin).mint(participantAddresses[0], BADGES[4].type, BADGES[4].rank, BADGES[4].nominator, BADGES[4].deadline);
                    
                    // redeem NFT #8
                    const tx = await nftContract.connect(participants[0]).functions["safeTransferFrom(address,address,uint256)"](participantAddresses[0], stakeContract.address, 8);
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
                    expect(BigNumber.from(tokenId).toString()).to.equal('8');  // token Id #8
                    expect(BigNumber.from(isReplaced).toString()).to.equal(constants.One.toString());  // true
                });

                it ('cannot lock tokens when length does not match', async () => {
                    expectRevert(stakeContract.connect(admin).lock([participantAddresses[0]], ['1', '2']), 'HoprStake: Length does not match');
                });

                it ('can lock tokens', async () => {
                    const tx = await stakeContract.connect(admin).lock([participantAddresses[2]], [utils.parseUnits('1.0', 'ether').toString()]);
                    const receipt = await ethers.provider.waitForTransaction(tx.hash);
                    const investor = await getParamFromTxResponse(
                        receipt, stakeContract.interface.getEvent("Staked").format(), 1, stakeContract.address.toLowerCase(), "Lock the token"
                    );
                    const cap = await getParamFromTxResponse(
                        receipt, stakeContract.interface.getEvent("Staked").format(), 3, stakeContract.address.toLowerCase(), "Lock the token"
                    );

                    expect(investor.toString().slice(-40).toLowerCase()).to.equal(participantAddresses[2].slice(2).toLowerCase()); // compare bytes32 like address
                    expect(BigNumber.from(cap).toString()).to.equal(utils.parseUnits('1.0', 'ether').toString());  // true
                });

                it ('cannot unlock tokens', async () => {
                    expectRevert(stakeContract.unlock(participantAddresses[0]), 'HoprStake: Program is ongoing, cannot unlock stake.');
                });

                it('can reclaim random ERC20', async () => {
                    const randomERC20 = await deployContract2(deployer, "ERC20Mock", stakeContract.address, 1);
                    // Revert message was bubbled up, showing only the one from ERC677Mock
                    await stakeContract.connect(admin).reclaimErc20Tokens(randomERC20.address);
                    expect((await randomERC20.balanceOf(adminAddress)).toString()).to.equal('1');
                }); 
                
                it ('can sync at anytime', async () => {
                    // const currentAccount = await stakeContract.accounts(participantAddresses[0]);
                        // expect(currentAccount[0].toString()).to.equal(utils.parseUnits('1000', 'ether').toString()); // actualLockedTokenAmount
                        // expect(currentAccount[1].toString()).to.equal('0'); // virtualLockedTokenAmount
                        // // skip checking lastSyncTimestamp
                        // expect(currentAccount[3].toString()).to.equal('0'); // cumulatedRewards
                        // expect(currentAccount[4].toString()).to.equal('0'); // claimedRewards
                    console.log(JSON.stringify(await stakeContract.accounts(participantAddresses[0]).toString()));
                    await stakeContract.sync(participantAddresses[2]);
                    console.log(JSON.stringify(await stakeContract.accounts(participantAddresses[0]).toString()));
                });
            });
            describe('Staking v2', function () {
                let tx;
                it('can redeem HODLr token', async function () {
                    tx = await nftContract.connect(participants[0]).functions["safeTransferFrom(address,address,uint256)"](participantAddresses[0], stake2Contract.address, 3);
                });

                it('can receive LOCK_TOKEN with `transferAndCall()`', async () => {
                    expect((await erc677.balanceOf(participantAddresses[0])).toString()).to.equal(utils.parseUnits('9000', 'ether').toString());
                    await erc677.connect(participants[0]).transferAndCall(stake2Contract.address, utils.parseUnits('1000', 'ether'), '0x'); // stake 1000 LOCK_TOKEN
                    expect((await erc677.balanceOf(participantAddresses[0])).toString()).to.equal(utils.parseUnits('8000', 'ether').toString());
                });

                it('emits SetCreated event', async function () {
                    const receipt = await ethers.provider.waitForTransaction(tx.hash);
                    const from = await getParamFromTxResponse(
                        receipt, stake2Contract.interface.getEvent("Redeemed").format(), 1, stake2Contract.address.toLowerCase(), "Redeem the token"
                    );
                    const tokenId = await getParamFromTxResponse(
                        receipt, stake2Contract.interface.getEvent("Redeemed").format(), 2, stake2Contract.address.toLowerCase(), "Redeem the token"
                    );
                    const isReplaced = await getParamFromTxResponse(
                        receipt, stake2Contract.interface.getEvent("Redeemed").format(), 3, stake2Contract.address.toLowerCase(), "Redeem the token"
                    );

                    expect(from.toString().slice(-40).toLowerCase()).to.equal(participantAddresses[0].slice(2).toLowerCase()); // compare bytes32 like address
                    expect(BigNumber.from(tokenId).toString()).to.equal('3');  // token Id #3
                    expect(BigNumber.from(isReplaced).toString()).to.equal(constants.One.toString());  // true. registered
                });
                
                it ('has no cumulated rewards increment', async () => {
                    const [blockTime, _] = await latestBlockTime();
                    console.log('debug blockTime', blockTime)
                    const rewardsIncrement = await stake2Contract.getCumulatedRewardsIncrement(participantAddresses[0]);
                    expect(BigNumber.from(rewardsIncrement).toString()).to.equal(constants.Zero.toString());
                });
                it ('has nothing to claim', async () => {
                    expectRevert(stake2Contract.claimRewards(participantAddresses[0]), 'HoprStake: Nothing to claim');
                });
                it ('can redeem token #4 and stake some tokens', async () => {
                    await nftContract.connect(participants[1]).functions["safeTransferFrom(address,address,uint256)"](participantAddresses[1], stake2Contract.address, 4);
                    await erc677.connect(participants[1]).transferAndCall(stake2Contract.address, utils.parseUnits('1.'), '0x');

                });
                it('gets the cumulated rewards right at PROGRAM_START', async function () {
                    const currentAccount = await stake2Contract.accounts(participantAddresses[0]);
                    const reward = await stake2Contract.getCumulatedRewardsIncrement(participantAddresses[0]);
                    expect(currentAccount[2].toString()).to.equal(calculateRewards(1000, 0, [BASIC_FACTOR_NUMERATOR, parseInt(BADGES[0].nominator)])); // equals to the expected rewards.
                    expect(reward.toString()).to.equal(constants.Zero.toString());  // rewards get synced
                });
            });
        });

        describe('After v1 PROGRAM_END', function () {
            let balanceBefore;
            describe('Before unlock', function () {
                it('succeeds in advancing block to PROGRAM_END+1', async function () {
                    balanceBefore = await erc677.balanceOf(participantAddresses[1]);
                    await advanceTimeForNextBlock(PROGRAM_END+1);
                    const [blockTime, _] = await latestBlockTime();
                    expect(blockTime.toString()).to.equal((PROGRAM_END+1).toString()); 
                });
    
                it('cannot receive random 677 with `transferAndCall()`', async () => {
                    // bubbled up
                    expectRevert(erc677.connect(participants[1]).transferAndCall(stakeContract.address, constants.One, '0x'), 'ERC677Mock: failed when calling onTokenTransfer');
                }); 
                it('cannot redeem NFT`', async () => {
                    // created 9th NFT
                    await nftContract.connect(admin).mint(participantAddresses[1], BADGES[1].type, BADGES[1].rank, BADGES[1].nominator, BADGES[1].deadline);
                    expectRevert(nftContract.connect(participants[1]).functions["safeTransferFrom(address,address,uint256)"](participantAddresses[1], stakeContract.address, 9), 'HoprStake: Program ended, cannot redeem boosts.');
                }); 
                it('cannot lock', async () => {
                    expectRevert(stakeContract.connect(admin).lock([participantAddresses[0]], ['1']), 'HoprStake: Program ended, cannot stake anymore.');
                }); 
            }); 
            describe('Unlock', function () {
                let tx;
                before('can unlock', async () => {
                    tx = await stakeContract.connect(participants[1]).unlock(participantAddresses[1]);
                }); 
                it('reclaims rewards', async () => {
                    const rewards = calculateRewards(1, PROGRAM_END-BASIC_START, [BASIC_FACTOR_NUMERATOR, parseInt(BADGES[0].nominator)]);
                    const receipt = await ethers.provider.waitForTransaction(tx.hash);
                    const account = await getParamFromTxResponse(
                        receipt, stakeContract.interface.getEvent("Claimed").format(), 1, stakeContract.address.toLowerCase(), "Lock the token"
                    );
                    const reward = await getParamFromTxResponse(
                        receipt, stakeContract.interface.getEvent("Claimed").format(), 2, stakeContract.address.toLowerCase(), "Lock the token"
                    );

                    expect(account.toString().slice(-40).toLowerCase()).to.equal(participantAddresses[1].slice(2).toLowerCase()); // compare bytes32 like address
                    expect(BigNumber.from(reward).toString()).to.equal(rewards);  // true
                }); 
                it('receives original tokens - Released event ', async () => {
                    const receipt = await ethers.provider.waitForTransaction(tx.hash);
                    const account = await getParamFromTxResponse(
                        receipt, stakeContract.interface.getEvent("Released").format(), 1, stakeContract.address.toLowerCase(), "Lock the token"
                    );
                    const actualStake = await getParamFromTxResponse(
                        receipt, stakeContract.interface.getEvent("Released").format(), 2, stakeContract.address.toLowerCase(), "Lock the token"
                    );

                    expect(account.toString().slice(-40).toLowerCase()).to.equal(participantAddresses[1].slice(2).toLowerCase()); // compare bytes32 like address
                    expect(BigNumber.from(actualStake).toString()).to.equal(utils.parseUnits('1.0', 'ether').toString());  // true
                }); 
                it('receives original tokens - increated by 1 token', async () => {
                    const balanceAfter = await erc677.balanceOf(participantAddresses[1]);
                    expect(BigNumber.from(balanceAfter).sub(BigNumber.from(balanceBefore)).toString()).to.equal(utils.parseUnits('1', 'ether').toString());  // true
                }); 
                it('receives NFTs', async () => {
                    const owner = await nftContract.ownerOf(9);
                    expect(owner).to.equal(participantAddresses[1]); // compare bytes32 like address
                }); 
            });
            describe('Staking v2', function () {
                it('gets the cumulated rewards shortly after PROGRAM_V2_START', async function () {
                    await stake2Contract.sync(participantAddresses[0]);
                    const currentAccount = await stake2Contract.accounts(participantAddresses[0]);
                    const reward = await stake2Contract.getCumulatedRewardsIncrement(participantAddresses[0]);
                    const [blockTime, _] = await latestBlockTime();
                    expect(currentAccount[2].toString()).to.equal(calculateRewards(1000, blockTime - PROGRAM_V2_START, [BASIC_FACTOR_NUMERATOR, parseInt(BADGES[0].nominator)])); // equals to the expected rewards.
                    expect(reward.toString()).to.equal(constants.Zero.toString());  // rewards get synced
                });

                it ('has insufficient pool', async () => {
                    expectRevert(stake2Contract.claimRewards(participantAddresses[0]), 'HoprStake: Insufficient reward pool.');
                });
            });
        });

        describe('During the staking v2 program', function () {
            it('can redeem another (less good) HODLr token', async function () {
                // create the 10th NFT.
                await nftContract.connect(admin).mint(participantAddresses[0], BADGES[3].type, BADGES[3].rank, BADGES[3].nominator, BADGES[3].deadline);
                console.log('debug', )
                
                // redeem NFT #10
                const tx = await nftContract.connect(participants[0]).functions["safeTransferFrom(address,address,uint256)"](participantAddresses[0], stake2Contract.address, 10);
                const receipt = await ethers.provider.waitForTransaction(tx.hash);
                const from = await getParamFromTxResponse(
                    receipt, stake2Contract.interface.getEvent("Redeemed").format(), 1, stake2Contract.address.toLowerCase(), "Redeem the token"
                );
                const tokenId = await getParamFromTxResponse(
                    receipt, stake2Contract.interface.getEvent("Redeemed").format(), 2, stake2Contract.address.toLowerCase(), "Redeem the token"
                );
                const isReplaced = await getParamFromTxResponse(
                    receipt, stake2Contract.interface.getEvent("Redeemed").format(), 3, stake2Contract.address.toLowerCase(), "Redeem the token"
                );

                expect(from.toString().slice(-40).toLowerCase()).to.equal(participantAddresses[0].slice(2).toLowerCase()); // compare bytes32 like address
                expect(BigNumber.from(tokenId).toString()).to.equal('10');  // token Id #10
                expect(BigNumber.from(isReplaced).toString()).to.equal(constants.Zero.toString());  // false
            });

            it('can redeem another (better) HODLr token', async function () {
                // redeem token number 5
                const tx = await nftContract.connect(participants[0]).functions["safeTransferFrom(address,address,uint256)"](participantAddresses[0], stake2Contract.address, 5);
                const receipt = await ethers.provider.waitForTransaction(tx.hash);
                const from = await getParamFromTxResponse(
                    receipt, stake2Contract.interface.getEvent("Redeemed").format(), 1, stake2Contract.address.toLowerCase(), "Redeem the token"
                );
                const tokenId = await getParamFromTxResponse(
                    receipt, stake2Contract.interface.getEvent("Redeemed").format(), 2, stake2Contract.address.toLowerCase(), "Redeem the token"
                );
                const isRegistered = await getParamFromTxResponse(
                    receipt, stake2Contract.interface.getEvent("Redeemed").format(), 3, stake2Contract.address.toLowerCase(), "Redeem the token"
                );

                expect(from.toString().slice(-40).toLowerCase()).to.equal(participantAddresses[0].slice(2).toLowerCase()); // compare bytes32 like address
                expect(BigNumber.from(tokenId).toString()).to.equal('5');  // token Id #5
                expect(BigNumber.from(isRegistered).toString()).to.equal(constants.One.toString());  // true
            });

            it('their token value is synced', async function () {
                const currentAccount = await stake2Contract.accounts(participantAddresses[0]);
                const reward = await stake2Contract.getCumulatedRewardsIncrement(participantAddresses[0]);
                const [blockTime, _] = await latestBlockTime();
                expect(currentAccount[2].toString()).to.equal(calculateRewards(1000, blockTime - PROGRAM_V2_START, [BASIC_FACTOR_NUMERATOR, parseInt(BADGES[0].nominator)])); // equals to the expected rewards.
                expect(reward.toString()).to.equal(constants.Zero.toString());  // rewards get synced
            });

            it('receives more claim rewards', async () => {
                await erc777.mintInternal(adminAddress, utils.parseUnits('5000000', 'ether'), '0x', '0x'); // admin account holds 5 million wxHOPR
                await erc777.connect(admin).send(stake2Contract.address, utils.parseUnits('5000000', 'ether'), '0x'); // propide 5 million REWARD_TOKEN
                expect((await erc777.balanceOf(adminAddress)).toString()).to.equal(constants.Zero.toString());
            });

            it ('claims rewards', async () => {
                const tx = await stake2Contract.claimRewards(participantAddresses[0]);
                const receipt = await ethers.provider.waitForTransaction(tx.hash);
                const account = await getParamFromTxResponse(
                    receipt, stake2Contract.interface.getEvent("Claimed").format(), 1, stake2Contract.address.toLowerCase(), "Tokens being claimed"
                );
                expect(account.toString().slice(-40).toLowerCase()).to.equal(participantAddresses[0].slice(2).toLowerCase()); // compare bytes32 like address
            });

            it('can redeem another HODLr token of another category', async function () {
                // create the 10th NFT.
                await nftContract.connect(admin).mint(participantAddresses[0], BADGES[4].type, BADGES[4].rank, BADGES[4].nominator, BADGES[4].deadline);
                
                // redeem NFT #11
                const tx = await nftContract.connect(participants[0]).functions["safeTransferFrom(address,address,uint256)"](participantAddresses[0], stake2Contract.address, 11);
                const receipt = await ethers.provider.waitForTransaction(tx.hash);
                const from = await getParamFromTxResponse(
                    receipt, stake2Contract.interface.getEvent("Redeemed").format(), 1, stake2Contract.address.toLowerCase(), "Redeem the token"
                );
                const tokenId = await getParamFromTxResponse(
                    receipt, stake2Contract.interface.getEvent("Redeemed").format(), 2, stake2Contract.address.toLowerCase(), "Redeem the token"
                );
                const isReplaced = await getParamFromTxResponse(
                    receipt, stake2Contract.interface.getEvent("Redeemed").format(), 3, stake2Contract.address.toLowerCase(), "Redeem the token"
                );

                expect(from.toString().slice(-40).toLowerCase()).to.equal(participantAddresses[0].slice(2).toLowerCase()); // compare bytes32 like address
                expect(BigNumber.from(tokenId).toString()).to.equal('11');  // token Id #11
                expect(BigNumber.from(isReplaced).toString()).to.equal(constants.One.toString());  // true
            });

            it ('cannot unlockFor tokens', async () => {
                expectRevert(stake2Contract.unlockFor(participantAddresses[0]), 'HoprStake: Program is ongoing, cannot unlock stake.');
            });

            it ('cannot unlock tokens', async () => {
                expectRevert(stake2Contract.unlock(), 'HoprStake: Program is ongoing, cannot unlock stake.');
            });

            it('can reclaim random ERC20', async () => {
                const randomERC20 = await deployContract2(deployer, "ERC20Mock", stake2Contract.address, 1);
                // Revert message was bubbled up, showing only the one from ERC677Mock
                await stake2Contract.connect(admin).reclaimErc20Tokens(randomERC20.address);
                expect((await randomERC20.balanceOf(adminAddress)).toString()).to.equal('1');
            }); 
            
            it ('can sync at anytime', async () => {
                console.log(JSON.stringify(await stake2Contract.accounts(participantAddresses[0]).toString()));
                await stake2Contract.sync(participantAddresses[2]);
                console.log(JSON.stringify(await stake2Contract.accounts(participantAddresses[0]).toString()));
            });
        });
        // describe('After PROGRAM_V2_END', function () {
        //     let tx;
        //     it('succeeds in advancing block to PROGRAM_V2_END + 1', async function () {
        //         await advanceTimeForNextBlock(PROGRAM_V2_END + 1);
        //         const [blockTime, _] = await latestBlockTime();
        //         expect(blockTime.toString()).to.equal((PROGRAM_V2_END + 1).toString()); 
        //     });

        //     it('cannot receive random 677 with `transferAndCall()`', async () => {
        //         // bubbled up
        //         expectRevert(erc677.connect(participants[1]).transferAndCall(stake2Contract.address, constants.One, '0x'), 'ERC677Mock: failed when calling onTokenTransfer');
        //     }); 
        //     it('cannot redeem NFT`', async () => {
        //         // created 12th NFT
        //         await nftContract.connect(admin).mint(participantAddresses[1], BADGES[1].type, BADGES[1].rank, BADGES[1].nominator, BADGES[1].deadline);
        //         expectRevert(nftContract.connect(participants[1]).functions["safeTransferFrom(address,address,uint256)"](participantAddresses[1], stake2Contract.address, 12), 'HoprStake: Program ended, cannot redeem boosts.');
        //     }); 
        //     it('can unlock', async () => {
        //         tx = await stake2Contract.connect(participants[1]).unlock(participantAddresses[1]);
        //     }); 
        //     it('reclaims rewards', async () => {
        //         const rewards = calculateRewards(1, PROGRAM_V2_END - PROGRAM_V2_START, [BASIC_FACTOR_NUMERATOR, parseInt(BADGES[0].nominator)]);
        //         const receipt = await ethers.provider.waitForTransaction(tx.hash);
        //         const account = await getParamFromTxResponse(
        //             receipt, stake2Contract.interface.getEvent("Claimed").format(), 1, stake2Contract.address.toLowerCase(), "Lock the token"
        //         );
        //         const reward = await getParamFromTxResponse(
        //             receipt, stake2Contract.interface.getEvent("Claimed").format(), 2, stake2Contract.address.toLowerCase(), "Lock the token"
        //         );

        //         expect(account.toString().slice(-40).toLowerCase()).to.equal(participantAddresses[1].slice(2).toLowerCase()); // compare bytes32 like address
        //         expect(BigNumber.from(reward).toString()).to.equal(rewards);  // true
        //     }); 
        //     it('receives original tokens - Released event ', async () => {
        //         const receipt = await ethers.provider.waitForTransaction(tx.hash);
        //         const account = await getParamFromTxResponse(
        //             receipt, stake2Contract.interface.getEvent("Released").format(), 1, stake2Contract.address.toLowerCase(), "Lock the token"
        //         );
        //         const actualStake = await getParamFromTxResponse(
        //             receipt, stake2Contract.interface.getEvent("Released").format(), 2, stake2Contract.address.toLowerCase(), "Lock the token"
        //         );

        //         expect(account.toString().slice(-40).toLowerCase()).to.equal(participantAddresses[1].slice(2).toLowerCase()); // compare bytes32 like address
        //         expect(BigNumber.from(actualStake).toString()).to.equal(utils.parseUnits('1.0', 'ether').toString());  // true
        //     }); 
        //     it('receives original tokens - total balance matches old one ', async () => {
        //         const balance = await erc677.balanceOf(participantAddresses[1]);
        //         expect(BigNumber.from(balance).toString()).to.equal(utils.parseUnits('10000', 'ether').toString());  // true
        //     }); 
        //     it('receives NFTs', async () => {
        //         const owner = await nftContract.ownerOf(9);
        //         expect(owner).to.equal(participantAddresses[1]); // compare bytes32 like address
        //     }); 
        // });
    });
});