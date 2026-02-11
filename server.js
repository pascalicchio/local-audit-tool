/**
 * Local Audit Tool - Web Server
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { auditWebsite } = require('./audit');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static('public'));

// API: Run audit
app.post('/api/audit', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL required' });
  }
  
  try {
    const results = await auditWebsite(url);
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Get all reports
app.get('/api/reports', (req, res) => {
  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) {
    return res.json([]);
  }
  
  const files = fs.readdirSync(reportsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(reportsDir, f)));
      return {
        filename: f,
        url: data.url,
        score: data.score,
        grade: data.grade,
        timestamp: data.timestamp
      };
    });
  
  res.json(files);
});

app.listen(PORT, () => {
  console.log(`🌐 Local Audit Tool running at http://localhost:${PORT}`);
});
