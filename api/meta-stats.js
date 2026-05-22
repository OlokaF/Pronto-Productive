// Vercel Serverless Function — Fetch Facebook Page / Instagram stats
// GET /api/meta-stats?pageId=...&accessToken=...&type=facebook|instagram
//
// Returns: { facebook: {...}, instagram: {...} }

export default async function handler(req, res) {
  // Allow cross-origin requests from same-origin Vercel deployment
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { pageId, accessToken, igAccountId, type } = req.query;

  if (!pageId || !accessToken) {
    return res.status(400).json({ error: "Missing pageId or accessToken" });
  }

  const since = Math.floor(Date.now() / 1000) - 28 * 24 * 60 * 60; // last 28 days
  const until = Math.floor(Date.now() / 1000);

  try {
    const result = {};

    if (type !== "instagram") {
      // ── Facebook Page Insights ──
      const fbMetrics = [
        "page_impressions",
        "page_impressions_unique",   // reach
        "page_engaged_users",
        "page_post_engagements",
        "page_fans",
        "page_fan_adds",
        "page_fan_removes",
        "page_views_total",
      ].join(",");

      const insightsRes = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/insights` +
        `?metric=${fbMetrics}` +
        `&period=day` +
        `&since=${since}` +
        `&until=${until}` +
        `&access_token=${accessToken}`
      );
      const insightsData = await insightsRes.json();

      // Also fetch basic page info
      const pageRes = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}` +
        `?fields=name,fan_count,followers_count,talking_about_count` +
        `&access_token=${accessToken}`
      );
      const pageInfo = await pageRes.json();

      result.facebook = {
        pageInfo,
        insights: insightsData.data || [],
      };
    }

    if ((type === "instagram" || type === "both") && igAccountId) {
      // ── Instagram Business Insights ──
      const igMetrics = [
        "impressions",
        "reach",
        "profile_views",
        "website_clicks",
        "follower_count",
      ].join(",");

      const igInsightsRes = await fetch(
        `https://graph.facebook.com/v21.0/${igAccountId}/insights` +
        `?metric=${igMetrics}` +
        `&period=day` +
        `&since=${since}` +
        `&until=${until}` +
        `&access_token=${accessToken}`
      );
      const igInsightsData = await igInsightsRes.json();

      // Basic Instagram account info
      const igInfoRes = await fetch(
        `https://graph.facebook.com/v21.0/${igAccountId}` +
        `?fields=name,username,biography,followers_count,follows_count,media_count,profile_picture_url,website` +
        `&access_token=${accessToken}`
      );
      const igInfo = await igInfoRes.json();

      // Recent media
      const igMediaRes = await fetch(
        `https://graph.facebook.com/v21.0/${igAccountId}/media` +
        `?fields=id,caption,media_type,thumbnail_url,permalink,timestamp,like_count,comments_count,insights.metric(reach,impressions,engagement)` +
        `&limit=12` +
        `&access_token=${accessToken}`
      );
      const igMedia = await igMediaRes.json();

      result.instagram = {
        accountInfo: igInfo,
        insights: igInsightsData.data || [],
        recentMedia: igMedia.data || [],
      };
    }

    return res.json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
