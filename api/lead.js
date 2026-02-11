/**
 * Lead Capture API
 */

module.exports = async (req, res) => {
  const { name, email, company, message, website } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email required' });
  }

  try {
    // Log lead - in production, send to email/database
    console.log('═══════════════════════════════════════');
    console.log('NEW LEAD - Website Audit Tool');
    console.log('═══════════════════════════════════════');
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Company:', company);
    console.log('Website:', website);
    console.log('Message:', message);
    console.log('Time:', new Date().toISOString());
    console.log('═══════════════════════════════════════');
    
    res.json({ success: true, message: 'Thank you! We\'ll be in touch soon.' });
  } catch (e) {
    console.error('Lead error:', e.message);
    res.status(500).json({ error: 'Failed to save lead' });
  }
};
