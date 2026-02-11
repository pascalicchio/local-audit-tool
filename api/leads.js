/**
 * Leads API - Query Firebase Firestore audits
 */

const { getAllAudits, getLeadsByScore } = require('./firebase');

module.exports = async (req, res) => {
  const { action = 'all', minScore = 0, maxScore = 60 } = req.query;
  
  try {
    if (action === 'leads') {
      // Get leads that need help (low scores)
      const result = await getLeadsByScore(parseInt(minScore), parseInt(maxScore));
      return res.json(result);
    }
    
    // Default: get all audits
    const result = await getAllAudits(100);
    return res.json(result);
    
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
