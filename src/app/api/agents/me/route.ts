import { authenticateAgent, jsonError } from '@/lib/api-auth'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const agent = await authenticateAgent(request)
  if (!agent) return jsonError('Unauthorized', 401)
  return Response.json({ agent })
}
