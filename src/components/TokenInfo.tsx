import React, { useEffect, useState } from 'react';
import { createPublicClient, http, formatUnits, formatEther, decodeEventLog } from 'viem';
import { ethers } from "ethers";
import { base } from 'viem/chains';
import { abi as TokenAbi } from '../abi/itxToken';
import { abi as MiningAbi } from '../abi/mining';
import { depositedEventAbi } from '../abi/depositedEventAbi';
import Navbar from './Navbar';
import { differenceInDays, parse } from "date-fns";


const tokenContractAddress = import.meta.env.VITE_TOKEN_CONTRACT_ADDRESS as `0x${string}` | undefined;
const ethtokenContractAddress = import.meta.env.VITE_ETH_TOKEN_CONTRACT_ADDRESS as `0x${string}` | undefined;
const miningContractAddress = import.meta.env.VITE_MINING_CONTRACT_ADDRESS as `0x${string}` | undefined;
const key = import.meta.env.VITE_API_KEY;
const decimals = 18;
const MINING_START_DATE = "2024-08-07";
const MINING_FIRST_TERM_DURATION = 16;
const TERM_TOKEN_ALLOCATION = 143_000_000;
const SHORT_TERM_RATIO = 1;
const LONG_TERM_RATIO = 2;

type MiningData = Record<string, { term: number; allocation: number }>;

const client = createPublicClient({
  chain: base,
  transport: http(`https://base-mainnet.g.alchemy.com/v2/${key}`),
});

const provider = new ethers.JsonRpcProvider(`https://base-mainnet.g.alchemy.com/v2/${key}`);

if (!tokenContractAddress || !tokenContractAddress.startsWith("0x")) {
  throw new Error("Invalid or missing token contract address in .env file - tokenContractAddress");
}

if (!ethtokenContractAddress || !ethtokenContractAddress.startsWith("0x")) {
  throw new Error("Invalid or missing token contract address in .env file - ethtokenContractAddress");
}

if (!miningContractAddress || !miningContractAddress.startsWith("0x")) {
  throw new Error("Invalid or missing mining contract address in .env file - miningContractAddress");
}

const formatNumber = (num: number | string) => {
  return parseFloat(num.toString()).toLocaleString();
};

const getMiningTerm = (date: Date = new Date()) => {
  const startDate = parse(MINING_START_DATE, "yyyy-MM-dd", new Date());
  const daysSinceStart = differenceInDays(date, startDate);

  if (daysSinceStart < 0) {
    return 0;
  }

  let termNumber = 1;
  let daysAccumulated = 0;
  let currentTermDuration = MINING_FIRST_TERM_DURATION;

  while (daysAccumulated <= daysSinceStart) {
    daysAccumulated += currentTermDuration;
    if (daysAccumulated > daysSinceStart) {
      return termNumber;
    }
    termNumber++;
    currentTermDuration *= 2;
  }

  return termNumber;
};

const groupAllocations = (dates: string[]) => {
  const result: MiningData = {};

  dates.forEach((date) => {
    const term = getMiningTerm(new Date(date));
    const allocation = getAllocation(term);
    result[date] = { term, allocation };
  });

  return result;
};

