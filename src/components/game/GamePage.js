import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { getBotMove, diffLabel } from '../../utils/chessBot';
import { connectSocket } from '../../utils/socket';
import toast from 'react-hot-toast';

/* ── Sound ── */
let actx = null;
const getCtx = () => { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); return actx; };
const tone = (f, d = 0.08, t = 'sine', v = 0.15) => {
  try {
    const c = getCtx(), o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination); o.type = t; o.frequency.value = f;
    g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d);
    o.start(c.currentTime); o.stop(c.currentTime + d);
  } catch { /* blocked */ }
};
const SFX = {
  move:    () => tone(520, 0.06),
  capture: () => { tone(280, 0.08, 'sawtooth'); setTimeout(() => tone(220, 0.1), 50); },
  check:   () => { tone(660, 0.1, 'square'); setTimeout(() => tone(550, 0.1, 'square'), 120); },
  castle:  () => { tone(440, 0.07); setTimeout(() => tone(520, 0.07), 80); },
  win:     () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'sine', 0.2), i * 120)),
  loss:    () => [440, 370, 311].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'sine', 0.15), i * 150)),
};

/* ── Timer ── */
function Timer({ seconds, active, side, inc }) {
  const m = Math.floor(seconds / 60), s = seconds % 60;
  const low = seconds <= 30, crit = seconds <= 10;
  return (
    <div className={`timer timer-${side} ${active ? 'timer-on' : 'timer-off'} ${low ? 'timer-low' : ''} ${crit ? 'timer-crit' : ''}`}>
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      {inc > 0 && <span className="timer-inc">+{inc}s</span>}
    </div>
  );
}

/* ── Move list ── */
function MoveList({ moves, onPGN }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.scrollIntoView({ behavior: 'smooth' }); }, [moves.length]);
  const pairs = [];
  for (let i = 0; i < moves.length; i += 2) pairs.push([moves[i], moves[i + 1]]);
  return (
    <div className="move-hist">
      <div className="mh-header">
        <span className="mh-title">Battle Log</span>
        {moves.length > 0 && <button className="mh-pgn-btn" onClick={onPGN}>PGN ↗</button>}
      </div>
      <div className="mh-body">
        {pairs.length === 0 && <p className="mh-empty">Awaiting first move…</p>}
        {pairs.map((p, i) => (
          <div key={i} className="mh-row">
            <span className="mh-num">{i + 1}.</span>
            <span className="mh-w">{p[0]?.san}</span>
            <span className="mh-b">{p[1]?.san || ''}</span>
          </div>
        ))}
        <div ref={ref} />
      </div>
    </div>
  );
}

