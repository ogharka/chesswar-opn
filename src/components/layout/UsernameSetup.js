import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import toast from 'react-hot-toast';

const AVATARS = ['♔', '♕', '♖', '♗', '♘', '♙'];

export default function UsernameSetup({ onDone }) {
  const { updateProfile, wallet } = useStore();
  const [username, setUsername] = useState('');
  const [avatar, setAvatar]     = useState(0);
  const [error, setError]       = useState('');

  const validate = (val) => {
    if (val.length < 3)  return 'Minimum 3 characters';
    if (val.length > 20) return 'Maximum 20 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(val)) return 'Letters, numbers and _ only';
    return '';
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setUsername(val);
    setError(validate(val));
  };

  const handleSubmit = () => {
    const err = validate(username);
    if (err) { setError(err); return; }
    const trimmed = username.trim();
    updateProfile({ username: trimmed, avatar });
    // Sync to server so other devices can fetch it
    if (wallet?.address) {
      fetch('https://ws.chesswar.xyz/sync-points', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ address: wallet.address, username: trimmed, points: 0, gamesPlayed: 0, wins: 0, nftBoost: 1 })
      }).catch(() => {});
    }
    toast.success(`Welcome to ChessWar, ${username}!`);
    onDone();
  };

  return (
    <div className="us-overlay">
      <div className="us-card">

        <div className="us-header">
          <div className="us-chess-icon">♟♙</div>
          <h2>Create Your Profile</h2>
          <p>Choose a name that will appear on the leaderboard and in battles</p>
        </div>

        {/* Avatar picker */}
        <div className="us-section">
          <label className="us-label">Choose Avatar</label>
          <div className="us-avatars">
            {AVATARS.map((a, i) => (
              <button
                key={i}
                className={`us-av ${avatar === i ? 'selected' : ''}`}
                onClick={() => setAvatar(i)}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Username input */}
        <div className="us-section">
          <label className="us-label">Username</label>
          <div className="us-input-wrap">
            <span className="us-av-preview">{AVATARS[avatar]}</span>
            <input
              className={`us-input ${error ? 'us-input-err' : username.length >= 3 ? 'us-input-ok' : ''}`}
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={handleChange}
              maxLength={20}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <span className="us-count">{username.length}/20</span>
          </div>
          {error && <p className="us-error">{error}</p>}
          {!error && username.length >= 3 && (
            <p className="us-success-msg">Username available</p>
          )}
        </div>

        {/* Wallet info */}
        <div className="us-wallet">
          <span className="us-wallet-dot" />
          <span>{wallet?.address?.slice(0, 8)}...{wallet?.address?.slice(-6)}</span>
          <span className="us-wallet-net">Base Network</span>
        </div>

        <button
          className="us-submit"
          onClick={handleSubmit}
          disabled={username.length < 3 || !!error}
        >
          Get Started
        </button>

        <button className="us-skip" onClick={onDone}>
          Skip for now
        </button>

      </div>
    </div>
  );
}
