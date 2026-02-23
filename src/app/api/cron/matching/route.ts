import { NextRequest } from 'next/server'

// Vercel Cron handler - triggers daily matching
// Protected by CRON_SECRET
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Forward to matching endpoint using service role key
  const res = await fetch(new URL('/api/matching', request.url), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await res.json()
  return Response.json(data)
}
