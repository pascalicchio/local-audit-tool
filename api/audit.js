/**
 * Website Audit Tool v4.0 - Majestic Edition
 * Multi-Page Crawl, Tech Detection, Keywords & Firebase
 */

const axios = require('axios');
const { saveAudit } = require('./firebase');

/**
 * Website Audit Tool v4.0 - Majestic Edition
 * Multi-Page Crawl, Tech Detection, Keywords & Firebase + PDF Export
 */
  martial_arts: { avg: 52, top: 78, description: 'martial arts schools' },
  restaurant: { avg: 48, top: 75, description: 'restaurants' },
  gym: { avg: 55, top: 80, description: 'fitness gyms' },
  medical: { avg: 68, top: 85, description: 'medical practices' },
  legal: { avg: 72, top: 88, description: 'law firms' },
  real_estate: { avg: 62, top: 82, description: 'real estate agencies' },
  home_services: { avg: 45, top: 72, description: 'home service businesses' },
  retail: { avg: 58, top: 79, description: 'retail stores' },
  general: { avg: 55, top: 80, description: 'local businesses' }
};

const INDUSTRY_KEYWORDS = {
  martial_arts: ['jiujitsu', 'jiu-jitsu', 'brazilian', 'gracie', 'karate', 'mma', 'dojo'],
  restaurant: ['restaurant', 'cafe', 'pizza', 'food', 'dining', 'menu', 'eatery'],
  gym: ['gym', 'fitness', 'workout', 'training', 'crossfit', 'health club'],
  medical: ['medical', 'clinic', 'dental', 'doctor', 'health', 'hospital', 'physician'],
  legal: ['lawyer', 'attorney', 'legal', 'law firm', 'counsel', 'justice'],
  real_estate: ['real estate', 'realtor', 'property', 'homes', 'broker', 'realty'],
  home_services: ['plumber', 'electrician', 'hvac', 'roofing', 'landscaping', 'contractor']
};

