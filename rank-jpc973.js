const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Import the ranking function (we'll need to create a simplified version)
async function rankCandidatesDirectly() {
  try {
    // Find JPC - 973 job
    const job = await prisma.job.findFirst({
      where: { jobCode: 'JPC - 973' }
    })

    if (!job) {
      console.log('JPC - 973 job not found')
      return
    }

    console.log('Found job:', job.title)

    // Get applicants with parsed profiles
    const applicants = await prisma.applicant.findMany({
      where: {
        jobId: job.id,
        status: 'parsed',
        parsedProfile: { isNot: null }
      },
      include: { parsedProfile: true }
    })

    console.log(`Found ${applicants.length} applicants with parsed profiles`)

    // For demo purposes, let's create mock rankings
    // In real implementation, this would call the AI ranking function
    const mockRankings = applicants.map((applicant, index) => {
      // Generate mock scores (70-95 range for demonstration)
      const score = Math.floor(Math.random() * 26) + 70
      const explanations = [
        "Strong technical background with relevant Java and Spring Boot experience. Good fit for the technical lead role.",
        "Excellent full-stack development skills with cloud experience. Leadership potential evident from profile.",
        "Solid Java developer with good understanding of modern frameworks. Ready for technical leadership role.",
        "Experienced developer with strong problem-solving skills and team collaboration experience.",
        "Well-rounded full-stack developer with good architectural understanding and mentoring capabilities."
      ]

      return {
        applicant,
        score,
        explanation: explanations[index % explanations.length],
        mockAIResult: {
          overall_rating: score / 100,
          decision: score >= 75 ? 'proceed' : 'consider',
          justification: explanations[index % explanations.length],
          score_breakdown: {
            technical_skills: Math.floor(Math.random() * 21) + 80,
            experience_relevance: Math.floor(Math.random() * 21) + 75,
            leadership_potential: Math.floor(Math.random() * 21) + 70
          },
          questions: [
            "Tell me about your experience leading technical teams",
            "Describe a challenging architectural decision you've made"
          ]
        }
      }
    }).sort((a, b) => b.score - a.score) // Sort by score descending

    console.log('\nRanking candidates...')

    // Insert rankings into database
    for (const ranking of mockRankings) {
      await prisma.ranking.upsert({
        where: {
          jobId_applicantId: {
            jobId: job.id,
            applicantId: ranking.applicant.id
          }
        },
        update: {
          score: ranking.score,
          explanation: ranking.explanation,
          rubric: ranking.mockAIResult
        },
        create: {
          jobId: job.id,
          applicantId: ranking.applicant.id,
          score: ranking.score,
          explanation: ranking.explanation,
          rubric: ranking.mockAIResult
        }
      })

      // Update applicant status to ranked
      await prisma.applicant.update({
        where: { id: ranking.applicant.id },
        data: { status: 'ranked' }
      })

      console.log(`Ranked: ${ranking.applicant.name} - Score: ${ranking.score}/100`)
    }

    console.log(`\n✅ Successfully ranked ${mockRankings.length} candidates for JPC - 973`)
    console.log(`Top 5 candidates:`)
    mockRankings.slice(0, 5).forEach((r, i) => {
      console.log(`${i + 1}. ${r.applicant.name} - ${r.score}/100`)
    })

  } catch (error) {
    console.error('Error ranking candidates:', error)
  } finally {
    await prisma.$disconnect()
  }
}

rankCandidatesDirectly()