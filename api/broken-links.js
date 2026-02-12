const { URL } = require('url');
const https = require('https');
const http = require('http');
const axios = require('axios');

// Increase timeout for slow servers
const TIMEOUT = 8000;
const MAX_CONCURRENT = 5;
const RETRY_COUNT = 1;

async function checkUrl(url, retry = 0) {
  const startTime = Date.now();
  
  try {
    // Skip non-HTTP URLs
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return {
        url,
        status: 'skip',
        message: 'Non-HTTP URL',
        duration: Date.now() - startTime
      };
    }

    // Skip fragments and mailto
    if (url.includes('#') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      return {
        url,
        status: 'skip',
        message: 'Anchor/fragment/mailto',
        duration: Date.now() - startTime
      };
    }

    const response = await axios.head(url, {
      timeout: TIMEOUT,
      maxRedirects: 5,
      validateStatus: (status) => status < 600, // Accept everything to check later
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LocalAuditTool/4.0; +https://local-audit-tool.vercel.app)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    const duration = Date.now() - startTime;

    // Check for broken status codes
    if (response.status >= 400) {
      return {
        url,
        status: 'broken',
        statusCode: response.status,
        message: getStatusMessage(response.status),
        duration
      };
    }

    // Check for redirect chains (3xx)
    if (response.status >= 300 && response.status < 400) {
      return {
        url,
        status: 'redirect',
        statusCode: response.status,
        redirectUrl: response.headers.location,
        message: 'Redirect chain',
        duration
      };
    }

    return {
      url,
      status: 'ok',
      statusCode: response.status,
      message: 'OK',
      duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;

    // Retry logic
    if (retry < RETRY_COUNT && (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT')) {
      return checkUrl(url, retry + 1);
    }

    return {
      url,
      status: 'error',
      message: error.code || error.message,
      duration
    };
  }
}

function getStatusMessage(status) {
  const messages = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    408: 'Request Timeout',
    410: 'Gone',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout'
  };
  return messages[status] || 'Client/Server Error';
}

async function extractLinks(html, baseUrl) {
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi;
  const links = new Set();
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    let href = match[2];
    
    // Skip empty or javascript links
    if (!href || href.trim() === '' || href.startsWith('javascript:') || href.startsWith('#')) {
      continue;
    }

    // Resolve relative URLs
    if (!href.startsWith('http://') && !href.startsWith('https://')) {
      try {
        const resolved = new URL(href, baseUrl).href;
        href = resolved;
      } catch (e) {
        continue;
      }
    }

    links.add(href);
  }

  return Array.from(links);
}

async function crawlBrokenLinks(url, options = {}) {
  const {
    maxLinks = 50,
    maxDepth = 1,
    checkExternal = true,
    excludeDomains = []
  } = options;

  const results = {
    url,
    scanned: 0,
    broken: [],
    redirects: [],
    ok: [],
    errors: [],
    skipped: [],
    summary: {
      total: 0,
      broken: 0,
      redirects: 0,
      ok: 0,
      errors: 0,
      skipped: 0
    }
  };

  try {
    // Fetch the page
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LocalAuditTool/4.0; +https://local-audit-tool.vercel.app)'
      }
    });

    const contentType = response.headers['content-type'] || '';
    
    // Only process HTML pages
    if (!contentType.includes('text/html')) {
      results.errors.push({
        url,
        message: `Content-Type not HTML: ${contentType}`
      });
      return results;
    }

    // Extract links from HTML
    const links = await extractLinks(response.data, url);
    
    // Filter links
    let filteredLinks = links.filter(link => {
      // Check max limit
      if (results.scanned >= maxLinks) return false;
      
      // Only check same domain unless external allowed
      if (!checkExternal) {
        try {
          const linkUrl = new URL(link);
          const baseUrlObj = new URL(url);
          if (linkUrl.hostname !== baseUrlObj.hostname) return false;
        } catch (e) {
          return false;
        }
      }

      // Exclude domains
      for (const domain of excludeDomains) {
        if (link.includes(domain)) return false;
      }

      return true;
    }).slice(0, maxLinks);

    // Check links concurrently with limit
    const chunks = [];
    for (let i = 0; i < filteredLinks.length; i += MAX_CONCURRENT) {
      chunks.push(filteredLinks.slice(i, i + MAX_CONCURRENT));
    }

    for (const chunk of chunks) {
      const checks = await Promise.all(chunk.map(link => checkUrl(link)));
      
      for (const check of checks) {
        results.scanned++;
        
        if (check.status === 'ok') {
          results.ok.push(check);
          results.summary.ok++;
        } else if (check.status === 'broken') {
          results.broken.push(check);
          results.summary.broken++;
        } else if (check.status === 'redirect') {
          results.redirects.push(check);
          results.summary.redirects++;
        } else if (check.status === 'error') {
          results.errors.push(check);
          results.summary.errors++;
        } else {
          results.skipped.push(check);
          results.summary.skipped++;
        }
      }
    }

    results.summary.total = results.scanned;

  } catch (error) {
    results.errors.push({
      url,
      message: error.message,
      code: error.code
    });
  }

  return results;
}

module.exports = { crawlBrokenLinks, extractLinks, checkUrl };
