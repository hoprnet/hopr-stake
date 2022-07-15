# NFT Minting process

First of all, create a non-custodial wallet address (Metamask wallet) specifically for the minting process (one time setup). And make sure to top up with some xDai tokens, because you will be paying the gas fees during the minting process.

Ask Sebastian or Rik, or Q to give you a minter role for a recently created wallet address.

## Add new NFTs to the staking UI

### 1. Make sure that images meet the standards.

- Image resolution is **1600 x 2263**
- Image type is **.jpg**

I recommend using a tool called ImageOptim which optimizes your image size, because at the beginning it will have 400 - 500 kb / image, which is a pretty big size for the web. The main setting I am using is to make sure that JPEG quality would be at least 85%. Which will make your image size at around about 200 - 300 kb.

### 2. Use IPFS services to upload the images.

- Make sure that your images are under the folder which has the NFT type name. This is for comfortable management purposes.
- Make sure that images names are lowercase and file names meet the rank. For example: `bronze.jpg`

Visit https://app.pinata.cloud/pinmanager (you will need to create the account), click on the button `+ Upload` and upload images as a folder.

After the upload, you will see the CID hash next to your recently uploaded folder. For example:
```QmXUhs8vi7NpRa5ZJb4mEoVRUBLT6vc7L1AjaEgJ41ikUC```

CID hash will be your uploaded folder address. Hyperlink to the images will look similar to this: ```ipfs://QmdtpZKNAjJEDZc5j7pdj8uunqaQTaSx5fjEPCWMf5nBWH/bronze.jpg```

If you want to check if you did everything correctly, you can click on the recently uploaded folder and check a list of uploaded images.

