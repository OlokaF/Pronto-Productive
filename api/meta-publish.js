// Vercel Serverless Function — Publish or schedule a post to Facebook/Instagram
// POST /api/meta-publish
//
// Body (JSON):
// {
//   targets: [
//     { type: "facebook", pageId: "...", accessToken: "..." },
//     { type: "instagram", igAccountId: "...", accessToken: "..." },
//   ],
//   message: "Post caption text",
//   imageUrl: "https://...",   // optional — public URL of image
//   scheduledTime: 1234567890, // optional — Unix timestamp (must be 10min–6months in future)
// }
//
// Returns: { results: [ { target, success, id, error } ] }

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const { targets = [], message = "", imageUrl, scheduledTime } = body;

  if (!targets.length) {
    return res.status(400).json({ error: "No targets specified" });
  }

  const results = await Promise.all(
    targets.map(async (target) => {
      try {
        if (target.type === "facebook") {
          // ── Publish to Facebook Page ──
          const payload = {};

          if (imageUrl) {
            // Photo post
            payload.url = imageUrl;
            payload.message = message;
            payload.access_token = target.accessToken;
            if (scheduledTime) {
              payload.scheduled_publish_time = scheduledTime;
              payload.published = false;
            }

            const photoRes = await fetch(
              `https://graph.facebook.com/v21.0/${target.pageId}/photos`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              }
            );
            const photoData = await photoRes.json();
            if (photoData.error) throw new Error(photoData.error.message);
            return { target, success: true, id: photoData.id || photoData.post_id };

          } else {
            // Text-only post
            payload.message = message;
            payload.access_token = target.accessToken;
            if (scheduledTime) {
              payload.scheduled_publish_time = scheduledTime;
              payload.published = false;
            }

            const feedRes = await fetch(
              `https://graph.facebook.com/v21.0/${target.pageId}/feed`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              }
            );
            const feedData = await feedRes.json();
            if (feedData.error) throw new Error(feedData.error.message);
            return { target, success: true, id: feedData.id };
          }

        } else if (target.type === "instagram") {
          // ── Publish to Instagram ──
          // Instagram requires an image URL for feed posts
          if (!imageUrl) {
            return { target, success: false, error: "Instagram posts require an image URL." };
          }

          // Step 1: Create media container
          const containerPayload = {
            image_url: imageUrl,
            caption: message,
            access_token: target.accessToken,
          };

          // If scheduling, note: Instagram Content Publishing API doesn't support
          // scheduled posts via the API directly — use a job queue instead
          const containerRes = await fetch(
            `https://graph.facebook.com/v21.0/${target.igAccountId}/media`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(containerPayload),
            }
          );
          const containerData = await containerRes.json();
          if (containerData.error) throw new Error(containerData.error.message);

          // Step 2: Check container status (poll until FINISHED)
          let ready = false;
          for (let i = 0; i < 5; i++) {
            await new Promise((r) => setTimeout(r, 1500));
            const statusRes = await fetch(
              `https://graph.facebook.com/v21.0/${containerData.id}` +
              `?fields=status_code` +
              `&access_token=${target.accessToken}`
            );
            const statusData = await statusRes.json();
            if (statusData.status_code === "FINISHED") { ready = true; break; }
            if (statusData.status_code === "ERROR") throw new Error("Media container processing failed.");
          }

          if (!ready) throw new Error("Media container timed out — try again.");

          // Step 3: Publish the container
          const publishRes = await fetch(
            `https://graph.facebook.com/v21.0/${target.igAccountId}/media_publish`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                creation_id: containerData.id,
                access_token: target.accessToken,
              }),
            }
          );
          const publishData = await publishRes.json();
          if (publishData.error) throw new Error(publishData.error.message);

          return { target, success: true, id: publishData.id };

        } else {
          return { target, success: false, error: `Unknown target type: ${target.type}` };
        }

      } catch (err) {
        return { target, success: false, error: err.message };
      }
    })
  );

  return res.json({ results });
}
