/* global BigInt */
import React, { useState, useEffect } from 'react';
import { ZkSendLinkBuilder } from '@mysten/zksend';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { ConnectButton, useWalletKit } from '@mysten/wallet-kit';
import { ClipboardIcon, DownloadIcon, AlertTriangle } from 'lucide-react';

const ONE_SUI = 1000000000n; // 1 SUI = 1,000,000,000 MIST

const GetstashedFrontend = () => {
  const [numLinks, setNumLinks] = useState(1);
  const [amountPerLink, setAmountPerLink] = useState('0.1');
  const [generatedLinks, setGeneratedLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [balance, setBalance] = useState('0'); // Store balance as string

  const { currentAccount, signAndExecuteTransactionBlock } = useWalletKit();
  const client = new SuiClient({ url: getFullnodeUrl("mainnet") });

  useEffect(() => {
    const fetchBalance = async () => {
      if (currentAccount) {
        try {
          const { totalBalance } = await client.getBalance({
            owner: currentAccount.address,
          });
          setBalance(totalBalance.toString()); // Store as string
        } catch (error) {
          console.error("Error fetching balance:", error);
          setError('Failed to fetch balance. Please try again.');
        }
      }
    };

    fetchBalance();
  }, [currentAccount]);

  const createLinks = async () => {
    if (!currentAccount) {
      setError('Please connect your wallet first.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const links = [];
      const numLinksToCreate = Math.min(numLinks, 100);
      const amountInMist = BigInt(Math.floor(parseFloat(amountPerLink) * Number(ONE_SUI)));

      for (let i = 0; i < numLinksToCreate; i++) {
        const link = new ZkSendLinkBuilder({
          sender: currentAccount.address,
          client,
        });
        link.addClaimableMist(amountInMist);
        links.push(link);
      }

     const tx = await ZkSendLinkBuilder.createLinks({ links });      
      const result = await signAndExecuteTransactionBlock({
        transactionBlock: tx,
      });

      console.log("Transaction result:", result);

      const urls = links.map((link) => link.getLink().replace('zksend.com', 'getstashed.com'));
      setGeneratedLinks(urls);

      // Refresh balance after creating links
      const { totalBalance } = await client.getBalance({
        owner: currentAccount.address,
      });
      setBalance(totalBalance.toString());
    } catch (error) {
      console.error("Error creating links:", error);
      setError('An error occurred while creating links. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Format balance for display
  const formatBalance = (balanceInMist) => {
    const balanceInSui = BigInt(balanceInMist) / ONE_SUI;
    return balanceInSui.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 5 });
  };

  const copyAllLinks = () => {
    const allLinks = generatedLinks.join('\n');
    navigator.clipboard.writeText(allLinks).then(() => {
      setCopySuccess('All links copied!');
      setTimeout(() => setCopySuccess(''), 3000);
    }).catch(err => {
      console.error('Failed to copy links: ', err);
      setError('Failed to copy links. Please try again.');
    });
  };

  const downloadLinks = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedLinks.join('\n')], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "getstashed_links.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto w-full px-4 sm:px-0">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-light-blue-500 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
        <div className="relative bg-white shadow-lg sm:rounded-3xl px-4 py-10 sm:p-20">
          <div className="max-w-md mx-auto">
            <h1 className="text-2xl font-semibold mb-6 text-center">Getstashed Bulk Link Generator</h1>
            </div>
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <div className="flex justify-center mb-6">
                  <ConnectButton />
                </div>
                {currentAccount && (
                  <div className="text-sm text-gray-600">
                    <p>Connected: {currentAccount.address.slice(0, 6)}...{currentAccount.address.slice(-4)}</p>
                    <p>Balance: {formatBalance(balance)} SUI</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Number of Links (max 100):
                    <input
                      type="number"
                      value={numLinks}
                      onChange={(e) => setNumLinks(Math.min(parseInt(e.target.value) || 1, MAX_LINKS))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Amount per Link (in SUI):
                    <input
                      type="number"
                      value={amountPerLink}
                      onChange={(e) => setAmountPerLink(parseFloat(e.target.value) || 0)}
                      step="0.1"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </label>
                </div>
                <div className="flex items-center justify-center">
                  <button
                    onClick={createLinks}
                    disabled={isLoading || !currentAccount}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Creating...' : 'Create Links'}
                  </button>
                </div>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              </div>
            {generatedLinks.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Generated Links:</h2>
                <div className="flex justify-between mb-4">
                  <button onClick={copyAllLinks} className="flex items-center bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 text-sm">
                    <ClipboardIcon className="w-4 h-4 mr-2" />
                    Copy All
                  </button>
                  <button onClick={downloadLinks} className="flex items-center bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-sm">
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    Download
                  </button>
                </div>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <div className="flex items-center text-yellow-600 mb-2">
                    <AlertTriangleIcon className="w-5 h-5 mr-2" />
                    <p className="text-sm text-yellow-700">
                      Save these links before closing or refreshing the page. This data will be lost otherwise.
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-md max-h-60 overflow-y-auto">
                  <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
                    {generatedLinks.map((link, index) => (
                      <li key={index}>
                        <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default GetstashedFrontend;


