# hopr-stake
Smart contract for staking incentives with NFTs

## Installation
```
nvm use 16
yarn install
yarn build
```
## Batch-mint NFTs
This script allows the HoprBoost minter to mint Boost NFTs of **one** "type" and one/multiple "rank" with their respective APYs. If the minter wants to mint Boost NFTs of **multiple** "types", steps 1-5 need to be repeated for each "type".

0. HOPR Association MS grant minter's account `MINTER_ROLE` on [`HoprBoost` smart contract](https://blockscout.com/xdai/mainnet/tokens/0x43d13D7B83607F14335cF2cB75E87dA369D056c7/read-contract)

1. Download the result of NFT recipients from DuneAnalytics to `inputs` folder and name it after the NFT's type name, e.g. `DAO_v2.csv`. An sample query is at https://dune.xyz/queries/140878. Note that 
    
    - You need to be logged in Dune with our company account to be able to download the entries. Please request access in case you don't have it.
    - Name of the csv is case-sensitive. Only one boost per type can be taken into account in the staking contract.
    - Column `eoa` and `grade` are mandatory
    - Addresses in the column `eoa` should start with `0x` and wrapped by `>` and `<`. The followings are valid examples of an `eoa` entry: 
        - `"<a href=""https://blockscout.com/xdai/mainnet/address/0xf69c45b4246fd91f17ab9851987c7f100e0273cf"" target=""_blank"">0xf69c45b4246fd91f17ab9851987c7f100e0273cf</a>"` 
        - `>0xea674fdde714fd979de3edf0f56aa9716b898ec8<`

2. Change parameters in `tasks/batchMint.ts` based on the "Request to mint NFT":
```ts
const deadline = 1642424400; // Jan 17th 2022, 14:
// Diamond: 5% Gold: 3% Silver: 2% Bronze: 1%
const boost = {
    "diamond": rate(5),
    "gold": rate(3),
    "silver": rate(2),
    "bronze": rate(1)
};
```
Each NFT has a `deadline`, before which the boost can be redeemed in the staking contract.
`boost` object contains key-value pairs, where the key is the "rank" of the Boost NFT and the value is the APY. E.g. `rate(5)` gives the boost factor for a 5% APY. Note that the key is also case-sensitive. It should be the same as entries of the `grade` column of the input csv.

