import { VercelRequest, VercelResponse } from '@vercel/node';
import { ethers } from "ethers";
import { formatEther } from 'viem';
import { kv } from '@vercel/kv';
import { differenceInDays, parse } from "date-fns";

const tokenContractAddress = process.env.VITE_TOKEN_CONTRACT_ADDRESS as `0x${string}`;
const miningContractAddress = process.env.VITE_MINING_CONTRACT_ADDRESS as `0x${string}`;
const key = process.env.VITE_API_KEY;
const CACHE_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes in milliseconds
const MINING_START_DATE = "2024-08-07";
const MINING_FIRST_TERM_DURATION = 16;
const TERM_TOKEN_ALLOCATION = 143_000_000;
const SHORT_TERM_RATIO = 1;
const LONG_TERM_RATIO = 2;


interface CachedMiningData {
  data: {
    uniqueAddresses: number;
    totalEthDeposit: string;
    totalDailyVolume: string;
    rewards: string[];
    term: number;
    currentAllocation: number;
    totalETH: number;
  };
  timestamp: number;
}

const provider = new ethers.JsonRpcProvider(`https://base-mainnet.g.alchemy.com/v2/${key}`);


export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {

    if (!tokenContractAddress || !tokenContractAddress.startsWith('0x')) {
      throw new Error('Invalid or missing token contract address');
    }

    if (!miningContractAddress || !miningContractAddress.startsWith('0x')) {
      throw new Error('Invalid or missing mining contract address');
    }

    const cachedData = await kv.get('miningData') as CachedMiningData | null;

    const currentTime = Date.now();
    if (cachedData && (currentTime - cachedData.timestamp < CACHE_EXPIRY_TIME)) {
      return res.status(200).json(cachedData.data);
    }

    type MiningData = Record<string, { term: number; allocation: number }>;

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
      console.log("allocation", allocations.length)
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

    const balance = await provider.getBalance(miningContractAddress);
    const totalEthDeposited = parseFloat(formatEther(balance));

    const rewards = getRewardPerEth(totalEthDeposited);

    const term = getMiningTerm();

    const currentAllocation = getAllocation(term);


    const data = {
      rewards,
      term,
      currentAllocation,
      totalETH: formatEther(balance),
    };

    await kv.set('miningData', {
      data,
      timestamp: currentTime,
    });

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching token data:", error);
    res.status(500).json({ error: 'Failed to fetch mining data' });
  }
}