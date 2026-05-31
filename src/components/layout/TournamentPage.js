import React from 'react';

export default function TournamentPage() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:24, padding:'40px 20px', textAlign:'center' }}>
      <div style={{ fontSize:72, filter:'drop-shadow(0 0 20px rgba(0,82,255,0.4))' }}>🏆</div>
      <div>
        <div style={{ fontSize:24, fontWeight:900, color:'var(--t1)', marginBottom:8 }}>Tournaments</div>
        <div style={{ fontSize:14, color:'var(--t3)', lineHeight:1.6, maxWidth:280 }}>
          Compete with players worldwide, win USDC prizes and earn 5× points boost.
        </div>
      </div>
      <div style={{ background:'linear-gradient(135deg,#0A0F1E,#001466)', borderRadius:20, padding:'20px 32px', border:'1px solid rgba(0,82,255,0.3)' }}>
        <div style={{ fontSize:13, fontWeight:800, color:'#60A5FA', letterSpacing:2, textTransform:'uppercase', marginBottom:4 }}>Coming Soon</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>Coming soon</div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10, width:'100%', maxWidth:300 }}>
        {[
          { icon:'⚡', text:'Blitz Cup · Every 4 Hours' },
          { icon:'🏆', text:'Daily Champion · Every 24 Hours' },
          { icon:'👑', text:'Weekly Grand Cup · Every Week' },
        ].map((item, i) => (
          <div key={i} style={{ background:'var(--card)', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:12, border:'1px solid var(--border)' }}>
            <span style={{ fontSize:20 }}>{item.icon}</span>
            <span style={{ fontSize:13, color:'var(--t2)', fontWeight:600 }}>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
