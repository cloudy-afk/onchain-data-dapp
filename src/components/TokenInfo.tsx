import Navbar from './Navbar';
import useTokenData from '../../hooks/useTokenData';
import useMiningData from '../../hooks/useMiningData';
import useCalculateData from '../../hooks/useCalculateData';


const formatNumber = (num: number | string) => {
  return parseFloat(num.toString()).toLocaleString();
};

const TokenInfo: React.FC = () => {
  const { data: tokenData, loading: tokenLoading, error: tokenError } = useTokenData();
  const { miningLoading, miningError, rewards, currentMiningTerm, currentAllocation } = useMiningData();
  const { calculateLoading, calculateError, calculateData } = useCalculateData();
  const { uniqueAddresses, totalEthDeposit, totalDailyVolume } = calculateData;

  return (
    <div>
      <Navbar />
      <div className='my-[20px] md:my-[30px] p-10 mx-auto'>
        <h1 className="text-3xl font-bold mb-2">Token Details</h1>
        <div className='flex flex-col md:flex-row justify-between space-x-0 md:space-x-2'>
          <div className="bg-[#ffffff] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
            <h2 className="text-xl font-bold">
              Token Name: {tokenError ? "Error" : tokenData ? tokenData.tokenName : tokenLoading ? "Loading..." : "N/A"}
            </h2>
          </div>
          <div className="bg-[#ffffff] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
            <h2 className="text-xl font-bold">
              Token Symbol: {tokenError ? "Error" : tokenData ? tokenData.tokenSymbol : tokenLoading ? "Loading..." : "N/A"}
            </h2>
          </div>
          <div className="bg-[#ffffff] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
            <h2 className="text-xl font-bold">
              Max Supply: {tokenError ? "Error" : tokenData ? formatNumber(tokenData.maxSupply) : tokenLoading ? "Loading..." : "N/A"}
            </h2>
          </div>
        </div>

        <h1 className="text-3xl font-bold mt-10 mb-2">Mining Stats - Base Network</h1>
        <div className='flex flex-col md:flex-row justify-between space-x-0 md:space-x-2'>
          <div className="bg-[#ffffff] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
            <h2 className="text-xl font-bold">
              Total No of Deposits: {tokenError ? "Error" : tokenData ? tokenData.lastDepositId : tokenLoading ? "Loading..." : "N/A"}
            </h2>
          </div>
          <div className="bg-[#ffffff] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
            <h2 className="text-xl font-bold">
              Total Wallets Mining: {calculateError ? "Error" : calculateLoading ? "Loading..." : uniqueAddresses || "N/A"}
            </h2>
          </div>
          <div className="bg-[#ffffff] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
            <h2 className="text-xl font-bold">
              Current Mining Phase: {miningError ? "Error" : currentMiningTerm ? currentMiningTerm + " / " + tokenData?.noOfPhases : miningLoading ? "Loading..." : "N/A"}
            </h2>
          </div>
        </div>

        <div className='flex flex-col md:flex-row justify-between space-x-0 md:space-x-4'>
          <div className="bg-[#ffffff] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
            <h2 className="text-xl font-bold">Allocation per Day: {currentAllocation ? formatNumber(currentAllocation) + " " + "ITX" : "Loading..."}</h2>
          </div>
          <div className="bg-[#ffffff] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
            <h2 className="text-xl font-bold">Reward per 1 ETH (Short Term): {rewards.rewardPerEthShortTerm ? formatNumber(rewards.rewardPerEthShortTerm) + " " + "ITX" : "Loading..."}</h2>
          </div>
          <div className="bg-[#ffffff] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
            <h2 className="text-xl font-bold">Reward per 1 ETH (Long Term): {rewards.rewardPerEthLongTerm ? formatNumber(rewards.rewardPerEthLongTerm) + " " + "ITX" : "Loading..."}</h2>
          </div>
        </div>

        <div className='flex flex-col md:flex-row justify-between space-x-0 md:space-x-4'>
          <div className="bg-[#ffffff] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
            <h2 className="text-xl font-bold">
              Total Claimed Tokens: {tokenError ? "Error" : tokenData ? tokenData.claimedAmount : tokenLoading ? "Loading..." : "N/A"}
            </h2>
          </div>
          <div className="bg-[#ffffff] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
            <h2 className="text-xl font-bold">
              Amount Of ETH Mined Today: {calculateError ? "Error" : calculateLoading ? "Loading..." : totalDailyVolume ? `${totalDailyVolume} ETH` : "N/A"}
            </h2>
          </div>
          <div className="bg-[#ffffff] p-8 md:p-10 lg:p-[70px] my-2 md:my-5 border border-[#ccc] rounded-lg w-full">
            <h2 className="text-xl font-bold">
              Total Deposited ETH on Base: {calculateError ? "Error" : calculateLoading ? "Loading..." : totalEthDeposit ? `${totalEthDeposit} ETH` : "N/A"}
            </h2>
          </div>
        </div>

        <p className='text-lg italic text-gray-700 mt-4 md:mt-2'>*This information is based on several parameters and could change depending on miners activity.*</p>
      </div>
    </div>
  );
};

export default TokenInfo;
