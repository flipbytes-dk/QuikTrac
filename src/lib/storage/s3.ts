import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getEnv } from '@/lib/env'

let _s3: S3Client | null = null

function getS3(): { client: S3Client; bucket: string } {
  const env = getEnv()
  const region = env.AWS_REGION
  const bucket = env.S3_BUCKET

  if (!region || !bucket) {
    throw new Error('AWS_REGION and S3_BUCKET are required for S3 uploads')
  }

  if (!_s3) {
    _s3 = new S3Client({ region })
  }
  return { client: _s3, bucket }
}

export async function uploadBufferToS3(params: {
  buffer: Buffer
  key: string
  contentType: string
  metadata?: Record<string, string>
}): Promise<{ key: string; etag?: string }> {
  const { client, bucket } = getS3()
  const { buffer, key, contentType, metadata } = params
  const env = getEnv()
  const put = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    Metadata: metadata,
    // Respect bucket policies that require KMS encryption
    ...(env.S3_KMS_KEY_ID
      ? { ServerSideEncryption: 'aws:kms', SSEKMSKeyId: env.S3_KMS_KEY_ID }
      : {}),
  })
  const res = await client.send(put)
  return { key, etag: res.ETag }
}

export function makeResumeKey(opts: {
  jobCode?: string | null
  applicantCeipalId?: string | number | null
  filename?: string
}): string {
  const job = (opts.jobCode || 'unknown').replace(/[^a-zA-Z0-9-_]/g, '_')
  const applicant = String(opts.applicantCeipalId || 'unknown')
  const name = (opts.filename || 'resume.pdf').replace(/[^a-zA-Z0-9-_.]/g, '_')
  return `resumes/${job}/${applicant}/${name}`
}
