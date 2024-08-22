import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider, createNetworkConfig, ConnectButton, ConnectModal, lightTheme } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui.js/client';
import GetstashedFrontend from './GetstashedFrontend.js'; // Adjust the import path as necessary
import '@mysten/dapp-kit/dist/index.css';

// Customizing the light theme
const customLightTheme = {
    ...lightTheme,
    backgroundColors: {
        ...lightTheme.backgroundColors,
        primaryButton: '#1a73e8', // Custom blue color for the button
        primaryButtonHover: '#1557b6', // Darker blue on hover
	outlineButtonHover: '#F4F4F5',
	modalOverlay: 'rgba(24 36 53 / 20%)',
	modalPrimary: 'white',
	modalSecondary: '#F7F8F8',
	iconButton: 'transparent',
	iconButtonHover: '#F0F1F2',
	dropdownMenu: '#FFFFFF',
	dropdownMenuSeparator: '#F3F6F8',
	walletItemSelected: 'white',
	walletItemHover: '#3C424226',
    },
    colors: {
        ...lightTheme.colors,
        primaryButton: '#ffffff', // White text color on the button
    },
};

const queryClient = new QueryClient();

const { networkConfig } = createNetworkConfig({
    mainnet: { url: getFullnodeUrl('mainnet') },
    devnet: { url: getFullnodeUrl('devnet') },
});

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <SuiClientProvider networks={networkConfig} defaultNetwork="mainnet">
                <WalletProvider
                    theme={customLightTheme} // Apply the custom theme here
                    autoConnect
                    stashedWallet={{
                        name: 'Getstashed',
                    }}
                >
                    <ConnectModal />  {/* Ensures wallet options appear in a modal */}
                    <GetstashedFrontend />
                </WalletProvider>
            </SuiClientProvider>
        </QueryClientProvider>
    );
}

export default App;
