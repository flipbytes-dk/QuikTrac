const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    // Check ParsedProfile records
    const parsedProfiles = await prisma.parsedProfile.findMany({
      take: 10,
      include: {
        applicant: {
          include: {
            job: true
          }
        }
      }
    })

    console.log('ParsedProfile records found:', parsedProfiles.length)
    console.log('Sample records:')
    parsedProfiles.forEach((profile, index) => {
      console.log(`${index + 1}. Applicant: ${profile.applicant.name}`)
      console.log(`   Job Code: ${profile.applicant.job.jobCode}`)
      console.log(`   Skills: ${profile.skills.slice(0, 3).join(', ')}...`)
      console.log(`   Location: ${profile.location}`)
      console.log('---')
    })

    // Specifically check for JPC - 973 applicants
    const jpc973Job = await prisma.job.findFirst({
      where: { jobCode: 'JPC - 973' }
    })

    if (jpc973Job) {
      console.log('\nJPC - 973 Job found:', jpc973Job.title)

      const jpc973Applicants = await prisma.applicant.findMany({
        where: { jobId: jpc973Job.id },
        include: {
          parsedProfile: true,
          rankings: true
        }
      })

      console.log(`JPC - 973 has ${jpc973Applicants.length} applicants`)
      jpc973Applicants.forEach((applicant, index) => {
        console.log(`${index + 1}. ${applicant.name} - Status: ${applicant.status}`)
        console.log(`   Has ParsedProfile: ${applicant.parsedProfile ? 'Yes' : 'No'}`)
        console.log(`   Has Ranking: ${applicant.rankings.length > 0 ? 'Yes' : 'No'}`)
      })
    } else {
      console.log('JPC - 973 job not found')
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()