/**
 * AI-Powered Recommendations using MiniMax
 */

const axios = require('axios');

const MINIMAX_API = 'https://api.minimax.chat/v1/text/chatcompletion_v2';

/**
 * Generate personalized recommendations using MiniMax AI
 */
async function generateRecommendations(auditData, industry = 'general') {
  const { url, score, checks, recommendations } = auditData;
  
  const prompt = `You are a website optimization expert for local businesses. 
Analyze this website audit and provide specific, actionable recommendations.

AUDIT DATA:
- URL: ${url}
- Score: ${score}/100
- Industry: ${industry}

ISSUES FOUND:
${recommendations.map(r => `- ${r.issue}: ${r.fix}`).join('\n')}

Provide:
1. A brief paragraph addressing the business owner personally
2. 3 specific action items with estimated impact (e.g., "Adding meta description could increase organic traffic by 20%")
3. Estimated investment range for fixes (e.g., "$200-500 for a developer")

Keep it conversational, encouraging, and professional. Don't use markdown.`;

  try {
    const response = await axios.post(MINIMAX_API, {
      model: 'abab6.5s-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful website optimization consultant for local businesses.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.MINIMAX_API_KEY || 'YOUR_API_KEY'}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    return response.data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.error('MiniMax API error:', e.message);
    return null;
  }
}

/**
 * Generate competitor comparison
 */
async function generateCompetitorAnalysis(auditData, competitorUrls = []) {
  const { url, score } = auditData;
  
  const prompt = `Compare this website to typical competitors in the local business space.

WEBSITE: ${url}
SCORE: ${score}/100

Competitors to compare against: ${competitorUrls.join(', ') || 'typical local businesses'}

Provide:
1. Where this website excels compared to competitors (2-3 points)
2. Critical gaps that need attention (2-3 points)
3. One "quick win" that would immediately improve competitive position

Keep it brief and actionable.`;

  try {
    const response = await axios.post(MINIMAX_API, {
      model: 'abab6.5s-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a competitive analysis expert for local businesses.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 500
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.MINIMAX_API_KEY || 'YOUR_API_KEY'}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    return response.data.choices?.[0]?.message?.content || null;
  } catch (e) {
    return null;
  }
}

module.exports = { generateRecommendations, generateCompetitorAnalysis };
