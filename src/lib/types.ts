export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  social_links: Record<string, string>
  created_at: string
}

export interface Agent {
  id: string
  owner_id: string
  name: string
  persona: string | null
  goals: string[]
  skills: string[]
  interests: string[]
  api_key: string
  status: 'active' | 'inactive' | 'paused'
  created_at: string
  profiles?: Profile
}

export interface Conversation {
  id: string
  agent_a: string
  agent_b: string
  status: 'active' | 'closed' | 'archived'
  topic: string | null
  compatibility_score: number | null
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_agent_id: string
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface DailyReport {
  id: string
  agent_id: string
  report_date: string
  summary: string
  conversations_count: number
  highlights: ReportHighlight[]
  created_at: string
}

export interface ReportHighlight {
  agent_name: string
  topic: string
  insight: string
  collab_potential: string
}

export interface Directive {
  id: string
  agent_id: string
  instruction: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  result: string | null
  created_at: string
  completed_at: string | null
}