const calculateTermDates = (startDateStr: string) => {
  const startDate = new Date(startDateStr);
  const termLengths = [16, 32, 64, 128, 256, 512, 1024];
  const currentDate = new Date(startDate);
  const allDates: string[] = [];

  for (const termLength of termLengths) {
    for (let i = 0; i < termLength; i++) {
      allDates.push(currentDate.toISOString().split("T")[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return allDates;
};

const getAllocation = (term: number) => {
  const currentTermDuration = MINING_FIRST_TERM_DURATION * 2 ** (term - 1);
  const dailyAllocation = TERM_TOKEN_ALLOCATION / currentTermDuration;
  return Math.floor(dailyAllocation * 1000) / 1000;
};

(() => {
  const groupDate = calculateTermDates(MINING_START_DATE);
  const allocations = groupAllocations(groupDate);
  console.log("allocation", allocations)
})();

const getRewardPerEth = (totalEthDeposited: number) => {
  const currentTerm = getMiningTerm(new Date());
  const dailyAllocation = getAllocation(currentTerm);

  // Short-term and long-term rewards split based on the 1:2 ratio
  const totalRatio = SHORT_TERM_RATIO + LONG_TERM_RATIO;
  const shortTermAllocation = (dailyAllocation * SHORT_TERM_RATIO) / totalRatio;
  const longTermAllocation = (dailyAllocation * LONG_TERM_RATIO) / totalRatio;

  // Rewards per 1 ETH for short-term and long-term
  const rewardPerEthShortTerm = totalEthDeposited > 0 ? shortTermAllocation / totalEthDeposited : 0;
  const rewardPerEthLongTerm = totalEthDeposited > 0 ? longTermAllocation / totalEthDeposited : 0;

  return {
    rewardPerEthShortTerm: Math.floor(rewardPerEthShortTerm * 1000) / 1000,
    rewardPerEthLongTerm: Math.floor(rewardPerEthLongTerm * 1000) / 1000
  };
};

const TokenInfo: React.FC = () => {
  const [data, setData] = useState<{
    tokenName: string;
    claimedAmount: string;
    maxSupply: string;
    lastDepositId: number;
    totalUsers: number;
    totalETH: string;
    noOfPhases: number;
    tokenSymbol: string;
  } | null>(null);

  const [currentMiningTerm, setCurrentMiningTerm] = useState<number>(0);
  const [currentAllocation, setCurrentAllocation] = useState<number>(0);
  const [rewards, setRewards] = useState<{ rewardPerEthShortTerm: number, rewardPerEthLongTerm: number }>({ rewardPerEthShortTerm: 0, rewardPerEthLongTerm: 0 });
  const [totalDepositsFormatted, setTotalDepositsFormatted] = useState<string>("");
  const [totalDailyVolume, setTotalDailyVolume] = useState<string>("");


  const fetchTokenData = async () => {
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
        noOfPhases: Number(noOfPhases),
        tokenSymbol,
      });

      const term = getMiningTerm();
      setCurrentMiningTerm(term);
      setCurrentAllocation(getAllocation(term));

      const totalEthDeposited = parseFloat(formatEther(balance));
      setRewards(getRewardPerEth(totalEthDeposited));

      const totalEthDeposit = await getTotalDeposits();
      setTotalDepositsFormatted(formatNumber(formatEther(totalEthDeposit)));


      const dailyVolume = await getDailyVolume();
      setTotalDailyVolume(formatNumber(formatEther(dailyVolume)));

    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    let isMounted = true;
  
    const fetchData = async () => {
      if (isMounted) {
        await fetchTokenData();
      }
    };
  
    fetchData();
    const interval = setInterval(fetchData, 3600000);
  
    return () => {
      isMounted = false; 
      clearInterval(interval);
    };
  }, []);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const getLogsPaginated = async (fromBlock: bigint, toBlock: bigint, step = 500000n) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let logs: any[] = [];
    let currentBlock = fromBlock;

    while (currentBlock <= toBlock) {
      const endBlock = currentBlock + step - 1n > toBlock ? toBlock : currentBlock + step - 1n;
      try {
        const blockLogs = await client.getLogs({
          address: miningContractAddress,
          event: depositedEventAbi,
          fromBlock: currentBlock,
          toBlock: endBlock,
        });
        logs = logs.concat(blockLogs);
      } catch (error) {
        console.error(`Error fetching logs from ${currentBlock} to ${endBlock}:`, error);
      }
      currentBlock = endBlock + 1n;
      await delay(200);
    }

    return logs;
  };

  const getUniqueAddresses = async () => {
    try {
      const fromBlock = BigInt(21218165);
      const toBlock = BigInt(await provider.getBlockNumber());
      const logs = await getLogsPaginated(fromBlock, toBlock);

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

      return Array.from(uniqueAddresses);
    } catch (error) {
      console.error("Error fetching unique addresses:", error);
      return [];
    }
  };

  const getTotalDeposits = async () => {
    try {
      const fromBlock = BigInt(21218165);
      const toBlock = BigInt(await provider.getBlockNumber());
      const logs = await getLogsPaginated(fromBlock, toBlock);

      let totalDeposits = 0n;
      for (const log of logs) {
        const { args } = decodeEventLog({
          abi: [depositedEventAbi],
          data: log.data,
          topics: log.topics,
        }) as unknown as { args: { amount: bigint } };

        totalDeposits += args.amount;
      }

      return totalDeposits;
    } catch (error) {
      console.error("Error fetching total deposits:", error);
      return 0n;
    }
  };

  const getDailyVolume = async () => {
    try {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const todayStartTimestamp = Math.floor(todayStart.getTime() / 1000);

      const fromBlock = BigInt(21218165); // Replace with actual start block if needed
      const toBlock = BigInt(await provider.getBlockNumber()); // Current block number
      const logs = await getLogsPaginated(fromBlock, toBlock);

      let dailyVolume = 0n;
      for (const log of logs) {
        const { args } = decodeEventLog({
          abi: [depositedEventAbi],
          data: log.data,
          topics: log.topics,
        }) as unknown as { args: { amount: bigint, depositedAt: number } };

        if (args.depositedAt >= todayStartTimestamp) {
          dailyVolume += args.amount;
        }
      }

      return dailyVolume;
    } catch (error) {
      console.error("Error fetching daily volume:", error);
      return 0n;
    }
  };

  return (
    <div>
      <Navbar />
      {data ? (
        <div className='my-[20px] md:my-[30px] p-10 mx-auto'>
          <h1 className="text-3xl font-bold mb-2">Token Details</h1>
          <div className='flex flex-col md:flex-row justify-between space-x-0 md:space-x-2'>
            <div className="bg-[#ffffff] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
              <h2 className="text-xl font-bold">Token Name: {data.tokenName}</h2>
            </div>
            <div className="bg-[#ffffff] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
              <h2 className="text-xl font-bold">Token Symbol: {data.tokenSymbol}</h2>
            </div>
            <div className="bg-[#ffffff] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
              <h2 className="text-xl font-bold">Max Supply: {formatNumber(data.maxSupply)}</h2>
            </div>
          </div>

          <h1 className="text-3xl font-bold mt-10 mb-2">Mining Stats - Base Network</h1>
          <div className='flex flex-col md:flex-row justify-between space-x-0 md:space-x-2'>
            <div className="bg-[#ffffff] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
              <h2 className="text-xl font-bold">Total No of Deposits: {data.lastDepositId}</h2>
            </div>
            <div className="bg-[#ffffff] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
              <h2 className="text-xl font-bold">Total Wallets Mining: {data.totalUsers}</h2>
            </div>
            <div className="bg-[#ffffff] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
              <h2 className="text-xl font-bold">Current Mining Phase: {currentMiningTerm}</h2>
            </div>
          </div>

          <div className='flex flex-col md:flex-row justify-between space-x-0 md:space-x-4'>
            <div className="bg-[#ffffff] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
              <h2 className="text-xl font-bold">Allocation per Day: {formatNumber(currentAllocation)} ITX</h2>
            </div>
            <div className="bg-[#ffffff] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
              <h2 className="text-xl font-bold">Reward per 1 ETH (Short Term): {formatNumber(rewards.rewardPerEthShortTerm)} ITX</h2>
            </div>
            <div className="bg-[#ffffff] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
              <h2 className="text-xl font-bold">Reward per 1 ETH (Long Term): {formatNumber(rewards.rewardPerEthLongTerm)} ITX</h2>
            </div>
          </div>

          <div className='flex flex-col md:flex-row justify-between space-x-0 md:space-x-4'>
            <div className="bg-[#ffffff] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
              <h2 className="text-xl font-bold">Total Claimed Tokens: {formatNumber(data.claimedAmount)} ITX</h2>
            </div>
            <div className="bg-[#ffffff] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
              <h2 className="text-xl font-bold">Amount Of ETH Mined Today: {totalDailyVolume} ETH</h2>
            </div>
            <div className="bg-[#ffffff] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
              <h2 className="text-xl font-bold">Total Deposited ETH on Base: {totalDepositsFormatted} ETH</h2>
            </div>
          </div>

          {/* <div className='flex flex-col md:flex-row justify-between space-x-0 md:space-x-4'>
            <div className="bg-[#ffffff] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
              <h2 className="text-xl font-bold">Total Claimed Tokens: {formatNumber(data.claimedAmount2)} ITX</h2>
            </div>
          </div> */}

          <p className='text-lg italic text-gray-700 mt-4 md:mt-2'>*This information is based on several parameters and could change depending on miners activity.*</p>
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
