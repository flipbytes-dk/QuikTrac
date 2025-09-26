import { NextRequest, NextResponse } from 'next/server'
import { costMonitor } from '@/lib/ai/cost-monitor'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const timeframe = searchParams.get('timeframe') as 'today' | 'week' | 'month' || 'today'
    const service = searchParams.get('service') || undefined
    const limit = parseInt(searchParams.get('limit') || '50')

    console.log(`[costs-dashboard] Getting cost data for timeframe: ${timeframe}, service: ${service || 'all'}`)

    const [summary, details] = await Promise.all([
      costMonitor.getCostSummary(timeframe),
      costMonitor.getDetailedUsage(service, limit),
    ])

    return NextResponse.json({
      success: true,
      timeframe,
      summary,
      details,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('[costs-dashboard] Failed to get cost data:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve cost data', code: 500 },
      { status: 500 }
    )
  }
}