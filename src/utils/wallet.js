import { ethers } from 'ethers';

// ─── Chain configs ────────────────────────────────────────────────────────────

export const BASE_CHAIN = {
  chainId: '0x2105',
  chainName: 'Base',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://mainnet.base.org'],
  blockExplorerUrls: ['https://basescan.org'],
};

export const OPN_TESTNET_CHAIN = {
  chainId: '0x3d8', // 984
  chainName: 'OPN Testnet',
  nativeCurrency: { name: 'Test OPN', symbol: 'OPN', decimals: 18 },
  rpcUrls: ['https://testnet-rpc.iopn.tech'],
  blockExplorerUrls: ['https://testnet.iopn.tech'],
};

export const SUPPORTED_CHAINS = {
  '0x2105': BASE_CHAIN,
  '0x3d8':  OPN_TESTNET_CHAIN,
};

// ─── Contract addresses per chain ─────────────────────────────────────────────

export const USDC_ADDRESS = {
  '0x14a34': '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
  '0x2105':  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base mainnet
  '0x3d8':   '0xF672985AD5CeCEA6a81863919cB0210326CA6885', // OPN Testnet (MockUSDC)
};

export const NFT_ADDRESS = {
  '0x2105': '', // your Base ChessWarNFT address here
  '0x3d8':  '0x489bCb3f315C7347CBd3528B4fa2Cb814B567177',
};

export const BET_ADDRESS = {
  '0x2105': '', // your Base ChessWarBet address here
  '0x3d8':  '0xE77042e051A230ce163D2793d47e958149Fb3445',
};

export const CWAR_ADDRESS = {
  '0x2105': '', // your Base CWARToken address here
  '0x3d8':  '0xC9B795Ab9FD9c1444b5F77FBb33a6052b90E12d0',
};

// ─── Active chain (persisted in localStorage) ─────────────────────────────────

export function getActiveChainId() {
  return localStorage.getItem('cw_chain') || '0x2105';
}

export function setActiveChainId(chainId) {
  localStorage.setItem('cw_chain', chainId);
}

export function getActiveChain() {
  return SUPPORTED_CHAINS[getActiveChainId()] || BASE_CHAIN;
}

// ─── ABIs ─────────────────────────────────────────────────────────────────────

export const USDC_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function symbol() view returns (string)',
  // MockUSDC faucet (OPN Testnet only)
  'function faucet() external',
  'function lastFaucet(address) view returns (uint256)',
];

export const NFT_ABI = [
  'function mint(uint8 tier) payable returns (uint256)',
  'function multiplierOf(address wallet) view returns (uint8)',
  'function tierOf(uint256 tokenId) view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function tierConfig(uint8) view returns (uint256 price, uint8 multiplier, uint256 maxSupply)',
];

export const BET_ABI = [
  'function createGame(uint256 stake) returns (uint256)',
  'function joinGame(uint256 gameId)',
  'function cancelGame(uint256 gameId)',
  'function resolveGame(uint256 gameId, address winner)',
  'function getGame(uint256 gameId) view returns (tuple(address playerA, address playerB, uint256 stake, uint8 status))',
  'function nextGameId() view returns (uint256)',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isFarcaster() {
  try { return window.self !== window.top; } catch { return false; }
}

export function isBaseApp() {
  try {
    return !!(window.ethereum?.isCoinbaseWallet) ||
           navigator.userAgent.includes('CoinbaseWallet');
  } catch { return false; }
}

// ─── Connect wallet ───────────────────────────────────────────────────────────

export async function connectWallet(chainId) {
  const targetChainId = chainId || getActiveChainId();
  const targetChain   = SUPPORTED_CHAINS[targetChainId] || BASE_CHAIN;

  async function switchChain(provider) {
    try {
      await provider.send('wallet_switchEthereumChain', [{ chainId: targetChain.chainId }]);
    } catch (e) {
      if (e.code === 4902 || e?.error?.code === 4902) {
        await provider.send('wallet_addEthereumChain', [targetChain]);
      } else throw e;
    }
  }

  // ── Base App ───────────────────────────────────────────────────────────
  if (isBaseApp()) {
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    await switchChain(provider);
    const signer  = await provider.getSigner();
    const address = await signer.getAddress();
    setActiveChainId(targetChainId);
    return { provider, signer, address, chainId: targetChainId };
  }

  // ── Farcaster ──────────────────────────────────────────────────────────
  if (isFarcaster()) {
    try {
      const { sdk } = await import('@farcaster/frame-sdk');
      await sdk.actions.ready();
      const ethProvider = sdk.wallet.ethProvider;
      if (!ethProvider) throw new Error('Farcaster wallet not available');
      const provider = new ethers.BrowserProvider(ethProvider);
      await provider.send('eth_requestAccounts', []);
      await switchChain(provider);
      const signer  = await provider.getSigner();
      const address = await signer.getAddress();
      setActiveChainId(targetChainId);
      return { provider, signer, address, chainId: targetChainId };
    } catch (e) {
      throw new Error('Farcaster wallet connection failed: ' + e.message);
    }
  }

  // ── Regular browser ────────────────────────────────────────────────────
  if (!window.ethereum) throw new Error('No wallet found. Please install MetaMask.');
  await window.ethereum.request({ method: 'eth_requestAccounts' });
  const provider = new ethers.BrowserProvider(window.ethereum);
  await switchChain(provider);
  const signer  = await provider.getSigner();
  const address = await signer.getAddress();
  setActiveChainId(targetChainId);
  return { provider, signer, address, chainId: targetChainId };
}

// ─── Balances ─────────────────────────────────────────────────────────────────

export async function getUSDCBalance(address, provider) {
  const chainId  = getActiveChainId();
  const usdcAddr = USDC_ADDRESS[chainId] || USDC_ADDRESS['0x2105'];
  try {
    const c = new ethers.Contract(usdcAddr, USDC_ABI, provider);
    const [bal, dec] = await Promise.all([c.balanceOf(address), c.decimals()]);
    return parseFloat(ethers.formatUnits(bal, dec)).toFixed(2);
  } catch { return '0.00'; }
}

export async function getETHBalance(address, provider) {
  try {
    const bal = await provider.getBalance(address);
    return parseFloat(ethers.formatEther(bal)).toFixed(4);
  } catch { return '0.0000'; }
}

// ─── Faucet (OPN Testnet only) ────────────────────────────────────────────────

export async function claimTestUSDC(signer) {
  const chainId  = getActiveChainId();
  const usdcAddr = USDC_ADDRESS[chainId];
  if (!usdcAddr) throw new Error('Not on OPN Testnet');
  const usdc = new ethers.Contract(usdcAddr, USDC_ABI, signer);
  const tx   = await usdc.faucet();
  await tx.wait();
  return tx.hash;
}

export const isOPNTestnet = () => getActiveChainId() === '0x3d8';
export const shortAddr    = (a) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '';
export const explorerUrl  = (a) => `${getActiveChain().blockExplorerUrls[0]}/address/${a}`;
export const txUrl        = (hash) => `${getActiveChain().blockExplorerUrls[0]}/tx/${hash}`;

export const PLATFORM_ADDRESS = process.env.REACT_APP_VAULT_ADDRESS || '0x0000000000000000000000000000000000000001';
