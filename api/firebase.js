/**
 * Firebase Firestore Service for Lead Capture
 * Handles initialization gracefully in serverless environments
 */

const fs = require('fs');
const path = require('path');

let admin = null;
let db = null;
let initialized = false;

function initFirebase() {
  if (initialized) return { success: true };
  
  try {
    // Try to load credentials
    const credsPath = path.join(__dirname, '../firebase-credentials.json');
    if (!fs.existsSync(credsPath)) {
      console.log('Firebase credentials not found');
      return { success: false, error: 'No credentials' };
    }
    
    const serviceAccount = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    
    // Try dynamic import for firebase-admin
    try {
      admin = require('firebase-admin');
    } catch (e) {
      console.log('Firebase Admin SDK not available (serverless build in progress)');
      return { success: false, error: 'SDK not available' };
    }
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: 'https://mission-board-70cab.firebaseio.com'
      });
    }
    
    db = admin.firestore();
    initialized = true;
    console.log('Firebase initialized successfully');
    return { success: true };
  } catch (e) {
    console.error('Firebase init error:', e.message);
    return { success: false, error: e.message };
  }
}

async function saveAudit(data) {
  try {
    const init = initFirebase();
    if (!init.success || !db) {
      console.log('Firebase not available, skipping save');
      return { success: false, error: init.error || 'Not initialized' };
    }
    
    const auditData = {
      url: data.url,
      score: data.score,
      grade: data.grade,
      industry: data.industry,
      industryName: data.industryName,
      keywords: data.keywords?.primary?.slice(0, 10) || [],
      techStack: data.techStack,
      performance: data.performance,
      checksCount: data.checks?.length || 0,
      issuesCount: data.checks?.filter(c => !c.passed)?.length || 0,
      savedAt: new Date().toISOString()
    };

    await db.collection('audits').doc(data.url).set(auditData, { merge: true });
    console.log('Saved audit to Firebase:', data.url);
    return { success: true, id: data.url };
  } catch (e) {
    console.error('Firebase save error:', e.message);
    return { success: false, error: e.message };
  }
}

async function getAuditHistory(url) {
  try {
    const init = initFirebase();
    if (!init.success || !db) return { success: false, error: 'Firebase not available' };
    
    const doc = await db.collection('audits').doc(url).get();
    if (doc.exists) {
      return { success: true, data: doc.data() };
    }
    return { success: false, exists: false };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  saveAudit,
  getAuditHistory
};
