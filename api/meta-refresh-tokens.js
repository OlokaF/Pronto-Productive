// Vercel Serverless Function — Refresh a long-lived user token before it expires (60 days)
// GET /api/meta-refresh-tokens?userToken=...
//
// Call this periodically (e.g. on app load) to keep the token alive.
// Returns: { accessToken, expiresIn }

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { userToken } = req.query;
  const { META_APP_ID, META_APP_SECRET } = process.env;

  if (!userToken) return res.status(400).json({ error: "Missing userToken" });

  try {
    const refreshRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token` +
      `?grant_type=fb_exchange_token` +
      `&client_id=${META_APP_ID}` +
      `&client_secret=${META_APP_SECRET}` +
      `&fb_exchange_token=${userToken}`
    );
    const data = await refreshRes.json();
    if (data.error) throw new Error(data.error.message);

    return res.json({
      accessToken: data.access_token,
      expiresIn: data.expires_in,  // seconds until expiry (~5184000 = 60 days)
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
