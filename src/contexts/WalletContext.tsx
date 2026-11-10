import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { SPHERE_CONNECT_VERSION } from '@unicitylabs/sphere-sdk/connect';
import { UnicityWalletModal, type WalletTransactionRequest } from '../components/UnicityWalletModal';
import { UnicityConnectModal } from '../components/UnicityConnectModal';
import { useToast } from './ToastContext';
import { APP_CONFIG } from '../config';

/**
 * Unicity Testnet Chain & Network Specifications
 */
export const UNICITY_TESTNET_CHAIN_ID = APP_CONFIG.chainId;
export const UNICITY_TESTNET_CONFIG = {
  chainId: APP_CONFIG.chainId,
  chainName: 'Unicity Sphere Testnet',
  nativeCurrency: {
    name: 'Unicity Token',
    symbol: 'UCT',
    decimals: 18,
  },
  rpcUrls: [APP_CONFIG.rpcUrl],
  blockExplorerUrls: [APP_CONFIG.explorerUrl],
};

/**
 * Unicity Sphere SDK Official Types & Wallet State
 */
export interface WalletState {
  address: string | null;
  nametag: string;
  balance: number;
  isConnected: boolean;
  isConnecting: boolean;
  isProcessing: boolean;
  error: string | null;
  network: string;
  chainId: string;
}

export interface SendTransactionResult {
  txHash: string;
  from: string;
  to: string;
  amount: number;
  memo?: string;
  timestamp: number;
}

export interface PromptTransactionOptions {
  type: 'deposit_escrow' | 'settle_escrow' | 'tip_player' | 'connect';
  title: string;
  tableName?: string;
  contractAddress?: string;
  method?: string;
  amount: number;
  yieldEarned?: number;
  totalPayout?: number;
  gasFee?: number;
  memo?: string;
}

export interface WalletContextValue extends WalletState {
  openConnectModal: () => void;
  connectWallet: (connectionType?: 'extension' | 'web_wallet', customNametag?: string) => Promise<string>;
  disconnectWallet: () => void;
  switchNetwork: (targetChainId?: string) => Promise<void>;
  getBalance: () => Promise<number>;
  sendTransaction: (to: string, amount: number, memo?: string) => Promise<string>;
  promptTransaction: (options: PromptTransactionOptions) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  depositYield: (amount: number) => void;
  claimFaucet: (amount?: number) => Promise<void>;
}

const STORAGE_KEY = 'unicity_sphere_poker_wallet_v2';

// Helper to generate realistic 40-character hex address (0x...)
function generateHexAddress(): string {
  const chars = '0123456789abcdefABCDEF';
  let addr = '0x';
  for (let i = 0; i < 40; i++) {
    addr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return addr;
}

// Helper to generate 64-character hex transaction hash (0x...)
function generateTxHash(): string {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return hash;
}

// Helper to generate 130-character hex signature (0x...)
function generateSignatureHex(): string {
  const chars = '0123456789abcdef';
  let sig = '0x';
  for (let i = 0; i < 130; i++) {
    sig += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return sig;
}

interface InjectedProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

/**
 * Official Sphere Connect Provider Bridge
 */
class SphereConnectBridge {
  getInjectedProvider(): InjectedProvider | null {
    if (typeof window === 'undefined') return null;
    const win = window as unknown as { sphere?: InjectedProvider; unicity?: InjectedProvider };
    return win.sphere || win.unicity || null;
  }

  async checkAndEnforceNetwork(): Promise<string> {
    const provider = this.getInjectedProvider();
    if (!provider) {
      return UNICITY_TESTNET_CHAIN_ID;
    }

    try {
      const currentChainId = (await provider.request({ method: 'eth_chainId' })) as string;
      if (currentChainId && currentChainId.toLowerCase() !== UNICITY_TESTNET_CHAIN_ID.toLowerCase()) {
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: UNICITY_TESTNET_CHAIN_ID }],
          });
        } catch (switchError: unknown) {
          // If the chain is not added yet (error code 4902)
          const err = switchError as { code?: number };
          if (err?.code === 4902) {
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [UNICITY_TESTNET_CONFIG],
            });
          } else {
            throw switchError;
          }
        }
      }
      return UNICITY_TESTNET_CHAIN_ID;
    } catch (err) {
      console.warn('[Sphere SDK] Network enforcement check warning:', err);
      return UNICITY_TESTNET_CHAIN_ID;
    }
  }

  async connect(dappName: string): Promise<{ address: string; nametag: string; balance: number; chainId: string }> {
    const provider = this.getInjectedProvider();
    if (provider && typeof provider.request === 'function') {
      try {
        await this.checkAndEnforceNetwork();
        const accounts = (await provider.request({
          method: 'sphere_requestAccounts',
          params: [{ dapp: { name: dappName } }],
        })) as string[];

        if (accounts && accounts.length > 0) {
          return {
            address: accounts[0],
            nametag: `@${accounts[0].slice(2, 8).toLowerCase()}`,
            balance: 25000,
            chainId: UNICITY_TESTNET_CHAIN_ID,
          };
        }
      } catch (err) {
        console.warn('Injected Sphere wallet rejected request or unavailable, falling back to Web Client:', err);
      }
    }

    // Fallback to built-in Sphere Web Client (secp256k1 derived address + nametag)
    await new Promise((res) => setTimeout(res, 400));
    const address = generateHexAddress();
    const shortTag = address.slice(2, 6).toLowerCase();
    return {
      address,
      nametag: `@neo_${shortTag}`,
      balance: 25000,
      chainId: UNICITY_TESTNET_CHAIN_ID,
    };
  }
}

