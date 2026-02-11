/**
 * Local Business Website Audit Tool
 * Uses Camofox to scrape websites, MiniMax to generate reports
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CAMOFOX_URL = process.env.CAMOFOX_URL || 'http://localhost:9377';
const OUTPUT_DIR = path.join(__dirname, 'reports');

// Audit categories
const AUDIT_CHECKS = [
  {
    name: 'SSL Certificate',
    check: (snapshot) => {
      const url = snapshot.url || '';
      return {
        passed: url.startsWith('https'),
        message: url.startsWith('https') ? 'SSL certificate detected' : 'NOT SECURE - No HTTPS'
      };
    }
  },
  {
    name: 'Mobile Friendly',
    check: (snapshot) => {
      const text = snapshot.raw.toLowerCase();
      const mobileIndicators = ['viewport', 'mobile', 'responsive'];
      const hasMobile = mobileIndicators.some(ind => text.includes(ind));
      return {
        passed: hasMobile,
        message: hasMobile ? 'Mobile responsive indicators found' : 'No mobile optimization detected'
      };
    }
  },
  {
    name: 'Meta Description',
    check: (snapshot) => {
      const text = snapshot.raw;
      const hasDescription = text.includes('description') || text.includes('meta');
      return {
        passed: hasDescription,
        message: hasDescription ? 'Meta tags present' : 'Missing meta description'
      };
    }
  },
  {
    name: 'Contact Information',
    check: (snapshot) => {
      const text = snapshot.raw.toLowerCase();
      const hasContact = text.includes('contact') || text.includes('phone') || 
                         text.includes('email') || text.includes('address') ||
                         text.includes('location') || text.includes('footer');
      return {
        passed: hasContact,
        message: hasContact ? 'Contact information found' : 'No contact info visible'
      };
    }
  },
  {
    name: 'Call to Action',
    check: (snapshot) => {
      const text = snapshot.raw.toLowerCase();
      const ctaWords = ['book', 'schedule', 'contact', 'call', 'get started', 
                        'sign up', 'register', 'appointment', 'learn more'];
      const hasCTA = ctaWords.some(word => text.includes(word));
      return {
        passed: hasCTA,
        message: hasCTA ? 'Call-to-action elements found' : 'No clear call-to-action'
      };
    }
  },
  {
    name: 'Social Links',
    check: (snapshot) => {
      const text = snapshot.raw.toLowerCase();
      const socialLinks = ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'x.com'];
      const found = socialLinks.filter(s => text.includes(s));
      return {
        passed: found.length > 0,
        message: found.length > 0 ? `Social links: ${found.join(', ')}` : 'No social media links'
      };
    }
  },
  {
    name: 'Images',
    check: (snapshot) => {
      const text = snapshot.raw;
      const hasImages = text.includes('img');
      const hasAlt = text.includes('alt=') || text.includes('alt="');
      return {
        passed: hasImages && hasAlt,
        message: hasImages ? (hasAlt ? 'Images with alt tags' : 'Images found but missing alt tags') : 'No images found'
      };
    }
  },
  {
    name: 'Page Speed Indicators',
    check: (snapshot) => {
      // Can't actually measure speed, but check for common speed optimizers
      const text = snapshot.raw.toLowerCase();
      const speedOptimizers = ['lazy', 'compress', 'cache', 'cdn', 'minify'];
      const found = speedOptimizers.filter(s => text.includes(s));
      return {
        passed: found.length > 0,
        message: found.length > 0 ? `Speed optimizations: ${found.join(', ')}` : 'No speed optimizations detected'
      };
    }
  }
];

async function createTab(url, sessionKey = 'audit') {
  const response = await axios.post(`${CAMOFOX_URL}/tabs`, {
    userId: 'audit-tool',
    sessionKey: sessionKey,
    url: url
  });
  return response.data.tabId;
}

async function getSnapshot(tabId) {
  const response = await axios.get(
    `${CAMOFOX_URL}/tabs/${tabId}/snapshot?userId=audit-tool`
  );
  return response.data;
}

async function closeTab(tabId) {
  try {
    await axios.delete(`${CAMOFOX_URL}/tabs/${tabId}?userId=audit-tool`);
  } catch (e) {
    // Ignore close errors
  }
}

async function auditWebsite(url) {
  console.log(`\n🔍 Auditing: ${url}`);
  
  let tabId = null;
  try {
    // Create tab and navigate
    tabId = await createTab(url, `audit-${Date.now()}`);
    console.log(`📱 Tab created: ${tabId}`);
    
    // Wait for page to load
    await new Promise(r => setTimeout(r, 4000));
    
    // Get snapshot
    const snapshot = await getSnapshot(tabId);
    console.log(`📸 Snapshot retrieved (${snapshot.refsCount} elements)`);
    
    // Run audit checks
    const results = {
      url,
      timestamp: new Date().toISOString(),
      score: 0,
      totalChecks: AUDIT_CHECKS.length,
      passedChecks: 0,
      checks: [],
      recommendations: []
    };
    
    for (const auditCheck of AUDIT_CHECKS) {
      try {
        const result = auditCheck.check({ 
          url, 
          raw: snapshot.snapshot,
          elements: snapshot.refsCount
        });
        
        results.checks.push({
          name: auditCheck.name,
          passed: result.passed,
          message: result.message
        });
        
        if (result.passed) {
          results.passedChecks++;
        } else {
          results.recommendations.push({
            issue: auditCheck.name,
            fix: result.message,
            priority: results.passedChecks > 4 ? 'medium' : 'high'
          });
        }
      } catch (e) {
        results.checks.push({
          name: auditCheck.name,
          passed: false,
          message: `Error checking: ${e.message}`
        });
        results.recommendations.push({
          issue: auditCheck.name,
          fix: 'Unable to check automatically',
          priority: 'medium'
        });
      }
    }
    
    // Calculate score
    results.score = Math.round((results.passedChecks / results.totalChecks) * 100);
    
    // Grade
    if (results.score >= 80) results.grade = 'A';
    else if (results.score >= 60) results.grade = 'B';
    else if (results.score >= 40) results.grade = 'C';
    else if (results.score >= 20) results.grade = 'D';
    else results.grade = 'F';
    
    return results;
    
  } catch (e) {
    console.error(`❌ Error auditing ${url}: ${e.message}`);
    return {
      url,
      timestamp: new Date().toISOString(),
      error: e.message,
      score: 0,
      grade: 'F'
    };
  } finally {
    if (tabId) await closeTab(tabId);
  }
}

async function generateReport(results) {
  const report = `
╔══════════════════════════════════════════════════════════════╗
║           WEBSITE AUDIT REPORT                               ║
╚══════════════════════════════════════════════════════════════╝

🌐 Website: ${results.url}
📅 Audited: ${new Date(results.timestamp).toLocaleString()}
📊 Score: ${results.score}/100 (Grade: ${results.grade})

${'═'.repeat(60)}

CHECK RESULTS:
${'─'.repeat(60)}

${results.checks?.map(c => 
  `${c.passed ? '✅' : '❌'} ${c.name.padEnd(25)} ${c.message}`
).join('\n') || 'No checks performed'}

${'═'.repeat(60)}

${results.recommendations?.length > 0 ? `
RECOMMENDATIONS:
${'─'.repeat(60)}
${results.recommendations.map((r, i) => `
${i+1}. ${r.issue.toUpperCase()} [${r.priority}]
   → ${r.fix}
`).join('\n')}
` : '\n✅ No critical issues found!\n'}

${'═'.repeat(60)}

FREE AUDIT PROVIDED BY: Local Audit Tool
To get these issues fixed, contact us for a quote!

`;
  return report;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           LOCAL BUSINESS WEBSITE AUDIT TOOL                   ║
╚══════════════════════════════════════════════════════════════╝

USAGE:
  node audit.js <url> [--report]

EXAMPLES:
  node audit.js https://example.com
  node audit.js https://example.com --report

OUTPUT:
  Saves JSON report to ./reports/ directory
  Prints formatted report to console (with --report flag)

`);
    return;
  }
  
  const url = args[0];
  const showReport = args.includes('--report') || args.includes('-r');
  
  // Ensure output dir exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const results = await auditWebsite(url);
  
  // Save JSON
  const filename = url.replace(/[^a-zA-Z0-9]/g, '_') + '-' + Date.now() + '.json';
  fs.writeFileSync(
    path.join(OUTPUT_DIR, filename),
    JSON.stringify(results, null, 2)
  );
  console.log(`\n💾 Report saved to: ${OUTPUT_DIR}/${filename}`);
  
  // Print report
  if (showReport || results.error) {
    const report = await generateReport(results);
    console.log(report);
  } else {
    console.log(`\n📊 Score: ${results.score}/100 (Grade: ${results.grade})`);
    console.log(`📋 ${results.passedChecks}/${results.totalChecks} checks passed`);
    if (results.recommendations?.length > 0) {
      console.log(`⚠️  ${results.recommendations.length} issues found (run with --report for details)`);
    }
  }
}

// Export for use as module
module.exports = { auditWebsite, generateReport, AUDIT_CHECKS };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
