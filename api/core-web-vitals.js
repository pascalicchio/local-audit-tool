const axios = require('axios');

const PSI_API_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

async function getCoreWebVitals(url, strategy = 'mobile') {
  const startTime = Date.now();
  
  try {
    // Validate URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // Call PageSpeed Insights API
    const response = await axios.get(PSI_API_BASE, {
      params: {
        url: url,
        strategy: strategy, // 'mobile' or 'desktop'
        category: 'performance',
        locale: 'en_US'
      },
      timeout: 30000
    });

    const duration = Date.now() - startTime;

    // Parse lighthouse result
    const lighthouseResult = response.data.lighthouseResult;
    
    if (!lighthouseResult) {
      return {
        url,
        status: 'error',
        message: 'No lighthouse result returned',
        duration
      };
    }

    // Extract Core Web Vitals
    const audits = lighthouseResult.audits;
    
    // LCP - Largest Contentful Paint
    const lcpAudit = audits['largest-contentful-paint'];
    const lcp = {
      value: lcpAudit?.numericValue || 0,
      unit: 'ms',
      displayValue: lcpAudit?.displayValue || '',
      score: lcpAudit?.score || 0,
      rating: getLCPRating(lcpAudit?.numericValue)
    };

    // CLS - Cumulative Layout Shift
    const clsAudit = audits['layout-shift-elements'];
    const cls = {
      value: audits['cumulative-layout-shift']?.numericValue || 0,
      unit: '',
      displayValue: audits['cumulative-layout-shift']?.displayValue || '',
      score: audits['cumulative-layout-shift']?.score || 0,
      rating: getCLSRating(audits['cumulative-layout-shift']?.numericValue),
      shiftingElements: clsAudit?.details?.items?.length || 0
    };

    // INP - Interaction to Next Paint (replaces FID in newer Lighthouse)
    let inpAudit = audits['interaction-to-next-paint'];
    let inp = {
      value: inpAudit?.numericValue || 0,
      unit: 'ms',
      displayValue: inpAudit?.displayValue || '',
      score: inpAudit?.score || 0,
      rating: getINPRating(inpAudit?.numericValue)
    };

    // Fallback to FID if INP not available
    if (!inpAudit || inpAudit.numericValue === undefined) {
      const fidAudit = audits['first-input-delay'];
      inp = {
        value: fidAudit?.numericValue || 0,
        unit: 'ms',
        displayValue: fidAudit?.displayValue || '',
        score: fidAudit?.score || 0,
        rating: getFIDRating(fidAudit?.numericValue),
        note: 'Using FID as INP was not available'
      };
    }

    // First Contentful Paint (FCP)
    const fcp = {
      value: audits['first-contentful-paint']?.numericValue || 0,
      unit: 'ms',
      displayValue: audits['first-contentful-paint']?.displayValue || '',
      score: audits['first-contentful-paint']?.score || 0,
      rating: getFCPRating(audits['first-contentful-paint']?.numericValue)
    };

    // Time to First Byte (TTFB)
    const ttfb = {
      value: audits['server-response-time']?.numericValue || 0,
      unit: 'ms',
      displayValue: audits['server-response-time']?.displayValue || '',
      score: audits['server-response-time']?.score || 0,
      rating: getTTFBRating(audits['server-response-time']?.numericValue)
    };

    // Total Blocking Time (TBT)
    const tbt = {
      value: audits['total-blocking-time']?.numericValue || 0,
      unit: 'ms',
      displayValue: audits['total-blocking-time']?.displayValue || '',
      score: audits['total-blocking-time']?.score || 0,
      rating: getTBTRating(audits['total-blocking-time']?.numericValue)
    };

    // Speed Index
    const speedIndex = {
      value: audits['speed-index']?.numericValue || 0,
      unit: 'ms',
      displayValue: audits['speed-index']?.displayValue || '',
      score: audits['speed-index']?.score || 0,
      rating: getSpeedIndexRating(audits['speed-index']?.numericValue)
    };

    // Overall Performance Score
    const overallScore = Math.round((response.data.lighthouseResult.categories?.performance?.score || 0) * 100);

    return {
      url,
      strategy,
      status: 'success',
      duration,
      overallScore,
      coreWebVitals: {
        lcp,
        cls,
        inp,
        fcp,
        ttfb,
        tbt,
        speedIndex
      },
      thresholds: {
        lcp: { good: 2500, needsImprovement: 4000 },
        cls: { good: 0.1, needsImprovement: 0.25 },
        inp: { good: 200, needsImprovement: 500 },
        fcp: { good: 1800, needsImprovement: 3000 },
        ttfb: { good: 800, needsImprovement: 1800 },
        tbt: { good: 200, needsImprovement: 600 }
      },
      opportunities: extractOpportunities(audits),
      diagnostics: extractDiagnostics(audits)
    };

  } catch (error) {
    return {
      url,
      status: 'error',
      message: error.message,
      code: error.code,
      duration: Date.now() - startTime,
      suggestion: 'Check if the URL is accessible and try again. PageSpeed API may be rate limited.'
    };
  }
}

// Rating helpers
function getLCPRating(ms) {
  if (ms <= 2500) return 'good';
  if (ms <= 4000) return 'needs-improvement';
  return 'poor';
}

function getCLSRating(value) {
  if (value <= 0.1) return 'good';
  if (value <= 0.25) return 'needs-improvement';
  return 'poor';
}

function getINPRating(ms) {
  if (ms <= 200) return 'good';
  if (ms <= 500) return 'needs-improvement';
  return 'poor';
}

function getFIDRating(ms) {
  if (ms <= 100) return 'good';
  if (ms <= 300) return 'needs-improvement';
  return 'poor';
}

function getFCPRating(ms) {
  if (ms <= 1800) return 'good';
  if (ms <= 3000) return 'needs-improvement';
  return 'poor';
}

function getTTFBRating(ms) {
  if (ms <= 800) return 'good';
  if (ms <= 1800) return 'needs-improvement';
  return 'poor';
}

function getTBTRating(ms) {
  if (ms <= 200) return 'good';
  if (ms <= 600) return 'needs-improvement';
  return 'poor';
}

function getSpeedIndexRating(ms) {
  if (ms <= 3400) return 'good';
  if (ms <= 5800) return 'needs-improvement';
  return 'poor';
}

function extractOpportunities(audits) {
  const importantIds = [
    'render-blocking-resources',
    'unused-css-rules',
    'unused-javascript',
    'modern-image-formats',
    'offscreen-images',
    'image-size-responsive',
    'image-alt-text',
    'document-width',
    'contrast',
    'tap-targets'
  ];

  return importantIds
    .filter(id => audits[id] && audits[id].score !== null && audits[id].score < 1)
    .map(id => ({
      id,
      title: audits[id]?.title || id,
      description: audits[id]?.description || '',
      score: audits[id]?.score || 0,
      impact: audits[id]?.numericValue || 0,
      unit: audits[id]?.numericUnit || 'ms',
      displayValue: audits[id]?.displayValue || ''
    }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 5);
}

function extractDiagnostics(audits) {
  const diagnosticIds = [
    'viewport',
    'html-has-lang',
    'html-lang-valid',
    'meta-viewport',
    'link-alt-text',
    'list-items',
    'list-of-links'
  ];

  return diagnosticIds
    .filter(id => audits[id] && audits[id].score !== null && audits[id].score < 1)
    .map(id => ({
      id,
      title: audits[id]?.title || id,
      description: audits[id]?.description || '',
      score: audits[id]?.score || 0
    }));
}

module.exports = { getCoreWebVitals };
