// This script will test the shortlist API
const fetch = require('node-fetch')

async function loadShortlistedCandidates() {
  try {
    const response = await fetch('http://localhost:3001/api/ceipal/shortlist?jobCode=973&pageSize=20')

    if (!response.ok) {
      console.error('API Error:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error details:', errorText)
      return
    }

    const data = await response.json()
    console.log('Shortlisted Candidates for JPC - 973:')
    console.log('=======================================')
    console.log(`Found ${data.items?.length || 0} candidates`)
    console.log(`Page ${data.pagination?.page || 1} of ${data.pagination?.pages || 1}`)
    console.log(`Total: ${data.pagination?.total || 0}`)
    console.log('')

    if (data.items && data.items.length > 0) {
      data.items.forEach((candidate, index) => {
        console.log(`${index + 1}. ${candidate.name} - Score: ${candidate.score}/100`)
        console.log(`   Email: ${candidate.email}`)
        console.log(`   Phone: ${candidate.phone}`)
        console.log(`   Location: ${candidate.location}`)
        console.log(`   Current Role: ${candidate.currentTitle || 'Not specified'}`)
        if (candidate.currentCompany) {
          console.log(`   Company: ${candidate.currentCompany}`)
        }
        console.log(`   Skills: ${candidate.skills?.slice(0, 3).join(', ') || 'Not specified'}`)
        console.log(`   AI Assessment: ${candidate.explanation}`)
        console.log('   ---')
      })
    } else {
      console.log('No shortlisted candidates found.')
    }

  } catch (error) {
    console.error('Error loading shortlisted candidates:', error)
  }
}

loadShortlistedCandidates()