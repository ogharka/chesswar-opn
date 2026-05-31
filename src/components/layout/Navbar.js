import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { ethers } from 'ethers';
import WalletModal from './WalletModal';
import NetworkSwitcher from './NetworkSwitcher';
import NetworkSwitcher from './NetworkSwitcher';

const USDC_ABI = ['function balanceOf(address) view returns (uint256)'];
const USDC_ADDR = process.env.REACT_APP_USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

const PlayIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
    <rect x="2" y="2" width="9" height="9" rx="2"/>
    <rect x="13" y="2" width="9" height="9" rx="2"/>
    <rect x="2" y="13" width="9" height="9" rx="2"/>
    <rect x="13" y="13" width="9" height="9" rx="2"/>
  </svg>
);
const CompeteIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
    <path d="M8 21h8M12 21v-4"/>
    <path d="M7 4H4v6a8 8 0 0 0 16 0V4h-3"/>
    <path d="M7 4h10"/>
  </svg>
);
const RanksIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6"  y1="20" x2="6"  y2="14"/>
  </svg>
);
const MoreIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
    <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
  </svg>
);

export default function Navbar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { points, nftBoost, profile, wallet, disconnect } = useStore();
  const [showWallet,     setShowWallet]     = useState(false);
  const [usdcBal,        setUsdcBal]        = useState('0.00');
  const [showDisconnect, setShowDisconnect] = useState(false);

  useEffect(() => {
    if (!showDisconnect) return;
    const handler = () => setShowDisconnect(false);
    setTimeout(() => document.addEventListener('click', handler), 0);
    return () => document.removeEventListener('click', handler);
  }, [showDisconnect]);

  useEffect(() => {
    if (!wallet?.address) return;
    const load = async () => {
      try {
        // Fetch in-app balance from server
        const res = await fetch(`https://ws.chesswar.xyz/balance/${wallet.address}`);
        const data = await res.json();
        setUsdcBal(parseFloat(data.usdc_balance || 0).toFixed(2));
      } catch {
        // Fallback to blockchain balance
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const contract = new ethers.Contract(USDC_ADDR, USDC_ABI, provider);
          const bal = await contract.balanceOf(wallet.address);
          setUsdcBal(parseFloat(ethers.formatUnits(bal, 6)).toFixed(2));
        } catch { setUsdcBal('0.00'); }
      }
    };
    load();
    // Refresh every 30 seconds
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [wallet?.address]);

  const path = location.pathname;
  const tabs = [
    { path: '/',            label: 'Play',    Icon: PlayIcon    },
    { path: '/tournament',  label: 'Compete', Icon: CompeteIcon },
    { path: '/leaderboard', label: 'Ranks',   Icon: RanksIcon   },
    { path: '/profile',     label: 'More',    Icon: MoreIcon    },
  ];

  return (
    <>
      <div className="top-bar">
        <div className="tb-brand">
          <div className="tb-logo">♟</div>
          <span className="tb-name">ChessWar</span>
        </div>
        <div className="tb-right">
          <NetworkSwitcher />
          <NetworkSwitcher />
          <button className="tb-chip tb-pts" onClick={() => navigate('/profile')}>
            <span>★</span>
            <span>{points.toLocaleString()}</span>
            <span className="tb-boost">{nftBoost}×</span>
          </button>
          <button className="tb-chip tb-wallet" onClick={() => setShowWallet(true)}>
            <span style={{color:'var(--green)',fontWeight:700}}>$</span>
            <span>{usdcBal}</span>
          </button>
          {wallet && (
            <div style={{position:'relative'}}>
              <button className="tb-addr" onClick={() => setShowDisconnect(v => !v)}>
                <span className="tb-addr-dot" />
                <span>{wallet.address.slice(0,4)}...{wallet.address.slice(-4)}</span>
              </button>
              {showDisconnect && (
                <div className="tb-disconnect-menu">
                  <button onClick={() => { setShowWallet(true); setShowDisconnect(false); }}>
                    Deposit / Withdraw
                  </button>
                  <button className="tb-disconnect-btn" onClick={() => { localStorage.setItem("cw_just_disconnected","1"); disconnect(); window.location.href = "/"; }}>
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <nav className="bottom-tabs">
        {tabs.map((t) => (
          <button key={t.path} className={`tab-btn ${path === t.path ? 'active' : ''}`} onClick={() => navigate(t.path)}>
            <t.Icon active={path === t.path} />
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      {showWallet && <WalletModal onClose={() => setShowWallet(false)} />}
    </>
  );
}
