import React, { useEffect, useState } from 'react';
import { createPublicClient, http, formatUnits, formatEther } from 'viem';
import { ethers } from "ethers";
import { base } from 'viem/chains';
import { abi as TokenAbi } from '../abi/itxToken';
import { abi as MiningAbi } from '../abi/mining';
import { depositedEventAbi } from '../abi/depositedEventAbi';
import Navbar from './Navbar';

const tokenContractAddress = import.meta.env.VITE_TOKEN_CONTRACT_ADDRESS as `0x${string}` | undefined;
const miningContractAddress = import.meta.env.VITE_MINING_CONTRACT_ADDRESS as `0x${string}` | undefined;
const key = import.meta.env.VITE_API_KEY;
const decimals = 18;

console.log('Mining Contract Address:', import.meta.env.VITE_MINING_CONTRACT_ADDRESS);


const client = createPublicClient({
  chain: base,
  transport: http(`https://base-mainnet.g.alchemy.com/v2/${key}`),
});

const provider = new ethers.JsonRpcProvider(`https://base-mainnet.g.alchemy.com/v2/${key}`);

if (!tokenContractAddress || !tokenContractAddress.startsWith("0x")) {
  throw new Error("Invalid or missing token contract address in .env file");
}

if (!miningContractAddress || !miningContractAddress.startsWith("0x")) {
  throw new Error("Invalid or missing mining contract address in .env file");
}

const TokenInfo: React.FC = () => {
  const [data, setData] = useState<{
    tokenName: string;
    claimedAmount: string;
    maxSupply: string;
    lastDepositId: number;
    totalUsers: number;
    totalETH: string;
    currentPhase: number;
    phaseRewardPerDay: string;
    noOfPhases: number;
    tokenSymbol: string;
  } | null>(null);


  //optional: print unique wallet addresses 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [uniqueAddresses, setUniqueAddresses] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
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

        const currentPhase = await client.readContract({
          address: tokenContractAddress,
          abi: TokenAbi,
          functionName: 'PHASE0_PERIOD',
        }) as bigint;

        const phaseRewardPerDay = await client.readContract({
          address: tokenContractAddress,
          abi: TokenAbi,
          functionName: 'PHASE0_REWARD_PER_DAY',
        }) as bigint;

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

        const uniqueAddressesFetched = await getUniqueAddresses() as string[];

        setData({
          tokenName,
          claimedAmount: formatUnits(totalClaimedAmount, decimals),
          maxSupply: formatUnits(maxSupply, decimals),
          lastDepositId: Number(lastDepositId.toString()),
          totalUsers: uniqueAddressesFetched.length,
          totalETH: formatEther(balance),
          currentPhase: Number(currentPhase.toString()),
          phaseRewardPerDay: formatUnits(phaseRewardPerDay, decimals),
          noOfPhases: Number(noOfPhases),
          tokenSymbol,
        });

        setUniqueAddresses(uniqueAddressesFetched);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  const getUniqueAddresses = async () => {
    try {
      const logs = await client.getLogs({
        address: miningContractAddress,
        event: depositedEventAbi,
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      const uniqueAddresses = new Set(
        logs
          .map((log: { topics?: string[] | undefined }) => {
            if (log.topics && log.topics.length > 2 && log.topics[2]) {
              return `0x${log.topics[2].slice(26)}`;
            }
            return null;
          })
          .filter((address: string | null): address is string => address !== null)
      );

      const uniqueAddressArray = Array.from(uniqueAddresses);
      return uniqueAddressArray;

    } catch (error) {
      console.error("Error fetching logs or processing:", error);
      return [];
    }
  };

  return (
    <div>
      <Navbar />
      {data ? (
        <div className='my-[20px] md:my-[30px] p-10 mx-auto'>
          <h1 className="text-3xl font-bold mb-2">Token Details</h1>
          <div className='flex flex-col md:flex-row justify-between space-x-0 md:space-x-2'>
            <div className="bg-[#f9f9f9] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
              <h2 className="text-xl font-bold">Token Name: {data.tokenName}</h2>
            </div>
            <div className="bg-[#f9f9f9] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
              <h2 className="text-xl font-bold">Token Symbol: {data.tokenSymbol}</h2>
            </div>
            <div className="bg-[#f9f9f9] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
              <h2 className="text-xl font-bold">Max Supply: {data.maxSupply}</h2>
            </div>
          </div>

          <h1 className="text-3xl font-bold mt-10 mb-2">Mining Stats</h1>
          <div className='flex flex-col md:flex-row justify-between space-x-0 md:space-x-2'>
            <div className="bg-[#f9f9f9] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
              <h2 className="text-xl font-bold">Total Processed Deposits: {data.lastDepositId}</h2>
            </div>
            <div className="bg-[#f9f9f9] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
              <h2 className="text-xl font-bold">Total Claimed Tokens: {data.claimedAmount}</h2>
            </div>
            <div className="bg-[#f9f9f9] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
              <h2 className="text-xl font-bold">Total Wallets Mining: {data.totalUsers}</h2>
            </div>
          </div>

          <div className='flex flex-col md:flex-row justify-between space-x-0 md:space-x-4'>
            <div className="bg-[#f9f9f9] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
              <h2 className="text-xl font-bold">Amount Of ETH Currently Mined: {data.totalETH} ETH</h2>
            </div>
            <div className="bg-[#f9f9f9] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
              <h2 className="text-xl font-bold">Token Reward Per Day (Phase 0): {data.phaseRewardPerDay} Tokens</h2>
            </div>
            <div className="bg-[#f9f9f9] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
              <h2 className="text-xl font-bold">Phase 0 Duration In Days: {data.currentPhase} Days</h2>
            </div>
          </div>
        </div>
      ) : (
        <div className='text-center font-bold text-xl mt-80'>
          <p>Loading data...</p>
        </div>
      )}
    </div>
  );
};

export default TokenInfo;
