// Vercel Serverless Function — Step 1: Redirect user to Meta OAuth dialog
// GET /api/meta-auth
export default function handler(req, res) {
  const { META_APP_ID, META_REDIRECT_URI } = process.env;

  if (!META_APP_ID) {
    return res.status(500).json({ error: "META_APP_ID environment variable not set in Vercel." });
  }

  const scopes = [
    "pages_show_list",           // see all pages the user manages
    "pages_manage_posts",         // create/publish posts on pages
    "pages_read_engagement",      // read page likes, comments, shares
    "read_insights",              // page-level analytics & reach
    "instagram_basic",            // basic Instagram account info
    "instagram_content_publish",  // publish photos/videos to Instagram
    "instagram_manage_insights",  // Instagram analytics
    "instagram_manage_comments",  // read/reply to Instagram comments
    "business_management",        // needed to access Business Suite pages
  ].join(",");

  const redirectUri = META_REDIRECT_URI || `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}/api/meta-callback`;

  const authUrl =
    `https://www.facebook.com/v21.0/dialog/oauth` +
    `?client_id=${META_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&response_type=code` +
    `&auth_type=rerequest`;

  res.redirect(authUrl);
}
