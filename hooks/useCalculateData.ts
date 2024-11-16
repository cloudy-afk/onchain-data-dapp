import { useEffect, useState } from 'react';

const useCalculateData = () => {
  const [calculateLoading, setLoading] = useState(true);
  const [calculateError, setError] = useState<string | null>(null);
  const [calculateData, setCalculateData] = useState({
    uniqueAddresses: 0,
    totalEthDeposit: "",
    totalDailyVolume: "",
  });

  useEffect(() => {
    const fetchCalculateData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/calculateData');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}; Message:  ${response.statusText}`);
        }
        const result = await response.json();
        console.log("just checking:", result);
        setCalculateData({
          uniqueAddresses: result.uniqueAddresses,
          totalEthDeposit: result.totalEthDeposit,
          totalDailyVolume: result.totalDailyVolume,
        });
        // setUniqueAddresses(result.uniqueAddresses);
        // setTotalDepositsFormatted(result.totalEthDeposit);
        // setTotalDailyVolume(result.totalDailyVolume);
      } catch (error) {
        console.error('Error fetching token data:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchCalculateData();
  }, []);
  return { calculateLoading, calculateError,calculateData };
};

export default useCalculateData;
