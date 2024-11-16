import { VercelRequest, VercelResponse } from '@vercel/node';
import { createPublicClient, http, decodeEventLog } from 'viem';
import { ethers } from "ethers";
import { formatEther } from 'viem';
import { base } from 'viem/chains';
import { kv } from '@vercel/kv';
import { depositedEventAbi } from '../src/abi/depositedEventAbi.js';

const tokenContractAddress = process.env.VITE_TOKEN_CONTRACT_ADDRESS as `0x${string}`;
const miningContractAddress = process.env.VITE_MINING_CONTRACT_ADDRESS as `0x${string}`;
const key = process.env.VITE_API_KEY;
const CACHE_EXPIRY_TIME = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

interface CachedCalculateData {
  data: {
    uniqueAddresses: number;
    totalEthDeposit: string;
    totalDailyVolume: string;
  };
  timestamp: number;
}

const client = createPublicClient({
  chain: base,
  transport: http(`https://base-mainnet.g.alchemy.com/v2/${key}`),
});
const provider = new ethers.JsonRpcProvider(`https://base-mainnet.g.alchemy.com/v2/${key}`);

const formatNumber = (num: number | string) => {
  return parseFloat(num.toString()).toLocaleString();
};
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {

    if (!tokenContractAddress || !tokenContractAddress.startsWith('0x')) {
      throw new Error('Invalid or missing token contract address');
    }

    if (!miningContractAddress || !miningContractAddress.startsWith('0x')) {
      throw new Error('Invalid or missing mining contract address');
    }

    const cachedData = await kv.get('calculateData') as CachedCalculateData | null;

    console.log('Cached data:', cachedData);

    const currentTime = Date.now();
    if (cachedData && (currentTime - cachedData.timestamp < CACHE_EXPIRY_TIME)) {
      return res.status(200).json(cachedData.data);
    }

    const getLogsPaginated = async (fromBlock: bigint, toBlock: bigint, step = 100000n) => {
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
          }).catch(err => {
            console.error('Error fetching logs:', err);
            throw new Error('Failed to fetch logs');
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
        console.log('From Block:', fromBlock, 'To Block:', toBlock);

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
        console.log('From Block:', fromBlock, 'To Block:', toBlock);

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
        const toBlock = BigInt(await provider.getBlockNumber());
        const logs = await getLogsPaginated(fromBlock, toBlock);
        console.log('From Block:', fromBlock, 'To Block:', toBlock);

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

    const [uniqueAddressesFetched, ethDepositTotal, dailyVolume] = await Promise.all([
      getUniqueAddresses(),
      getTotalDeposits(),
      getDailyVolume(),
    ]);

    console.log('Fetched Data:', { uniqueAddressesFetched, ethDepositTotal, dailyVolume });


    const uniqueAddresses = uniqueAddressesFetched.length;
    console.log('uniqueAddressesFetched:', uniqueAddresses);

    const totalEthDeposit = formatNumber(formatEther(ethDepositTotal));
    console.log('totalEthDeposit:', totalEthDeposit);

    const totalDailyVolume = (formatNumber(formatEther(dailyVolume)));
    console.log('totalDailyVolume:', totalDailyVolume);

    const data = {
      uniqueAddresses,
      totalEthDeposit,
      totalDailyVolume,
    };

    await kv.set('calculateData', {
      data,
      timestamp: currentTime,
    });

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching calculated data:", error);
    res.status(500).json({ error: 'Failed to fetch mining data' });
  }
}