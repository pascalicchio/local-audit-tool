/**
 * AI-Powered Recommendations using MiniMax
 */

const axios = require('axios');

const MINIMAX_API = 'https://api.minimax.chat/v1/text/chatcompletion_v2';

module.exports = async (req, res) => {
  const { auditData, industry } = req.body;
  
  if (!auditData) {
    return res.status(400).json({ error: 'Audit data required' });
  }

  try {
    const prompt = `You are a website optimization expert for local businesses. 
Analyze this website audit and provide specific, actionable recommendations.

AUDIT DATA:
- URL: ${auditData.url}
- Score: ${auditData.score}/100
- Industry: ${industry || 'general'}

ISSUES FOUND:
${auditData.recommendations?.map(r => `- ${r.issue}: ${r.fix}`).join('\n') || 'None'}

Provide:
1. A brief paragraph addressing the business owner personally (2-3 sentences)
2. 3 specific action items with estimated impact
3. Estimated investment range for fixes

Keep it conversational, encouraging, and professional. Don't use markdown.`;

    const response = await axios.post(MINIMAX_API, {
      model: 'abab6.5s-chat',
      messages: [
        { role: 'system', content: 'You are a helpful website optimization consultant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 600
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.MINIMAX_API_KEY || ''}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    const recommendations = response.data.choices?.[0]?.message?.content || null;
    res.json({ recommendations });
  } catch (e) {
    console.error('MiniMax error:', e.message);
    res.json({ 
      recommendations: `Based on your audit, here are your top priorities:\n\n` +
      auditData.recommendations?.map(r => `• ${r.issue}: ${r.fix}`).join('\n') || 'Your website looks good!'
    });
  }
};
