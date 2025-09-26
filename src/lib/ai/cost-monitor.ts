import { PrismaClient } from '@prisma/client'
import { prisma as sharedPrisma } from '@/lib/db/prisma'

export interface OpenAIUsage {
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cost: number
  success: boolean
  error?: string
}

export interface LlamaParseUsage {
  jobId: string
  processingTimeMs: number
  pages: number
  fileSize: number
  success: boolean
  error?: string
}

export interface LandingAIUsage {
  processingTimeMs: number
  pages: number
  fileSize: number
  success: boolean
  error?: string
}

export type ServiceType = 'openai' | 'llamaparse' | 'landingai'

export interface CostRecord {
  id: string
  service: ServiceType
  operation: string
  cost: number
  metadata: Record<string, any>
  success: boolean
  error?: string
  createdAt: Date
}

// OpenAI pricing (per 1K tokens) as of 2024
const OPENAI_PRICING = {
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
  'gpt-5': { input: 0.0025, output: 0.01 }, // Assuming same as gpt-4o for now
} as const

// Actual pricing for other services (updated from official docs)
const SERVICE_PRICING = {
  llamaparse: {
    perPage: 0.003, // $0.003 per page (3 credits per page, 1,000 credits = $1)
  },
  landingai: {
    perPage: 0.025, // $0.025 per page (Team plan: 3 credits/page, $1=110 credits)
  }
} as const

class CostMonitor {
  private prisma: PrismaClient

  constructor(prisma?: PrismaClient) {
    // Reuse the shared Prisma client to avoid exhausting the connection pool
    this.prisma = prisma || sharedPrisma
  }

  async trackOpenAI(
    operation: string,
    usage: {
      model: string
      prompt_tokens: number
      completion_tokens: number
      total_tokens: number
    },
    success: boolean,
    error?: string
  ): Promise<CostRecord> {
    const cost = this.calculateOpenAICost(usage.model, usage.prompt_tokens, usage.completion_tokens)

    const record = await this.prisma.costRecord.create({
      data: {
        service: 'openai' as ServiceType,
        operation,
        cost,
        metadata: {
          model: usage.model,
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        },
        success,
        error,
      },
    })

    console.log(`[cost-monitor] OpenAI ${operation}: ${usage.model} - $${cost.toFixed(4)} (${usage.total_tokens} tokens)`)

    return record as CostRecord
  }

  async trackLlamaParse(
    operation: string,
    usage: LlamaParseUsage
  ): Promise<CostRecord> {
    const cost = this.calculateLlamaParseCost(usage.pages)

    const record = await this.prisma.costRecord.create({
      data: {
        service: 'llamaparse' as ServiceType,
        operation,
        cost,
        metadata: {
          jobId: usage.jobId,
          processingTimeMs: usage.processingTimeMs,
          pages: usage.pages,
          fileSize: usage.fileSize,
        },
        success: usage.success,
        error: usage.error,
      },
    })

    console.log(`[cost-monitor] LlamaParse ${operation}: $${cost.toFixed(4)} (${usage.pages} pages)`)

    return record as CostRecord
  }

  async trackLandingAI(
    operation: string,
    usage: LandingAIUsage
  ): Promise<CostRecord> {
    const cost = this.calculateLandingAICost(usage.pages)

    const record = await this.prisma.costRecord.create({
      data: {
        service: 'landingai' as ServiceType,
        operation,
        cost,
        metadata: {
          processingTimeMs: usage.processingTimeMs,
          pages: usage.pages,
          fileSize: usage.fileSize,
        },
        success: usage.success,
        error: usage.error,
      },
    })

    console.log(`[cost-monitor] Landing AI ${operation}: $${cost.toFixed(4)} (${usage.pages} pages)`)

    return record as CostRecord
  }

  private calculateOpenAICost(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = OPENAI_PRICING[model as keyof typeof OPENAI_PRICING]
    if (!pricing) {
      console.warn(`[cost-monitor] Unknown OpenAI model: ${model}, using gpt-4o pricing`)
      return this.calculateOpenAICost('gpt-4o', promptTokens, completionTokens)
    }

    const inputCost = (promptTokens / 1000) * pricing.input
    const outputCost = (completionTokens / 1000) * pricing.output
    return inputCost + outputCost
  }

  private calculateLlamaParseCost(pages: number): number {
    return pages * SERVICE_PRICING.llamaparse.perPage
  }

  private calculateLandingAICost(pages: number): number {
    return pages * SERVICE_PRICING.landingai.perPage
  }

  async getCostSummary(timeframe: 'today' | 'week' | 'month' = 'today'): Promise<{
    totalCost: number
    byService: Record<string, { cost: number; operations: number }>
    byOperation: Record<string, { cost: number; count: number }>
  }> {
    const now = new Date()
    let startDate: Date

    switch (timeframe) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
    }

    const records = await this.prisma.costRecord.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    })

    const totalCost = records.reduce((sum, record) => sum + record.cost, 0)

    const byService = records.reduce((acc, record) => {
      if (!acc[record.service]) {
        acc[record.service] = { cost: 0, operations: 0 }
      }
      acc[record.service].cost += record.cost
      acc[record.service].operations += 1
      return acc
    }, {} as Record<string, { cost: number; operations: number }>)

    const byOperation = records.reduce((acc, record) => {
      if (!acc[record.operation]) {
        acc[record.operation] = { cost: 0, count: 0 }
      }
      acc[record.operation].cost += record.cost
      acc[record.operation].count += 1
      return acc
    }, {} as Record<string, { cost: number; count: number }>)

    return { totalCost, byService, byOperation }
  }

  async getDetailedUsage(service?: string, limit = 50): Promise<CostRecord[]> {
    const records = await this.prisma.costRecord.findMany({
      where: service ? { service: service as ServiceType } : undefined,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })
    return records as CostRecord[]
  }
}

export const costMonitor = new CostMonitor()

// Utility function to format costs for display
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 1000).toFixed(2)}m` // Show in thousandths
  }
  return `$${cost.toFixed(4)}`
}

// Utility function to format tokens for display
export function formatTokens(tokens: number): string {
  if (tokens < 1000) {
    return `${tokens} tokens`
  }
  return `${(tokens / 1000).toFixed(1)}K tokens`
}