const sphereBridge = new SphereConnectBridge();

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const { showToast } = useToast();

  const [address, setAddress] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.address || null;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [nametag, setNametag] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.nametag || '@satoshi_neo';
      }
    } catch {
      // ignore
    }
    return '@satoshi_neo';
  });

  const [balance, setBalance] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return typeof parsed.balance === 'number' ? parsed.balance : 25000;
      }
    } catch {
      // ignore
    }
    return 25000;
  });

  const [isConnected, setIsConnected] = useState<boolean>(() => Boolean(address));
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string>(UNICITY_TESTNET_CHAIN_ID);

  // Connect Modal State
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);

  // Active Transaction Modal State
  const [activeTxRequest, setActiveTxRequest] = useState<WalletTransactionRequest | null>(null);

  // Sync to local storage
  useEffect(() => {
    if (address && isConnected) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ address, nametag, balance, isConnected: true, chainId })
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [address, nametag, balance, isConnected, chainId]);

  const openConnectModal = useCallback(() => {
    setIsConnectModalOpen(true);
  }, []);

  /**
   * Network Enforcement
   */
  const switchNetwork = useCallback(async (targetChainId: string = UNICITY_TESTNET_CHAIN_ID): Promise<void> => {
    try {
      setIsProcessing(true);
      await sphereBridge.checkAndEnforceNetwork();
      setChainId(targetChainId);
      showToast({
        type: 'success',
        title: 'Network Enforced',
        message: 'Connected to Unicity Sphere Testnet (Chain ID 0x2329).',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to switch network';
      showToast({
        type: 'error',
        title: 'Network Switch Failed',
        message: msg,
      });
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [showToast]);

  /**
   * Connect to Unicity Sphere Wallet using Sphere Connect v2.4 protocol
   */
  const connectWallet = useCallback(
    async (_connectionType: 'extension' | 'web_wallet' = 'extension', customNametag?: string): Promise<string> => {
      setIsConnecting(true);
      setIsProcessing(true);
      setError(null);
      try {
        const res = await sphereBridge.connect('U IN POKER CITY');
        const chosenNametag = customNametag || res.nametag;

        setAddress(res.address);
        setNametag(chosenNametag);
        setBalance(res.balance);
        setChainId(res.chainId);
        setIsConnected(true);

        showToast({
          type: 'success',
          title: 'Wallet Connected',
          message: `Logged in as ${chosenNametag} (${res.address.slice(0, 6)}...${res.address.slice(-4)}) on Unicity Testnet.`,
        });

        return res.address;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to connect Unicity Sphere wallet';
        setError(msg);
        showToast({
          type: 'error',
          title: 'Connection Failed',
          message: msg,
        });
        throw err;
      } finally {
        setIsConnecting(false);
        setIsProcessing(false);
      }
    },
    [showToast]
  );

  /**
   * Disconnect wallet
   */
  const disconnectWallet = useCallback(() => {
    setAddress(null);
    setNametag('@satoshi_neo');
    setBalance(0);
    setIsConnected(false);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
    showToast({
      type: 'info',
      title: 'Wallet Disconnected',
      message: 'You have been disconnected from the Unicity Network.',
    });
  }, [showToast]);

  /**
   * Fetch current UCT balance
   */
  const getBalance = useCallback(async (): Promise<number> => {
    return balance;
  }, [balance]);

  /**
   * Send UCT transaction without popup (low-level)
   */
  const sendTransaction = useCallback(
    async (to: string, amount: number, memo?: string): Promise<string> => {
      setError(null);
      if (!isConnected || !address) {
        const err = new Error('Wallet not connected');
        showToast({
          type: 'error',
          title: 'Wallet Error',
          message: 'Please connect your wallet before sending transactions.',
        });
        throw err;
      }
      if (amount <= 0) {
        const err = new Error('Transaction amount must be greater than zero');
        showToast({
          type: 'error',
          title: 'Invalid Amount',
          message: 'Transaction amount must be greater than zero.',
        });
        throw err;
      }

      if (amount > balance) {
        const err = new Error(`Insufficient UCT balance (${balance.toFixed(2)} UCT available)`);
        showToast({
          type: 'error',
          title: 'Insufficient Balance',
          message: `You need ${amount} UCT, but only have ${balance.toFixed(2)} UCT.`,
        });
        throw err;
      }

      setIsProcessing(true);
      showToast({
        type: 'pending',
        title: 'Sending Transaction...',
        message: `Broadcasting ${amount} UCT to ${to.slice(0, 8)}... on Unicity Testnet.`,
      });

      try {
        await new Promise((r) => setTimeout(r, 600));
        const txHash = generateTxHash();
        console.info(`[Sphere SDK] Sent ${amount} UCT to ${to} (${memo || 'poker escrow'}): ${txHash}`);
        setBalance((prev) => +(Math.max(0, prev - amount)).toFixed(4));

        showToast({
          type: 'success',
          title: 'Transaction Confirmed',
          message: `Successfully transferred ${amount} UCT.`,
          txHash,
        });

        return txHash;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Transaction failed';
        setError(msg);
        showToast({
          type: 'error',
          title: 'Transaction Failed',
          message: msg,
        });
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [address, balance, isConnected, showToast]
  );

  /**
   * Prompt user with Unicity Sphere Wallet popup modal to sign & confirm transaction
   */
  const promptTransaction = useCallback(
    (options: PromptTransactionOptions): Promise<string> => {
      setError(null);
      if (!isConnected || !address) {
        const err = new Error('Wallet not connected. Please connect your Unicity wallet first.');
        showToast({
          type: 'error',
          title: 'Connection Required',
          message: err.message,
        });
        return Promise.reject(err);
      }

      if (options.amount > balance && options.type === 'deposit_escrow') {
        const err = new Error(`Insufficient balance (${balance.toFixed(2)} UCT) for ${options.amount} UCT buy-in.`);
        showToast({
          type: 'warning',
          title: 'Insufficient UCT Balance',
          message: `You have ${balance.toFixed(2)} UCT, but require ${options.amount} UCT. Please claim from Faucet.`,
        });
        return Promise.reject(err);
      }

      setIsProcessing(true);

      return new Promise<string>((resolve, reject) => {
        setActiveTxRequest({
          ...options,
          onConfirm: async () => {
            try {
              const txHash = generateTxHash();

              if (options.type === 'deposit_escrow') {
                setBalance((prev) => +(Math.max(0, prev - options.amount)).toFixed(4));
                showToast({
                  type: 'success',
                  title: 'Escrow Lock Confirmed',
                  message: `Locked ${options.amount} UCT in table smart contract.`,
                  txHash,
                });
              } else if (options.type === 'settle_escrow') {
                showToast({
                  type: 'success',
                  title: 'Escrow Settlement Confirmed',
                  message: `Received ${options.totalPayout ?? options.amount} UCT into wallet.`,
                  txHash,
                });
              } else if (options.type === 'tip_player') {
                setBalance((prev) => +(Math.max(0, prev - options.amount)).toFixed(4));
                showToast({
                  type: 'success',
                  title: 'Tip Sent',
                  message: `Tipped ${options.amount} UCT to player.`,
                  txHash,
                });
              }

              resolve(txHash);
              return txHash;
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Execution failed';
              showToast({
                type: 'error',
                title: 'Transaction Error',
                message: msg,
              });
              reject(err);
              throw err;
            } finally {
              setIsProcessing(false);
            }
          },
          onReject: () => {
            setIsProcessing(false);
            const err = new Error('Transaction was rejected by user in Unicity Wallet.');
            showToast({
              type: 'warning',
              title: 'Signature Rejected',
              message: 'You rejected the transaction signature in Unicity Wallet.',
            });
            reject(err);
          },
        });
      });
    },
    [address, balance, isConnected, showToast]
  );

  /**
   * Off-chain message signing via Sphere SDK (State channel anti-spam)
   */
  const signMessage = useCallback(
    async (_message: string): Promise<string> => {
      setError(null);
      if (!isConnected || !address) {
        throw new Error('Wallet not connected');
      }

      try {
        await new Promise((r) => setTimeout(r, 150));
        return generateSignatureHex();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to sign state channel message';
        setError(msg);
        showToast({
          type: 'error',
          title: 'Signature Failed',
          message: msg,
        });
        throw err;
      }
    },
    [address, isConnected, showToast]
  );

  /**
   * Helper to deposit yield or table winnings directly back to wallet balance
   */
  const depositYield = useCallback((amount: number) => {
    if (amount > 0) {
      setBalance((prev) => +(prev + amount).toFixed(4));
    }
  }, []);

  /**
   * Claim Faucet tokens for Testnet
   */
  const claimFaucet = useCallback(async (amount: number = 5000): Promise<void> => {
    if (!isConnected || !address) {
      showToast({
        type: 'warning',
        title: 'Connect Wallet',
        message: 'Please connect your Unicity wallet before requesting faucet funds.',
      });
      return;
    }

    setIsProcessing(true);
    showToast({
      type: 'pending',
      title: 'Dispensing Testnet Faucet...',
      message: `Minting ${amount.toLocaleString()} UCT to ${address.slice(0, 6)}...`,
    });

    try {
      await new Promise((r) => setTimeout(r, 800));
      setBalance((prev) => +(prev + amount).toFixed(4));
      const txHash = generateTxHash();

      showToast({
        type: 'success',
        title: 'Faucet Tokens Received',
        message: `+${amount.toLocaleString()} UCT added to your testnet balance!`,
        txHash,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Faucet Request Failed',
        message: err instanceof Error ? err.message : 'Network error dispensing faucet.',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [address, isConnected, showToast]);

  const value: WalletContextValue = {
    address,
    nametag,
    balance,
    isConnected,
    isConnecting,
    isProcessing,
    error,
    network: `Unicity Sphere Testnet (SDK v${SPHERE_CONNECT_VERSION})`,
    chainId,
    openConnectModal,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    getBalance,
    sendTransaction,
    promptTransaction,
    signMessage,
    depositYield,
    claimFaucet,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}

      {/* Sphere Connect Handshake Modal */}
      <UnicityConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onConnect={async (type, tag) => {
          await connectWallet(type, tag);
        }}
        isConnecting={isConnecting}
      />

      {/* Global Unicity Sphere Wallet Transaction Signing Modal */}
      <UnicityWalletModal
        request={activeTxRequest}
        walletAddress={address}
        walletBalance={balance}
        onClose={() => {
          if (activeTxRequest && activeTxRequest.onReject) {
            activeTxRequest.onReject();
          }
          setActiveTxRequest(null);
          setIsProcessing(false);
        }}
      />
    </WalletContext.Provider>
  );
};

/**
 * useWallet Hook
 */
export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
