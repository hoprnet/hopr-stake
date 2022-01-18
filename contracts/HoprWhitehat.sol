// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/introspection/ERC1820Implementer.sol";
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
6. user calls `gimmeToken` on this contract or the owner calls `gimmeTokenFor(staker)`
*/

contract HoprWhitehat is Ownable, IERC777Recipient, IERC721Receiver, ERC1820Implementer {
    using SafeERC20 for IERC20;
    
    address public lastCaller;
    bool public globalSwitch;
    uint256 public rescuedXHoprAmount;

    HoprBoost public myHoprBoost = HoprBoost(0x43d13D7B83607F14335cF2cB75E87dA369D056c7);
    HoprStake public myHoprStake = HoprStake(0x912F4d6607160256787a2AD40dA098Ac2aFE57AC);
    ERC777Mock public wxHopr = ERC777Mock(0xD4fdec44DB9D44B8f2b6d529620f9C0C7066A2c1);
    ERC677Mock public xHopr = ERC677Mock(0xD057604A14982FE8D88c5fC25Aac3267eA142a08);

    IERC1820Registry private constant ERC1820_REGISTRY = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);
    bytes32 private constant ERC1820_ACCEPT_MAGIC = keccak256(abi.encodePacked("ERC1820_ACCEPT_MAGIC"));
    bytes32 private constant TOKENS_RECIPIENT_INTERFACE_HASH = keccak256("ERC777TokensRecipient");
    bytes32 private constant ERC1820_ACCEPT_MAGIC = keccak256("ERC1820_ACCEPT_MAGIC");



    event RequestedGimme(address indexed account, uint256 indexed entitledReward);
    event Called777Hook(address indexed contractAddress, address indexed from, uint256 indexed amount);
    event Called777HookForFunding(address indexed contractAddress, address indexed from, uint256 indexed amount);
    event Received677(address indexed contractAddress, address indexed from, uint256 indexed amount);
    event ReclaimedBoost(address indexed account, uint256 indexed tokenId);

    /**
     * @dev Provide NFT contract address. Transfer owner role to the new owner address. 
     * At deployment, it also registers the lock contract as an ERC777 recipient. 
     * @param _newOwner address Address of the new owner. This new owner can reclaim any ERC20 and ERC721 token being accidentally sent to the lock contract. 
     * @param _myHoprBoost address Address of the mock boost contract.
     * @param _myHoprStake address Address of the mock stake contract.
     * @param _xHopr address Address of the mock xHopr contract.
     * @param _wxHopr address Address of the mock wxHopr contract.
     */
    constructor(address _newOwner, address _myHoprBoost, address _myHoprStake, address _xHopr, address _wxHopr) {
        // implement in favor of testing
        uint chainId;
        assembly {
            chainId := chainid()
        }
        if (chainId != 100) {
            myHoprBoost = HoprBoost(_myHoprBoost);
            myHoprStake = HoprStake(_myHoprStake);
            xHopr = ERC677Mock(_xHopr);
            wxHopr = ERC777Mock(_wxHopr);
        }
        changeGlobalSwitch(true);
        ERC1820_REGISTRY.setInterfaceImplementer(address(this), TOKENS_RECIPIENT_INTERFACE_HASH, address(this));
        transferOwnership(_newOwner);
    }

    /**
     * override implementation check
     */
    function canImplementInterfaceForAddress(bytes32 interfaceHash, address account)
        public
        view
        virtual
        override
        returns (bytes32)
    {
        return interfaceHash == TOKENS_RECIPIENT_INTERFACE_HASH ? ERC1820_ACCEPT_MAGIC : bytes32(0x00);
    }

    // entry function to be called by users who can unlock their tokens (users who have rewards)
    function gimmeToken() external {
        // contract must be the recipient of 
        require(myHoprStake.owner() == address(this), "HoprStake needs to transfer ownership");        
        // check 1820 implementation
        require(ERC1820_REGISTRY.getInterfaceImplementer(msg.sender, TOKENS_RECIPIENT_INTERFACE_HASH) == address(this), "Caller has to set this contract as ERC1820 interface");
        // store the caller for other hook functions
        lastCaller = msg.sender;
        // update caller's account (claimable rewards)
        myHoprStake.sync(lastCaller); // updates the rewards inside the accounts mapping struct
        // solhint-disable-next-line no-unused-vars
        (uint256 actualLockedTokenAmount, uint256 virtualLockedTokenAmount, uint256 lastSyncTimestamp, uint256 cumulatedRewards, uint256 claimedRewards) = myHoprStake.accounts(lastCaller);
        uint256 stakerEntitledReward = cumulatedRewards - claimedRewards;
        emit RequestedGimme(lastCaller, stakerEntitledReward);
        // fund reward to Stake contract
        wxHopr.send(address(myHoprStake), stakerEntitledReward, '0x0');
        // unlock xHOPR
        myHoprStake.unlock(lastCaller);
    }

    // entry function to be called by users who can unlock their tokens (users who have rewards)
    function gimmeTokenFor(address staker) external onlyOwner {
        // contract must be the recipient of 
        require(myHoprStake.owner() == address(this), "HoprStake needs to transfer ownership");        
        // check 1820 implementation
        require(ERC1820_REGISTRY.getInterfaceImplementer(staker, TOKENS_RECIPIENT_INTERFACE_HASH) == address(this), "Caller has to set this contract as ERC1820 interface");
        // store the caller for other hook functions
        lastCaller = staker;
        // update caller's account (claimable rewards)
        myHoprStake.sync(lastCaller); // updates the rewards inside the accounts mapping struct
        // solhint-disable-next-line no-unused-vars
        (uint256 actualLockedTokenAmount, uint256 virtualLockedTokenAmount, uint256 lastSyncTimestamp, uint256 cumulatedRewards, uint256 claimedRewards) = myHoprStake.accounts(lastCaller);
        uint256 stakerEntitledReward = cumulatedRewards - claimedRewards;
        emit RequestedGimme(lastCaller, stakerEntitledReward);
        // fund reward to Stake contract
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
                require(to != address(this), "must not send ERC777 tokens to HoprWhitehat");
                emit Called777Hook(msg.sender, from, amount);
                // controlled-reentrancy starts here
                myHoprStake.reclaimErc20Tokens(address(xHopr));
            }
            else {
                emit Called777HookForFunding(msg.sender, from, amount);
            }
        }
    }

    /**
     * @dev ERC677 fallback (xHOPR aka token that users stake and unlock)
     * No need to reclaim NFTs for caller upon receiving xHOPR
     */
    function onTokenTransfer(
        address _from,
        uint256 _value,
        bytes memory _data
    ) external returns (bool) {
        if (msg.sender == address(xHopr)) {
            rescuedXHoprAmount += _value;
        }
        emit Received677(msg.sender, _from, _value);
        return true;
    }

    /**
     * ERC721 hook. Allow contract to receive 721
     */
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

    /**
     * @dev Transfer the ownership of HoprStake contract back to multisig
     */
    function transferBackOwnership(address multisig) external onlyOwner {
        myHoprStake.transferOwnership(multisig);
    }

    /**
     * @dev rescue all the NFTs of a locked staker account
     * Forward it to the original owner.
     */
    function ownerRescueBoosterNfts(address stakerAddress) external onlyOwner {
        for (uint c = 0; c < myHoprStake.redeemedNftIndex(stakerAddress); c++) {
            uint tokenId = myHoprStake.redeemedNft(stakerAddress, c);
            emit ReclaimedBoost(stakerAddress, tokenId);
            // reclaim erc721 of the lockedAddress
            myHoprStake.reclaimErc721Tokens(stakerAddress, tokenId);
            // forward the 721 to the original staker
            myHoprBoost.safeTransferFrom(address(this), stakerAddress, tokenId);
        }
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
     * @param tokenId id of the ERC721 token.
     */
    function reclaimErc721Tokens(address tokenAddress, uint256 tokenId) external onlyOwner {
        IHoprBoost(tokenAddress).transferFrom(address(this), owner(), tokenId);
    }

    /**
     * @dev Control the switch for ERC777 tokensReceived hook.
     * @param status new status of the switch
     */
    function changeGlobalSwitch(bool status) public onlyOwner {
        globalSwitch = status;
    }
}
