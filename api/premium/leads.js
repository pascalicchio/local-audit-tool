/**
 * Lead Capture and Management
 */

const fs = require('fs');
const path = require('path');

const LEADS_DIR = path.join(__dirname, '../../data/leads');

// Ensure directory exists
if (!fs.existsSync(LEADS_DIR)) {
  fs.mkdirSync(LEADS_DIR, { recursive: true });
}

/**
 * Save lead data
 */
function saveLead(leadData) {
  const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
  const filename = path.join(LEADS_DIR, `${id}.json`);
  
  const lead = {
    id,
    ...leadData,
    createdAt: new Date().toISOString(),
    status: 'new'
  };
  
  fs.writeFileSync(filename, JSON.stringify(lead, null, 2));
  return id;
}

/**
 * Get all leads
 */
function getLeads() {
  if (!fs.existsSync(LEADS_DIR)) return [];
  
  return fs.readdirSync(LEADS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(LEADS_DIR, f)));
      return {
        id: data.id,
        email: data.email,
        website: data.website,
        score: data.score,
        industry: data.industry,
        status: data.status,
        createdAt: data.createdAt
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Update lead status
 */
function updateLeadStatus(id, status, notes = '') {
  const filename = path.join(LEADS_DIR, `${id}.json`);
  if (!fs.existsSync(filename)) return null;
  
  const lead = JSON.parse(fs.readFileSync(filename));
  lead.status = status;
  lead.notes = notes;
  lead.updatedAt = new Date().toISOString();
  
  fs.writeFileSync(filename, JSON.stringify(lead, null, 2));
  return lead;
}

/**
 * Get lead by ID
 */
function getLead(id) {
  const filename = path.join(LEADS_DIR, `${id}.json`);
  if (!fs.existsSync(filename)) return null;
  return JSON.parse(fs.readFileSync(filename));
}

module.exports = { saveLead, getLeads, updateLeadStatus, getLead };
