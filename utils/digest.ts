import { Contract, BigNumber, utils } from "ethers";

const {keccak256, defaultAbiCoder, toUtf8Bytes, solidityPack} = utils;

export const PERMIT_TYPEHASH = keccak256(
    toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
);

const getDomainSeparator = (name: string, tokenAddress: string, chainId: number) => {
    return keccak256(
        defaultAbiCoder.encode(
            ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
            [
            keccak256(toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
            keccak256(toUtf8Bytes(name)),
            keccak256(toUtf8Bytes('1')),
            chainId,
            tokenAddress
            ]
        )
    )
};

export async function getApprovalDigest(
    token: Contract,
    approve: {
      owner: string
      spender: string
      value: BigNumber
    },
    nonce: BigNumber,
    deadline: BigNumber
  ): Promise<string> {
    const name = await token.name()
    const network = await token.provider.getNetwork();
    const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address, network.chainId)
    return keccak256(
      solidityPack(
        ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
        [
          '0x19',
          '0x01',
          DOMAIN_SEPARATOR,
          keccak256(
            defaultAbiCoder.encode(
              ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
              [PERMIT_TYPEHASH, approve.owner, approve.spender, approve.value, nonce, deadline]
            )
          )
        ]
      )
    )
  }

export const signTransactions = async (signingKey: utils.SigningKey, message: string): Promise<{v:number, r:string, s:string}> => {
  const {r, s, v} = signingKey.signDigest(message);
  // console.log(r, s, v)
  // const result = "0x" + r.slice(2)+s.slice(2)+v.toString(16)
  // console.log(`[signature] ${result}`);
  // return result;
  return {r, s, v}
}