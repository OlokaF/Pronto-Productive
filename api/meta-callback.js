// Vercel Serverless Function — Step 2: Handle OAuth callback from Meta
// GET /api/meta-callback?code=...
// After Meta redirects here we:
//   1. Exchange the code for a short-lived user access token
//   2. Exchange that for a long-lived user token (60-day)
//   3. Fetch all Facebook Pages + linked Instagram Business Accounts
//   4. postMessage the result back to the opener window and close

export default async function handler(req, res) {
  const { code, error, error_description } = req.query;
  const { META_APP_ID, META_APP_SECRET, META_REDIRECT_URI } = process.env;

  const redirectUri =
    META_REDIRECT_URI ||
    `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}/api/meta-callback`;

  // ── Helper: send a result back to the opener and close the popup ──
  function popupReply(payload) {
    const json = JSON.stringify(payload).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html><html><body><script>
      try {
        window.opener && window.opener.postMessage(${json}, "*");
      } finally {
        window.close();
      }
    </script><p>You can close this window.</p></body></html>`);
  }

  if (error) {
    return popupReply({ type: "META_AUTH_ERROR", error: error_description || error });
  }

  if (!code) {
    return popupReply({ type: "META_AUTH_ERROR", error: "No authorisation code received." });
  }

  try {
    // ── Step 1: Exchange code for short-lived token ──
    const shortRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token` +
      `?client_id=${META_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&client_secret=${META_APP_SECRET}` +
      `&code=${code}`
    );
    const shortData = await shortRes.json();
    if (shortData.error) throw new Error(shortData.error.message);

    // ── Step 2: Exchange for long-lived user token (valid ~60 days) ──
    const longRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token` +
      `?grant_type=fb_exchange_token` +
      `&client_id=${META_APP_ID}` +
      `&client_secret=${META_APP_SECRET}` +
      `&fb_exchange_token=${shortData.access_token}`
    );
    const longData = await longRes.json();
    if (longData.error) throw new Error(longData.error.message);

    const userToken = longData.access_token || shortData.access_token;

    // ── Step 3: Fetch Facebook Pages this user manages ──
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts` +
      `?access_token=${userToken}` +
      `&fields=id,name,access_token,picture,fan_count,instagram_business_account,category`
    );
    const pagesData = await pagesRes.json();
    if (pagesData.error) throw new Error(pagesData.error.message);

    const pages = pagesData.data || [];

    // ── Step 4: For each page, fetch its linked Instagram Business Account details ──
    const enrichedPages = await Promise.all(
      pages.map(async (page) => {
        const igId = page.instagram_business_account?.id;
        let instagram = null;

        if (igId) {
          try {
            const igRes = await fetch(
              `https://graph.facebook.com/v21.0/${igId}` +
              `?fields=id,name,username,followers_count,profile_picture_url` +
              `&access_token=${page.access_token}`
            );
            const igData = await igRes.json();
            if (!igData.error) instagram = igData;
          } catch (_) {}
        }

        return {
          id: page.id,
          name: page.name,
          category: page.category,
          accessToken: page.access_token,       // page-level token — use for all page API calls
          fanCount: page.fan_count,
          picture: page.picture?.data?.url,
          instagram,                             // null if no linked Instagram Business Account
        };
      })
    );

    return popupReply({
      type: "META_AUTH_SUCCESS",
      userToken,
      pages: enrichedPages,
    });

  } catch (err) {
    return popupReply({ type: "META_AUTH_ERROR", error: err.message });
  }
}
