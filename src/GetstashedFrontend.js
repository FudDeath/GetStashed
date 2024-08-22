/* global BigInt */
import React, { useState, useEffect } from 'react';
import { ZkSendLinkBuilder } from '@mysten/zksend';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
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
            const numLinksToCreate = Math.min(numLinks, MAX_LINKS);

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
                    onSuccess: (result) => {
                        console.log('Transaction successful', result);
                        setGeneratedLinks(links.map((link) => link.getLink().replace('zksend.com', 'getstashed.com')));
                        refreshBalance();
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

    return (
        <div className="min-h-screen bg-gray-100 py-6 flex flex-col items-center sm:py-12">
            {/* Wallet Connection Button */}
            <div className="w-full flex justify-end pr-6 mb-4">
                <ConnectButton className="wallet-connect-button" />
            </div>
            <div className="bg-white shadow-lg sm:rounded-3xl px-8 py-10 sm:p-20 w-full max-w-md">
                <h1 className="text-2xl font-semibold text-center mb-6">Getstashed Bulk Link Generator</h1>
                <div className="space-y-4">
                    {balance !== null && (
                        <div className="text-center text-sm text-gray-600 mb-4">
                            <p>Connected: 0x{currentAccount?.address.slice(2, 6)}...{currentAccount?.address.slice(-4)}</p>
                            <p>Balance: {balance.toFixed(4)} SUI</p>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
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
                    </div>
                    <div className="flex justify-center mt-6">
                        <button
                            onClick={createLinks}
                            disabled={isLoading || !currentAccount}
                            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Creating...' : 'Create Links'}
                        </button>
                    </div>
                    {error && <p className="text-red-500 text-center text-sm mt-2">{error}</p>}
                </div>
            </div>
        </div>
    );
}

export default GetstashedFrontend;

