const { crawlBrokenLinks } = require('./broken-links');

module.exports = async (req, res) => {
  try {
    const { url, maxLinks = 50, checkExternal = true } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'URL parameter required',
        example: { url: 'https://example.com', maxLinks: 50, checkExternal: true }
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

    console.log(`[Broken Links] Starting audit for: ${targetUrl}`);

    const results = await crawlBrokenLinks(targetUrl, {
      maxLinks: parseInt(maxLinks) || 50,
      checkExternal: checkExternal !== false,
      excludeDomains: []
    });

    console.log(`[Broken Links] Complete: ${results.summary.total} links checked`);

    // Format response
    res.json({
      url: targetUrl,
      timestamp: new Date().toISOString(),
      summary: {
        totalLinksChecked: results.summary.total,
        broken: results.summary.broken,
        redirects: results.summary.redirects,
        ok: results.summary.ok,
        errors: results.summary.errors,
        skipped: results.summary.skipped
      },
      brokenLinks: results.broken.map(link => ({
        url: link.url,
        statusCode: link.statusCode,
        message: link.message,
        duration: link.duration
      })),
      redirects: results.redirects.map(link => ({
        url: link.url,
        statusCode: link.statusCode,
        redirectUrl: link.redirectUrl,
        message: link.message,
        duration: link.duration
      })),
      okLinks: results.ok.slice(0, 10).map(link => ({
        url: link.url,
        statusCode: link.statusCode,
        duration: link.duration
      })),
      recommendations: results.summary.broken > 0 ? [
        'Fix or remove broken links to improve user experience',
        'Set up 301 redirects for moved pages',
        'Use a link monitoring tool to catch issues early'
      ] : [
        'Great! No broken links found',
        'Consider monitoring new links as you add content'
      ]
    });

  } catch (error) {
    console.error('[Broken Links] Error:', error.message);
    res.status(500).json({
      error: 'Broken links check failed',
      message: error.message,
      suggestion: 'Try again or check if the URL is accessible'
    });
  }
};
