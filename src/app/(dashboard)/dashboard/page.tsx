import { prisma } from '@/lib/db/prisma'
import Image from 'next/image'

function StatCard({ label, value, delta }: { label: string; value: number | string; delta?: number }) {
  return (
    <div className="group h-32 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/80 p-5 shadow-xl backdrop-blur transition-all duration-200 hover:shadow-2xl hover:scale-[1.02] hover:bg-[hsl(var(--card))]/90 hover:border-[#2487FE]/20 supports-[backdrop-filter]:bg-[hsl(var(--card))]/70 focus-within:ring-2 focus-within:ring-[#2487FE] focus-within:ring-offset-2 sm:h-28">
      <div className="text-[10px] uppercase tracking-wide text-[#172233]/60 transition-colors group-hover:text-[#172233]/85">{label}</div>
      <div className="mt-2 text-2xl font-semibold leading-none text-[#172233] transition-all group-hover:text-[#2487FE] sm:text-3xl">{value}</div>
      {typeof delta === 'number' ? (
        <div className={`mt-1 text-xs transition-colors ${delta > 0 ? 'text-green-600 dark:text-green-400' : delta < 0 ? 'text-red-600 dark:text-red-400' : 'text-[#172233]/60'}`}>
          {delta > 0 ? '+' : ''}{delta} vs last week
        </div>
      ) : null}
    </div>
  )
}

export default async function DashboardPage() {
  const now = Date.now()
  const weekStart = new Date(now - 7 * 24 * 60 * 60 * 1000)
  const prevWeekStart = new Date(now - 14 * 24 * 60 * 60 * 1000)

  const [
    imported,
    parsedAll,
    rankedAll,
    shortlistedAll,
    contactedAll,
    missingContactAll,
    jobs,
    importsW,
    importsPrev,
    parsedW,
    parsedPrev,
    rankedW,
    rankedPrev,
    shortlistedW,
    shortlistedPrev,
    contactedW,
    contactedPrev,
    missingContactW,
    missingContactPrev,
  ] = await Promise.all([
    prisma.applicant.count({ where: { status: 'imported' } }),
    prisma.applicant.count({ where: { status: 'parsed' } }),
    prisma.applicant.count({ where: { status: 'ranked' } }),
    prisma.applicant.count({ where: { status: 'shortlisted' } }),
    prisma.applicant.count({ where: { status: 'contacted' } }),
    prisma.applicant.count({ where: { OR: [{ email: null }, { email: '' }, { phone: null }, { phone: '' }] } }),
    prisma.job.count(),

    // Week vs last week
    prisma.applicant.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.applicant.count({ where: { createdAt: { gte: prevWeekStart, lt: weekStart } } }),

    prisma.applicant.count({ where: { status: 'parsed', createdAt: { gte: weekStart } } }),
    prisma.applicant.count({ where: { status: 'parsed', createdAt: { gte: prevWeekStart, lt: weekStart } } }),

    prisma.applicant.count({ where: { status: 'ranked', createdAt: { gte: weekStart } } }),
    prisma.applicant.count({ where: { status: 'ranked', createdAt: { gte: prevWeekStart, lt: weekStart } } }),

    prisma.applicant.count({ where: { status: 'shortlisted', createdAt: { gte: weekStart } } }),
    prisma.applicant.count({ where: { status: 'shortlisted', createdAt: { gte: prevWeekStart, lt: weekStart } } }),

    prisma.applicant.count({ where: { status: 'contacted', createdAt: { gte: weekStart } } }),
    prisma.applicant.count({ where: { status: 'contacted', createdAt: { gte: prevWeekStart, lt: weekStart } } }),

    prisma.applicant.count({
      where: {
        AND: [
          { OR: [{ email: null }, { email: '' }, { phone: null }, { phone: '' }] },
          { createdAt: { gte: weekStart } },
        ],
      },
    }),
    prisma.applicant.count({
      where: {
        AND: [
          { OR: [{ email: null }, { email: '' }, { phone: null }, { phone: '' }] },
          { createdAt: { gte: prevWeekStart, lt: weekStart } },
        ],
      },
    }),
  ])

  const d = (w: number, p: number) => w - p

  return (
    <main className="w-full">
      <div className="mb-4 flex items-center gap-3">
        <Image src="/logo.png" alt="QuikTrac" width={28} height={28} className="rounded-sm" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-[#172233]/85">Your recruiting snapshot.</p>
        </div>
      </div>

      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard label="New imports (7d)" value={importsW} delta={d(importsW, importsPrev)} />
        <StatCard label="Resumes screened (7d)" value={parsedW} delta={d(parsedW, parsedPrev)} />
        <StatCard label="Ranked (7d)" value={rankedW} delta={d(rankedW, rankedPrev)} />
        <StatCard label="Shortlisted (7d)" value={shortlistedW} delta={d(shortlistedW, shortlistedPrev)} />
        <StatCard label="Contacted (7d)" value={contactedW} delta={d(contactedW, contactedPrev)} />
        <StatCard label="Missing contact info (7d)" value={missingContactW} delta={d(missingContactW, missingContactPrev)} />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Applicants imported (all)" value={imported} />
        <StatCard label="Jobs (all)" value={jobs} />
      </section>
    </main>
  )
}
