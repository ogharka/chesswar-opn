import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useStore } from '../../store/useStore';
import { syncNFTBoost } from '../../utils/api';
import toast from 'react-hot-toast';

const NFT_TIERS = [
  { tier: 1, name: 'Soldier',   boost: '2×', price: '0.001 ETH', color: '#0052FF',
    svg: `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="sg1" cx="50%" cy="30%" r="70%"><stop offset="0%" stop-color="#1a3a6e"/><stop offset="100%" stop-color="#050a14"/></radialGradient></defs><rect width="300" height="300" fill="#0A0F1E"/><rect width="300" height="300" fill="url(#sg1)" opacity="0.6"/><rect x="90" y="240" width="120" height="14" rx="4" fill="#0052FF" opacity="0.9"/><rect x="100" y="228" width="100" height="14" rx="3" fill="#0052FF" opacity="0.8"/><rect x="128" y="180" width="44" height="52" rx="4" fill="#0052FF" opacity="0.85"/><rect x="118" y="170" width="64" height="16" rx="4" fill="#1a6bff" opacity="0.9"/><circle cx="150" cy="140" r="36" fill="#0052FF"/><circle cx="150" cy="140" r="28" fill="#1a6bff"/><circle cx="150" cy="140" r="18" fill="#4D8BFF"/><circle cx="140" cy="130" r="7" fill="#fff" opacity="0.15"/><circle cx="150" cy="140" r="44" fill="none" stroke="#0052FF" stroke-width="1" opacity="0.4"/><rect x="110" y="58" width="80" height="26" rx="6" fill="#0039B3" opacity="0.9"/><text x="150" y="76" text-anchor="middle" font-family="system-ui" font-size="12" font-weight="600" fill="#7DB8FF">SOLDIER</text><rect x="116" y="258" width="68" height="20" rx="10" fill="#0039B3"/><text x="150" y="272" text-anchor="middle" font-family="system-ui" font-size="11" fill="#7DB8FF">2x BOOST</text></svg>` },
  { tier: 2, name: 'Knight',    boost: '3×', price: '0.003 ETH',  color: '#05B169',
    svg: `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="kg1" cx="50%" cy="30%" r="70%"><stop offset="0%" stop-color="#0d3d0d"/><stop offset="100%" stop-color="#030a03"/></radialGradient></defs><rect width="300" height="300" fill="#0A1A0A"/><rect width="300" height="300" fill="url(#kg1)" opacity="0.6"/><rect x="80" y="238" width="140" height="14" rx="4" fill="#05B169" opacity="0.9"/><rect x="95" y="226" width="110" height="14" rx="3" fill="#05B169" opacity="0.8"/><rect x="130" y="185" width="50" height="45" rx="4" fill="#05B169" opacity="0.85"/><path d="M118 185 Q108 165 112 145 Q115 125 130 118 Q145 112 165 118 Q185 125 188 148 Q190 168 178 182 Q168 192 155 194 Q138 196 118 185Z" fill="#05B169"/><path d="M108 165 Q95 168 92 178 Q90 188 100 192 Q112 196 122 188 Q130 182 128 170 Q120 162 108 165Z" fill="#049A5C"/><circle cx="162" cy="145" r="8" fill="#0A1A0A"/><circle cx="164" cy="143" r="3" fill="#049A5C"/><path d="M165 118 Q175 100 172 80 Q169 62 160 55 Q148 50 138 58 Q128 68 130 85 Q132 100 130 118" fill="#049A5C" opacity="0.8"/><rect x="106" y="50" width="88" height="26" rx="6" fill="#033d1f" opacity="0.9"/><text x="150" y="68" text-anchor="middle" font-family="system-ui" font-size="12" font-weight="600" fill="#4DEBA0">KNIGHT</text><rect x="112" y="256" width="76" height="20" rx="10" fill="#033d1f"/><text x="150" y="270" text-anchor="middle" font-family="system-ui" font-size="11" fill="#4DEBA0">3x BOOST</text></svg>` },
  { tier: 3, name: 'Commander', boost: '4×', price: '0.005 ETH', color: '#8B5CF6',
    svg: `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="cg1" cx="50%" cy="30%" r="70%"><stop offset="0%" stop-color="#3d0d4a"/><stop offset="100%" stop-color="#0a030d"/></radialGradient></defs><rect width="300" height="300" fill="#160A1A"/><rect width="300" height="300" fill="url(#cg1)" opacity="0.7"/><path d="M150 58 L218 88 L218 165 Q218 210 150 248 Q82 210 82 165 L82 88 Z" fill="#8B5CF6" opacity="0.9"/><path d="M150 72 L206 98 L206 163 Q206 202 150 236 Q94 202 94 163 L94 98 Z" fill="#7C3AED"/><path d="M150 86 L194 108 L194 161 Q194 194 150 224 Q106 194 106 161 L106 108 Z" fill="#6D28D9"/><rect x="140" y="108" width="20" height="90" rx="3" fill="#C4B5FD" opacity="0.9"/><rect x="115" y="145" width="70" height="20" rx="3" fill="#C4B5FD" opacity="0.9"/><rect x="85" y="248" width="130" height="14" rx="4" fill="#8B5CF6" opacity="0.85"/><rect x="88" y="46" width="124" height="26" rx="6" fill="#3B0764" opacity="0.9"/><text x="150" y="64" text-anchor="middle" font-family="system-ui" font-size="11" font-weight="600" fill="#C4B5FD">COMMANDER</text><rect x="110" y="266" width="80" height="20" rx="10" fill="#3B0764"/><text x="150" y="280" text-anchor="middle" font-family="system-ui" font-size="11" fill="#C4B5FD">4x BOOST</text></svg>` },
  { tier: 4, name: 'Warlord',   boost: '5×', price: '0.010 ETH',  color: '#C9A84C',
    svg: `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="wg1" cx="50%" cy="30%" r="70%"><stop offset="0%" stop-color="#2a1a00"/><stop offset="100%" stop-color="#0a0500"/></radialGradient></defs><rect width="300" height="300" fill="#0F0A00"/><rect width="300" height="300" fill="url(#wg1)" opacity="0.8"/><path d="M90 210 Q150 240 210 210 L210 190 Q150 220 90 190 Z" fill="#C9A84C"/><rect x="90" y="175" width="120" height="18" rx="2" fill="#C9A84C"/><rect x="90" y="130" width="120" height="50" fill="#C9A84C"/><polygon points="90,130 90,80 115,115" fill="#B8922A"/><polygon points="115,130 115,95 138,118" fill="#C9A84C"/><polygon points="138,130 138,70 162,70 162,130" fill="#D4B555"/><polygon points="162,130 162,95 185,118" fill="#C9A84C"/><polygon points="185,130 185,80 210,130" fill="#B8922A"/><circle cx="90" cy="80" r="8" fill="#0052FF"/><circle cx="90" cy="80" r="4" fill="#7DB8FF" opacity="0.8"/><circle cx="150" cy="66" r="10" fill="#EF4444"/><circle cx="150" cy="66" r="5" fill="#FCA5A5" opacity="0.8"/><circle cx="210" cy="80" r="8" fill="#0052FF"/><circle cx="210" cy="80" r="4" fill="#7DB8FF" opacity="0.8"/><circle cx="150" cy="152" r="6" fill="#EF4444"/><rect x="80" y="228" width="140" height="14" rx="4" fill="#C9A84C" opacity="0.9"/><rect x="96" y="42" width="108" height="26" rx="6" fill="#1a1000" opacity="0.9"/><text x="150" y="60" text-anchor="middle" font-family="system-ui" font-size="12" font-weight="600" fill="#F5D87A">WARLORD</text><rect x="110" y="246" width="80" height="20" rx="10" fill="#1a1000"/><text x="150" y="260" text-anchor="middle" font-family="system-ui" font-size="11" fill="#F5D87A">5x BOOST</text></svg>` },
];

