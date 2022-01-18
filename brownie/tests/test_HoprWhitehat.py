import pytest
import brownie
from brownie import accounts, HoprWhitehat


@pytest.fixture(scope="session")
def hoprStake(Contract):
    yield Contract.from_abi("HoprStake", "0x912F4d6607160256787a2AD40dA098Ac2aFE57AC", HOPRSTAKE_ABI)

@pytest.fixture(scope="session")
def hoprWhitehat():
    yield accounts[0].deploy(HoprWhitehat, accounts[0])

@pytest.fixture(scope="session")
def erc1820Registry(Contract):
    yield Contract.from_abi("ERC1820Registry", "0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24", ERC1820REGISTRY_ABI)

def test_gimmeToken(hoprStake, hoprWhitehat, erc1820Registry):
    print("before")
    try:
        print(accounts[0])
        print(hoprWhitehat.address)
        tx = erc1820Registry.setInterfaceImplementer(
            accounts[0],
            "0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b",
            hoprWhitehat.address,
            { 'from': accounts[0] }
        )
        print("the print", tx.revert_msg)
        hoprStake.transferOwnership(hoprWhitehat.address, { 'from': hoprStake.owner() })
        hoprWhitehat.gimmeToken({'from': accounts[0] })
    except Exception as e:
        assert e == ""
    print("after")


# ABIS
HOPRSTAKE_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_nftAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_newOwner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_lockToken",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_rewardToken",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": False,
    "inputs": [
      {
        "indexed": True,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": True,
        "internalType": "uint256",
        "name": "rewardAmount",
        "type": "uint256"
      }
    ],
    "name": "Claimed",
    "type": "event"
  },
  {
    "anonymous": False,
    "inputs": [
      {
        "indexed": True,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": True,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": False,
    "inputs": [
      {
        "indexed": True,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": True,
        "internalType": "uint256",
        "name": "boostTokenId",
        "type": "uint256"
      },
      {
        "indexed": True,
        "internalType": "bool",
        "name": "factorRegistered",
        "type": "bool"
      }
    ],
    "name": "Redeemed",
    "type": "event"
  },
  {
    "anonymous": False,
    "inputs": [
      {
        "indexed": True,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": True,
        "internalType": "uint256",
        "name": "actualAmount",
        "type": "uint256"
      },
      {
        "indexed": True,
        "internalType": "uint256",
        "name": "virtualAmount",
        "type": "uint256"
      }
    ],
    "name": "Released",
    "type": "event"
  },
  {
    "anonymous": False,
    "inputs": [
      {
        "indexed": True,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "RewardFueled",
    "type": "event"
  },
  {
    "anonymous": False,
    "inputs": [
      {
        "indexed": True,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": True,
        "internalType": "uint256",
        "name": "actualAmount",
        "type": "uint256"
      },
      {
        "indexed": True,
        "internalType": "uint256",
        "name": "virtualAmount",
        "type": "uint256"
      }
    ],
    "name": "Staked",
    "type": "event"
  },
  {
    "anonymous": False,
    "inputs": [
      {
        "indexed": True,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": True,
        "internalType": "uint256",
        "name": "increment",
        "type": "uint256"
      }
    ],
    "name": "Sync",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "BASIC_FACTOR_NUMERATOR",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "BASIC_START",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "BOOST_CAP",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "FACTOR_DENOMINATOR",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "LOCK_TOKEN",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "PROGRAM_END",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "REWARD_TOKEN",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "SEED_FACTOR_NUMERATOR",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "SEED_START",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "accounts",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "actualLockedTokenAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "virtualLockedTokenAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "lastSyncTimestamp",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "cumulatedRewards",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "claimedRewards",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "availableReward",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "claimRewards",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_account",
        "type": "address"
      }
    ],
    "name": "getCumulatedRewardsIncrement",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "investors",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "caps",
        "type": "uint256[]"
      }
    ],
    "name": "lock",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nftContract",
    "outputs": [
      {
        "internalType": "contract IHoprBoost",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "onERC721Received",
    "outputs": [
      {
        "internalType": "bytes4",
        "name": "",
        "type": "bytes4"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_from",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_value",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "_data",
        "type": "bytes"
      }
    ],
    "name": "onTokenTransfer",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      }
    ],
    "name": "reclaimErc20Tokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "reclaimErc721Tokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "redeemedFactor",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "redeemedFactorIndex",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "redeemedNft",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "redeemedNftIndex",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "sync",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "userData",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "operatorData",
        "type": "bytes"
      }
    ],
    "name": "tokensReceived",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalLocked",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "unlock",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

ERC1820REGISTRY_ABI = [
    {"type":"function","stateMutability":"nonpayable","payable":False,"outputs":[],"name":"setInterfaceImplementer","inputs":[{"type":"address","name":"_addr"},{"type":"bytes32","name":"_interfaceHash"},{"type":"address","name":"_implementer"}],"constant":False},{"type":"function","stateMutability":"view","payable":False,"outputs":[{"type":"address","name":""}],"name":"getManager","inputs":[{"type":"address","name":"_addr"}],"constant":True},{"type":"function","stateMutability":"nonpayable","payable":False,"outputs":[],"name":"setManager","inputs":[{"type":"address","name":"_addr"},{"type":"address","name":"_newManager"}],"constant":False},{"type":"function","stateMutability":"pure","payable":False,"outputs":[{"type":"bytes32","name":""}],"name":"interfaceHash","inputs":[{"type":"string","name":"_interfaceName"}],"constant":True},{"type":"function","stateMutability":"nonpayable","payable":False,"outputs":[],"name":"updateERC165Cache","inputs":[{"type":"address","name":"_contract"},{"type":"bytes4","name":"_interfaceId"}],"constant":False},{"type":"function","stateMutability":"view","payable":False,"outputs":[{"type":"address","name":""}],"name":"getInterfaceImplementer","inputs":[{"type":"address","name":"_addr"},{"type":"bytes32","name":"_interfaceHash"}],"constant":True},{"type":"function","stateMutability":"view","payable":False,"outputs":[{"type":"bool","name":""}],"name":"implementsERC165InterfaceNoCache","inputs":[{"type":"address","name":"_contract"},{"type":"bytes4","name":"_interfaceId"}],"constant":True},{"type":"function","stateMutability":"view","payable":False,"outputs":[{"type":"bool","name":""}],"name":"implementsERC165Interface","inputs":[{"type":"address","name":"_contract"},{"type":"bytes4","name":"_interfaceId"}],"constant":True},{"type":"event","name":"InterfaceImplementerSet","inputs":[{"type":"address","name":"addr","indexed":True},{"type":"bytes32","name":"interfaceHash","indexed":True},{"type":"address","name":"implementer","indexed":True}],"anonymous":False},{"type":"event","name":"ManagerChanged","inputs":[{"type":"address","name":"addr","indexed":True},{"type":"address","name":"newManager","indexed":True}],"anonymous":False}
]