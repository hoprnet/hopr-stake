import { ethers } from 'hardhat'
import { BigNumber, constants, Contract, Signer, utils } from 'ethers'
import { it } from 'mocha';
import{ expect } from "chai";
// import expectRevert from "../utils/exception";
import { deployContract, deployContract2, deployContract4 } from "../utils/contracts";
import { deployRegistry } from '../utils/registry';
// import { shouldSupportInterfaces } from '../utils/interface';
import { getParamFromTxResponse } from '../utils/events';
import { latestBlock } from '../utils/time';

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

        it('can receive ERC777 on HoprStake contract', async function () {
            const interfaceHash = utils.keccak256(utils.toUtf8Bytes('ERC777TokensRecipient'));
            const implementer = await erc1820.getInterfaceImplementer(stakeContract.address, interfaceHash)
            expect(interfaceHash).to.equal("0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b");
            expect(implementer).to.equal(stakeContract.address);
        })

        it('participants have received ERC721', async function () {
            expect((await nftContract.tokenOfOwnerByIndex(participantAddresses[0], 0)).toString()).to.equal(constants.Zero.toString());
        });

        // it('has total supply of zero', async function () {
        //     expect((await nftContract.totalSupply()).toString()).to.equal(constants.Zero.toString());
        // });
        
        // it('has no boost factor', async function () {
        //     expect((await nftContract.boostOf(constants.Zero)).toString()).to.equal([constants.Zero, constants.Zero].join());
        // });

        // it('has type zero for all tokens', async function () {
        //     expect((await nftContract.typeIndexOf(constants.Zero)).toString()).to.equal(constants.Zero.toString());
        //     expect((await nftContract.typeIndexOf(constants.One)).toString()).to.equal(constants.Zero.toString());
        //     expect((await nftContract.typeIndexOf(constants.Two)).toString()).to.equal(constants.Zero.toString());
        // });  

        describe('Before program starts', function () {
            let tx;
            before(async function () {
                const block = await latestBlock();
                console.log(`currentBlock is ${block}, ${BigNumber.from(block).lte(BADGES[0].deadline)}`)
            })

            it('can redeem HODLr token', async function () {
                tx = await nftContract.connect(participants[0]).functions["safeTransferFrom(address,address,uint256)"](participantAddresses[0], stakeContract.address, 0);
            });

        //     it('has total supply of one', async function () {
        //         expect((await nftContract.totalSupply()).toString()).to.equal(constants.One.toString());
        //     });

        //     it('has correct boost factor', async function () {
        //         expect((await nftContract.boostOf(constants.Zero)).toString()).to.equal([BADGES[0].nominator, BADGES[0].deadline].join());
        //     });

        //     it('has correct type', async function () {
        //         expect((await nftContract.typeIndexOf(constants.Zero)).toString()).to.equal(constants.One.toString());
        //     });   
            
        //     it('emits BoostMinted event', async function () {
        //         const receipt = await ethers.provider.waitForTransaction(tx.hash);
        //         const boostTypeIndex = await getParamFromTxResponse(
        //             receipt, nftContract.interface.getEvent("BoostMinted").format(), 1, nftContract.address.toLowerCase(), "Mint boost"
        //         );
        //         const boostNumerator = await getParamFromTxResponse(
        //             receipt, nftContract.interface.getEvent("BoostMinted").format(), 2, nftContract.address.toLowerCase(), "Mint boost"
        //         );
        //         const redeemDeadline = await getParamFromTxResponse(
        //             receipt, nftContract.interface.getEvent("BoostMinted").format(), 3, nftContract.address.toLowerCase(), "Mint boost"
        //         );
        //         expect(BigNumber.from(boostTypeIndex).toString()).to.equal(constants.One.toString());
        //         expect(BigNumber.from(boostNumerator).toString()).to.equal(BADGES[0].nominator.toString());
        //         expect(BigNumber.from(redeemDeadline).toString()).to.equal(BADGES[0].deadline.toString());
        //     }); 
            
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
            
        //     it('emits Transfer event', async function () {
        //         const receipt = await ethers.provider.waitForTransaction(tx.hash);
        //         const from = await getParamFromTxResponse(
        //             receipt, nftContract.interface.getEvent("Transfer").format(), 1, nftContract.address.toLowerCase(), "Mint boost"
        //         );
        //         const to = await getParamFromTxResponse(
        //             receipt, nftContract.interface.getEvent("Transfer").format(), 2, nftContract.address.toLowerCase(), "Mint boost"
        //         );
        //         const tokenId = await getParamFromTxResponse(
        //             receipt, nftContract.interface.getEvent("Transfer").format(), 3, nftContract.address.toLowerCase(), "Mint boost"
        //         );
        //         expect(from.toString()).to.equal(constants.HashZero);
        //         expect(to.toString().slice(-40).toLowerCase()).to.equal(goldHodlerAddresses[0].slice(2).toLowerCase()); // compare bytes32 like address
        //         expect(BigNumber.from(tokenId).toString()).to.equal(constants.Zero.toString());
        //     }); 
            
        //     it('can find type by token Id', async function () {
        //         expect((await nftContract.typeOf(constants.Zero)).toString()).to.equal(BADGES[0].type);
        //     });     
            
        //     it('can find type by type index', async function () {
        //         expect((await nftContract.typeAt(constants.One)).toString()).to.equal(BADGES[0].type);
        //     });     
        });

        // describe('baseURI', function () {
        //     it('fails when non admin sets URI', async function () {
        //         expectRevert(nftContract.connect(deployer).updateBaseURI(baseURI), `AccessControl: account ${deployerAddress.toLowerCase()} is missing role ${constants.HashZero}`);
        //     });

        //     it('minted tokens has the corect URI', async function () {
        //         expect((await nftContract.tokenURI(constants.Zero)).toString()).to.equal(`${""}${BADGES[0].type}/${BADGES[0].rank}`);
        //     });

        //     it('admin can set', async function () {
        //         await nftContract.connect(admin).updateBaseURI(baseURI);
        //     });

        //     it('minted tokens has the updated URI', async function () {
        //         expect((await nftContract.tokenURI(constants.Zero)).toString()).to.equal(`${baseURI}${BADGES[0].type}/${BADGES[0].rank}`);
        //     });
        // });

        // describe('mint one token of existing type', function () {
        //     it('allows a minter - to mint', async function () {
        //         await nftContract.connect(minter2).mint(goldHodlerAddresses[1], BADGES[0].type, BADGES[0].rank, BADGES[0].nominator, BADGES[0].deadline);
        //     });

        //     it('has total supply of two', async function () {
        //         expect((await nftContract.totalSupply()).toString()).to.equal(constants.Two.toString());
        //     });

        //     it('has correct boost factor', async function () {
        //         expect((await nftContract.boostOf(constants.One)).toString()).to.equal([BADGES[0].nominator, BADGES[0].deadline].join());
        //     });

        //     it('has correct type', async function () {
        //         expect((await nftContract.typeIndexOf(constants.One)).toString()).to.equal(constants.One.toString());
        //     });   
        // });

        // describe('batch mint an existing type', function () {
        //     it('allows a minter - to mint', async function () {
        //         await nftContract.connect(minter2).batchMint(silverHodlerAddresses, BADGES[1].type, BADGES[1].rank, BADGES[1].nominator, BADGES[1].deadline);
        //     });

        //     it('has total supply of four', async function () {
        //         expect((await nftContract.totalSupply()).toString()).to.equal(BigNumber.from('4').toString());
        //     });

        //     it('has correct boost factor', async function () {
        //         expect((await nftContract.boostOf(constants.Two)).toString()).to.equal([BADGES[1].nominator, BADGES[1].deadline].join());
        //     });

        //     it('has correct type', async function () {
        //         expect((await nftContract.typeIndexOf(BigNumber.from('3'))).toString()).to.equal(constants.One.toString());
        //     });   
        // });

        // describe('batch mint a new type', function () {
        //     it('allows a minter - to mint', async function () {
        //         await nftContract.connect(minter2).batchMint(testnetParticipantAddresses, BADGES[2].type, BADGES[2].rank, BADGES[2].nominator, BADGES[2].deadline);
        //     });

        //     it('has total supply of seven', async function () {
        //         expect((await nftContract.totalSupply()).toString()).to.equal(BigNumber.from('7').toString());
        //     });

        //     it('has correct boost factor', async function () {
        //         expect((await nftContract.boostOf(BigNumber.from('6'))).toString()).to.equal([BADGES[2].nominator, BADGES[2].deadline].join());
        //     });

        //     it('has correct type', async function () {
        //         expect((await nftContract.typeIndexOf(BigNumber.from('6'))).toString()).to.equal(constants.Two.toString());
        //     });   
        // });

        // describe('should support interface', function () {
        //     it('has correct type', async function () {
        //         const contract = await deployContract2(deployer, "HoprBoost", adminAddress, baseURI);
        //         shouldSupportInterfaces(contract, [
        //             'IHoprBoost', 'ERC165','AccessControlEnumerable', 'ERC721', 'ERC721Enumerable'
        //         ])
        //     }); 
        // });
        
        // describe('claim ERC20 tokens from the NFT contract', function () {
        //     let erc20;
        //     before(async function () {
        //         erc20 = await deployContract2(deployer, "ERC20Mock", nftContract.address, constants.One);
        //     })

        //     it('has one mock erc20 token', async function () {
        //         expect((await erc20.balanceOf(nftContract.address)).toString()).to.equal(constants.One.toString());
        //     }); 

        //     it('admin can reclaim erc20 token', async function () {
        //         await nftContract.connect(admin).reclaimErc20Tokens(erc20.address);
        //         expect((await erc20.balanceOf(nftContract.address)).toString()).to.equal(constants.Zero.toString());
        //         expect((await erc20.balanceOf(adminAddress)).toString()).to.equal(constants.One.toString());
        //     }); 
        // });

        // describe('claim ERC721 tokens from the NFT contract', function () {
        //     let erc721;
        //     before(async function () {
        //         erc721 = await deployContract(deployer, "ERC721Mock");
        //         await erc721.mint(nftContract.address, 3);
        //     })

        //     it('has one mock erc721 token', async function () {
        //         expect((await erc721.balanceOf(nftContract.address)).toString()).to.equal(constants.One.toString());
        //     }); 

        //     it('admin can reclaim erc721 token', async function () {
        //         await nftContract.connect(admin).reclaimErc721Tokens(erc721.address, 3);
        //         expect((await erc721.balanceOf(nftContract.address)).toString()).to.equal(constants.Zero.toString());
        //         expect((await erc721.balanceOf(adminAddress)).toString()).to.equal(constants.One.toString());
        //     }); 
        // });
    });
});
