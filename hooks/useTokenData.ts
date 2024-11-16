import { useEffect, useState } from 'react';

interface TokenData {
  tokenName: string;
  claimedAmount: string;
  maxSupply: string;
  lastDepositId: number;
  totalUsers: number;
  totalETH: string;
  noOfPhases: number;
  tokenSymbol: string;
}

const useTokenData = () => {
  const [data, setData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/tokenData');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}; Message:  ${response.statusText}`);
        }
        const result = await response.json();
        setData(result);
      } catch (error) {
          console.error('Error fetching token data:', error);
          setError(error instanceof Error ? error.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
};

export default useTokenData;
