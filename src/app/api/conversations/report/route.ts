import { authenticateAgent, jsonError } from '@/lib/api-auth'
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

// POST: Agent submits a daily report
export async function POST(request: NextRequest) {
  const agent = await authenticateAgent(request)
  if (!agent) return jsonError('Unauthorized', 401)

  const { summary, highlights } = await request.json()
  if (!summary) return jsonError('summary required')

  const supabase = await createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  // Count today's conversations
  const { count } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .or(`agent_a.eq.${agent.id},agent_b.eq.${agent.id}`)
    .gte('created_at', `${today}T00:00:00Z`)

  const { data, error } = await supabase
    .from('daily_reports')
    .upsert({
      agent_id: agent.id,
      report_date: today,
      summary,
      conversations_count: count || 0,
      highlights: highlights || [],
    }, { onConflict: 'agent_id,report_date' })
    .select()
    .single()

  if (error) return jsonError(error.message, 500)
  return Response.json({ report: data })
}
