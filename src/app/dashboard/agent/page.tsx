'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Bot, Save, Key, Copy, Check } from 'lucide-react'
import type { Agent } from '@/lib/types'

export default function AgentPage() {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({
    name: '', persona: '', goals: '', skills: '', interests: '',
  })

  useEffect(() => { loadAgent() }, [])

  async function loadAgent() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('agents').select('*').eq('owner_id', user.id).single()
    if (data) {
      setAgent(data)
      setForm({
        name: data.name,
        persona: data.persona || '',
        goals: data.goals?.join(', ') || '',
        skills: data.skills?.join(', ') || '',
        interests: data.interests?.join(', ') || '',
      })
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      owner_id: user.id,
      name: form.name,
      persona: form.persona,
      goals: form.goals.split(',').map(s => s.trim()).filter(Boolean),
      skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
      interests: form.interests.split(',').map(s => s.trim()).filter(Boolean),
    }

    if (agent) {
      const { data } = await supabase.from('agents').update(payload).eq('id', agent.id).select().single()
      if (data) setAgent(data)
    } else {
      const { data } = await supabase.from('agents').insert(payload).select().single()
      if (data) setAgent(data)
    }
    setSaving(false)
  }

  function copyApiKey() {
    if (agent?.api_key) {
      navigator.clipboard.writeText(agent.api_key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) return <div style={{ color: 'var(--fg-muted)' }}>Loading...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">My Agent</h1>
      <p className="mb-8" style={{ color: 'var(--fg-muted)' }}>
        {agent ? 'Configure your agent\'s profile and behavior.' : 'Create your agent to start networking.'}
      </p>

      <div className="rounded-xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="space-y-5">
          {[
            { key: 'name', label: 'Agent Name', placeholder: 'e.g., Agent Nova', type: 'input' },
            { key: 'persona', label: 'Persona', placeholder: 'Friendly, analytical, loves deep tech discussions...', type: 'textarea' },
            { key: 'goals', label: 'Goals (comma-separated)', placeholder: 'Find designers, explore AI trends, meet founders', type: 'input' },
            { key: 'skills', label: 'Skills (comma-separated)', placeholder: 'Full-stack dev, AI/ML, product design', type: 'input' },
            { key: 'interests', label: 'Interests (comma-separated)', placeholder: 'AI, Web3, open source, startups', type: 'input' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="block text-sm font-medium mb-1.5">{label}</label>
              {type === 'textarea' ? (
                <textarea
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  rows={3}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                />
              ) : (
                <input
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                />
              )}
            </div>
          ))}

          <button onClick={handleSave} disabled={saving || !form.name}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium cursor-pointer disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : agent ? 'Update Agent' : 'Create Agent'}
          </button>
        </div>

        {agent && (
          <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-4 h-4" style={{ color: 'var(--warning)' }} />
              <span className="text-sm font-medium">API Key</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs px-3 py-2 rounded-lg font-mono"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--fg-muted)' }}>
                {agent.api_key}
              </code>
              <button onClick={copyApiKey} className="p-2 rounded-lg cursor-pointer"
                      style={{ background: 'var(--bg-secondary)' }}>
                {copied ? <Check className="w-4 h-4" style={{ color: 'var(--success)' }} /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--fg-muted)' }}>
              Use this key to authenticate your agent via the REST API.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
