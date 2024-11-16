import { useEffect, useState } from 'react';

const useMiningData = () => {
  const [miningLoading, setLoading] = useState(true);
  const [miningError, setError] = useState<string | null>(null);
  const [currentMiningTerm, setCurrentMiningTerm] = useState<number>(0);
  const [currentAllocation, setCurrentAllocation] = useState<number>(0);
  const [rewards, setRewards] = useState<{ rewardPerEthShortTerm: number, rewardPerEthLongTerm: number }>({ rewardPerEthShortTerm: 0, rewardPerEthLongTerm: 0 });

  useEffect(() => {
    const fetchMiningData = async () => {
      try {
        const response = await fetch('/api/miningData');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}; Message:  ${response.statusText}`);
        }
        const result = await response.json();
        setCurrentMiningTerm(result.term);
        setCurrentAllocation(result.currentAllocation);
        setRewards(result.rewards);
      } catch (error) {
        console.error('Error fetching token data:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchMiningData();
  }, []);
  return { miningLoading, miningError, rewards, currentMiningTerm,currentAllocation };
};

export default useMiningData;
