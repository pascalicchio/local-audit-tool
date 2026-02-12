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
const { getCoreWebVitals } = require('./core-web-vitals');

module.exports = async (req, res) => {
  try {
    const { url, strategy = 'mobile' } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'URL parameter required',
        example: { url: 'https://example.com', strategy: 'mobile' }
      });
    }

    // Validate URL
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    // Validate URL format
    try {
      new URL(targetUrl);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Validate strategy
    if (strategy !== 'mobile' && strategy !== 'desktop') {
      return res.status(400).json({ error: 'Strategy must be "mobile" or "desktop"' });
    }

    console.log(`[Core Web Vitals] Starting audit for: ${targetUrl} (${strategy})`);

    const results = await getCoreWebVitals(targetUrl, strategy);

    console.log(`[Core Web Vitals] Complete: Score ${results.overallScore}, LCP ${results.coreWebVitals.lcp.value}ms`);

    if (results.status === 'error') {
      return res.status(500).json({
        error: 'Core Web Vitals check failed',
        message: results.message,
        suggestion: results.suggestion || 'Try again or use a different URL'
      });
    }

    // Format response
    res.json({
      url: targetUrl,
      strategy,
      timestamp: new Date().toISOString(),
      overallScore: results.overallScore,
      status: results.status === 'success' ? 'analyzed' : results.status,
      coreWebVitals: {
        lcp: {
          value: results.coreWebVitals.lcp.value,
          unit: 'ms',
          rating: results.coreWebVitals.lcp.rating,
          displayValue: results.coreWebVitals.lcp.displayValue,
          thresholds: { good: 2500, needsImprovement: 4000 }
        },
        cls: {
          value: results.coreWebVitals.cls.value,
          unit: '',
          rating: results.coreWebVitals.cls.rating,
          displayValue: results.coreWebVitals.cls.displayValue,
          shiftingElements: results.coreWebVitals.cls.shiftingElements,
          thresholds: { good: 0.1, needsImprovement: 0.25 }
        },
        inp: {
          value: results.coreWebVitals.inp.value,
          unit: 'ms',
          rating: results.coreWebVitals.inp.rating,
          displayValue: results.coreWebVitals.inp.displayValue,
          note: results.coreWebVitals.inp.note || 'INP measures responsiveness'
        },
        fcp: {
          value: results.coreWebVitals.fcp.value,
          unit: 'ms',
          rating: results.coreWebVitals.fcp.rating,
          displayValue: results.coreWebVitals.fcp.displayValue
        },
        ttfb: {
          value: results.coreWebVitals.ttfb.value,
          unit: 'ms',
          rating: results.coreWebVitals.ttfb.rating,
          displayValue: results.coreWebVitals.ttfb.displayValue
        }
      },
      opportunities: results.opportunities.map(op => ({
        title: op.title,
        impact: op.impact,
        unit: op.unit,
        displayValue: op.displayValue,
        description: op.description.substring(0, 100) + '...'
      })),
      diagnostics: results.diagnostics,
      apiDuration: results.duration,
      recommendations: generateRecommendations(results.coreWebVitals)
    });

  } catch (error) {
    console.error('[Core Web Vitals] Error:', error.message);
    res.status(500).json({
      error: 'Core Web Vitals check failed',
      message: error.message,
      suggestion: 'Try again or check if the URL is accessible'
    });
  }
};

function generateRecommendations(cwv) {
  const recommendations = [];

  // LCP recommendations
  if (cwv.lcp.rating === 'needs-improvement' || cwv.lcp.rating === 'poor') {
    recommendations.push({
      metric: 'LCP',
      priority: 'high',
      title: 'Improve Largest Contentful Paint',
      actions: [
        'Optimize or compress hero images',
        'Preload critical resources',
        'Reduce server response time (TTFB)',
        'Eliminate render-blocking resources'
      ]
    });
  }

  // CLS recommendations
  if (cwv.cls.rating === 'needs-improvement' || cwv.cls.rating === 'poor') {
    recommendations.push({
      metric: 'CLS',
      priority: 'high',
      title: 'Reduce Cumulative Layout Shift',
      actions: [
        'Add width and height attributes to images',
        'Reserve space for ads and embeds',
        'Avoid inserting content above existing content',
        'Use CSS transform for animations'
      ]
    });
  }

  // INP recommendations
  if (cwv.inp.rating === 'needs-improvement' || cwv.inp.rating === 'poor') {
    recommendations.push({
      metric: 'INP',
      priority: 'medium',
      title: 'Improve Interaction to Next Paint',
      actions: [
        'Break up long JavaScript tasks',
        'Reduce main thread work',
        'Defer non-critical JavaScript',
        'Optimize event handlers'
      ]
    });
  }

  // TTFB recommendations
  if (cwv.ttfb.rating === 'needs-improvement' || cwv.ttfb.rating === 'poor') {
    recommendations.push({
      metric: 'TTFB',
      priority: 'high',
      title: 'Reduce Server Response Time',
      actions: [
        'Use a faster hosting provider',
        'Enable caching on your server',
        'Optimize database queries',
        'Use a CDN'
      ]
    });
  }

  // If all good
  if (recommendations.length === 0) {
    recommendations.push({
      metric: 'All',
      priority: 'none',
      title: 'Great job! Your Core Web Vitals are healthy',
      actions: ['Continue monitoring', 'Maintain performance as you add content']
    });
  }

  return recommendations;
}
