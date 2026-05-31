import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import toast from 'react-hot-toast';
import TestnetFaucet from './TestnetFaucet';
import TestnetFaucet from './TestnetFaucet';

const TIME_OPTS = [
  { val: 1,  label: '1 min',  type: 'Bullet'  },
  { val: 3,  label: '3 min',  type: 'Blitz'   },
  { val: 5,  label: '5 min',  type: 'Blitz'   },
  { val: 10, label: '10 min', type: 'Rapid'   },
  { val: 15, label: '15 min', type: 'Rapid'   },
  { val: 30, label: '30 min', type: 'Classic' },
];

const BET_PRESETS = ['0.10', '0.50', '1.00', '5.00'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { points, nftBoost, profile, gameHistory, wallet } = useStore();

  const [selTime,    setSelTime]    = useState(5);
  const [mode,       setMode]       = useState('bot'); // bot | bet | pvp | pvp-free
  const [betAmt,     setBetAmt]     = useState('0.10');
  const [searching,  setSearching]  = useState(false);
  const [botDiff,    setBotDiff]    = useState('intermediate');

  const winRate = profile.gamesPlayed
    ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100) : 0;

  const handlePlay = async () => {
    if (mode === 'bot') {
      navigate('/play/bot', { state: { timeControl: selTime, botDiff } });
      return;
    }

    if (mode === 'pvp-friend') {
      const link = window.location.origin + '?invite=' + Math.random().toString(36).slice(2,8).toUpperCase();
      navigator.clipboard.writeText(link);
      toast.success('Invite link copied! Share with your friend.');
      return;
    }

    if (mode === 'bet') {
      // Check in-app balance first
      if (!wallet?.address) { toast.error('Connect wallet first'); return; }
      try {
        const res = await fetch(`https://ws.chesswar.xyz/balance/${wallet.address}`);
        const bal = await res.json();
        if (parseFloat(bal.usdc_balance) < parseFloat(betAmt)) {
          toast.error(`Need ${betAmt} USDC in-app balance. Deposit first.`);
          return;
        }
      } catch { toast.error('Balance check failed'); return; }
    }

    // Start matchmaking for online modes
    if (mode === 'pvp-free' || mode === 'bet') {
      setSearching(true);
      const { connectSocket } = await import('../../utils/socket');
      const socket = connectSocket();
      socket.off('game_found');
      socket.emit('join_queue', {
        betAmount: mode === 'bet' ? betAmt : 'free',
        username: profile.username || 'Anonymous',
        address: wallet?.address || ''
      });
      socket.on('game_found', ({ gameId, color, opponent, betAmount: bAmt }) => {
        setSearching(false);
        toast.success('Opponent found! Starting game...');
        navigate(mode === 'bet' ? '/play/bet' : '/play/pvp', {
          state: { timeControl: selTime, betAmount: bAmt, gameId, color, opponent, online: true }
        });
      });
      return;
    }

    navigate(`/play/${mode}`, { state: { timeControl: selTime, betAmount: betAmt } });
  };

  const cancelSearch = () => {
    import('../../utils/socket').then(({ connectSocket }) => {
      const socket = connectSocket();
      socket.emit('leave_queue');
    });
    setSearching(false);
    toast('Search cancelled');
  };

  const recent = gameHistory.slice(0, 8);

  return (
    <div className="play-page">

      <TestnetFaucet />

      {/* Stats */
      <div className="stats-row">
        <div className="stat-card">
          <div className="sc-val blue">{points.toLocaleString()}</div>
          <div className="sc-label">War Points</div>
        </div>
        <div className="stat-card">
          <div className="sc-val">{profile.gamesPlayed || 0}</div>
          <div className="sc-label">Battles</div>
        </div>
        <div className="stat-card">
          <div className={`sc-val ${winRate > 50 ? 'green' : ''}`}>{winRate}%</div>
          <div className="sc-label">Win Rate</div>
        </div>
      </div>

      {/* Game mode */}
      <div>
        <div className="section-title">Mode</div>
        <div className="mode-grid">
          <div className={`mode-card ${mode==='bot'?'active':''}`} onClick={()=>setMode('bot')} style={mode==='bot'?{borderColor:'var(--green)',background:'linear-gradient(135deg,#fff 60%,#E6F9F1)'}:{}}>
            <div className="mc-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={mode==='bot'?'var(--green)':'var(--t2)'} strokeWidth="2"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a4 4 0 0 1 8 0v2"/><circle cx="9" cy="13" r="1" fill={mode==='bot'?'var(--green)':'var(--t2)'}/><circle cx="15" cy="13" r="1" fill={mode==='bot'?'var(--green)':'var(--t2)'}/></svg></div>
            <div className="mc-title">vs Bot</div>
            <div className="mc-sub">Play against AI</div>
            <span className="mc-tag" style={{background:'#E6F9F1',color:'var(--green)'}}>Free</span>
          </div>
          <div className={`mode-card ${mode==='pvp-free'?'active':''}`} onClick={()=>setMode('pvp-free')} style={mode==='pvp-free'?{borderColor:'#8B5CF6',background:'linear-gradient(135deg,#fff 60%,#F5F3FF)'}:{}}>
            <div className="mc-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={mode==='pvp-free'?'#8B5CF6':'var(--t2)'} strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
            <div className="mc-title">Play Online</div>
            <div className="mc-sub">Free matchmaking</div>
            <span className="mc-tag" style={{background:'#F5F3FF',color:'#8B5CF6'}}>Free</span>
          </div>
          <div className={`mode-card ${mode==='bet'?'active':''}`} onClick={()=>setMode('bet')} style={mode==='bet'?{borderColor:'var(--blue)',background:'linear-gradient(135deg,#fff 60%,var(--blue-light))'}:{}}>
            <div className="mc-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={mode==='bet'?'var(--blue)':'var(--t2)'} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>
            <div className="mc-title">Bet Battle</div>
            <div className="mc-sub">Wager USDC</div>
            <span className="mc-tag" style={{background:'var(--blue-light)',color:'var(--blue)'}}>5× Points</span>
          </div>
          <div className={`mode-card ${mode==='pvp-friend'?'active':''}`} onClick={()=>setMode('pvp-friend')} style={mode==='pvp-friend'?{borderColor:'var(--gold)',background:'linear-gradient(135deg,#fff 60%,#FEF3C7)'}:{}}>
            <div className="mc-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={mode==='pvp-friend'?'var(--gold)':'var(--t2)'} strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div>
            <div className="mc-title">Play with Friend</div>
            <div className="mc-sub">Share invite link</div>
            <span className="mc-tag" style={{background:'#FEF3C7',color:'var(--gold)'}}>Invite</span>
          </div>
        </div>
      </div>

      {/* Bet amount (only for bet mode) */}
      {mode === 'bet' && (
        <div className="bet-row">
          <span className="bet-label">Wager</span>
          <input
            className="bet-input"
            type="number"
            min="0.10"
            step="0.10"
            value={betAmt}
            onChange={e => setBetAmt(e.target.value)}
          />
          <span className="bet-currency">USDC</span>
          <div className="bet-presets">
            {BET_PRESETS.map(p => (
              <button
                key={p}
                className={`bet-preset ${betAmt === p ? 'active' : ''}`}
                onClick={() => setBetAmt(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'bot' && (
        <div style={{marginBottom:8}}>
          <div className="section-title">Difficulty</div>
          <div style={{display:'flex',gap:6,padding:'3px',background:'var(--raised)',borderRadius:14,border:'1px solid var(--border)'}}>
            {[{val:'beginner',label:'Easy'},{val:'intermediate',label:'Medium'},{val:'hard',label:'Hard'},{val:'veryhard',label:'Master'}].map(d => (
              <div key={d.val} onClick={()=>setBotDiff(d.val)} style={{flex:1,textAlign:'center',padding:'9px 4px',borderRadius:11,background:botDiff===d.val?'#fff':'transparent',boxShadow:botDiff===d.val?'0 2px 8px rgba(0,0,0,0.1)':'none',cursor:'pointer',transition:'all .2s'}}>
                <div style={{fontSize:11,fontWeight:botDiff===d.val?800:600,color:botDiff===d.val?'var(--blue)':'var(--t3)',letterSpacing:.2}}>{d.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time control */}
      <div>
        <div className="section-title">Time Control</div>
        <div className="time-grid">
          {(mode === 'pvp-free' || mode === 'bet'
            ? TIME_OPTS.filter(t => t.val === 5 || t.val === 10)
            : TIME_OPTS
          ).map(t => (
            <div
              key={t.val}
              className={`time-card ${selTime === t.val ? 'active' : ''}`}
              onClick={() => setSelTime(t.val)}
            >
              <div className={`tc-time ${selTime === t.val ? 'active' : ''}`}>{t.val}<span style={{fontSize:10,fontWeight:600,opacity:0.7}}>m</span></div>
              <div className="tc-label">{t.type}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Play button */}
      <button
        className={`find-btn ${searching ? 'searching' : ''}`}
        onClick={handlePlay}
        disabled={searching}
      >
        {searching ? (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{animation:'spin 1s linear infinite'}}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Finding opponent...
          </>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            {mode === 'bot' ? 'Play vs Bot' : mode === 'bet' ? `Bet ${betAmt} USDC` : mode === 'pvp-friend' ? 'Copy Invite Link' : 'Find Opponent'}
          </>
        )}
      </button>

      {/* Recent battles */}
      {recent.length > 0 && (
        <div>
          <div className="section-title">Recent Battles</div>
          <div className="battles-list">
            {recent.map((g, i) => {
              const won  = g.result === 'win';
              const draw = g.result === 'draw';
              return (
                <div key={i} className="battle-item">
                  <div className={`bi-result ${won ? 'win' : draw ? 'draw' : 'loss'}`}>
                    {won ? 'W' : draw ? 'D' : 'L'}
                  </div>
                  <div className="bi-info">
                    <div className="bi-opp">{g.opponent || 'Opponent'}</div>
                    <div className="bi-meta">{g.mode} · {new Date(g.id).toLocaleDateString()}</div>
                  </div>
                  <div className={`bi-pts ${g.pointsEarned > 0 ? 'pos' : g.pointsEarned < 0 ? 'neg' : 'zero'}`}>
                    {g.pointsEarned > 0 ? '+' : ''}{g.pointsEarned} pts
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
