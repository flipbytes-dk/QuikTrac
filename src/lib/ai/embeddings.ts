/**
 * OpenAI Embedding Generation Utilities
 * Handles vector generation for semantic search and candidate matching
 */

import cuid from 'cuid'

const OPENAI_EMBEDDING_URL = 'https://api.openai.com/v1/embeddings'

/**
 * Generate embeddings using OpenAI's text-embedding model
 * @param text - Text to embed (max 8192 tokens for text-embedding-3-small)
 * @param model - Embedding model to use (default: text-embedding-3-small)
 * @returns Array of numbers representing the embedding vector
 */
export async function generateEmbedding(text: string, model = 'text-embedding-3-small'): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY not configured')

  // Truncate text if it's too long (rough estimate: 1 token ≈ 4 chars)
  const maxChars = 8192 * 4
  const truncatedText = text.length > maxChars ? text.slice(0, maxChars) : text

  const res = await fetch(OPENAI_EMBEDDING_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      input: truncatedText,
      encoding_format: 'float'
    }),
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`OpenAI embedding error ${res.status}: ${txt}`)
  }

  const data = await res.json()
  const embedding = data?.data?.[0]?.embedding
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error('No embedding data from OpenAI')
  }

  return embedding
}

/**
 * Generate embeddings for resume content optimized for candidate search
 * @param resumeMarkdown - Resume content in markdown format
 * @param skills - Array of skills
 * @param titles - Array of job titles/roles
 * @returns Embedding vector for the combined candidate profile
 */
export async function generateCandidateEmbedding(
  resumeMarkdown: string,
  skills: string[] = [],
  titles: string[] = []
): Promise<number[]> {
  // Combine different aspects of the candidate profile
  const combinedText = [
    resumeMarkdown,
    skills.length > 0 ? `Skills: ${skills.join(', ')}` : '',
    titles.length > 0 ? `Roles: ${titles.join(', ')}` : ''
  ].filter(Boolean).join('\n\n')

  return generateEmbedding(combinedText)
}

/**
 * Store embedding vector in the database
 * @param applicantId - ID of the applicant
 * @param embedding - Vector embedding array
 * @param model - Model used to generate embedding
 */
export async function storeEmbedding(
  applicantId: string,
  embedding: number[],
  model = 'text-embedding-3-small'
) {
  const { prisma } = await import('@/lib/db/prisma')

  // Check if embedding already exists for this applicant
  const existingEmbedding = await prisma.embedding.findFirst({
    where: {
      namespace: 'candidate',
      refId: applicantId
    }
  })

  // Convert array to pgvector format string
  const vectorString = `[${embedding.join(',')}]`

  if (existingEmbedding) {
    // Update existing embedding
    await prisma.$executeRaw`
      UPDATE "Embedding"
      SET vector = ${vectorString}::vector,
          model = ${model},
          "createdAt" = NOW()
      WHERE id = ${existingEmbedding.id}
    `
  } else {
    // Create new embedding
    await prisma.$executeRaw`
      INSERT INTO "Embedding" (id, namespace, "refId", vector, model, "createdAt")
      VALUES (${generateId()}, 'candidate', ${applicantId}, ${vectorString}::vector, ${model}, NOW())
    `
  }
}

// Use proper cuid generation
function generateId(): string {
  return cuid()
}