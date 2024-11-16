import { VercelRequest, VercelResponse } from '@vercel/node';
import { createPublicClient, http } from 'viem';
import { ethers } from "ethers";
import { TokenAbi } from '../src/abi/itxToken.js';
import { MiningAbi } from '../src/abi/mining.js';
import { formatUnits, formatEther } from 'viem';
import { base } from 'viem/chains';
import { kv } from '@vercel/kv';

const tokenContractAddress = process.env.VITE_TOKEN_CONTRACT_ADDRESS as `0x${string}`;
const miningContractAddress = process.env.VITE_MINING_CONTRACT_ADDRESS as `0x${string}`;
const key = process.env.VITE_API_KEY;
const CACHE_EXPIRY_TIME = 3 * 60 * 60 * 1000; // 3 hours in milliseconds


const client = createPublicClient({
  chain: base,
  transport: http(`https://base-mainnet.g.alchemy.com/v2/${key}`),
});

const provider = new ethers.JsonRpcProvider(`https://base-mainnet.g.alchemy.com/v2/${key}`);

interface CachedTokenData {
  data: {
    tokenName: string;
    claimedAmount: string;
    maxSupply: string;
    lastDepositId: number;
    totalUsers: number;
    totalETH: string;
    noOfPhases: number;
    tokenSymbol: string;
  };
  timestamp: number;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {

    if (!tokenContractAddress || !tokenContractAddress.startsWith('0x')) {
      throw new Error('Invalid or missing token contract address');
    }

    if (!miningContractAddress || !miningContractAddress.startsWith('0x')) {
      throw new Error('Invalid or missing mining contract address');
    }

    const cachedData = await kv.get('tokenData') as CachedTokenData | null;

    const currentTime = Date.now();
    if (cachedData && (currentTime - cachedData.timestamp < CACHE_EXPIRY_TIME)) {
      return res.status(200).json(cachedData.data);
    }

    const tokenName = await client.readContract({
      address: tokenContractAddress,
      abi: TokenAbi,
      functionName: 'name',
    }) as string;

    const totalClaimedAmount = await client.readContract({
      address: tokenContractAddress,
      abi: TokenAbi,
      functionName: 'totalClaimedAmount',
    }) as bigint;

    const maxSupply = await client.readContract({
      address: tokenContractAddress,
      abi: TokenAbi,
      functionName: 'MAX_SUPPLY',
    }) as bigint;

    const lastDepositId = await client.readContract({
      address: miningContractAddress,
      abi: MiningAbi,
      functionName: 'getLastProcessedDepositId',
    }) as bigint;

    const balance = await provider.getBalance(miningContractAddress);

    const noOfPhases = await client.readContract({
      address: tokenContractAddress,
      abi: TokenAbi,
      functionName: 'NUM_PHASES',
    }) as bigint;

    const tokenSymbol = await client.readContract({
      address: tokenContractAddress,
      abi: TokenAbi,
      functionName: 'symbol',
    }) as string;

    const data = {
      tokenName,
      claimedAmount: formatUnits(totalClaimedAmount, 18),
      maxSupply: formatUnits(maxSupply, 18),
      lastDepositId: Number(lastDepositId.toString()),
      totalETH: formatEther(balance),
      noOfPhases: Number(noOfPhases),
      tokenSymbol,
    };

    await kv.set('tokenData', {
      data,
      timestamp: currentTime,
    });

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching token data:", error);
    res.status(500).json({ error: 'Failed to fetch token data' });
  }
}