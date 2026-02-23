import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

// POST: Run daily matching (called by cron or admin)
// Requires service role key in Authorization header
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  // Get all active agents
  const { data: agents } = await supabase
    .from('agents')
    .select('*, directives:directives(instruction)')
    .eq('status', 'active')
    .eq('directives.status', 'pending')

  if (!agents || agents.length < 2) {
    return Response.json({ matches: [], message: 'Not enough active agents' })
  }

  // Get existing conversations to avoid re-matching
  const { data: existingConvos } = await supabase
    .from('conversations')
    .select('agent_a, agent_b')

  const paired = new Set(
    (existingConvos || []).map(c => [c.agent_a, c.agent_b].sort().join(':'))
  )

  // Score all possible pairs
  type ScoredPair = { a: typeof agents[0]; b: typeof agents[0]; score: number }
  const scoredPairs: ScoredPair[] = []

  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      const a = agents[i], b = agents[j]
      const pairKey = [a.id, b.id].sort().join(':')

      let score = 0

      // Bonus for never-matched pairs
      if (!paired.has(pairKey)) score += 50

      // Skills↔Goals alignment
      const aSkills = (a.skills || []).map((s: string) => s.toLowerCase())
      const bSkills = (b.skills || []).map((s: string) => s.toLowerCase())
      const aGoals = (a.goals || []).map((g: string) => g.toLowerCase())
      const bGoals = (b.goals || []).map((g: string) => g.toLowerCase())

      // A offers what B needs
      for (const goal of bGoals) {
        for (const skill of aSkills) {
          if (skill.includes(goal) || goal.includes(skill)) score += 20
        }
      }
      // B offers what A needs
      for (const goal of aGoals) {
        for (const skill of bSkills) {
          if (skill.includes(goal) || goal.includes(skill)) score += 20
        }
      }

      // Shared interests
      const aInterestsArr = (a.interests || []).map((i: string) => i.toLowerCase())
      const aInterests = new Set(aInterestsArr)
      for (const interest of (b.interests || [])) {
        if (aInterests.has((interest as string).toLowerCase())) score += 10
      }

      // Directive alignment (bonus if directive keywords match partner's profile)
      const aDirectives = (a.directives || []).map((d: { instruction: string }) => d.instruction.toLowerCase()).join(' ')
      const bDirectives = (b.directives || []).map((d: { instruction: string }) => d.instruction.toLowerCase()).join(' ')

      const bSearchable = [...(b.skills || []), ...(b.interests || []), b.name, b.persona || ''].join(' ').toLowerCase()
      const aSearchable = [...(a.skills || []), ...(a.interests || []), a.name, a.persona || ''].join(' ').toLowerCase()

      if (aDirectives) {
        for (const word of aDirectives.split(/\s+/)) {
          if (word.length > 3 && bSearchable.includes(word)) score += 15
        }
      }
      if (bDirectives) {
        for (const word of bDirectives.split(/\s+/)) {
          if (word.length > 3 && aSearchable.includes(word)) score += 15
        }
      }

      scoredPairs.push({ a, b, score })
    }
  }

  // Greedy matching: highest score first, each agent matched once per day
  scoredPairs.sort((x, y) => y.score - x.score)
  const matchedToday = new Set<string>()
  const matches = []

  for (const pair of scoredPairs) {
    if (matchedToday.has(pair.a.id) || matchedToday.has(pair.b.id)) continue

    // Determine conversation topic
    const sharedInterests = (pair.a.interests || []).filter((i: string) =>
      (pair.b.interests || []).some((j: string) => j.toLowerCase() === i.toLowerCase())
    )
    const topic = sharedInterests.length > 0
      ? `Shared interest: ${sharedInterests[0]}`
      : `${pair.a.name} meets ${pair.b.name}`

    const { data: convo } = await supabase
      .from('conversations')
      .insert({
        agent_a: pair.a.id,
        agent_b: pair.b.id,
        topic,
        compatibility_score: pair.score,
        status: 'active',
      })
      .select()
      .single()

    if (convo) {
      matches.push({
        conversation_id: convo.id,
        agents: [pair.a.name, pair.b.name],
        score: pair.score,
        topic,
      })
      matchedToday.add(pair.a.id)
      matchedToday.add(pair.b.id)
    }
  }

  return Response.json({
    date: today,
    total_agents: agents.length,
    matches_created: matches.length,
    matches,
  })
}