const NFT_ABI = [
  'function mint(uint8 tierIndex) payable',
  'function balanceOf(address) view returns (uint256)',
  'function tokenOfOwnerByIndex(address,uint256) view returns (uint256)',
  'function tokenTier(uint256) view returns (uint8)',
  'function getBoostMultiplier(address) view returns (uint8)',
];
const TIER_PRICES = { 1:'0.001', 2:'0.003', 3:'0.005', 4:'0.010' };

export default function ProfilePage() {
  const { wallet, profile, updateProfile, nfts, mintNFT, points, nftBoost, setNftBoost, pointsLog } = useStore();
  const [editing,      setEditing]      = useState(false);
  const [nameVal,      setNameVal]      = useState(profile.username || '');
  const [minting,      setMinting]      = useState(null);
  const [onchainNFTs,  setOnchainNFTs]  = useState([]);
  const [loadingNFTs,  setLoadingNFTs]  = useState(false);
  const [activeSection,setActiveSection]= useState('nfts'); // nfts | referral | airdrop | history

  useEffect(() => {
    if (!wallet?.address) return;
    const load = async () => {
      setLoadingNFTs(true);
      try {
        if (!window.ethereum) return;
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(process.env.REACT_APP_NFT_ADDRESS, NFT_ABI, provider);
        const balance  = Number(await contract.balanceOf(wallet.address));
        const tokens   = [];
        for (let i = 0; i < balance; i++) {
          const tokenId = await contract.tokenOfOwnerByIndex(wallet.address, i);
          const tier    = await contract.tokenTier(tokenId);
          tokens.push({ tokenId: Number(tokenId), tier: Number(tier) });
        }
        setOnchainNFTs(tokens);
        if (tokens.length > 0) {
          const boost = Number(await contract.getBoostMultiplier(wallet.address));
          if (setNftBoost) setNftBoost(boost);
        }
      } catch (e) { console.log('NFT load:', e.message); }
      setLoadingNFTs(false);
    };
    load();
  }, [wallet?.address]); // eslint-disable-line

  const handleMint = async (tier) => {
    const nftAddress = process.env.REACT_APP_NFT_ADDRESS || '0x893b49999592775b2d85cAB4BF697Da1f4Ee5731';
    if (!window.ethereum) { toast.error('Wallet not connected'); return; }
    setMinting(tier);
    try {
      const provider  = new ethers.BrowserProvider(window.ethereum);
      const signer    = await provider.getSigner();
      const contract  = new ethers.Contract(nftAddress, NFT_ABI, signer);
      const price     = ethers.parseEther(TIER_PRICES[tier]);
      toast('Confirm in wallet...', { duration: 4000 });
      const tx = await contract.mint(tier - 1, { value: price });
      toast('Minting...', { duration: 8000 });
      await tx.wait();
      mintNFT(tier);
      try { const r = await syncNFTBoost(); if (setNftBoost) setNftBoost(r.boost); } catch {}
      toast.success(`${NFT_TIERS[tier-1].name} minted!`);
    } catch (err) {
      if (err.code === 4001 || err.code === 'ACTION_REJECTED') toast.error('Cancelled');
      else toast.error(err.reason || 'Mint failed');
    }
    setMinting(null);
  };

  const refLink = `${window.location.origin}?ref=${profile.referralCode}`;
  const copyRef = () => { navigator.clipboard.writeText(refLink); toast.success('Referral link copied!'); };
  const share   = (p) => {
    const text = `Play chess, earn USDC and CWAR on Base — ChessWar:`;
    const urls = {
      twitter:  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(refLink)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(text)}`,
      warpcast: `https://warpcast.com/~/compose?text=${encodeURIComponent(text + ' ' + refLink)}`,
    };
    window.open(urls[p], '_blank');
  };

  const initial  = profile.username ? profile.username[0].toUpperCase() : '?';
  const winRate  = profile.gamesPlayed ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100) : 0;
  const highestOnchain = onchainNFTs.length > 0 ? Math.max(...onchainNFTs.map(n => n.tier)) : -1;

  return (
    <div className="more-page">

      {/* Profile card */}
      <div className="more-profile-card">
        <div className="mp-avatar">{initial}</div>
        <div className="mp-info">
          {editing ? (
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <input
                style={{flex:1,border:'1.5px solid var(--blue)',borderRadius:8,padding:'6px 10px',fontSize:15,fontWeight:700,outline:'none'}}
                value={nameVal} onChange={e=>setNameVal(e.target.value)}
                maxLength={20} autoFocus
                onKeyDown={e=>{if(e.key==='Enter'){updateProfile({username:nameVal});setEditing(false);toast.success('Username updated!');}}}
              />
              <button style={{padding:'6px 12px',background:'var(--blue)',color:'#fff',borderRadius:8,fontSize:13,fontWeight:700}}
                onClick={()=>{updateProfile({username:nameVal});setEditing(false);toast.success('Updated!');}}>
                Save
              </button>
            </div>
          ) : (
            <div className="mp-name">{profile.username || 'Anonymous'}</div>
          )}
          <div className="mp-addr">{wallet?.address?.slice(0,8)}...{wallet?.address?.slice(-6)}</div>
          <div className="mp-joined">Joined {new Date().toLocaleDateString('en',{month:'long',year:'numeric'})}</div>
        </div>
        <button className="mp-edit" onClick={()=>setEditing(!editing)}>
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {/* Stats */}
      <div className="more-stats">
        <div className="ms-card"><div className="ms-val blue">{points.toLocaleString()}</div><div className="ms-label">Points</div></div>
        <div className="ms-card"><div className="ms-val">{profile.gamesPlayed||0}</div><div className="ms-label">Battles</div></div>
        <div className="ms-card"><div className="ms-val">{winRate}%</div><div className="ms-label">Win Rate</div></div>
        <div className="ms-card"><div className="ms-val">{profile.gamesWon||0}</div><div className="ms-label">Wins</div></div>
        <div className="ms-card"><div className="ms-val blue">{nftBoost}×</div><div className="ms-label">NFT Boost</div></div>
        <div className="ms-card"><div className="ms-val">{profile.referralCount||0}</div><div className="ms-label">Recruits</div></div>
      </div>

      {/* Sections */}
      <div className="more-section">
        <div className="more-section-title">War NFTs</div>
        {loadingNFTs && <div style={{fontSize:13,color:'var(--t3)',padding:'8px 4px'}}>Loading NFTs from blockchain...</div>}
        {onchainNFTs.length > 0 && (
          <div style={{fontSize:13,color:'var(--blue)',fontWeight:600,padding:'4px 4px 8px'}}>
            You own {onchainNFTs.length} War NFT{onchainNFTs.length>1?'s':''} on Base
          </div>
        )}
        <div className="nft-grid">
          {NFT_TIERS.map(t => {
            const ownedLocal   = nfts.filter(n=>n.tier===t.tier).length;
            const ownedOnchain = onchainNFTs.filter(n=>n.tier===t.tier-1).length;
            const owned = Math.max(ownedLocal, ownedOnchain);
            const active = highestOnchain === t.tier - 1;
            return (
              <div key={t.tier} className={`nft-card ${active?'active-nft':''}`}>
                <div className="nft-card-img" style={{width:'100%',aspectRatio:'1',overflow:'hidden',background:'#0A0F1E'}}
                  dangerouslySetInnerHTML={{__html: t.svg}} />
                <div className="nft-card-body">
                  <div className="nc-name">{t.name}</div>
                  <div className="nc-boost">{t.boost} Boost</div>
                  <div className="nc-price">{t.price}</div>
                  {owned > 0 && <div className="nc-owned">Owned: {owned} {active?'· Active':''}</div>}
                  <button className="nc-mint-btn" onClick={()=>handleMint(t.tier)}
                    disabled={!!minting} style={{background:t.color}}>
                    {minting===t.tier ? 'Minting...' : owned>0 ? 'Mint More' : `Mint ${t.price}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Referral */}
      <div className="more-section">
        <div className="more-section-title">Recruit Warriors</div>
        <div className="ref-card">
          <div className="ref-title">Earn 1,000 Points Per Recruit</div>
          <div className="ref-sub">Share your war code. Both you and your recruit get 1,000 pts.</div>
          <div className="ref-code-wrap">
            <div className="ref-code">{profile.referralCode}</div>
            <button className="ref-copy" onClick={copyRef}>Copy Link</button>
          </div>
          <div className="ref-share-btns">
            <button className="ref-share-btn" onClick={()=>share('twitter')}>Twitter/X</button>
            <button className="ref-share-btn" onClick={()=>share('telegram')}>Telegram</button>
            <button className="ref-share-btn" onClick={()=>share('warpcast')}>Warpcast</button>
          </div>
        </div>
      </div>

      {/* Airdrop */}
      <div className="more-section">
        <div className="more-section-title">CWAR Token Airdrop</div>
        <div className="airdrop-card">
          <div className="ad-title">1,000,000,000 CWAR</div>
          <div className="ad-sub">Launching on Base. Your points determine your share.</div>
          <div className="ad-pts">{points.toLocaleString()}</div>
          <div className="ad-pts-label">Your war points</div>
        </div>
      </div>

      {/* Points log */}
      {pointsLog.length > 0 && (
        <div className="more-section">
          <div className="more-section-title">Points History</div>
          <div className="battles-list">
            {pointsLog.slice(0,10).map((l,i) => (
              <div key={i} className="battle-item">
                <div className={`bi-result ${l.earned>0?'win':'loss'}`}>{l.earned>0?'+':'-'}</div>
                <div className="bi-info">
                  <div className="bi-opp">{l.reason}</div>
                  <div className="bi-meta">{new Date(l.at).toLocaleDateString()}</div>
                </div>
                <div className={`bi-pts ${l.earned>0?'pos':'neg'}`}>+{l.earned} pts</div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
