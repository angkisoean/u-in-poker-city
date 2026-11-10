export interface AppConfig {
  network: string;
  chainId: string;
  rpcUrl: string;
  explorerUrl: string;
  tableFactoryAddress: string;
  sphereWalletInstallUrl: string;
}

export const APP_CONFIG: AppConfig = {
  network: import.meta.env.VITE_UNICITY_NETWORK || 'testnet',
  chainId: import.meta.env.VITE_UNICITY_CHAIN_ID || '0x2329',
  rpcUrl: import.meta.env.VITE_UNICITY_RPC_URL || 'https://rpc.testnet.unicity.network',
  explorerUrl: import.meta.env.VITE_UNICITY_EXPLORER_URL || 'https://explorer.testnet.unicity.network',
  tableFactoryAddress: import.meta.env.VITE_TABLE_FACTORY_ADDRESS || '0xUNI_POKER_TABLE_ESCROW_CONTRACT_9921',
  sphereWalletInstallUrl: import.meta.env.VITE_SPHERE_WALLET_INSTALL_URL || 'https://chromewebstore.google.com/detail/unicity-sphere-wallet',
};
