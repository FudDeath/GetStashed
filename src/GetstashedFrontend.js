/* global BigInt */
import React, { useState, useEffect } from 'react';
import { ZkSendLinkBuilder, ZkSendLink } from '@mysten/zksend';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { ClipboardIcon, DownloadIcon, AlertTriangleIcon, UploadIcon } from 'lucide-react';
import './styles.css';

const ONE_SUI = BigInt(1000000000); // 1 SUI = 1,000,000,000 MIST
const MAX_LINKS = 100;

const GetstashedFrontend = () => {
    const [numLinks, setNumLinks] = useState(1);
    const [amountPerLink, setAmountPerLink] = useState(0.1);
    const [generatedLinks, setGeneratedLinks] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [balance, setBalance] = useState(null);
    const [copySuccess, setCopySuccess] = useState('');
    const [uploadedLinks, setUploadedLinks] = useState([]);
    const [isClaimLoading, setIsClaimLoading] = useState(false);
    const [claimResults, setClaimResults] = useState([]);
    const [claimProgress, setClaimProgress] = useState([]);
    const [claimSummary, setClaimSummary] = useState(null);

    const currentAccount = useCurrentAccount();
    const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
    const client = new SuiClient({ url: getFullnodeUrl("mainnet") });

    useEffect(() => {
        const fetchBalance = async () => {
            if (currentAccount) {
                try {
                    const { totalBalance } = await client.getBalance({
                        owner: currentAccount.address,
                    });
                    setBalance(Number(totalBalance) / Number(ONE_SUI));
                } catch (error) {
                    console.error("Error fetching balance:", error);
                    setError('Failed to fetch balance. Please try again.');
                }
            } else {
                setBalance(null);
            }
        };
        fetchBalance();
    }, [currentAccount, client]);

    const refreshBalance = async () => {
        if (currentAccount) {
            try {
                const { totalBalance } = await client.getBalance({
                    owner: currentAccount.address,
                });
                setBalance(Number(totalBalance) / Number(ONE_SUI));
            } catch (error) {
                console.error("Error refreshing balance:", error);
            }
        }
    };

    const createLinks = async () => {
        if (!currentAccount) {
            setError('Please connect your wallet first.');
            return;
        }

        const numLinksToCreate = Math.min(numLinks, MAX_LINKS);
        const totalSuiNeeded = BigInt(Math.floor(amountPerLink * Number(ONE_SUI))) * BigInt(numLinksToCreate);

        // balance is currently in SUI, convert to MIST for comparison
        const currentBalanceInMist = BigInt(Math.floor(Number(balance) * Number(ONE_SUI)));

        if (currentBalanceInMist < totalSuiNeeded) {
            setError(
                `You do not have enough balance. Needed: ${(Number(totalSuiNeeded)/1e9).toFixed(4)} SUI, Available: ${balance !== null ? balance.toFixed(4) : '0'} SUI`
            );
            return;
        }

        setIsLoading(true);
        setError('');
        try {
            const links = [];
            for (let i = 0; i < numLinksToCreate; i++) {
                const link = new ZkSendLinkBuilder({
                    sender: currentAccount.address,
                    client,
                });
                link.addClaimableMist(BigInt(Math.floor(amountPerLink * Number(ONE_SUI))));
                links.push(link);
            }

            const txBlock = await ZkSendLinkBuilder.createLinks({ links });
            await signAndExecuteTransaction(
                { transaction: txBlock },
                {
                    onSuccess: async (result) => {
                        console.log('Transaction successful', result);
                        setGeneratedLinks(links.map((link) => link.getLink().replace('zksend.com', 'getstashed.com')));
                        await refreshBalance();
                    },
                    onError: (err) => {
                        console.error("Error executing transaction:", err);
                        setError('An error occurred while creating links. Please try again.');
                    },
                }
            );

        } catch (error) {
            console.error("Error creating links:", error);
            setError('An error occurred while creating links. Please try again.');
        } finally {
            setIsLoading(false);
        }
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
        const file = new Blob([generatedLinks.join('\n')], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = "getstashed_links.txt";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                const links = content.split('\n').map(link => link.trim()).filter(link => link.length > 0);
                setUploadedLinks(links);
            };
            reader.readAsText(file);
        }
    };

    const massClaimAssets = async () => {
        if (!currentAccount) {
            setError('Please connect your wallet first.');
            return;
        }

        setIsClaimLoading(true);
        setError('');
        setClaimProgress([]);
        const results = [];
        let successfulClaims = 0;

        for (let i = 0; i < uploadedLinks.length; i++) {
            const linkUrl = uploadedLinks[i];
            setClaimProgress(prev => [...prev, `Claiming link ${i + 1}...`]);
            try {
                const link = await ZkSendLink.fromUrl(linkUrl);
                const { balances } = link.assets;
                const claimResult = await link.claimAssets(currentAccount.address);

                const suiBalance = balances.find(b => b.coinType === "0x2::sui::SUI");
                const suiAmount = suiBalance ? Number(suiBalance.amount) / Number(ONE_SUI) : 0;

                results.push({
                    link: linkUrl,
                    claimedAmount: suiAmount.toFixed(4),
                });
                successfulClaims++;
                setClaimProgress(prev => [...prev, `Link ${i + 1} claimed successfully: ${suiAmount.toFixed(4)} SUI`]);
            } catch (error) {
                console.error(`Error claiming assets from link ${linkUrl}:`, error);
                results.push({
                    link: linkUrl,
                    error: error.message,
                });
                setClaimProgress(prev => [...prev, `Error claiming link ${i + 1}: ${error.message}`]);
            }
        }

        setClaimResults(results);
        setClaimSummary(`Successfully claimed ${successfulClaims} out of ${uploadedLinks.length} links.`);
        await refreshBalance(); // Refresh balance after claiming
        setIsClaimLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
                <h1 className="text-2xl font-bold mb-6 text-center">Getstashed Bulk Link Generator</h1>

                <div className="mb-6 flex justify-center">
                    <ConnectButton />
                </div>

                {currentAccount && (
                    <div className="mb-6 text-center">
                        <p className="text-sm text-gray-600">Connected: 0x{currentAccount.address.slice(2, 6)}...{currentAccount.address.slice(-4)}</p>
                        <p className="text-sm text-gray-600">Balance: {balance !== null ? `${balance.toFixed(4)} SUI` : 'Loading...'}</p>
                    </div>
                )}

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Number of Links (max 100):
                        <input
                            type="number"
                            value={numLinks}
                            onChange={(e) => setNumLinks(Math.min(parseInt(e.target.value) || 1, MAX_LINKS))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        />
                    </label>
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount per Link (in SUI):
                        <input
                            type="number"
                            value={amountPerLink}
                            onChange={(e) => setAmountPerLink(parseFloat(e.target.value) || 0)}
                            step="0.1"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        />
                    </label>
                </div>
                <button
                    onClick={createLinks}
                    disabled={isLoading || !currentAccount}
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Creating...' : 'Create Links'}
                </button>

                {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}

                {generatedLinks.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-xl font-semibold mb-4">Generated Links</h2>
                        <div className="flex space-x-2 mb-4">
                            <button onClick={copyAllLinks} className="flex items-center bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50">
                                <ClipboardIcon className="w-5 h-5 mr-2" /> Copy All
                            </button>
                            <button onClick={downloadLinks} className="flex items-center bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                                <DownloadIcon className="w-5 h-5 mr-2" /> Download
                            </button>
                        </div>
                        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
                            <div className="flex">
                                <AlertTriangleIcon className="w-5 h-5 mr-2" />
                                <p>Save these links before closing or refreshing the page. This data will be lost otherwise.</p>
                            </div>
                        </div>
                        <ul className="list-disc pl-5 space-y-1">
                            {generatedLinks.map((link, index) => (
                                <li key={index}>
                                    <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{link}</a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="mt-8">
                    <h2 className="text-xl font-semibold mb-4">Mass Claim Assets</h2>
                    <div className="flex items-center space-x-2 mb-4">
                        <input
                            type="file"
                            accept=".txt"
                            onChange={handleFileUpload}
                            className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-md file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100"
                        />
                        <button
                            onClick={massClaimAssets}
                            disabled={isClaimLoading || !currentAccount || uploadedLinks.length === 0}
                            className="flex items-center bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            <UploadIcon className="w-5 h-5 mr-2" /> {isClaimLoading ? 'Claiming...' : 'Claim Assets'}
                        </button>
                    </div>
                </div>

                {uploadedLinks.length > 0 && (
                    <div className="mt-4">
                        <p className="text-sm text-gray-600">{uploadedLinks.length} links loaded</p>
                    </div>
                )}

                {isClaimLoading && (
                    <div className="mt-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Claiming in progress...</p>
                        <div className="bg-gray-100 p-4 rounded-md max-h-60 overflow-y-auto">
                            {claimProgress.map((progress, index) => (
                                <p key={index} className="text-sm text-gray-700">{progress}</p>
                            ))}
                        </div>
                    </div>
                )}

                {claimSummary && (
                    <div className="mt-4 p-4 bg-green-100 border-l-4 border-green-500 text-green-700">
                        <p className="font-semibold">{claimSummary}</p>
                    </div>
                )}

                {claimResults.length > 0 && (
                    <div className="mt-8">
                        <h3 className="text-lg font-semibold mb-4">Claim Results</h3>
                        <ul className="space-y-2">
                            {claimResults.map((result, index) => (
                                <li key={index} className="bg-gray-50 p-3 rounded-md">
                                    <p className="text-sm text-gray-600">Link {index + 1}: {result.link}</p>
                                    {result.error ? (
                                        <p className="text-sm text-red-500">Error: {result.error}</p>
                                    ) : (
                                        <p className="text-sm font-semibold text-green-600">Claimed: {result.claimedAmount} SUI</p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GetstashedFrontend;
