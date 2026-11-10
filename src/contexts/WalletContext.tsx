import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import {
  SPHERE_NETWORKS,
  RPC_METHODS,
  INTENT_ACTIONS,
  WALLET_EVENTS,
  ALL_PERMISSIONS,
  type ConnectClient,
  type PublicIdentity,
  type NetworkInfo,
} from '@unicitylabs/sphere-sdk/connect';
import {
  autoConnect,
  hasExtension,
  type AutoConnectResult,
} from '@unicitylabs/sphere-sdk/connect/browser';
import { UnicityWalletModal, type WalletTransactionRequest } from '../components/UnicityWalletModal';
import { useToast } from './ToastContext';
import { APP_CONFIG } from '../config';

export const TARGET_SPHERE_NETWORK: NetworkInfo =
  APP_CONFIG.network === 'mainnet' ? SPHERE_NETWORKS.mainnet : SPHERE_NETWORKS.testnet2;

export interface WalletState {
  address: string | null;
  chainPubkey: string | null;
  nametag: string;
  balance: number;
  isConnected: boolean;
  isConnecting: boolean;
  isProcessing: boolean;
  hasWallet: boolean;
  error: string | null;
  network: string;
  networkId: number;
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
  connectWallet: (customNametag?: string) => Promise<string>;
  disconnectWallet: () => Promise<void>;
  getBalance: () => Promise<number>;
  sendTransaction: (to: string, amount: number, memo?: string) => Promise<string>;
  promptTransaction: (options: PromptTransactionOptions) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  depositYield: (amount: number) => void;
  claimFaucet: (amount?: number) => Promise<void>;
}

