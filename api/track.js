// api/track.js - Analytics tracking
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { event, data, userId } = req.body;
  
  // Log to Vercel Analytics (free tier available)
  console.log(`[ANALYTICS] User: ${userId}, Event: ${event}`, data);
  
  // Store in database later (Vercel KV, Supabase, etc)
  
  res.status(200).json({ success: true });
}
