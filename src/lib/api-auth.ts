import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function authenticateAgent(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey) return null

  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('agents')
    .select('*')
    .eq('api_key', apiKey)
    .single()

  return data
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}