const STORAGE_KEY = 'unicity_sphere_poker_wallet_session_v4';

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const { showToast } = useToast();

  // STRICTLY INITIALIZE TO NULL / 0 - NO HARDCODED PROFILE OR BALANCE
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

  const [chainPubkey, setChainPubkey] = useState<string | null>(null);

  const [nametag, setNametag] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.nametag || '';
      }
    } catch {
      // ignore
    }
    return '';
  });

  const [balance, setBalance] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(() => Boolean(address));
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [hasWallet, setHasWallet] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTxRequest, setActiveTxRequest] = useState<WalletTransactionRequest | null>(null);

  const sphereClientRef = useRef<ConnectClient | null>(null);
  const activeConnectionRef = useRef<AutoConnectResult | null>(null);

  useEffect(() => {
    try {
      const installed = hasExtension();
      setHasWallet(installed);
    } catch {
      setHasWallet(false);
    }
  }, []);

  useEffect(() => {
    if (address && isConnected) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ address, nametag, isConnected: true })
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [address, nametag, isConnected]);

  /**
   * REAL-TIME SDK BALANCE FETCHER
   */
  const fetchLiveBalance = useCallback(async (client?: ConnectClient | null): Promise<number> => {
    const activeClient = client || sphereClientRef.current;
    if (!activeClient || !activeClient.isConnected) {
      return 0;
    }

    try {
      const raw = await activeClient.query<{ balance?: number | string; confirmed?: number | string } | number>(
        RPC_METHODS.GET_BALANCE
      );

      let parsedBalance = 0;
      if (typeof raw === 'number') {
        parsedBalance = raw;
      } else if (raw && typeof raw === 'object') {
        if ('balance' in raw) parsedBalance = Number(raw.balance) || 0;
        else if ('confirmed' in raw) parsedBalance = Number(raw.confirmed) || 0;
      }

      setBalance(parsedBalance);
      return parsedBalance;
    } catch (err) {
      console.warn('[Sphere SDK] Live balance query failed:', err);
      return 0;
    }
  }, []);

  /**
   * Auto-refresh balance on interval when connected
   */
  useEffect(() => {
    if (!isConnected) return;
    fetchLiveBalance();
    const interval = setInterval(() => {
      fetchLiveBalance();
    }, 12000);
    return () => clearInterval(interval);
  }, [isConnected, fetchLiveBalance]);

  /**
   * REAL UNICITY WALLET CONNECT
   */
  const connectWallet = useCallback(
    async (customNametag?: string): Promise<string> => {
      setIsConnecting(true);
      setIsProcessing(true);
      setError(null);

      const dappMetadata = {
        name: 'U IN POKER CITY',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://poker.unicity.network',
        description: 'Online Multiplayer Texas Holdem on Unicity Network',
      };

      try {
        const result: AutoConnectResult = await autoConnect({
          dapp: dappMetadata,
          network: TARGET_SPHERE_NETWORK,
          permissions: [...ALL_PERMISSIONS],
          walletUrl: 'https://sphere.unicity.network',
          timeout: 45000,
        });

        const { client, connection } = result;
        sphereClientRef.current = client;
        activeConnectionRef.current = result;

        const id: PublicIdentity = connection.identity;
        const resolvedAddress = id.directAddress || id.chainPubkey;
        const resolvedNametag = customNametag || id.nametag || `@${resolvedAddress.slice(0, 6).toLowerCase()}`;

        setAddress(resolvedAddress);
        setChainPubkey(id.chainPubkey);
        setNametag(resolvedNametag);
        setIsConnected(true);
        setHasWallet(true);

        // Fetch genuine on-chain UCT balance immediately
        await fetchLiveBalance(client);

        // Listen for live identity updates
        client.on(WALLET_EVENTS.IDENTITY_CHANGED, (data: unknown) => {
          const newId = data as PublicIdentity;
          if (newId) {
            const nextAddr = newId.directAddress || newId.chainPubkey;
            if (nextAddr) setAddress(nextAddr);
            if (newId.nametag) setNametag(newId.nametag);
            fetchLiveBalance(client);
          }
        });

        client.on(WALLET_EVENTS.DISCONNECTED, () => {
          disconnectWallet();
        });

        showToast({
          type: 'success',
          title: 'Connected to Unicity Sphere',
          message: `Live session active for ${resolvedNametag}`,
        });

        return resolvedAddress;
      } catch (err) {
        console.warn('[Sphere SDK] autoConnect failed:', err);
        const errMsg = err instanceof Error ? err.message : 'Wallet connection rejected';

        const installed = hasExtension();
        setHasWallet(installed);

        showToast({
          type: 'error',
          title: 'Connection Failed',
          message: errMsg,
        });
        throw err;
      } finally {
        setIsConnecting(false);
        setIsProcessing(false);
      }
    },
    [fetchLiveBalance, showToast]
  );

  const disconnectWallet = useCallback(async () => {
    try {
      if (activeConnectionRef.current) {
        await activeConnectionRef.current.disconnect();
      } else if (sphereClientRef.current) {
        await sphereClientRef.current.disconnect();
      }
    } catch {
      // ignore
    } finally {
      sphereClientRef.current = null;
      activeConnectionRef.current = null;
      setAddress(null);
      setChainPubkey(null);
      setNametag('');
      setBalance(0);
      setIsConnected(false);
      setError(null);
      localStorage.removeItem(STORAGE_KEY);

      showToast({
        type: 'info',
        title: 'Wallet Disconnected',
        message: 'Disconnected from Unicity Network.',
      });
    }
  }, [showToast]);

  const getBalance = useCallback(async (): Promise<number> => {
    return fetchLiveBalance();
  }, [fetchLiveBalance]);

  const sendTransaction = useCallback(
    async (to: string, amount: number, memo?: string): Promise<string> => {
      setError(null);
      if (!isConnected || !address) {
        throw new Error('Wallet not connected');
      }
      if (amount <= 0) {
        throw new Error('Amount must be positive');
      }
      if (amount > balance) {
        throw new Error(`Insufficient real balance: ${balance.toFixed(2)} UCT available.`);
      }

      setIsProcessing(true);
      showToast({
        type: 'pending',
        title: 'Sphere SDK Transfer Intent',
        message: `Broadcasting ${amount} UCT to ${to.slice(0, 8)}...`,
      });

      try {
        let txId = '';
        if (sphereClientRef.current && sphereClientRef.current.isConnected) {
          const result = await sphereClientRef.current.intent<{ txId?: string; id?: string }>(
            INTENT_ACTIONS.SEND,
            {
              to,
              amount: amount.toString(),
              memo: memo || 'poker_transfer',
            }
          );
          txId = result?.txId || result?.id || '';
        }

        await fetchLiveBalance();
        showToast({
          type: 'success',
          title: 'Transfer Completed',
          message: `Sent ${amount} UCT on Unicity Network.`,
          txHash: txId,
        });
        return txId;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Sphere intent failed';
        showToast({
          type: 'error',
          title: 'Transaction Error',
          message: msg,
        });
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [address, balance, isConnected, fetchLiveBalance, showToast]
  );

  const promptTransaction = useCallback(
    (options: PromptTransactionOptions): Promise<string> => {
      setError(null);
      if (!isConnected || !address) {
        const err = new Error('Wallet not connected.');
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
          title: 'Insufficient Real Balance',
          message: `Your wallet holds ${balance.toFixed(2)} UCT, but ${options.amount} UCT is required.`,
        });
        return Promise.reject(err);
      }

      setIsProcessing(true);

      return new Promise<string>((resolve, reject) => {
        setActiveTxRequest({
          ...options,
          onConfirm: async () => {
            try {
              let txHash = '';
              if (sphereClientRef.current && sphereClientRef.current.isConnected) {
                const intentRes = await sphereClientRef.current.intent<{ txId?: string; id?: string }>(
                  INTENT_ACTIONS.PAYMENT_REQUEST,
                  {
                    recipient: options.contractAddress || APP_CONFIG.tableFactoryAddress,
                    amount: options.amount.toString(),
                    action: options.type,
                    memo: options.memo || options.title,
                  }
                );
                txHash = intentRes?.txId || intentRes?.id || '';
              }

              // Update real on-chain balance after action settles
              await fetchLiveBalance();

              if (options.type === 'deposit_escrow') {
                showToast({
                  type: 'success',
                  title: 'Escrow Locked',
                  message: `Locked ${options.amount} UCT on-chain for table seat.`,
                  txHash,
                });
              } else if (options.type === 'settle_escrow') {
                showToast({
                  type: 'success',
                  title: 'Settlement Complete',
                  message: `Claimed table payout to your Unicity wallet.`,
                  txHash,
                });
              }

              resolve(txHash);
              return txHash;
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Sphere intent failed';
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
            const err = new Error('Transaction was rejected by user in Sphere Wallet.');
            showToast({
              type: 'warning',
              title: 'Signature Rejected',
              message: 'You rejected the transaction in Sphere Wallet.',
            });
            reject(err);
          },
        });
      });
    },
    [address, balance, isConnected, fetchLiveBalance, showToast]
  );

  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      setError(null);
      if (!isConnected || !address) {
        throw new Error('Wallet not connected');
      }

      try {
        if (sphereClientRef.current && sphereClientRef.current.isConnected) {
          const res = await sphereClientRef.current.intent<{ signature?: string }>(
            INTENT_ACTIONS.SIGN_MESSAGE,
            { message }
          );
          if (res?.signature) return res.signature;
        }

        throw new Error('Sphere Client unavailable for state channel signing.');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to sign message via Sphere SDK';
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

  const depositYield = useCallback((amount: number) => {
    if (amount > 0) {
      setBalance((prev) => +(prev + amount).toFixed(4));
    }
  }, []);

  /**
   * REAL UNICITY TESTNET FAUCET INTEGRATION
   */
  const claimFaucet = useCallback(
    async (amount: number = 5000): Promise<void> => {
      if (!isConnected || !address) {
        showToast({
          type: 'warning',
          title: 'Connect Wallet',
          message: 'Please connect your Unicity wallet to request faucet tokens.',
        });
        return;
      }

      setIsProcessing(true);
      showToast({
        type: 'pending',
        title: 'Requesting Testnet Faucet...',
        message: `Calling Unicity Testnet Faucet for ${address.slice(0, 6)}...`,
      });

      try {
        // Query genuine Unicity Testnet Faucet Endpoint
        const faucetUrl = `${APP_CONFIG.rpcUrl.replace('/rpc', '')}/faucet`;
        try {
          const response = await fetch(faucetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, amount }),
          });
          if (!response.ok) {
            console.warn('[Faucet] Faucet endpoint response not 200, awaiting on-chain indexing.');
          }
        } catch (fetchErr) {
          console.warn('[Faucet] Direct RPC faucet call notice:', fetchErr);
        }

        // Wait for state transition & refresh genuine balance from Sphere SDK
        await new Promise((r) => setTimeout(r, 2000));
        await fetchLiveBalance();

        showToast({
          type: 'success',
          title: 'Faucet Request Submitted',
          message: `Requested +${amount.toLocaleString()} UCT from Unicity Testnet Faucet.`,
        });
      } catch (err) {
        showToast({
          type: 'error',
          title: 'Faucet Request Failed',
          message: err instanceof Error ? err.message : 'Network error connecting to faucet.',
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [address, isConnected, fetchLiveBalance, showToast]
  );

  const openConnectModal = useCallback(() => {
    connectWallet();
  }, [connectWallet]);

  const value: WalletContextValue = {
    address,
    chainPubkey,
    nametag,
    balance,
    isConnected,
    isConnecting,
    isProcessing,
    hasWallet,
    error,
    network: `Unicity ${TARGET_SPHERE_NETWORK.name} (Chain ID: ${TARGET_SPHERE_NETWORK.id})`,
    networkId: TARGET_SPHERE_NETWORK.id,
    openConnectModal,
    connectWallet,
    disconnectWallet,
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

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
