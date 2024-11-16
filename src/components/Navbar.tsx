const Navbar: React.FC = () => {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <nav className="flex w-full items-center justify-between bg-[#111111] py-2 shadow-md dark:bg-neutral-700 lg:py-4">
      <div className="flex items-center justify-between w-full px-4 md:px-10 mx-auto">
        <div>
          <a className="flex items-center" href="../App.tsx">
            <span className="text-xl font-semibold text-white">ITX MINING STATS</span>
          </a>
        </div>

        <div className="ml-auto">
          <button
            type="button"
            className="inline-block font-bold rounded bg-white px-4 py-2 text-[#111111] transition duration-150 ease-in-out hover:bg-[#111111] hover:text-white hover:border focus:outline-none focus:ring-2 focus:ring-[#111111]"
            onClick={handleRefresh}
          >
            Refresh
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
