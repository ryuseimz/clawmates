'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { MessageSquare, Send, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import type { Directive } from '@/lib/types'

const statusConfig = {
  pending: { icon: Clock, color: 'var(--warning)', label: 'Pending' },
  in_progress: { icon: Loader2, color: 'var(--accent)', label: 'In Progress' },
  completed: { icon: CheckCircle, color: 'var(--success)', label: 'Completed' },
  cancelled: { icon: XCircle, color: 'var(--fg-muted)', label: 'Cancelled' },
}

export default function DirectivesPage() {
  const [directives, setDirectives] = useState<Directive[]>([])
  const [instruction, setInstruction] = useState('')
  const [agentId, setAgentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: agent } = await supabase.from('agents').select('id').eq('owner_id', user.id).single()
    if (agent) {
      setAgentId(agent.id)
      const { data } = await supabase
        .from('directives')
        .select('*')
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (data) setDirectives(data)
    }
    setLoading(false)
  }

  async function handleSend() {
    if (!instruction.trim() || !agentId) return
    setSending(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('directives')
      .insert({ agent_id: agentId, instruction: instruction.trim() })
      .select()
      .single()
    if (data) setDirectives([data, ...directives])
    setInstruction('')
    setSending(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Directives</h1>
      <p className="mb-8" style={{ color: 'var(--fg-muted)' }}>
        Tell your agent what to look for. It&apos;ll prioritize matches based on your instructions.
      </p>

      {/* Input */}
      {agentId && (
        <div className="rounded-xl p-4 mb-6 flex gap-3"
             style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <input
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder='e.g., "Find people working on AI agents" or "Look for designers in Tokyo"'
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          />
          <button onClick={handleSend} disabled={sending || !instruction.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium cursor-pointer disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ color: 'var(--fg-muted)' }}>Loading...</div>
      ) : !agentId ? (
        <div className="text-center py-16" style={{ color: 'var(--fg-muted)' }}>
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Create an agent first to send directives.</p>
        </div>
      ) : directives.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--fg-muted)' }}>
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>No directives yet. Give your agent something to do!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {directives.map(d => {
            const config = statusConfig[d.status]
            const Icon = config.icon
            return (
              <div key={d.id} className="rounded-xl p-4"
                   style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between">
                  <p className="flex-1">{d.instruction}</p>
                  <span className="flex items-center gap-1.5 text-xs font-medium shrink-0 ml-4"
                        style={{ color: config.color }}>
                    <Icon className="w-3.5 h-3.5" />
                    {config.label}
                  </span>
                </div>
                {d.result && (
                  <p className="mt-3 text-sm rounded-lg p-3"
                     style={{ background: 'var(--bg-secondary)', color: 'var(--fg-muted)' }}>
                    {d.result}
                  </p>
                )}
                <p className="text-xs mt-2" style={{ color: 'var(--fg-muted)' }}>
                  {new Date(d.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
