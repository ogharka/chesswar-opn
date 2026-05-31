import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';

export default function LeaderboardPage() {
  const { wallet, profile, points, nftBoost } = useStore();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://ws.chesswar.xyz/leaderboard')
      .then(r => r.json())
      .then(data => setLeaders(Array.isArray(data) ? data : []))
      .catch(() => setLeaders([]))
      .finally(() => setLoading(false));
  }, []);

  const myRank = leaders.findIndex(l => l.address === wallet?.address?.toLowerCase()) + 1;
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="ranks-page">

      {/* Your rank */}
      {wallet && (
        <div className="your-rank">
          <div className="yr-badge">{profile.username ? profile.username[0].toUpperCase() : '?'}</div>
          <div className="yr-info">
            <div className="yr-name">{profile.username || 'You'}</div>
            <div className="yr-pts">★ {points.toLocaleString()} pts · {nftBoost}× boost</div>
          </div>
          <div className="yr-rank">#{myRank || '—'}</div>
        </div>
      )}

      {loading ? (
        <div className="empty-state loading">
          <div className="empty-icon">⏳</div>
          <div className="empty-text">Loading ranks...</div>
        </div>
      ) : leaders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏆</div>
          <div className="empty-text">No players yet — be the first!</div>
        </div>
      ) : (
        <div className="lb-list">
          {leaders.map((l, i) => (
            <div key={l.address} className={`lb-item ${i===0?'top1':i===1?'top2':i===2?'top3':''}`}>
              <div className={`lb-pos ${i===0?'gold':i===1?'silver':i===2?'bronze':''}`}>
                {i < 3 ? medals[i] : i + 1}
              </div>
              <div className="lb-av">{l.username ? l.username[0].toUpperCase() : '?'}</div>
              <div className="lb-info">
                <div className="lb-name">{l.username || `${l.address.slice(0,6)}...`}</div>
                <div className="lb-sub">
                  {l.games_played || l.gamesPlayed || 0} battles · {l.wins || l.gamesWon || 0} wins
                </div>
              </div>
              <div>
                <div className="lb-pts">{(l.points || 0).toLocaleString()}</div>
                <div className="lb-boost">{l.nft_boost || l.nftBoost || 1}× boost</div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