/* ── Promotion picker ── */
function PromoPicker({ color, onSelect }) {
  const opts = [
    { t: 'q', s: color === 'w' ? '♕' : '♛', n: 'Queen'  },
    { t: 'r', s: color === 'w' ? '♖' : '♜', n: 'Rook'   },
    { t: 'b', s: color === 'w' ? '♗' : '♝', n: 'Bishop' },
    { t: 'n', s: color === 'w' ? '♘' : '♞', n: 'Knight' },
  ];
  return (
    <div className="promo-overlay">
      <div className="promo-modal">
        <p className="promo-title">Choose your weapon</p>
        <div className="promo-grid">
          {opts.map((o) => (
            <button key={o.t} className="promo-btn" onClick={() => onSelect(o.t)}>
              <span className="promo-piece">{o.s}</span>
              <span className="promo-label">{o.n}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Time controls ── */
const BOT_DIFFS = ['beginner', 'intermediate', 'hard', 'veryhard'];
const TIME_OPTS = [
  { label: '1 min',  base: 60,   inc: 0  },
  { label: '3 min',  base: 180,  inc: 2  },
  { label: '5 min',  base: 300,  inc: 0  },
  { label: '7 min',  base: 420,  inc: 0  },
  { label: '10 min', base: 600,  inc: 0  },
  { label: '30 min', base: 1800, inc: 0  },
];

const PSYMS = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };

export default function GamePage() {
  const { mode } = useParams();
  const navigate = useNavigate();
  const { addPoints, updateProfile, profile, addGameResult, nftBoost } = useStore();

  const isBet = mode === 'bet';
  const isBot = mode === 'bot';

  const location = useLocation();
  const locState = location.state || {};
  const isOnline = locState.online || false;
  const gameId   = locState.gameId || null;
  const myColor  = locState.color  || 'white';
  const oppData  = locState.opponent || null;

  /* searching state */
  const [searching, setSearching] = useState(false);

  const handleCancelSearch = () => {
    try {
      const socket = connectSocket();
      socket.emit('leave_queue');
    } catch {}
    setSearching(false);
    navigate('/');
  };

  /* config */
  const [configured, setConfigured] = useState(false);
  const [timeOpt,   setTimeOpt]   = useState(TIME_OPTS[2]);
  const [betAmt,    setBetAmt]    = useState('0.10');
  const [betErr,    setBetErr]    = useState('');
  const [botDiff,   setBotDiff]   = useState('intermediate');
  const [soundOn,   setSoundOn]   = useState(true);

  /* game */
  const chessRef  = useRef(new Chess());
  const timerRef  = useRef(null);
  const overRef   = useRef(false);
  const soundRef  = useRef(true);
  useEffect(() => { soundRef.current = soundOn; }, [soundOn]);

  const [fen,       setFen]      = useState(chessRef.current.fen());
  const [moves,     setMoves]    = useState([]);
  const [wTime,     setWTime]    = useState(300);
  const [bTime,     setBTime]    = useState(300);
  const [turn,      setTurn]     = useState('w');
  const [started,   setStarted]  = useState(false);
  const [over,      setOver]     = useState(null);
  const [selected,  setSelected] = useState(null);
  const [hilights,  setHilights] = useState({});
  const [flipped,   setFlipped]  = useState(false);
  const [capW,      setCapW]     = useState([]);
  const [capB,      setCapB]     = useState([]);
  const [promo,     setPromo]    = useState(null);
  const [drawOffer,    setDrawOffer]    = useState(false);
  const [shareMsg,     setShareMsg]     = useState(false);
  const [showControls, setShowControls] = useState(false);

  const sfx = useCallback((name) => { if (soundRef.current) SFX[name]?.(); }, []);

  /* end game */
  const endGame = useCallback((winner, reason) => {
    if (overRef.current) return;
    overRef.current = true;
    clearInterval(timerRef.current);
    const won = winner === 'w', draw = winner === 'd';
    const base = draw ? 5 : won ? 20 : reason === 'resignation' ? 0 : 10;
    const earned = base > 0 ? addPoints(base, `${mode} · ${reason}`, isBet) : 0;
    updateProfile({
      gamesPlayed: profile.gamesPlayed + 1,
      gamesWon:    won  ? profile.gamesWon  + 1 : profile.gamesWon,
      gamesLost:   (!won && !draw) ? profile.gamesLost + 1 : profile.gamesLost,
      gamesDraw:   draw ? profile.gamesDraw + 1 : profile.gamesDraw,
    });
    addGameResult({ result: won ? 'win' : draw ? 'draw' : 'loss', mode, opponent: 'Opponent', pointsEarned: earned });
    setOver({ winner, reason, earned, isBet, betAmt: isBet ? betAmt : null });
    if (window.ethereum?.selectedAddress) {
      const addr = window.ethereum.selectedAddress;
      const st = useStore.getState();
      fetch('https://ws.chesswar.xyz/sync-points', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          address: addr,
          username: st.profile?.username || 'Anonymous',
          points: st.points,
          gamesPlayed: st.profile?.gamesPlayed || 0,
          wins: st.profile?.gamesWon || 0,
          nftBoost: st.nftBoost || 1
        })
      }).catch(() => {});
    }
    if (won) sfx('win'); else if (!draw) sfx('loss');
    toast(won ? 'Victory!' : draw ? 'Draw!' : 'Defeated!', { duration: 3000 });
  }, [addPoints, addGameResult, betAmt, isBet, mode, profile, sfx, updateProfile]); // eslint-disable-line

  /* apply move */
  const applyMove = useCallback((mv) => {
    const chess = chessRef.current;
    const res = chess.move(mv);
    if (!res) return false;
    const inc = timeOpt.inc || 0;
    if (inc > 0) { if (res.color === 'w') setWTime((t) => t + inc); else setBTime((t) => t + inc); }
    if (res.captured) { if (res.color === 'w') setCapW((p) => [...p, res.captured]); else setCapB((p) => [...p, res.captured]); sfx('capture'); }
    else if (res.flags.includes('k') || res.flags.includes('q')) sfx('castle');
    else sfx('move');
    setFen(chess.fen()); setTurn(chess.turn()); setMoves((m) => [...m, res]);
    setHilights({ [res.from]: { background: 'rgba(201,168,76,0.5)' }, [res.to]: { background: 'rgba(201,168,76,0.5)' } });
    setSelected(null);
    if (chess.isCheckmate()) {
      const winner = chess.turn() === 'w' ? 'b' : 'w';
      endGame(winner, 'checkmate');
      if (isOnline && gameId) {
        const socket = connectSocket();
        const winnerColor = winner === 'w' ? 'white' : 'black';
        socket.emit('game_over', { gameId, winner: winnerColor, reason: 'checkmate' });
      }
      return true;
    }
    if (chess.isDraw()) {
      endGame('d', 'draw');
      if (isOnline && gameId) {
        const socket = connectSocket();
        socket.emit('game_over', { gameId, winner: 'draw', reason: 'draw' });
      }
      return true;
    }
    if (chess.isCheck()) { sfx('check'); toast('⚠️ Check!', { duration: 1000 }); }
    if (isOnline && gameId) {
      const socket = connectSocket();
      socket.emit('make_move', { gameId, move: mv, fen: chess.fen() });
    }
    return true;
  }, [endGame, sfx, timeOpt.inc, isOnline, gameId]);

  useEffect(() => {
    if ((isOnline || locState.botDiff) && !configured) {
      if (locState.botDiff) setBotDiff(locState.botDiff);
      if (locState.timeControl) {
        const tc = TIME_OPTS.find(t => t.base === Number(locState.timeControl) * 60) || TIME_OPTS[2];
        setTimeOpt(tc);
        setWTime(tc.base);
        setBTime(tc.base);
      }
      setStarted(true);
      setConfigured(true);
    }
  }, [isOnline, locState.botDiff]); // eslint-disable-line

  useEffect(() => {
    if (!isOnline || !gameId) return;
    const socket = connectSocket();
    socket.emit('join_game', { gameId });
    let idleTimer = setTimeout(() => {
      if (!overRef.current) {
        endGame('b', 'timeout');
        socket.emit('game_over', { gameId, winner: myColor === 'white' ? 'black' : 'white', reason: 'idle' });
      }
    }, 50000);
    const resetIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (!overRef.current) {
          endGame('b', 'timeout');
          socket.emit('game_over', { gameId, winner: myColor === 'white' ? 'black' : 'white', reason: 'idle' });
        }
      }, 120000);
    };
    socket.on('move_made', resetIdle);
    socket.on('opponent_move', ({ move }) => {
      const chess = chessRef.current;
      const res = chess.move(move);
      if (res) {
        setFen(chess.fen());
        setTurn(chess.turn());
        setMoves(m => [...m, res]);
        if (chess.isCheckmate()) {
          endGame('b', 'checkmate');
          socket.emit('game_over', { gameId, winner: myColor === 'white' ? 'black' : 'white', reason: 'checkmate' });
        } else if (chess.isDraw()) {
          endGame('d', 'draw');
          socket.emit('game_over', { gameId, winner: 'draw', reason: 'draw' });
        }
      }
    });
    socket.on('game_ended', ({ winner, reason }) => {
      if (overRef.current) return;
      const won  = (winner === 'white' && myColor === 'white') || (winner === 'black' && myColor === 'black');
      const draw = winner === 'draw';
      endGame(won ? 'w' : draw ? 'd' : 'b', reason);
    });
    socket.on('draw_offered', () => {
      if (window.confirm('Opponent offers a draw. Accept?')) {
        socket.emit('draw_response', { gameId, accepted: true });
      } else {
        socket.emit('draw_response', { gameId, accepted: false });
      }
    });
    socket.on('draw_declined', () => toast.error('Opponent declined draw'));
    return () => {
      clearTimeout(idleTimer);
      socket.off('opponent_move');
      socket.off('game_ended');
      socket.off('draw_offered');
      socket.off('draw_declined');
      socket.off('move_made');
    };
  }, [isOnline, gameId, myColor, endGame]); // eslint-disable-line

  useEffect(() => {
    if (!started || over || !isBot || chessRef.current.turn() !== 'b') return;
    const delay = botDiff === 'beginner' ? 400 : botDiff === 'intermediate' ? 700 : 1000;
    const tid = setTimeout(() => {
      const mv = getBotMove(chessRef.current.fen(), botDiff);
      if (mv) applyMove(mv);
    }, delay + Math.random() * 300);
    return () => clearTimeout(tid);
  }, [fen, started, over, isBot, botDiff, applyMove]); // eslint-disable-line

  useEffect(() => {
    if (!started || over) return;
    timerRef.current = setInterval(() => {
      if (overRef.current) { clearInterval(timerRef.current); return; }
      const turn = chessRef.current.turn();
      if (turn === 'w') {
        setWTime((t) => { if (t <= 1) { endGame('b', 'timeout'); return 0; } return t - 1; });
      } else {
        setBTime((t) => { if (t <= 1) { endGame('w', 'timeout'); return 0; } return t - 1; });
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [started, over, endGame]);

  const isPromo = (from, to) => {
    const p = chessRef.current.get(from);
    return p?.type === 'p' && ((p.color === 'w' && to[1] === '8') || (p.color === 'b' && to[1] === '1'));
  };

  const onSquareClick = (sq) => {
    if (!started || over || promo) return;
    if (isOnline) {
      const turn = chessRef.current.turn();
      if ((turn === 'w' && myColor !== 'white') || (turn === 'b' && myColor !== 'black')) return;
    }
    const chess = chessRef.current, piece = chess.get(sq);
    if (piece && piece.color === chess.turn()) {
      setSelected(sq);
      const legal = chess.moves({ square: sq, verbose: true });
      const h = { [sq]: { background: 'rgba(201,168,76,0.5)' } };
      legal.forEach((m) => { h[m.to] = chess.get(m.to) ? { background: 'radial-gradient(circle, rgba(180,30,30,0.6) 55%, transparent 60%)' } : { background: 'radial-gradient(circle, rgba(201,168,76,0.3) 28%, transparent 32%)' }; });
      setHilights(h);
      return;
    }
    if (!selected) return;
    if (isPromo(selected, sq)) {
      const legal = chess.moves({ square: selected, verbose: true }).map((m) => m.to);
      if (legal.includes(sq)) { setPromo({ from: selected, to: sq }); setSelected(null); setHilights({}); return; }
    }
    const moved = applyMove({ from: selected, to: sq, promotion: 'q' });
    if (!moved) {
      if (piece && piece.color === chess.turn()) {
        setSelected(sq);
        const legal = chess.moves({ square: sq, verbose: true });
        const h = { [sq]: { background: 'rgba(201,168,76,0.5)' } };
        legal.forEach((m) => { h[m.to] = { background: 'radial-gradient(circle, rgba(201,168,76,0.3) 28%, transparent 32%)' }; });
        setHilights(h);
      } else { setSelected(null); setHilights({}); }
    }
  };

  const onDrop = (from, to) => {
    if (!started || over) return false;
    if (isOnline) {
      const turn = chessRef.current.turn();
      if ((turn === 'w' && myColor !== 'white') || (turn === 'b' && myColor !== 'black')) return false;
    }
    if (isPromo(from, to)) { setPromo({ from, to }); return false; }
    return applyMove({ from, to, promotion: 'q' });
  };

  const onPromoSelect = (p) => { if (promo) { applyMove({ ...promo, promotion: p }); setPromo(null); } };
  const exportPGN = () => { navigator.clipboard.writeText(chessRef.current.pgn()); toast.success('PGN copied!'); };

  const reset = () => {
    chessRef.current.reset(); overRef.current = false;
    setFen(chessRef.current.fen()); setMoves([]); setWTime(timeOpt.base); setBTime(timeOpt.base);
    setTurn('w'); setOver(null); setSelected(null); setHilights({}); setCapW([]); setCapB([]); setPromo(null);
  };

  const startGame = () => {
    if (isBet) { const n = parseFloat(betAmt); if (isNaN(n) || n < 0.1) { setBetErr('Minimum 0.10 USDC'); return; } setBetErr(''); }
    reset(); setConfigured(true); setStarted(true);
  };

  const rematch = () => { reset(); setStarted(true); };

  const resign = () => {
    if (!started || over) return;
    if (!window.confirm('Resign this game? You will lose and your opponent wins.')) return;
    endGame('b', 'resignation');
  };

  const abort = () => {
    if (!started || over) return;
    if (moves.length > 1) { toast.error('Cannot abort after move 2'); return; }
    clearInterval(timerRef.current);
    overRef.current = true;
    setOver({ winner: null, reason: 'aborted', earned: 0 });
    if (isBet) toast('Game aborted — bet refunded');
    else toast('Game aborted');
  };

  const offerDraw = () => {
    if (!started || over) return;
    setDrawOffer(true);
    toast('Draw offered — waiting for opponent', { duration: 3000 });
  };

  const shareGame = () => {
    const pgn = chessRef.current.pgn();
    navigator.clipboard.writeText(pgn);
    setShareMsg(true);
    toast.success('PGN copied to clipboard!');
    setTimeout(() => setShareMsg(false), 2000);
  };

  /* ── Searching screen ── */
  if (searching) {
    return (
      <div className="config-screen">
        <div className="config-card" style={{textAlign:'center', padding:'40px 24px'}}>
          <div style={{fontSize:56, marginBottom:16}}>♟</div>
          <h2 style={{marginBottom:8}}>Finding Opponent...</h2>
          <p style={{color:'var(--t2)', marginBottom:32}}>Searching for a player to match you</p>
          <div style={{
            width:56, height:56,
            border:'4px solid #0052FF',
            borderTopColor:'transparent',
            borderRadius:'50%',
            animation:'spin 1s linear infinite',
            margin:'0 auto 32px'
          }}/>
          <button
            onClick={handleCancelSearch}
            style={{
              width:'100%', padding:'16px',
              background:'transparent',
              border:'1.5px solid #ddd',
              borderRadius:'14px',
              fontSize:'16px', fontWeight:'600',
              color:'#666', cursor:'pointer'
            }}
          >
            ✕ Cancel Search
          </button>
        </div>
      </div>
    );
  }

  /* ── Config screen ── */
  if (!configured) {
    return (
      <div className="config-screen">
        <div className="config-card">
          <button className="config-back" onClick={() => navigate('/')}>← Back</button>
          <h2 className="config-title">
            {isBot ? 'vs Computer' : isBet ? 'Bet Battle' : 'Play Online'}
          </h2>

          {isBot && (
            <div className="config-group">
              <label>Difficulty</label>
              <div className="diff-grid">
                {BOT_DIFFS.map((d) => (
                  <button key={d} className={`diff-btn ${botDiff === d ? 'active' : ''}`}
                    onClick={() => setBotDiff(d)}>
                    {diffLabel(d)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="config-group">
            <label>Battle Timer</label>
            <div className="tc-grid">
              {TIME_OPTS.map((t) => (
                <button key={t.label} className={`tc-btn ${timeOpt.label === t.label ? 'active' : ''}`} onClick={() => setTimeOpt(t)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="config-group config-inline">
            <label>Sound</label>
            <button className={`sound-toggle ${soundOn ? 'on' : 'off'}`} onClick={() => setSoundOn((s) => !s)}>
              <span className="sound-toggle-knob" />
            </button>
          </div>

          {isBet && (
            <div className="config-group">
              <label>Wager Amount (USDC)</label>
              <div className="bet-quick">
                {[0.1, 0.5, 1, 5, 10, 50, 100].map((v) => (
                  <button key={v} className={`bq-btn ${parseFloat(betAmt) === v ? 'active' : ''}`}
                    onClick={() => { setBetAmt(v.toFixed(2)); setBetErr(''); }}>
                    {v}
                  </button>
                ))}
              </div>
              <div className="bet-custom-row">
                <span className="bet-cur">USDC</span>
                <input type="number" className="bet-input" value={betAmt} min="0.1" step="0.01"
                  onChange={(e) => { setBetAmt(e.target.value); setBetErr(''); }} />
              </div>
              {betErr && <p className="bet-error">{betErr}</p>}
              <div className="bet-summary">
                <div className="bs-row"><span>You wager</span><strong>{parseFloat(betAmt) || 0} USDC</strong></div>
                <div className="bs-row"><span>If you win</span><strong className="green">+{((parseFloat(betAmt) || 0) * 2 * 0.98).toFixed(2)} USDC</strong></div>
                <div className="bs-row"><span>Platform fee</span><strong>2%</strong></div>
                <div className="bs-row"><span>Point boost</span><strong className="fire">× 5× all points</strong></div>
              </div>
            </div>
          )}

          <button className="config-start-btn" onClick={startGame}>
            {isBet ? `Start Battle · ${parseFloat(betAmt) || 0} USDC` : 'Start Battle'}
          </button>
        </div>
      </div>
    );
  }

  /* ── Game screen ── */
  return (
    <>
    <div className="game-screen">
      {/* Opponent */}
      <div className="game-player">
        <div className="gp-left">
          <div className="gp-av">{isBot ? '🤖' : '♟'}</div>
          <div>
            <div className="gp-name">{isBot ? `AI · ${diffLabel(botDiff)}` : isOnline && oppData ? oppData.username : 'Opponent'}</div>
            <div className="gp-caps">{capB.map((p,i) => <span key={i}>{PSYMS[p]}</span>)}</div>
          </div>
        </div>
        <Timer seconds={isOnline && myColor==='black' ? wTime : bTime} active={started && !over && turn===(isOnline && myColor==='black' ? 'w' : 'b')} side="black" inc={timeOpt.inc} />
      </div>

      {/* Board */}
      <div className="game-board-wrap">
        <div className="game-board-inner">
          <div className="game-board-area">
            <Chessboard
              position={fen}
              onSquareClick={onSquareClick}
              onPieceDrop={onDrop}
              boardOrientation={isOnline ? myColor : (flipped ? 'black' : 'white')}
              customSquareStyles={hilights}
              customBoardStyle={{ borderRadius: '0', overflow: 'hidden' }}
              customDarkSquareStyle={{ backgroundColor: '#B58863' }}
              customLightSquareStyle={{ backgroundColor: '#F0D9B5' }}
              areArrowsAllowed
            />
          </div>
        </div>
      </div>

      {/* Self */}
      <div className="game-player">
        <div className="gp-left">
          <div className="gp-av">♙</div>
          <div>
            <div className="gp-name">{profile?.username || 'You'}</div>
            <div className="gp-caps">{capW.map((p,i) => <span key={i}>{PSYMS[p]}</span>)}</div>
          </div>
        </div>
        <Timer seconds={isOnline && myColor==='black' ? bTime : wTime} active={started && !over && turn===(isOnline && myColor==='black' ? 'b' : 'w')} side="white" inc={timeOpt.inc} />
      </div>

      {/* Battle log */}
      <div className="battle-log">
        <div className="bl-title">Battle Log</div>
        {moves.length === 0
          ? <div className="bl-empty">Awaiting first move...</div>
          : <div className="bl-moves">
              {Array.from({length: Math.ceil(moves.length/2)}, (_,i) => (
                <div className="bl-row" key={i}>
                  <span className="bl-num">{i+1}.</span>
                  <span className="bl-w">{moves[i*2]?.san}</span>
                  <span className="bl-b">{moves[i*2+1]?.san || ''}</span>
                </div>
              ))}
            </div>
        }
      </div>

      {/* FAB hamburger */}
      {started && !over && (
        <button className="game-fab" onClick={() => setShowControls(true)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <line x1="3" y1="6"  x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      )}
    </div>

    {/* Bottom sheet game menu */}
    {showControls && (
      <>
        <div className="game-sheet-overlay" onClick={() => setShowControls(false)} />
        <div className="game-sheet">
          <div className="gs-handle" />
          <button className="gs-item" onClick={() => { setFlipped(f=>!f); setShowControls(false); }}>Flip Board</button>
          <button className="gs-item" onClick={() => { setSoundOn(s=>!s); setShowControls(false); }}>{soundOn ? 'Disable Sounds' : 'Enable Sounds'}</button>
          <button className="gs-item" onClick={() => { shareGame(); setShowControls(false); }}>Share Game</button>
          {!drawOffer && isOnline && (
            <button className="gs-item gs-draw" onClick={() => { offerDraw(); setShowControls(false); }}>Offer Draw</button>
          )}
          <button className="gs-item gs-resign" onClick={() => { resign(); setShowControls(false); }}>Resign</button>
          <button className="gs-cancel" onClick={() => setShowControls(false)}>Cancel</button>
        </div>
      </>
    )}

    {promo && <PromoPicker color={chessRef.current.turn()} onSelect={onPromoSelect} />}

    {over && (
      <div className="game-over-overlay">
        <div className="go-modal">
          <div className={`go-banner ${over.winner==='w' ? 'go-win' : over.winner==='d' ? 'go-draw' : 'go-loss'}`}>
            <div className="go-title">
              {over.winner==='w' ? '🏆 Victory!' : over.winner==='d' ? '🤝 Draw' : '💀 Defeated'}
            </div>
            <div className="go-reason">
              {over.reason==='checkmate'   && (over.winner==='w' ? 'Checkmate — brilliant!' : 'Your king has fallen')}
              {over.reason==='resignation' && (over.winner==='w' ? 'Opponent resigned' : 'You resigned')}
              {over.reason==='timeout'     && (over.winner==='w' ? 'Opponent ran out of time' : 'Time expired')}
              {over.reason==='idle'        && (over.winner==='w' ? 'Opponent went idle' : 'You went idle')}
              {over.reason==='disconnect'  && (over.winner==='w' ? 'Opponent disconnected' : 'You disconnected')}
              {over.reason==='draw'        && 'Game drawn by agreement'}
              {over.reason==='aborted'     && 'Game aborted — no penalty'}
            </div>
          </div>
          <div className="go-stats">
            <div className="go-row"><span>Points earned</span><strong className="gold">+{over.earned}</strong></div>
            <div className="go-row"><span>NFT boost</span><strong>{nftBoost}×</strong></div>
            {isBet && (
              <div className="go-row">
                <span>Wager</span>
                <strong className={over.winner==='w' ? 'green' : 'red'}>
                  {over.winner==='w' ? `+${(parseFloat(betAmt)*2*0.98).toFixed(2)} USDC` : over.winner==='d' ? 'Refunded' : `-${betAmt} USDC`}
                </strong>
              </div>
            )}
          </div>
          <div className="go-actions">
            {!isOnline && <button className="go-btn go-rematch" onClick={rematch}>Rematch</button>}
            {isOnline && <button className="go-btn go-rematch" onClick={() => navigate('/')}>New Game</button>}
            <button className="go-btn" onClick={exportPGN}>Share Game</button>
            <button className="go-btn go-home" onClick={() => navigate('/')}>Home</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