4. Save the minter's private key in the `.env` file
```
MINTER_KEY=0x123...xyz
``` 
5. Test locally with
If you want to save the output log under `outputs` folder, run
```
NAME="<replace this with type name>" yarn batchmint:local:save-log
```
e.g.
```
NAME="DAO_v2" yarn batchmint:local:save-log
```
If you don't want or have trouble saving the output file, run
```
NAME="<replace this with type name>" yarn batchmint:local
```
e.g.
```
NAME="DAO_v2" yarn batchmint:local
```
5. Mint in production, run 
If you want to save the output log under `outputs` folder, run
```
NAME="<replace this with type name>" yarn batchmint:xdai:save-log
```
e.g.
```
NAME="DAO_v2" yarn batchmint:xdai:save-log
```
If you don't want or have trouble saving the output file, run
```
NAME="<replace this with type name>" yarn batchmint:xdai
```
e.g.
```
NAME="DAO_v2" yarn batchmint:xdai
```
6. Minter renounces its `MINTER_ROLE` or let the HOPR Association MS revoke minter's account `MINTER_ROLE` on [`HoprBoost` smart contract](https://blockscout.com/xdai/mainnet/tokens/0x43d13D7B83607F14335cF2cB75E87dA369D056c7/read-contract).
To renounce its `MINTER_ROLE`, 
    - Go to [Boost contract on blockscout explorer](https://blockscout.com/xdai/mainnet/address/0x43d13D7B83607F14335cF2cB75E87dA369D056c7/write-contract) and connect to MetaMask.
    - Insert "`0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6`" and `<your account address>` into fields "7. renounceRole" → "role(bytes32)" and "account(address)" respectively and click "Write".
## Technical Specification
This incentive program will take place on the xDAI chain - Locking xHOPR to receive wxHOPR rewards.  
Two smart contracts are introduced for this incentive program:
1. `HoprBoost` - NFT for additional (all the boosts except for “basic locking rewards” and “seed investor rewards”) testing rewards. Boost NFTs can be freely traded on the market.
2. `HoprIncentiveLock` - The actual contract for locking tokens and claiming rewards. 

### `HoprStake.sol`
inherit `ownable`, `ERC777Recipient`, `ERC721Receiver`, (`IERC677Recipient`), `ReentrancyGuard` contract
#### Variables
- _BASIC_START_: [uint256] Block timestamp at which incentive program starts for accounts that stake real `LOCK_TOKEN`. Default value is `1627387200` (July 27th 2021 14:00 CET).
- _SEED_START_: [uint256] Block timestamp at which incentive program starts for seed investors that promise to stake their unreleased tokens. Default value is `1630065600` (August 27th 2021 14:00 CET).
- _PROGRAM_END_: [uint256] Block timestamp at which incentive program ends. From this timestamp on, tokens can be unlocked. Default value is `1642424400` (Jan 17th 2022 14:00 CET).
- _FACTOR_DENOMINATOR_: [uint256] Denominator of the “Basic reward factor”. Default value is `1e12`.
- _BASIC_FACTOR_NUMERATOR_: [uint256] Numerator of the “Basic reward factor”, for all accounts (except for seed investors) that participate in the program. Default value is `5787`, which corresponds to 5.787/1e9 per second. Its associated denominator is `FACTOR_DENOMINATOR`. 
- _SEED_FACTOR_NUMERATOR_: [uint256] Numerator of the “Seed investor reward factor”, for all accounts (except for seed investors) that participate in the program. Default value is `7032`, which corresponds to 7.032/1e9 per second. Its associated denominator is `FACTOR_DENOMINATOR`. 
- _BOOST_CAP_: [uint256] Cap on actual locked tokens for receiving additional boosts. Default value is 1 million (`1e24`).
- _LOCK_TOKEN_: [address] Token that HOPR holders need to lock to the contract. `xHOPR` address.
- _REWARD_TOKEN_: [address] Token that HOPR holders can claim as rewards. `wxHOPR` address.
- _nftContract_: [address] Address of the NFT smart contract.
- _redeemedNft_: [mapping(address=>mapping(uint256=>uint256))] Redeemed NFT per account, structured as “account -> index -> NFT tokenId”. The detailed “boost factor, cap, and boost start timestamp” is saved in the “HoprBoost NFT” contract (see section below).
- _redeemedNftIndex_: [mapping(address=>uint256)] The last index of redeemed NFT of an account. It defines the length of the “redeemed factor” mapping.
- _redeemedFactor_: [mapping(address=>mapping(uint256=>uint256))] Redeemed boost factors per account, structured as “account -> index -> NFT tokenId”. The detailed “boost factor, cap, and boost start timestamp” is saved in the “HoprBoost NFT” contract (see section below).
- _redeemedFactorIndex_: [mapping(address=>uint256)] The last index of the redeemed boost factor of an account. It defines the length of the “redeemed factor” mapping. 
- _accounts_: [mapping(address=>Account)] It stores the locked token amount, earned and claimed rewards per account. “Account” structure is defined as 
- _actualLockedTokenAmount_: [uint256] The amount of LOCK_TOKEN being actually locked to the contract. Those tokens can be withdrawn after “UNLOCK_START”
- _virtualLockedTokenAmount_: [uint256] The amount of LOCK_TOKEN token being virtually locked to the contract. This field is only relevant to seed investors. Those tokens cannot be withdrawn after “UNLOCK_START”.
- _lastSyncTimestamp_: [uint256] Timestamp at which any “Account” attribute gets synced for the last time. “Sync” happens when tokens are locked, a new boost factor is redeemed, rewards get claimed. When syncing, “cumulatedRewards” is updated. 
- _cumulatedRewards_: [uint256] Rewards accredited to the account at “lastSyncTimestamp”.
- _claimedRewards_: [uint256] Rewards claimed by the account.
- _totalLocked_: [uint256] Total amount of tokens being locked in the incentive program. Virtual token locks are not taken into account.
- _availableReward_: [uint256] Total amount of reward tokens currently available in the lock.
#### Functions
- _constructor_(_nftAddress: address, _newOwner: address): Provide NFT contract address. Transfer owner role to the new owner address. This new owner can reclaim any ERC20 and ERC721 token being accidentally sent to the lock contract. At deployment, it also registers the lock contract as an `ERC777recipient`. 
- `onTokenTransfer`(from:address, tokenAmount: uint256): ERC677 hook. Holders can lock tokens by sending their `LOCK_TOKEN` tokens via  `transferAndCall()` function to the lock contract. Before `PROGRAM_END`, it accepts tokens, update “Account” {+tokenAmount, +0, block.timestamp, 0, 0} in accounts - mapping, sync Account state, and update `totalLocked`; After `PROGRAM_END`, it refuses tokens. 
- _tokensReceived_(tokenAmount:uint256) ERC777 hook. HOPR association sends their tokens to fuel the reward pool. It updates the `availableReward` by `tokenAmount`.
- _lock_(accounts: address[], cap: uint256[]) Only owner can call this function to store virtual lock for seed investors. If the investor hasn't locked any token in this account, create an "Account" with {0, cap[i], block.timestamp, 0, 0}. If the investor has locked some tokens in this account, update its `virtualLockedTokenAmount`.
- __getCumulatedRewardsIncrement_(account:address) Calculates the increment of cumulated rewards during the `lastSyncTimestamp` and block.timestamp. 
- __sync_(account: address) Update “lastSyncTimestamp” with the current block timestamp and update `cumulatedRewards` with `_getCumulatedRewardsIncrement(account)`
- _sync_(account: address) Public function for `_sync(account)`.
- _onERC721Received_(tokenId: uint256): Able to receive ERC721 tokens. If the ERC721 is `nftContract` (a.k.a HoprBoost NFT), redeem the HoprBoost NFT by adding the token Id to account’s `redeemedFactor`, updating `redeemedFactorIndex`, syncing the account and burning the HoprBoost NFT. This relieves accounts from “approving” + “transferring” NFT. HOPR Boost can thus be redeemed with ERC721 token safeTransferFrom. If the ERC721 is NOT `nftContract`, refuse reception.
- __claim_(account: address): send `REWARD_TOKEN` (`Account.cumulatedRewards - Account.claimedRewards`) to the account. Update `Account.claimedRewards` and reduce `availableReward`.
- _claimRewards_(account: address):  `_sync(account)` and `_claim(account)`.
- `unlock`(account: address): If block.timestamp >= UNLOCK_START, it executes `_sync(account)`, `_claim(account)` and also sends the `Account.actualLockedTokenAmount` back to the account. Update `totalLocked`.
- _getCumulatedRewardsIncrement_(account:address) publicly callable and returns `_getCumulatedRewardsIncrement(account)`.
- _reclaimErc20Tokens_(tokenAddress: address) Can only be called by the owner. Reclaim all the ERC20 tokens accidentally sent to the lock contract. For `LOCK_TOKEN`, it removes the difference between the current lock's `LOCK_TOKEN` balance and totalLocked. For `REWARD_TOKEN`, it removes the difference between the current lock's `REWARD_TOKEN` balance and `availableReward`. 
- _reclaimErc721Tokens_(tokenAddress: address, tokenId: uint256) Can only be called by the owner. Reclaim all the ERC721 tokens accidentally sent to the lock contract. 
### HoprBoost NFT
Inherit from `IHoprBoost`, `AccessControlEnumerable`, `ERC721URIStorage`, `ERC721Enumerable`, `ReentrancyGuard`. 
#### Variables
- _MINTER_ROLE_:[bytes32] Identifier of the minter role.
- __boostType_: [EnumerableStringSet.StringSet] Backward researchable mapping of boost types (“boost type index” ⇔ “boost type”)
- __boostNumerator_: [mapping(uint256=>uint256)] “tokenId -> boost factor”
- __redeemDeadline_: [mapping(uint256=>uint256)] “tokenId -> deadline for redeeming a boost”
- __boostTypeIndexOfId_: [mapping(uint256=>uint256)] “tokenId -> boost type index”
#### Functions
- _constructor_("HOPR Boost NFT", "HOPR Boost", _newAdmin: address) Provide name and symbol for ERC721. Set a new admin role. Set the new admin as a minter. Provide the base token URI (for frontend).
- _updateBaseURI_(baseURI: string) Called by the owner to reset the website where metadata is hosted. Most likely we'll use Pinata. ERC721 token metadata is defined as:
    ```json
    {
        "type": "DAO participant",
        "rank": "gold",
        "image": "https://badge.example/item-id-8u5h2m.png",
        "deadline": 1626080323,
        "boost": 0.05 // daily reward in percentage
    }
    ```
- _boostOf_ (uint256): [uint256, uint256] “tokenId -> (boost factor, boost deadline)” Boost factor per second. It is converted with the function: 
    ```
    APY = boostFactor * 3600 * 24 / 1e12 * 365. 
    ```
- _typeIndexOf_ (uint256): [uint256] “tokenId -> boost type index”. Type of boost. 
- _typeOf_(uint256): [string] “tokenId -> boost type name”. E.g. “DAO participant”. Type names are case sensitive.
- _typeAt_(uint256): [string] “typeIndex -> boost type name”. Return type name of a given type index. 
- _mint_(to: address, boostType: string, boostRank: string, boostNumerator: uint256, redeemDeadline: uint256) Called by minter to airdrop NFT tokens to accounts. If the boost type does not exist, create a new type. `TokenURIs` are created as `${boostType}/${boostRank}`. 
- _batchMint_(to: address[], boostType: string, boostRank: string, boostNumerator: uint256, redeemDeadline: uint256) Called by a minter to create multiple boost factor NFT of the same type and rank.
- _safeTransferFrom_(from:address, to:address, tokenId: uint256) Function that can be used for redeeming boost. It calls `onERC721Received` under the hood, which triggers the NFT-redeem process. 
- _reclaimERC20Tokens_(tokenAddress: address) Only called by the owner. Reclaim all the ERC20 tokens. 
- _reclaimERC721Tokens_(tokenAddress: address, tokenId: uint256) Owner only. It returns all the ERC721 being accidentally sent to the contract. 
- _supportsInterface_(bytes4): Specify interfaces according to ERC165.
- _tokenURI_(): Returns the URI string
- __baseURI_(): get the baseURI of the ERC721.
- __beforeTokenTransfer_(): function being called when transferring the ERC721 token
- __burn_(): override to prevent burning
- __mintBoost_(): register boost information when mint a boost ERC721 token.
