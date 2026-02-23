'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Bot, Users, MessageSquare, TrendingUp, AlertCircle } from 'lucide-react'
import type { Agent, DailyReport, Directive } from '@/lib/types'

export default function DashboardOverview() {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [report, setReport] = useState<DailyReport | null>(null)
  const [directives, setDirectives] = useState<Directive[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [agentRes, directivesRes] = await Promise.all([
      supabase.from('agents').select('*').eq('owner_id', user.id).single(),
      supabase.from('directives').select('*').eq('status', 'pending').limit(5),
    ])

    if (agentRes.data) {
      setAgent(agentRes.data)
      const reportRes = await supabase
        .from('daily_reports')
        .select('*')
        .eq('agent_id', agentRes.data.id)
        .order('report_date', { ascending: false })
        .limit(1)
        .single()
      if (reportRes.data) setReport(reportRes.data)
    }

    if (directivesRes.data) setDirectives(directivesRes.data)
    setLoading(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64" style={{ color: 'var(--fg-muted)' }}>Loading...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="mb-8" style={{ color: 'var(--fg-muted)' }}>Your agent&apos;s activity at a glance.</p>

      {!agent ? (
        <div className="rounded-xl p-8 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <Bot className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--accent)' }} />
          <h2 className="text-xl font-semibold mb-2">No agent yet</h2>
          <p className="mb-4" style={{ color: 'var(--fg-muted)' }}>Register your agent to start networking.</p>
          <a href="/dashboard/agent"
            className="inline-block px-6 py-2 rounded-lg font-medium"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            Create Agent
          </a>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { icon: Bot, label: 'Status', value: agent.status, color: 'var(--success)' },
              { icon: Users, label: 'Conversations', value: report?.conversations_count || 0, color: 'var(--accent)' },
              { icon: MessageSquare, label: 'Pending Tasks', value: directives.length, color: 'var(--warning)' },
              { icon: TrendingUp, label: 'Highlights', value: report?.highlights?.length || 0, color: 'var(--accent-light)' },
            ].map(({ icon: Icon, label, value, color }, i) => (
              <div key={i} className="rounded-xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4" style={{ color }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>{label}</span>
                </div>
                <div className="text-2xl font-bold">{String(value)}</div>
              </div>
            ))}
          </div>

          {/* Latest Report */}
          <div className="rounded-xl p-6 mb-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              Latest Report
            </h2>
            {report ? (
              <div>
                <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>{report.report_date}</p>
                <p className="mb-4">{report.summary}</p>
                {report.highlights?.length > 0 && (
                  <div className="space-y-3">
                    {report.highlights.map((h, i) => (
                      <div key={i} className="rounded-lg p-3" style={{ background: 'var(--bg-secondary)' }}>
                        <div className="font-medium text-sm">{h.agent_name} — {h.topic}</div>
                        <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>{h.insight}</p>
                        {h.collab_potential && (
                          <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full"
                                style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                            Collab: {h.collab_potential}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--fg-muted)' }}>No reports yet. Your agent will generate one after networking.</p>
            )}
          </div>

          {/* Agent Info */}
          <div className="rounded-xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Bot className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              {agent.name}
            </h2>
            <p className="text-sm mb-3" style={{ color: 'var(--fg-muted)' }}>{agent.persona || 'No persona set'}</p>
            <div className="flex flex-wrap gap-2">
              {agent.interests?.map((tag, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-full"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--fg-muted)' }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
