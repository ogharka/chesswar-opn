import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { ethers } from 'ethers';
import { loginWithWallet } from '../../utils/api';
import toast from 'react-hot-toast';

export default function ConnectPage() {
  const { setWallet, setProvider, initProfile, updateProfile, setPoints, setNftBoost } = useStore();
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      let provider, signer, address;

      // Try window.ethereum first (Base App, MetaMask, Coinbase Wallet)
      if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send('eth_requestAccounts', []);
        // Switch to Base
        try {
          await provider.send('wallet_switchEthereumChain', [{ chainId: '0x2105' }]);
        } catch (e) {
          if (e.code === 4902) {
            await provider.send('wallet_addEthereumChain', [{
              chainId: '0x2105', chainName: 'Base',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org']
            }]);
          }
        }
        signer = await provider.getSigner();
        address = await signer.getAddress();
      }
      // Try Farcaster SDK
      else {
        const { sdk } = await import('@farcaster/frame-sdk');
        await sdk.actions.ready();
        const ethProvider = sdk.wallet.ethProvider;
        provider = new ethers.BrowserProvider(ethProvider);
        await provider.send('eth_requestAccounts', []);
        signer = await provider.getSigner();
        address = await signer.getAddress();
      }

      setProvider(provider);
      setWallet({ address, signer });
      initProfile(address);
      try { localStorage.removeItem('cw_just_disconnected'); } catch {}

      // Load user data
      try {
        await loginWithWallet(signer);
        const res = await fetch(`https://ws.chesswar.xyz/user/${address}`);
        const user = await res.json();
        if (user?.username && user.username !== 'Anonymous') {
          updateProfile({ username: user.username });
          if (user.points) setPoints(user.points);
          if (user.nft_boost) setNftBoost(user.nft_boost);
        }
      } catch {}

      toast.success('Wallet connected!');
    } catch (err) {
      toast.error(err.message || 'Connection failed');
    }
    setLoading(false);
  };

  return (
    <div className="connect-page">
      <div className="connect-card">
        <img src="/logo192.png" alt="ChessWar" style={{width:80,height:80,borderRadius:18,marginBottom:8}} />
        <h1 className="cc-title">ChessWar</h1>
        <p className="cc-sub">Play chess. Earn USDC. Dominate the board.</p>
        <div className="cc-features">
          {[
            { icon: '⚔️', title: 'Bet Battle',   sub: 'USDC wager · winner takes all' },
            { icon: '🏆', title: 'Tournaments',  sub: '10 USDC entry · prize pool'     },
            { icon: '★',  title: 'Earn Points',  sub: '5× boost on bet games'         },
            { icon: '◈',  title: 'War NFTs',     sub: 'Up to 5× point multiplier'     },
            { icon: '♙',  title: 'vs Computer',  sub: 'Practice & improve'            },
            { icon: '🪂', title: 'CWAR Airdrop', sub: '1B tokens · top earners win'   },
          ].map((f, i) => (
            <div key={i} className="cc-feat">
              <div className="cc-feat-icon">{f.icon}</div>
              <div className="cc-feat-info">
                <div className="cc-feat-title">{f.title}</div>
                <div className="cc-feat-sub">{f.sub}</div>
              </div>
            </div>
          ))}
        </div>
        <button className="cc-connect" onClick={handleConnect} disabled={loading}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          {loading ? 'Connecting...' : 'Connect Wallet'}
        </button>
        <p className="cc-base">MetaMask · Coinbase Wallet · Base Network</p>
      </div>
    </div>
  );
}
