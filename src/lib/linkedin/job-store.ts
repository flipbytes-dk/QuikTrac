// Shared in-memory job store across route modules in a single Node process.
// In serverless multi-process environments this is still best-effort. For
// production, persist to Redis/DB.

export type JobMap<T> = Map<string, T>

declare global {
  // eslint-disable-next-line no-var
  var __LINKEDIN_JOBS__: JobMap<any> | undefined
}

export function getJobStore<T = any>(): JobMap<T> {
  if (!global.__LINKEDIN_JOBS__) {
    global.__LINKEDIN_JOBS__ = new Map<string, T>()
  }
  return global.__LINKEDIN_JOBS__ as JobMap<T>
}
