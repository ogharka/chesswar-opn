import React, { useState } from 'react';
import { claimTestUSDC, isOPNTestnet } from '../utils/wallet';
import { useStore } from '../store/useStore';

/**
 * TestnetFaucet
 * Shows a "Get 1,000 USDC" button on OPN Testnet only.
 * Place it on Dashboard or ProfilePage.
 */
export default function TestnetFaucet() {
  const { wallet } = useStore();
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState('');

  if (!isOPNTestnet() || !wallet) return null;

  async function claim() {
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      await claimTestUSDC(wallet.signer);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (e) {
      const msg = e?.reason || e?.shortMessage || e.message;
      setError(msg.includes('cooldown') ? 'Already claimed today. Try again in 24h.' : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrapper}>
      <span style={styles.label}>🧪 OPN Testnet</span>
      <button onClick={claim} disabled={loading} style={styles.btn}>
        {loading ? 'Claiming…' : success ? '✓ 1,000 USDC claimed!' : 'Get 1,000 Test USDC'}
      </button>
      {error && <span style={styles.error}>{error}</span>}
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '10px',
    marginBottom: '12px',
  },
  label: { fontSize: '13px', color: '#166534', fontWeight: '600' },
  btn: {
    padding: '6px 14px',
    borderRadius: '8px',
    border: 'none',
    background: '#22c55e',
    color: '#fff',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
  },
  error: { fontSize: '12px', color: '#dc2626' },
};
