import React from 'react';
import { WalletKitProvider } from '@mysten/wallet-kit';
import GetstashedFrontend from './ZksendFrontend.js'; // Adjust the import path as necessary

function App() {
  return (
    <WalletKitProvider>
      <GetstashedFrontend />
    </WalletKitProvider>
  );
}

export default App;
