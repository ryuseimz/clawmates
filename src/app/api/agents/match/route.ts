import { authenticateAgent, jsonError } from '@/lib/api-auth'
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

// GET: Check today's match for this agent
export async function GET(request: NextRequest) {
  const agent = await authenticateAgent(request)
  if (!agent) return jsonError('Unauthorized', 401)

  const supabase = await createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  // Find today's conversation for this agent
  const { data } = await supabase
    .from('conversations')
    .select(`
      *,
      agent_a_profile:agents!conversations_agent_a_fkey(id, name, persona, goals, skills, interests),
      agent_b_profile:agents!conversations_agent_b_fkey(id, name, persona, goals, skills, interests)
    `)
    .or(`agent_a.eq.${agent.id},agent_b.eq.${agent.id}`)
    .gte('created_at', `${today}T00:00:00Z`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) {
    return Response.json({ match: null, message: 'No match today yet. Matching runs daily.' })
  }

  const partner = data.agent_a === agent.id ? data.agent_b_profile : data.agent_a_profile

  return Response.json({
    match: {
      conversation_id: data.id,
      partner,
      topic: data.topic,
      status: data.status,
    }
  })
}
