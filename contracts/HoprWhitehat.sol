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
  CHECKLIST:

  STEP -1. flatten contract
  STEP 0. deploy HoprWhitehat
  STEP 1. transfer ownership of HoprStake to this newOwnerContract
  STEP 2. find user with minimal amount of locked tokens for testing purposes
  STEP 3. obtain the amount of rewards which that user is entitled to
  STEP 4. fund newOwnerContract with corresponding amount of wxHOPR
  STEP 5. user needs to follow procedure A

  PROCEDURE PARTICIPANTS:

  W - HoprWhitehat contract
  H - HoprStake contract
  S - account which has stake locked in H
  C - account calling the gimmeToken/0 function
  O - account which is owner of W

  PROCEDURE A (2 manual steps):

  1. S calls contract function `prepare` of W
  2. S calls contract function `gimmeToken` of W
  3. [W-gimmeToken] sends wxHopr to H
  4. [W-gimmeToken] calls `unlock` of H
  5. [W-gimmeToken -> H-unlock-_claim] performs `safeTransfer` of wxHopr to S
  6. [W-gimmeToken -> H-unlock-_claim -> S-W_tokensReceived] calls `reclaimErc20Tokens` of H
  7. [W-gimmeToken -> H-unlock-_claim -> S-W_tokensReceived -> H-reclaimErc20Tokens] performs `safeTransfer` of xHopr to H
  8. [W-gimmeToken -> H-unlock] transfers redeemed nfts
  8. DONE

  PROCEDURE B (1 manual step):

  1. S calls contract function `prepare` of W
  2. O calls contract function `gimmeToken` of W with S as parameter
  3. [W-gimmeToken] sends wxHopr to H
  4. [W-gimmeToken] calls `unlock` of H
  5. [W-gimmeToken -> H-unlock-_claim] performs `safeTransfer` of wxHopr to S
  6. [W-gimmeToken -> H-unlock-_claim -> S-W_tokensReceived] calls `reclaimErc20Tokens` of H
  7. [W-gimmeToken -> H-unlock-_claim -> S-W_tokensReceived -> H-reclaimErc20Tokens] performs `safeTransfer` of xHopr to H
  8. [W-gimmeToken -> H-unlock] transfers redeemed nfts
  8. DONE
*/

contract HoprWhitehat is Ownable, IERC777Recipient, IERC721Receiver {
    using SafeERC20 for IERC20;

    // utility variable used to refer to the caller
    address public currentCaller;

    // determine if function calls are processed
    bool public isActive;

    // instantiated references to the contracts used in Stake Season 1
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
        // keep deactivated at creation, requires manual activation by owner
        isActive = false;
        transferOwnership(_newOwner);
    }

    function prepare() external {
        // ensure STEP 2 hasn't happened yet
        require(ERC1820_REGISTRY.getInterfaceImplementer(msg.sender,
                                                         TOKENS_RECIPIENT_INTERFACE_HASH) != address(this),
                                                         "Caller has already set this contract as ERC1820 interface");

        // set interface for caller
        address caller = msg.sender;
        ERC1820_REGISTRY.setInterfaceImplementer(caller,
                                                 TOKENS_RECIPIENT_INTERFACE_HASH,
                                                 address(this))
    }

    // entry function to be called by users who can unlock their tokens (users who have rewards)
    function gimmeToken() external {
        // ensure STEP 1
        require(myHoprStake.owner() == address(this), "HoprStake needs to transfer ownership");
        // ensure STEP 2
        require(ERC1820_REGISTRY.getInterfaceImplementer(msg.sender, TOKENS_RECIPIENT_INTERFACE_HASH) == address(this), "Caller has to set this contract as ERC1820 interface");

        // store caller to be used throughout the call
        currentCaller = msg.sender;

        // updates the rewards inside the accounts mapping struct
        myHoprStake.sync(currentCaller);

        // solhint-disable-next-line no-unused-vars
        (uint256 actualLockedTokenAmount, uint256 virtualLockedTokenAmount, uint256 lastSyncTimestamp, uint256 cumulatedRewards, uint256 claimedRewards) = myHoprStake.accounts(currentCaller);
        uint256 stakerEntitledReward = cumulatedRewards - claimedRewards;
        emit RequestedGimme(currentCaller, stakerEntitledReward);

        // this will trigger the tokensReceived callback in this contract,
        // since the caller has set the ERC180 interface before calling this
        // function
        wxHopr.send(address(myHoprStake), stakerEntitledReward, '0x0');

        // unlock xHOPR
        myHoprStake.unlock(currentCaller);
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
        if (isActive) {
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
        emit ReceivedXHopr(currentCaller, _value);
        for (uint c = 0; c < myHoprStake.redeemedNftIndex(currentCaller); c++) {
            uint tokenId = myHoprStake.redeemedNft(currentCaller,c);
            emit ReclaimedBoost(currentCaller, tokenId);
            myHoprStake.reclaimErc721Tokens(currentCaller, tokenId);
            myHoprBoost.safeTransferFrom(address(this), currentCaller, tokenId);
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

    /**
     * @dev Activate all contract functions.
     */
    function activate() public onlyOwner {
        require(!isActive, "HoprWhitehat is already active");
        isActive = true;
    }

    /**
     * @dev Deactivate all contract functions.
     */
    function deactivate() public onlyOwner {
        require(!isActive, "HoprWhitehat is already not active");
        isActive = false;
    }
}
