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
