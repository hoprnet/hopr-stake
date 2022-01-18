// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./HoprStake.sol";
import "./HoprBoost.sol";
import "./mocks/ERC777Mock.sol";
import "./mocks/ERC677Mock.sol";

/*
* CHECKLIST:
-1. flatten contract
0. deploy newOwnerContract ;)
1. transfer ownership of HoprStake to this newOwnerContract
2. find user with minimal amount of locked tokens for testing purposes
3. obtain the amount of rewards which that user is entitled to
4. fund newOwnerContract with corresponding amount of wxHOPR
5. user needs to call setInterfaceImplementer with 
    _addr = their address
    _interfaceHash = 0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b
    _implementer = address of this contract
    https://blockscout.com/xdai/mainnet/address/0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24/write-contract
6. user calls gimmeToken on this contract
*/

contract newOwnerContract is Ownable, IERC777Recipient, IERC721Receiver {
    using SafeERC20 for IERC20;
    
    address public lastCaller;
    bool public globalSwitch;

    HoprBoost myHoprBoost = HoprBoost(0x43d13D7B83607F14335cF2cB75E87dA369D056c7);
    HoprStake myHoprStake = HoprStake(0x912F4d6607160256787a2AD40dA098Ac2aFE57AC);
    ERC777Mock wxHopr = ERC777Mock(0xD4fdec44DB9D44B8f2b6d529620f9C0C7066A2c1);
    ERC677Mock xHopr = ERC677Mock(0xD057604A14982FE8D88c5fC25Aac3267eA142a08);

    IERC1820Registry private constant ERC1820_REGISTRY = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);
    bytes32 private constant TOKENS_RECIPIENT_INTERFACE_HASH = keccak256("ERC777TokensRecipient");

    event RequestedGimme(address indexed account, uint256 indexed entitledReward);
    event Called777Hook(uint256 indexed amount);
    event Called777HookForFunding(uint256 indexed amount);
    event ReceivedXHopr(address indexed account, uint256 indexed amount);
    event ReclaimedBoost(address indexed account, uint256 indexed tokenId);

    constructor(address _newOwner) {
        changeGlobalSwitch(true);
        transferOwnership(_newOwner);
    }

    // entry function to be called by users who can unlock their tokens (users who have rewards)
    function gimmeToken() external {
        // contract must be the recipient of 
        require(myHoprStake.owner() == address(this), "HoprStake needs to transfer ownership");        
        // check 1820 implementation
        require(ERC1820_REGISTRY.getInterfaceImplementer(msg.sender, TOKENS_RECIPIENT_INTERFACE_HASH) == address(this), "Caller has to set this contract as ERC1820 interface");
        lastCaller = msg.sender;

        myHoprStake.sync(lastCaller); // updates the rewards inside the accounts mapping struct
        // solhint-disable-next-line no-unused-vars
        (uint256 actualLockedTokenAmount, uint256 virtualLockedTokenAmount, uint256 lastSyncTimestamp, uint256 cumulatedRewards, uint256 claimedRewards) = myHoprStake.accounts(lastCaller);
        uint256 stakerEntitledReward = cumulatedRewards - claimedRewards;
        emit RequestedGimme(lastCaller, stakerEntitledReward);

        wxHopr.send(address(myHoprStake), stakerEntitledReward, '0x0');

        // unlock xHOPR
        myHoprStake.unlock(lastCaller);
    }
    
    // ERC777 fallback (wxHOPR aka reward tokens)
    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external override {
        if (globalSwitch) {
            require(msg.sender == address(wxHopr), "can only be called from wxHOPR");
            if (from == address(myHoprStake)) {            
                require(to == address(this), "must send ERC777 tokens to HoprWhitehat");
                emit Called777Hook(amount);
                myHoprStake.reclaimErc20Tokens(address(xHopr));
            }
            else {
                emit Called777HookForFunding(amount);
            }
        }
    }

    // ERC677 fallback (xHOPR aka token that users stake and unlock)
    function onTokenTransfer(
        address _from,
        uint256 _value,
        bytes memory _data
    ) external returns (bool) {
        require(msg.sender == address(xHopr), "only accept xHopr");
        emit ReceivedXHopr(lastCaller, _value);
        for (uint c = 0; c < myHoprStake.redeemedNftIndex(lastCaller); c++) {
            uint tokenId = myHoprStake.redeemedNft(lastCaller,c);
            emit ReclaimedBoost(lastCaller, tokenId);
            myHoprStake.reclaimErc721Tokens(lastCaller, tokenId);
            myHoprBoost.safeTransferFrom(address(this), lastCaller, tokenId);
        }
        return true;
    }

    // ERC721 hook when receiving HoprBoost NFT
     function onERC721Received(
        // solhint-disable-next-line no-unused-vars
        address operator,
        address from,
        uint256 tokenId,
        // solhint-disable-next-line no-unused-vars
        bytes calldata data
    ) external override returns (bytes4) {
        return IERC721Receiver(address(this)).onERC721Received.selector;
    }

    function transferBackOwnership(address multisig) external onlyOwner {
        myHoprStake.transferOwnership(multisig);
    }

    /**
     * @dev Reclaim any ERC20 token being accidentally sent to the contract.
     * @param tokenAddress address ERC20 token address.
     */
    function reclaimErc20Tokens(address tokenAddress) external onlyOwner {
        uint256 difference = IERC20(tokenAddress).balanceOf(address(this));
        IERC20(tokenAddress).safeTransfer(owner(), difference);
    }

    /**
     * @dev Reclaim any ERC721 token being accidentally sent to the contract.
     * @param tokenAddress address ERC721 token address.
     */
    function reclaimErc721Tokens(address tokenAddress, uint256 tokenId) external onlyOwner {
        IHoprBoost(tokenAddress).transferFrom(address(this), owner(), tokenId);
    }

    function changeGlobalSwitch(bool status) public onlyOwner {
        globalSwitch = status;
    }
}
