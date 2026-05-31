import React, { useState, useEffect } from 'react';
import { connectWallet, SUPPORTED_CHAINS, getActiveChainId } from '../utils/wallet';
import { useStore } from '../store/useStore';

/**
 * NetworkSwitcher
 * Drop-in component — place it in your Navbar.
 * Lets users switch between Base and OPN Testnet.
 */
export default function NetworkSwitcher() {
  const { setWallet, setProvider } = useStore();
  const [activeChain, setActiveChain] = useState(getActiveChainId());
  const [switching, setSwitching]     = useState(false);

  useEffect(() => {
    if (!window.ethereum) return;
    const handler = (chainId) => setActiveChain(chainId);
    window.ethereum.on('chainChanged', handler);
    return () => window.ethereum.removeListener('chainChanged', handler);
  }, []);

  async function switchTo(chainId) {
    if (chainId === activeChain || switching) return;
    setSwitching(true);
    try {
      const { provider, signer, address } = await connectWallet(chainId);
      setProvider(provider);
      setWallet({ address, signer });
      setActiveChain(chainId);
    } catch (e) {
      console.error('Network switch failed:', e.message);
    } finally {
      setSwitching(false);
    }
  }

  const chains = Object.entries(SUPPORTED_CHAINS);

  return (
    <div style={styles.wrapper}>
      {chains.map(([id, chain]) => (
        <button
          key={id}
          onClick={() => switchTo(id)}
          disabled={switching}
          style={{
            ...styles.btn,
            ...(activeChain === id ? styles.active : styles.inactive),
          }}
        >
          <span style={styles.dot(activeChain === id)} />
          {chain.chainName}
        </button>
      ))}
      {switching && <span style={styles.loading}>switching…</span>}
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: '#F4F6FA',
    borderRadius: '10px',
    padding: '4px',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '5px 12px',
    borderRadius: '7px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.15s',
  },
  active: {
    background: '#fff',
    color: '#0052FF',
    boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
  },
  inactive: {
    background: 'transparent',
    color: '#6B7280',
  },
  dot: (active) => ({
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: active ? '#22c55e' : '#D1D5DB',
    display: 'inline-block',
  }),
  loading: {
    fontSize: '12px',
    color: '#9CA3AF',
    marginLeft: '4px',
  },
};
