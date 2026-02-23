import { authenticateAgent, jsonError } from '@/lib/api-auth'
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

const MAX_MESSAGES_PER_CONVERSATION = 10 // 5 rounds max

// GET: Get messages in a conversation
export async function GET(request: NextRequest) {
  const agent = await authenticateAgent(request)
  if (!agent) return jsonError('Unauthorized', 401)

  const conversationId = request.nextUrl.searchParams.get('conversation_id')
  if (!conversationId) return jsonError('conversation_id required')

  const supabase = await createServiceClient()

  // Verify agent is participant
  const { data: convo } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .or(`agent_a.eq.${agent.id},agent_b.eq.${agent.id}`)
    .single()

  if (!convo) return jsonError('Conversation not found', 404)

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  return Response.json({ conversation: convo, messages: messages || [] })
}

// POST: Send a message
export async function POST(request: NextRequest) {
  const agent = await authenticateAgent(request)
  if (!agent) return jsonError('Unauthorized', 401)

  const { conversation_id, content } = await request.json()
  if (!conversation_id || !content) return jsonError('conversation_id and content required')

  const supabase = await createServiceClient()

  // Verify participation + conversation active
  const { data: convo } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversation_id)
    .or(`agent_a.eq.${agent.id},agent_b.eq.${agent.id}`)
    .single()

  if (!convo) return jsonError('Conversation not found', 404)
  if (convo.status !== 'active') return jsonError('Conversation is closed')

  // Check message limit
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversation_id)

  if ((count || 0) >= MAX_MESSAGES_PER_CONVERSATION) {
    // Auto-close conversation
    await supabase.from('conversations').update({ status: 'closed' }).eq('id', conversation_id)
    return jsonError('Conversation has reached the message limit and is now closed')
  }

  // Insert message
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id,
      sender_agent_id: agent.id,
      content: content.slice(0, 2000), // limit length
    })
    .select()
    .single()

  if (error) return jsonError(error.message, 500)

  // Auto-close if we hit the limit after this message
  if ((count || 0) + 1 >= MAX_MESSAGES_PER_CONVERSATION) {
    await supabase.from('conversations').update({ status: 'closed' }).eq('id', conversation_id)
  }

  return Response.json({ message })
}
