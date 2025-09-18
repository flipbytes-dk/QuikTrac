// Seed script (CommonJS, no new deps). Uses a precomputed bcrypt hash for 'Admin123!'.
// Override with ADMIN_EMAIL and/or ADMIN_PASSWORD_HASH in env.

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// bcrypt hash for 'Admin123!' with 10 salt rounds
const DEFAULT_ADMIN_HASH = '$2b$10$5g7b0k2F0q0cD3XhCq3rsePq6B7RZc8g1oJ4xWcKpS5f3J1LQbSZe'

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@quiktrac.local'
  const adminHash = process.env.ADMIN_PASSWORD_HASH || DEFAULT_ADMIN_HASH

  // Roles
  const [adminRole, recruiterRole, clientRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: { name: 'admin' },
    }),
    prisma.role.upsert({
      where: { name: 'recruiter' },
      update: {},
      create: { name: 'recruiter' },
    }),
    prisma.role.upsert({
      where: { name: 'client' },
      update: {},
      create: { name: 'client' },
    }),
  ])

  // Admin user
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminHash, roleId: adminRole.id },
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      roleId: adminRole.id,
    },
  })

  // Sample job and applicant
  const job = await prisma.job.upsert({
    where: { ceipalId: 'DEMO-1234' },
    update: {},
    create: {
      ceipalId: 'DEMO-1234',
      title: 'Senior Full‑Stack Engineer',
      location: 'Bengaluru, IN',
      description: 'React/Next.js + Node/Prisma; AWS; 6+ years',
      status: 'open',
    },
  })

  const applicant = await prisma.applicant.upsert({
    where: { ceipalId: 'CAND-1' },
    update: {},
    create: {
      ceipalId: 'CAND-1',
      jobId: job.id,
      name: 'Asha Sharma',
      email: 'asha@example.com',
      phone: '+91-90000-00000',
      location: 'Bengaluru, IN',
      yearsExperience: 7,
      skills: ['react', 'nextjs', 'node', 'prisma', 'aws'],
      status: 'imported',
    },
  })

  await prisma.parsedProfile.upsert({
    where: { applicantId: applicant.id },
    update: {},
    create: {
      applicantId: applicant.id,
      json: { summary: 'Full‑stack engineer with React/Next.js, Node, AWS.' },
      skills: ['react', 'nextjs', 'node', 'prisma', 'aws'],
      titles: ['Senior Software Engineer', 'Full‑Stack Engineer'],
      location: 'Bengaluru, IN',
      totalExpMonths: 84,
    },
  })

  console.log('Seed complete: admin user, roles, demo job/applicant created.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
