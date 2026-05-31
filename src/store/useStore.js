import { create } from 'zustand';
import { persist } from 'zustand/middleware';

function makeRefCode(address) {
  return 'CW' + address.slice(2, 8).toUpperCase();
}

export const useStore = create(
  persist(
    (set, get) => ({

      // ── Wallet ────────────────────────────────────────────
      wallet: null,
      provider: null,
      setWallet: (w) => set({ wallet: w }),
      setProvider: (p) => set({ provider: p }),
      disconnect: () => set({ wallet: null, provider: null }),

      // ── Profile ───────────────────────────────────────────
      profile: {
        username: '',
        avatar: 0,
        joinedAt: null,
        referralCode: '',
        referralCount: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        gamesDraw: 0,
        betGamesPlayed: 0,
        betGamesWon: 0,
      },

      initProfile: (address) => {
        const p = get().profile;
        if (p.joinedAt) return;
        set({ profile: { ...p, referralCode: makeRefCode(address), joinedAt: Date.now() } });
      },

      updateProfile: (updates) =>
        set((s) => ({ profile: { ...s.profile, ...updates } })),

      // ── Points ────────────────────────────────────────────
      points: 0,
      pointsLog: [],
      nfts: [],
      nftBoost: 1,
      setPoints: (p) => set({ points: p }),
      setNftBoost: (b) => set({ nftBoost: b }),

      addPoints: (base, reason, isBet) => {
        const s = get();
        const multiplier = base < 0 ? 1 : s.nftBoost * (isBet ? 5 : 1);
        const total = Math.round(base * multiplier);
        set((st) => ({
          points: Math.max(0, st.points + total),
          pointsLog: [
            { id: Date.now(), amount: total, base, nftBoost: s.nftBoost, isBet, reason, ts: Date.now() },
            ...st.pointsLog,
          ].slice(0, 200),
        }));
        return total;
      },

      mintNFT: (tier) => {
        const tiers = {
          1: { name: 'Soldier',  symbol: '♟',  boost: 2, price: '0.005 ETH' },
          2: { name: 'Knight',   symbol: '♞',  boost: 3, price: '0.01 ETH'  },
          3: { name: 'Commander',symbol: '♝',  boost: 4, price: '0.025 ETH' },
          4: { name: 'Warlord',  symbol: '♛',  boost: 5, price: '0.05 ETH'  },
        };
        const t = tiers[tier];
        if (!t) return null;
        const nft = { id: Date.now(), tier, ...t, mintedAt: Date.now() };
        set((s) => {
          const newNfts = [...s.nfts, nft];
          const maxBoost = Math.max(...newNfts.map((n) => n.boost));
          return { nfts: newNfts, nftBoost: maxBoost };
        });
        return nft;
      },

      // ── Referrals ─────────────────────────────────────────
      claimedRefs: [],
      claimReferral: (code) => {
        const s = get();
        if (s.claimedRefs.includes(code)) return false;
        s.addPoints(1000, `Referral: ${code}`, false);
        set((st) => ({
          claimedRefs: [...st.claimedRefs, code],
          profile: { ...st.profile, referralCount: st.profile.referralCount + 1 },
        }));
        return true;
      },

      // ── Tournaments ───────────────────────────────────────
      joinedTournaments: [],
      joinTournament: (id) =>
        set((s) => ({ joinedTournaments: [...s.joinedTournaments, { id, joinedAt: Date.now() }] })),

      // ── Game history ──────────────────────────────────────
      gameHistory: [],
      addGameResult: (result) =>
        set((s) => ({
          gameHistory: [{ ...result, id: Date.now() }, ...s.gameHistory].slice(0, 50),
        })),
    }),
    {
      name: 'chesswar-v1',
      partialize: (s) => ({
        points: s.points,
        pointsLog: s.pointsLog,
        profile: s.profile,
        nfts: s.nfts,
        nftBoost: s.nftBoost,
        claimedRefs: s.claimedRefs,
        joinedTournaments: s.joinedTournaments,
        gameHistory: s.gameHistory,
      }),
    }
  )
);
