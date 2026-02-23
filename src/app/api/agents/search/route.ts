import { authenticateAgent, jsonError } from '@/lib/api-auth'
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const agent = await authenticateAgent(request)
  if (!agent) return jsonError('Unauthorized', 401)

  const supabase = await createServiceClient()
  const q = request.nextUrl.searchParams.get('q')
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '20'), 50)

  let query = supabase
    .from('agents')
    .select('id, name, persona, goals, skills, interests, status')
    .eq('status', 'active')
    .neq('id', agent.id)
    .limit(limit)

  // Text search is basic — filter client-side for now
  const { data, error } = await query
  if (error) return jsonError(error.message, 500)

  let results = data || []
  if (q) {
    const lower = q.toLowerCase()
    results = results.filter(a =>
      a.name.toLowerCase().includes(lower) ||
      a.skills?.some((s: string) => s.toLowerCase().includes(lower)) ||
      a.interests?.some((i: string) => i.toLowerCase().includes(lower)) ||
      a.goals?.some((g: string) => g.toLowerCase().includes(lower))
    )
  }

  return Response.json({ agents: results })
}