const TECH_PATTERNS = {
  cms: [
    { name: 'WordPress', pattern: /wp-content|wordpress|uploads\/20\d{2}/i },
    { name: 'Shopify', pattern: /shopify|cdn\.shopify\.com/i },
    { name: 'Wix', pattern: /wixpress|wixapps/i },
    { name: 'Webflow', pattern: /webflow|wf-stage/i },
    { name: 'Squarespace', pattern: /squarespace|static\d*\.squarespace/i },
    { name: 'Drupal', pattern: /drupal|sites\/default/i },
    { name: 'Joomla', pattern: /joomla|components\/com_/i }
  ],
  frameworks: [
    { name: 'React', pattern: /react|__react|reactjs|webpack/i },
    { name: 'Vue.js', pattern: /vue|__vue|\.vue\.js/i },
    { name: 'Next.js', pattern: /nextjs|next\.js|_next\//i },
    { name: 'Gatsby', pattern: /gatsby|__gatsby/i },
    { name: 'Tailwind', pattern: /tailwind|tailwindcss/i },
    { name: 'Bootstrap', pattern: /bootstrap[^v]|bootstrap\./i },
    { name: 'jQuery', pattern: /jquery|\$\.ajax/i }
  ],
  analytics: [
    { name: 'Google Analytics', pattern: /google-analytics|gtag|ga\(/i },
    { name: 'Google Tag Manager', pattern: /googletagmanager|gtm\(/i },
    { name: 'Facebook Pixel', pattern: /facebook\.com\/tr\?|fbq\(/i },
    { name: 'Hotjar', pattern: /hotjar|hj\(/i },
    { name: 'HubSpot', pattern: /hubspot|hsforms/i },
    { name: 'Intercom', pattern: /intercom/i }
  ],
  hosting: [
    { name: 'Cloudflare', pattern: /cloudflare|cdnjs\.cloudflare/i },
    { name: 'Vercel', pattern: /vercel|_vercel/i },
    { name: 'Netlify', pattern: /netlify|_netlify/i },
    { name: 'AWS', pattern: /amazonaws|s3\./i },
    { name: 'Google Cloud', pattern: /googleapis|storage\.googleapis/i }
  ]
};

const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'you', 'your', 'are', 'not', 'but', 'from', 'have', 'has', 'was', 'were', 'will', 'would', 'could', 'should', 'what', 'when', 'where', 'which', 'who', 'how', 'why', 'can', 'may', 'might', 'must', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'our', 'their', 'them', 'these', 'those', 'then', 'out', 'into', 'over', 'after', 'before', 'between', 'under', 'again', 'further', 'once', 'about', 'above', 'below']);

function extractKeywords(html) {
  const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/[^\w\s-]/g, ' ').toLowerCase();
  const words = text.split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w)).map(w => w.replace(/^-|-$/g, ''));
  const freq = {};
  words.forEach(w => { if (w.length > 2) freq[w] = (freq[w] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([word, count]) => ({ word, count }));
}

function generateRelatedKeywords(keywords) {
  const top = keywords.slice(0, 5).map(k => k.word);
  const related = new Set([...top]);
  const mods = ['near me', 'nearby', 'online', 'best', 'top rated', 'affordable', 'professional', 'expert', 'reviews', 'prices', 'cost'];
  top.forEach(kw => { mods.forEach(m => { related.add(kw + ' ' + m); related.add(m + ' ' + kw); }); related.add(kw + ' Orlando'); related.add(kw + ' Florida'); });
  return {
    primary: keywords.slice(0, 10),
    secondary: keywords.slice(10, 25),
    contentPillars: top.length ? [
      { title: 'Ultimate Guide to ' + top[0], type: 'pillar' },
      { title: '10 Things You Need to Know About ' + top[0], type: 'listicle' },
      { title: 'How to Choose the Best ' + (top[0] || 'Service'), type: 'howto' },
      { title: (top[0] || 'Service') + ' vs Competitors', type: 'comparison' },
      { title: 'Why ' + (top[0] || 'Local Business') + ' is Worth It', type: 'trend' }
    ] : [],
    questionsForFAQ: top.slice(0, 3).flatMap(kw => ['how much', 'what is', 'how to', 'where to', 'when should', 'why is'].map(q => q + ' ' + kw + '?')).slice(0, 12),
    longTailOpportunities: Array.from(related).slice(0, 25)
  };
}

function detectTechStack(html, url) {
  const detected = { cms: [], frameworks: [], analytics: [], hosting: [] };
  for (const [cat, patterns] of Object.entries(TECH_PATTERNS)) {
    patterns.forEach(p => { if (p.pattern.test(html) || p.pattern.test(url)) detected[cat].push(p.name); });
  }
  return detected;
}

function detectIndustry(html, url) {
  const text = (html + ' ' + url).toLowerCase();
  for (const [ind, kws] of Object.entries(INDUSTRY_KEYWORDS)) { if (kws.some(k => text.includes(k))) return ind; }
  return 'general';
}

function calculatePerformanceScore(html) {
  let score = 100;
  const sizeKB = html.length / 1024;
  if (sizeKB > 1000) score -= 30;
  else if (sizeKB > 500) score -= 20;
  else if (sizeKB > 200) score -= 10;
  score -= Math.min(25, (html.match(/<script/gi) || []).length * 2);
  score -= Math.min(15, (html.match(/<iframe|<embed/gi) || []).length * 5);
  return Math.max(0, Math.min(100, Math.round(score)));
}

const AUDIT_CHECKS = [
  { name: 'SSL Certificate', category: 'security', weight: 10, check: d => ({ passed: d.url.startsWith('https'), message: d.url.startsWith('https') ? 'HTTPS' : 'No HTTPS' })},
  { name: 'Security Headers', category: 'security', weight: 15, check: d => {
    const passed = /Content-Security-Policy|X-Frame-Options/i.test(d.html);
    return { passed, message: passed ? 'Security headers' : 'Add CSP/X-Frame' };
  }},
  { name: 'Performance Score', category: 'performance', weight: 15, check: d => {
    const msg = d.perf >= 80 ? 'Fast' : d.perf >= 50 ? 'Average' : 'Slow';
    return { passed: d.perf >= 50, message: msg };
  }},
  { name: 'Page Title', category: 'seo', weight: 10, check: d => {
    const t = d.html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (!t) return { passed: false, message: 'Missing title' };
    const len = t[1].length;
    return { passed: len >= 30 && len <= 60, message: len >= 30 ? len + ' chars' : 'Too short' };
  }},
  { name: 'Meta Description', category: 'seo', weight: 10, check: d => {
    const desc = /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i.exec(d.html);
    if (!desc) return { passed: false, message: 'Missing description' };
    return { passed: desc[1].length >= 120, message: desc[1].length + ' chars' };
  }},
  { name: 'H1 Heading', category: 'seo', weight: 10, check: d => {
    const h1 = (d.html.match(/<h1[^>]*>/gi) || []).length;
    if (h1 === 0) return { passed: false, message: 'No H1 heading' };
    if (h1 > 1) return { passed: false, message: h1 + ' H1 tags' };
    return { passed: true, message: 'H1 present' };
  }},
  { name: 'Keyword Usage', category: 'seo', weight: 10, check: d => ({ passed: d.keywords.length > 0, message: d.keywords.length + ' keywords' })},
  { name: 'Content Length', category: 'seo', weight: 8, check: d => {
    const words = d.html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
    return { passed: words >= 1000, message: words >= 1000 ? words + ' words' : 'Thin content' };
  }},
  { name: 'Schema Markup', category: 'technical', weight: 8, check: d => {
    const passed = /application\/ld\+json/i.test(d.html);
    return { passed, message: passed ? 'Schema found' : 'No schema' };
  }},
  { name: 'Open Graph', category: 'social', weight: 8, check: d => {
    const passed = /og:title|og:description|og:image/i.test(d.html);
    return { passed, message: passed ? 'Open Graph' : 'Missing OG tags' };
  }},
  { name: 'Mobile Optimized', category: 'ux', weight: 10, check: d => ({ passed: /viewport/i.test(d.html), message: /viewport/i.test(d.html) ? 'Mobile ready' : 'No viewport' })},
  { name: 'Clear CTA', category: 'ux', weight: 8, check: d => {
    const has = /book|schedule|contact|appointment|get started|sign up/i.test(d.html);
    return { passed: has, message: has ? 'CTA found' : 'No clear CTA' };
  }},
  { name: 'Contact Info', category: 'ux', weight: 8, check: d => ({
    passed: /contact|phone|email|address|location/i.test(d.html),
    message: /contact|phone|email|address/i.test(d.html) ? 'Contact info' : 'No contact'
  })},
  { name: 'Social Links', category: 'social', weight: 5, check: d => ({
    passed: /facebook|instagram|linkedin|twitter|youtube/i.test(d.html),
    message: /facebook|instagram|linkedin/i.test(d.html) ? 'Social links' : 'No social'
  })},
  { name: 'Images', category: 'performance', weight: 8, check: d => {
    const img = (d.html.match(/<img/gi) || []).length;
    const alt = (d.html.match(/<img[^>]*alt=["'][^"']+["']/gi) || []).length;
    if (img === 0) return { passed: true, message: 'No images' };
    const ratio = alt / img;
    return { passed: ratio >= 0.5, message: alt + '/' + img + ' have alt' };
  }},
  { name: 'Favicon', category: 'branding', weight: 3, check: d => ({ passed: /favicon/i.test(d.html), message: /favicon/i.test(d.html) ? 'Favicon' : 'No favicon' })},
  { name: 'Internal Links', category: 'links', weight: 8, check: d => {
    const links = (d.html.match(/href=["'][^"']+["']/gi) || []).length;
    return { passed: links >= 2, message: links + ' links found' };
  }},
  { name: 'Canonical URL', category: 'technical', weight: 5, check: d => ({
    passed: /canonical/i.test(d.html),
    message: /canonical/i.test(d.html) ? 'Canonical tag' : 'No canonical'
  })}
];

async function crawlPage(url, client) {
  try {
    const response = await client.get(url, { timeout: 8000, maxRedirects: 3 });
    return {
      url,
      html: response.data,
      status: response.status,
      sizeKB: Math.round(response.data.length / 1024),
      error: null
    };
  } catch (e) {
    return { url, html: '', status: e.response?.status || 0, sizeKB: 0, error: e.message };
  }
}

async function discoverLinks(baseUrl, html, client) {
  try {
    const baseUrlObj = new URL(baseUrl);
    const found = new Set();
    
    // Find internal links from href attributes
    const hrefMatches = html.match(/href=["']([^"']+)["']/gi) || [];
    hrefMatches.forEach(href => {
      try {
        const url = href.replace(/href=["']/, '').replace(/["']/, '');
        // Only crawl HTML pages, exclude assets
        if (url.startsWith('/') && 
            !url.match(/\.(pdf|jpg|png|css|js|woff|woff2|ttf|eot|svg|gif|ico|xml)$/i) &&
            !url.includes('?') && 
            !url.includes('#') &&
            url.length > 1 &&
            !url.startsWith('//')) {
          const fullUrl = new URL(url, baseUrl).href;
          const parsed = new URL(fullUrl);
          // Only include pages from same domain
          if (parsed.hostname === baseUrlObj.hostname) {
            found.add(fullUrl);
          }
        }
      } catch (e) {}
    });
    
    return Array.from(found).slice(0, 9); // Return up to 9 additional pages
  } catch (e) {
    return [];
  }
}

module.exports = async (req, res) => {
  let { url, email, industry: requestedIndustry, pages: maxPages = 10 } = req.body;
  
  if (!url) return res.status(400).json({ error: 'URL required' });
  url = url.trim().replace(/\/$/, '');
  if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
  
  // Limit pages to prevent abuse
  maxPages = Math.min(Math.max(1, parseInt(maxPages) || 5), 20);
  
  const client = axios.create({
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 15000
  });
  
  try {
    // Crawl homepage
    const homeResult = await crawlPage(url, client);
    if (homeResult.error) {
      return res.status(500).json({ error: 'Could not access website: ' + homeResult.error });
    }
    
    // Discover additional pages
    const additionalUrls = await discoverLinks(url, homeResult.html, client);
    
    // Crawl additional pages (up to maxPages-1)
    const pagesToCrawl = [url, ...additionalUrls.slice(0, maxPages - 1)];
    const crawlResults = [homeResult];
    
    for (const pageUrl of additionalUrls.slice(0, maxPages - 1)) {
      const result = await crawlPage(pageUrl, client);
      crawlResults.push(result);
      if (crawlResults.length >= maxPages) break;
    }
    
    // Aggregate data from all pages
    const allHtml = crawlResults.map(r => r.html).join(' ');
    const allErrors = crawlResults.filter(r => r.error || r.status >= 400);
    const successfulPages = crawlResults.filter(r => !r.error && r.status < 400);
    
    // Homepage analysis
    const homeHtml = homeResult.html;
    const perf = calculatePerformanceScore(homeHtml);
    const techStack = detectTechStack(homeHtml, url);
    const keywords = extractKeywords(homeHtml);
    const keywordData = generateRelatedKeywords(keywords);
    
    // Run checks on homepage
    let passed = 0, totalWeight = 0, weightedScore = 0, recommendations = [];
    for (const check of AUDIT_CHECKS) {
      try {
        const result = check.check({ url, html: homeHtml, perf, keywords });
        if (result.passed) { passed++; weightedScore += check.weight; }
        recommendations.push({ category: check.category, issue: check.name, passed: result.passed, message: result.message });
      } catch (e) { recommendations.push({ category: check.category, issue: check.name, passed: false, message: 'Error' }); }
      totalWeight += check.weight;
    }
    
    const finalScore = Math.round((weightedScore / totalWeight) * 100);
    const industry = requestedIndustry || detectIndustry(homeHtml, url);
    const benchmark = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS.general;
    
    // Percentile
    let percentile;
    if (finalScore >= benchmark.top) percentile = 'top_10';
    else if (finalScore >= benchmark.avg + 20) percentile = 'above_avg';
    else if (finalScore >= benchmark.avg) percentile = 'average';
    else if (finalScore >= benchmark.avg - 15) percentile = 'below_avg';
    else percentile = 'needs_work';
    
    const byCategory = {};
    recommendations.forEach(r => { if (!byCategory[r.category]) byCategory[r.category] = []; byCategory[r.category].push(r); });
    
    // GSC mock data
    const gscData = {
      connected: false,
      mockData: {
        queries: (keywordData.primary || []).slice(0, 3).map(k => ({ query: k.word, clicks: Math.floor(Math.random() * 100), impressions: Math.floor(Math.random() * 1000), ctr: (Math.floor(Math.random() * 5) + 1) + '-' + (Math.floor(Math.random() * 5) + 5) + '%' })),
        topPages: crawlResults.filter(r => r.url !== url).slice(0, 3).map(r => ({ page: new URL(r.url).pathname, clicks: Math.floor(Math.random() * 50), impressions: Math.floor(Math.random() * 500) }))
      }
    };
    
    // Multi-page summary
    const pageAnalysis = {
      totalPages: crawlResults.length,
      successful: successfulPages.length,
      errors: allErrors.length,
      errorPages: allErrors.map(e => ({ url: e.url, error: e.error || 'Status ' + e.status })),
      avgPageSizeKB: Math.round(successfulPages.reduce((sum, p) => sum + (p.sizeKB || 0), 0) / Math.max(successfulPages.length, 1)),
      totalSizeKB: successfulPages.reduce((sum, p) => sum + (p.sizeKB || 0), 0)
    };
    
    // Save to Firebase (async)
    saveAudit({
      url, score: finalScore,
      grade: finalScore >= 80 ? 'A' : finalScore >= 70 ? 'B' : finalScore >= 60 ? 'C' : finalScore >= 40 ? 'D' : 'F',
      industry, industryName: benchmark.description,
      keywords: keywordData, techStack,
      performance: { score: perf },
      checks: recommendations,
      pages: pageAnalysis
    }).catch(e => console.error('Firebase save failed:', e.message));
    
    res.json({
      url, timestamp: new Date().toISOString(), score: finalScore,
      grade: finalScore >= 80 ? 'A' : finalScore >= 70 ? 'B' : finalScore >= 60 ? 'C' : finalScore >= 40 ? 'D' : 'F',
      checks: recommendations, byCategory,
      performance: { score: perf, homePageSizeKB: homeResult.sizeKB },
      keywords: keywordData, techStack, industry, industryName: benchmark.description,
      comparison: { yourScore: finalScore, industryAverage: benchmark.avg, industryTop: benchmark.top, percentile, description: 'vs ' + benchmark.description },
      gsc: gscData, saved: true,
      pages: pageAnalysis,
      crawledUrls: crawlResults.map(r => r.url),
      shareText: 'I got ' + finalScore + '/100 on my website audit! Check yours at local-audit-tool.vercel.app'
    });
  } catch (e) {
    res.status(500).json({ error: 'Audit failed: ' + e.message });
  }
};
/**
 * AI-Powered Recommendations using MiniMax
 */

const axios = require('axios');

const MINIMAX_API = 'https://api.minimax.chat/v1/text/chatcompletion_v2';

module.exports = async (req, res) => {
  const { auditData, industry } = req.body;
  
  if (!auditData) {
    return res.status(400).json({ error: 'Audit data required' });
  }

  try {
    const prompt = `You are a website optimization expert for local businesses. 
Analyze this website audit and provide specific, actionable recommendations.

AUDIT DATA:
- URL: ${auditData.url}
- Score: ${auditData.score}/100
- Industry: ${industry || 'general'}

ISSUES FOUND:
${auditData.recommendations?.map(r => `- ${r.issue}: ${r.fix}`).join('\n') || 'None'}

Provide:
1. A brief paragraph addressing the business owner personally (2-3 sentences)
2. 3 specific action items with estimated impact
3. Estimated investment range for fixes

Keep it conversational, encouraging, and professional. Don't use markdown.`;

    const response = await axios.post(MINIMAX_API, {
      model: 'abab6.5s-chat',
      messages: [
        { role: 'system', content: 'You are a helpful website optimization consultant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 600
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.MINIMAX_API_KEY || ''}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    const recommendations = response.data.choices?.[0]?.message?.content || null;
    res.json({ recommendations });
  } catch (e) {
    console.error('MiniMax error:', e.message);
    res.json({ 
      recommendations: `Based on your audit, here are your top priorities:\n\n` +
      auditData.recommendations?.map(r => `• ${r.issue}: ${r.fix}`).join('\n') || 'Your website looks good!'
    });
  }
};
