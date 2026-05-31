const API_URL = 'https://ws.chesswar.xyz';

function getToken()  { try { return localStorage.getItem('cw_token'); } catch { return null; } }
function setToken(t) { try { localStorage.setItem('cw_token', t); } catch {} }
function clearToken(){ try { localStorage.removeItem('cw_token'); } catch {} }

function headers() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function api(method, path, body) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

// Only sign if no valid token exists
export async function loginWithWallet(signer) {
  try {
    // If token already exists skip signing
    const existing = getToken();
    if (existing) return null;

    const address = await signer.getAddress();
    const message = `ChessWar login\nAddress: ${address}\nTimestamp: ${Date.now()}`;
    const signature = await signer.signMessage(message);
    setToken(`${address}_${signature.slice(0, 20)}`);
    return null;
  } catch { return null; }
}

export function logout() { clearToken(); }

export const getProfile      = (addr) => api('GET',  `/user/${addr}`);
export const updateProfile   = (data) => api('PUT',  '/profile', data);
export const getLeaderboard  = ()     => api('GET',  '/leaderboard');
export const claimReferral   = (code) => api('POST', '/referral/claim', { referralCode: code });
export const addPoints       = (data) => api('POST', '/points/add', data);
export const getPointsHistory= ()     => api('GET',  '/points/history');
export const updateNFTBoost  = (boost)=> api('POST', '/points/nft-boost', { boost });
export const getGameHistory  = ()     => api('GET',  '/games/history');
export const getGame         = (id)   => api('GET',  `/games/${id}`);
export const syncNFTBoost    = ()     => api('POST', '/nft/sync');
export const getNFTInfo      = (addr) => api('GET',  `/nft/${addr}`);
export const getAirdropProof = (addr) => api('GET',  `/airdrop/proof/${addr}`);
export const markAirdropClaimed = ()  => api('POST', '/airdrop/claimed');
export const getAirdropStats = ()     => api('GET',  '/airdrop/stats');