![y5LiJSA3cOKc5FvjGmXYaU3wO-BzkLqqpwGeL9oY_02UCZhl7A07ZvW8lVOpgs5ON4pTs8MM-AJHtLZ_FMwOjwXxtmrW-sE9dgIb-bV5x6r34ZTtTnth55-fgoZ9NOxT6Thrg-fEcnGuZEIA6Sv7TvQ](https://user-images.githubusercontent.com/73285987/179196916-d3c3bc18-3d17-424b-aed4-bc87f6a4cce6.png)

### 3. Using Github we will need to add NFT’s metadata, which needs for:

- During the minting process it will include this metadata info directly into NFT, so everyone could check the details about this nft on blockscout (GC explorer).
- Staking UI, will recognise the NFT and will render all the details about this specific NFT.

This url will be a location of all NFTs metadata: https://github.com/hoprnet/hopr-devrel/tree/main/stake/packages/frontend/public

By clicking on this url, you will be on a main branch. You will need to change branch based on the staking season, at the moment the tutorial was created we have staking season 3, this means the branch will be: `release/stake-v3`

![m7yXWDgES4FeS8ANdMrn7zaHWAHJZbY0wrCFJzgDaaVdmni4GVZf28pJKToZ11gtt6WoA-NYxiyqbJ-mo_4Tc95kKgMk7q4KqJ9zkz34iCd7irVeU4woG8SOOt62Yyg6i5Cwn0r1c-aKpY524ZR71-0](https://user-images.githubusercontent.com/73285987/179207839-c5a7d573-ee75-45ea-a61e-87c44282e992.png)

Create a folder which has the exact name as the NFT type (On a minting process you will need to use the same name for a match) for example: `Wildhorn_v2`

On the top left corner click on `Add file` and click on `Create new file`:

![xguT9FYxQQx2o-Zxzvucp8y7eeotcw-nl-mgWBNor6pjPzowGoVlYH81Ysr_ophy8obVQX4pHZqoON9TTYdzswVNLHwNh8kk_VSSiJ0Hx7VdEGI7avmk3Y4yrSJKapuLUAILg3XMKmMk4RR__FxyRVM](https://user-images.githubusercontent.com/73285987/179208871-a5353821-7fc6-4fb9-b155-d1bc1f637bcf.png)

Enter the name of a folder and add a slash symbol `/` at the end, this will create a folder. This needs only once, later you will be creating only files inside the folder.

![vY1Zvv5Fooi4a9tLPOd6MeVfa9ejzdVmunQKxArVCfHmIFmxN5OKK3_C0q96XAoru9ukHXA5p_-SuczEp0dGMuw0K8aPeDxy-GFVty0EzTpQPZgKQl4TBbXILUaPDFrg7Ul6Rsu_BDi9wEIuK2y1J0c](https://user-images.githubusercontent.com/73285987/179210693-cedfdb90-ad88-41f2-9eea-2268540d07ea.png)

Now you can enter the name of a specific NFT rank, for example: `bronze`

![-8_Muz-FV0TLCxHJTcqkU5WndJgQk0UQNSDpA4r5pWpaF3DjRnER6QQAatRxFeURQlqEGhHF8s8r7w17UE-QU4-1mKTLfhw-FUDQky261kXs5DL6cvBjqwoJBNyixSV6f8AGLKMs3rVnaPT8FjnKlJo](https://user-images.githubusercontent.com/73285987/179210850-a457b898-c920-4192-a057-903e23a657d6.png)

In the text field you will to enter the metadata details for this specific rank. For example:
```
{
    "type": "Wildhorn_v2",
    "rank": "bronze",
    "image": "ipfs://QmXUhs8vi7NpRa5ZJb4mEoVRUBLT6vc7L1AjaEgJ41ikUC/bronze.jpg",
    "deadline": 1642424400,
    "boost": 0.03
}
```
![COy8mBr8vnlMBQ53DJW3MTkGGCO8kkUvoKVu6XSIbUZBNU-QAdvGF1xTcQZ0pLbhEmaqiESpEugTRx9ehrzWtGAnovpTnR2xOfcxIvdlPJr82JE9xlo5lNoxbfOAKaG5ptRF-TG-ty749miVVaKZ7vk](https://user-images.githubusercontent.com/73285987/179211053-526f02a1-d0dd-4f85-8071-48b029d342e3.png)

- **type** - Name of NFT type.
- **rank** - NFT rank, can be only: bronze, silver, gold, diamond
- **image** - IPFS link to the specific NFT rank
- **deadline** - is the timestamp, when the staking season ends.
- **boost** - boost value, in this case 0.03 means 3%

After you added the metadata info for the bronze rank, scroll to the bottom, make sure to select: Create a new branch for this commit and start a pull request and name your branch. For example: Adding-Wildhorn_v2-NFT, make sure to fill the spaces between words with dashes.

*By creating a new branch it will have a copy of this repository with your modified files.*

Now click the button `Propose new file`

![FFgKRNI1Uzvt63fRX0p0seD44BDnKmY-hws0NYoFbfLVhACPzn8pifiTxOqbu75YW5aljHIgujh0gGn_B50tXWEQrJxLrWeez281n2OcrJPmkKeUBDUf4yi_JKS3apeed5pi5xx6M7LkIyZx1oDv2nc](https://user-images.githubusercontent.com/73285987/179218407-29ee3bf0-3569-44db-9403-7c7c08678dcb.png)

It will ask you to open a pull request, but we will skip this step, because we only added metadata info with only a bronze rank. Now click on `hopr-devrel`, to get back to the main category of this repository.

![nFgsWER2dqcSph-XzCu2qFtTByXbHQnOeg1UGmsFnY2WycjLlXSq9AmGckI6bn0n6G1sK9eDuAihCgcUb_aWakmsDd1z8Ul3sFnPIHzcbuCQysXELEv9Syz16fN2dkUh2MFU-UJKhd9t0DDHciqi5s0](https://user-images.githubusercontent.com/73285987/179218529-6d1db99b-2b98-4581-9b24-27719024e0ab.png)

You will see a notification box about your recently created branch, click on the name of your new branch. In this example this will be `Adding-Wildhorn_v2-NFT`

![r1r2Tv7K7JW4RgL_Cps346rd7IE-OwbXWVpI4G-0v5rKbcsA1x26Un7bE30g7Z3WnYBO6hnkwfJvgBNEUEW4u2sipEDjzdPinMEgVlXrqwU48tqftt3lByOqjMz0buoLgHsTe9lOc00Syy-dAQ-Nr6s](https://user-images.githubusercontent.com/73285987/179218729-1f204b3f-ffac-4bc3-920a-87d9b2152f32.png)

Now you are on the branch where you have your modified files. Go to folders: 

`stake -> packages -> frontend -> public`

Now you will see your recently created folder with a name of NFT type. In this tutorial we are using: `Wildhorn_v2`, click on your recently created folder and you will see a bronze rank file.

![54V68REogJkJbNhkbS6YjvNyeITnscCC9XrXRXr4ibrFCgXkax1iIsgM_DfRN8kCFYwwcobSdO6BhlQBJKNkbvReGdGssiKN_Ea-Re2yUSYY5GCaF7a-iUQBbd-GkyWd4XjbHTEc4D5jimYQxcjQrI4](https://user-images.githubusercontent.com/73285987/179227274-e4ef7f2f-88b1-4234-b3f4-e0c73c841eb6.png)

Now you need to add a metadata file with the other rank. Click on the top right corner `Add file` enter the file name: `silver` and fill with the metadata info.

![uk2DkvOiWjZoxDQPRsir3ZLQwDGzlXjb2SXBqGv3K1tHnCNVNwqa2DR2pUP09abwhawqq4K5h0c0qPU0XYQwJ2B-UcffcT_5_I1zt2tiOVwWDmEBfXAj-PkykpJu_mf_Xw7RdnUxHg6VGUkFFv2kaGg](https://user-images.githubusercontent.com/73285987/179227433-2fb78537-dfee-4690-a127-9fa9688835a3.png)

Scroll to the bottom and now instead of creating a new branch, you will make the edits on your recently created branch. Make sure it has been selected: Commit directly to the `<Your branch name>` branch. In this tutorial it will be: Commit directly to the `Adding-Wildhorn_v2-NFT` branch.

![xZA99LGkZoUoX_o6JASkWSI7NnzL7gRHNthtKbmEtdCXMbWQsm8a3f8rNsl3dZGScNAKjBP7sCflmES_5bS5URqWU83PYwJGOzbi4YypVgs893uuY0Ora0lSt0pSg1B96gaXjpSqX-osfzYUFPJdQ68](https://user-images.githubusercontent.com/73285987/179227742-67864cf4-edd5-4a30-8ec0-0714571ce79d.png)

Now click the button `Commit changes`, after you commit changes it will get back to your folder, so you don’t need to go to the beginning of the `hopr-devrel` repository. 

Now click on the top right corner `Add file` and repeat the same process with the rest rank files the way you did with a `silver` rank.

After you added all metadata files with all ranks, now you need to pull request your changes, so it could be approved and merged into deployment (production). Now go back to the main hopr-devrel repository by clicking on the top left corner “hopr-devrel”.

You will see the same notification box, in this time click on the “Compare & pull request” button.

![YWUJIkftiF-xtnzUpkeX3_a5ORQhrQSCPX0EfoIYPhGRQ1hO854LYRiJpRhx9BfedpJ8xL0YYNEqxKvAUUZqLNl_6cj9FEpDBVv0EVmCw3TIlwgfeMiLOhiMCqbVB5rNChsRv8frCMOArCfOkju1DJg](https://user-images.githubusercontent.com/73285987/179227915-55e60591-69b8-4fab-8600-0541bab5219d.png)

#### Now make sure to do these steps: 

- Change a branch base from `main` to `release/stake-v3` (branch depends on the current staking season). Because every staking UI is deployed on the different branches, depending on the staking season.
- Add a meaningful title, so it will be clear for the others on what you have been working on.
- Add reviewer, usually Andrius or Rich. On the picture below, on the right side you will see reviewers section, click on a gear icon and enter the name of a reviewer.

![oDhVHJmWXM6HihBUxjKoNQxW3jWJIV7UPDTjQKqXT_Hz2i4Ve_x2PH7n_FurZ2budYibC8kP1pVqyE_vk9ff_wBHJw3VUS2yhQ4koFqRsHlNKkDicjXTCWKPfl6JKZQOMGpghlIv_7jRSJeu9LFmow8](https://user-images.githubusercontent.com/73285987/179236011-47b18ca2-17a7-459d-b16b-e557b5078d2b.png)

Click on the button `Create pull request` and voila! After someone will review and approve your changes, you will be able to merge your PR. After your PR will be merged you can move to the next step, the minting process!


## Minting NFTs

*This tutorial section is based on the Mac OS.*

### Setup and prepare nvm on your mac (one time setup).

Visit: https://github.com/nvm-sh/nvm#installing-and-updating

Open terminal app on your mac and execute the command:
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
```

After it will finish nvm installation, execute this command:

```
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")" [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

Make sure it was installed correctly and the node default version is at least `16`. To check this, execute the command: 
```
nvm ls
```
If it will not recognise nvm, please troubleshoot the issue with Andrius.

### Setup and prepare hopr-stake repository on your mac (one time setup).

On your terminal window, clone `hopr-stake` repository from github to your mac by executing this command: 
```
git clone https://github.com/hoprnet/hopr-stake.git
```
FYI after the cloning process will be finished, it will create a folder with all required files on the default location: `Users/<username>/hopr-stake`

Now go to the hopr-stake folder by executing this command: 
```
cd hopr-stake
```
Now we need to install and build the `hopr-stake` repository. Execute commands one by one.

Execute the first command:
```
yarn install
```
After yarn install will finish it’s job, execute this command:
```
yarn build
```
If you didn’t receive any errors, this means you made it! And hopr-stake script is ready to go!

### Minting process and what needs to be done

Before editing the files, my recommendation is to install a code editor tool called [Visual Studio Code](https://code.visualstudio.com/Download), which is lightweight and will not auto correct the text.

For managing files I would recommend using a finder app or any other file manager. Now lets find our folder `hopr-stake`. Launch Finder app and from the top menu locate `Go` and then select `Go to Folder…` enter the location: `/Users/<username>/hopr-stake/` where `<username>` is your username on your mac. For example: `/Users/Andrius/hopr-stake/`

1. Lets prepare a CSV file, the structure of a file you will find inside the hopr-stake folder on a sub-folder called `inputs`, have a look at file: `Wildhorn_v2.csv`
    
    CSV file structure will consist of 2 header terms `eoa` and `grade` which are separated with comma:

    - **eoa** - stands for the recipient eth address
    - **grade** - stands for the rank the recipient should receive

    Always make sure that eth address should be included between: `><`, for example row will look like: `>0x00000000000000000000000<,diamond`

    After the CSV file will be ready, make sure the CSV file name is the same as the NFT type name. Now you will need to upload a CSV file to the `inputs` folder, which is a subfolder of a `hopr-stake`. The location is: `Users/<username>/hopr-stake/inputs`
    
2. Find batchmint.ts file to modify boost rank percentages.

   batchMint.ts location is - `/Users/<username>/hopr-stake/tasks/batchMint.ts`
   
   Open batchMint.ts file with `VSC (Visual Studio Code)` app and make some edits.
   
   Find a 12th row and you will see a list of ranks and it’s values:
   
   ![IU5jmqJhfFmp7JqLgi02C99szAdHCt48OSb5NgvA0M33CBVe8-_pwroy9463rFkV4pg7Y98SNwUwGqyqfNuUiMtWBKo2H10ewNOv8gc-skRS-tPW9zkHWXUrruAzXyyYI1EK9XXiKFAD9A3Mv6dqF9o](https://user-images.githubusercontent.com/73285987/179239104-b5c53f53-b779-4268-b0d8-6f967c44278e.png)
   
   You will need to change rate numbers depending on NFT boost percentages. For example 7.5 stands for 7.5% boost.

   Keep in mind sometimes you will need to mint less than 4 ranks, this means you will need to leave only the ranks you will be minting, otherwise it could show you the errors during the minting process.

   After you finish editing the ranks and boost percentages, save and quit from a file.
  
3. Now the important part, you will need to enter the secret key of your recently created wallet address inside a file called: `.env`

    Let's find your wallet's secret key. Go to metamask, make sure you have selected the right address and click on the 3 dots which are on the top right corner, and select `Account details`. Click on a button `Export Private Key`, enter your metamask password and it will show you a private key.

    Now to find file `.env`, use the finder app and make sure you are in the `hopr-stake` folder.

    *Files which don't have names and only have file extensions like .env are by default hidden for security reasons.*
    
    To be able to see hidden files, use your keyboard combination: `Command + Shift + .`

    You will notice file called `.env.example`, please remove the `.example` part, so file should look like this: `.env`

    Edit `.env` file with `VSC`. This file should contain with these lines:
    ```
    ETHERSCAN=
    DEPLOYER_PRIVATE_KEY=
    ADMIN_ACCOUNT=
    ALICE=
    MINTER_KEY=
    TEST_WHITEHAT_ONLY=false
    ```
    What you will need to do is to enter your wallet secret key next to `MINTER_KEY=`, in the end file should look similar to this:
    ```
    ETHERSCAN=
    DEPLOYER_PRIVATE_KEY=
    ADMIN_ACCOUNT=
    ALICE=
    MINTER_KEY=<Your wallet secret key>
    TEST_WHITEHAT_ONLY=false
    ```
    `<Your wallet secret key>` - replace with your wallet secret key and fill without <>.

    **IMPORTANT** after you finish the minting process, ***delete your wallet secret key*** from the file .env and save.

    Great, now you updated the .env file with your secret key and you are ready for the last step!

4. Last step, minting!

   Lets double check:

   - You have prepared a CSV file which name is exactly like an NFT type name and it is uploaded to a subfolder called `inputs`.
   - `batchMint.ts` file is updated with corresponding ranks and percentages.
   - You have temporary entered your wallet secret key on the file `.env`

   Now before actual minting, execute the command locally. Open terminal app and execute command: 
   ```
   NAME="<NFT type name>" yarn batchmint:local:save-log
   ```
   `<NFT type name>` - NFT type name, which should match with CSV file name, Metadata folder which was added previously. For example:
   ```
   NAME="Wildhorn_v2" yarn batchmint:local:save-log
   ```
   After executing the command above will not give any major errors, except gas fees error, this means it should be good to go for an actual minting process.

   For the actual minting process execute command:
   ```
   NAME="<NFT type name>" yarn batchmint:xdai:save-log
   ```
   Don’t forget to replace `<NFT type name>` with corresponding NFT type name.

   Now let's wait and let it do all the magic, if you will see the list of transactions, this means you have successfully minted the NFTs!
   
## Troubleshooting

   Check the original source at [hopr-stake technical part](https://github.com/hoprnet/hopr-stake/edit/main/README.md#hopr-stake-technical-part) section, please follow the instructions up to 6th step including.
   
<hr>

## hopr-stake technical part
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
    - If the type has been previously minted (e.g. there's already a `DAO_v2.csv` in the `inputs` folder and `DAO_v2.log` in the `outputs` folder), please rename the old file to avoid being overridden. (e.g. Rename the old file into `DAO_v2_batch1.csv` and `DAO_v2_batch1.log` respectively).

2. Change parameters in [`tasks/batchMint.ts`](./tasks/batchMint.ts#L12) based on the "Request to mint NFT":
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

**Important note: In most cases you only need to change the value inside `rate($value)`. Unless needed, do not change neither the `deadline` nor the bost key attributes (i.e. `diamond`, `gold`, `silver`, `bronze`). If during log the `apy` shows `NaN` you likely have an error and need to ensure the `*.csv` `grade` column matches [`tasks/batchMint.ts`](./tasks/batchMint.ts#L12) `boost` key-value map.**

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
7. Create a new branch `nft/<type>` and commit input csv and output logs. E.g. 
```
git checkout -b nft/Wildhorn_v2
git add .
git commit -am "Mint NFT Wildhorn_v2"
git push --set-upstream origin nft/Wildhorn_v2
```
and create a pull request to `main` base in the [hopr-stake repo](https://github.com/hoprnet/hopr-stake/pulls) and merge it. 
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
