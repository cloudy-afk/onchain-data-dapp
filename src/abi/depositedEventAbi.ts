import { AbiEvent } from 'viem';

export const depositedEventAbi: AbiEvent = {
  anonymous: false,
  inputs: [
    {
      indexed: true,
      internalType: "uint256",
      name: "depositId",
      type: "uint256",
    },
    {
      indexed: true,
      internalType: "address",
      name: "sender",
      type: "address",
    },
    {
      indexed: true,
      internalType: "bytes32",
      name: "recipientSaltHash",
      type: "bytes32",
    },
    {
      indexed: false,
      internalType: "uint32",
      name: "tokenIndex",
      type: "uint32",
    },
    {
      indexed: false,
      internalType: "uint256",
      name: "amount",
      type: "uint256",
    },
    {
      indexed: false,
      internalType: "uint256",
      name: "depositedAt",
      type: "uint256",
    }
  ],
  name: "Deposited",
  type: "event",
};
