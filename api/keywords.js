/**
 * Keyword Research Module
 * Extracts keywords from website content and suggests related terms
 */

const axios = require('axios');

// Common stop words to filter out
const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'you', 'your', 'are', 'not', 'but', 
  'from', 'have', 'has', 'was', 'were', 'been', 'being', 'will', 'would', 'could', 'should',
  'what', 'when', 'where', 'which', 'who', 'how', 'why', 'can', 'may', 'might', 'must',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
  'only', 'own', 'same', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there',
  'our', 'their', 'them', 'these', 'those', 'then', 'out', 'into', 'over', 'after',
  'before', 'between', 'under', 'again', 'further', 'once', 'about', 'above', 'below']);

function extractKeywords(html) {
  // Clean HTML
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[^\w\s-]/g, ' ')
    .toLowerCase();
  
  // Count word frequencies
  const words = text.split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w))
    .map(w => w.replace(/-$/, '').replace(/^-/, ''));
  
  const freq = {};
  words.forEach(w => {
    if (w.length > 2) freq[w] = (freq[w] || 0) + 1;
  });
  
  // Sort by frequency
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word, count]) => ({ word, count }));
}

function generateRelatedKeywords(keywords) {
  const topKeywords = keywords.slice(0, 5).map(k => k.word);
  
  // Generate related keyword patterns
  const related = new Set();
  
  // Add the keywords themselves
  topKeywords.forEach(k => related.add(k));
  
  // Add common modifiers for each keyword
  const modifiers = [
    'near me', 'nearby', 'online', 'best', 'top rated', 'affordable', 'cheap',
    'professional', 'expert', 'certified', 'licensed', 'experienced', 'quality',
    'reviews', 'ratings', 'prices', 'cost', 'quote', 'estimate',
    'appointment', 'booking', 'schedule', 'consultation',
    'benefits', 'advantages', 'results', 'guarantee'
  ];
  
  topKeywords.forEach(kw => {
    modifiers.forEach(mod => {
      related.add(`${kw} ${mod}`);
      related.add(`${mod} ${kw}`);
    });
    
    // Add location modifiers (common for local businesses)
    related.add(`${kw} Orlando`);
    related.add(`${kw} Florida`);
    related.add(`${kw} Davenport`);
    related.add(`${kw} Celebration`);
    related.add(`${kw} ${kw} near me`);
  });
  
  // Content pillar suggestions
  const contentPillars = [
    { title: `Ultimate Guide to ${topKeywords[0] || 'Your Industry'}`, type: 'pillar' },
    { title: `10 Things You Need to Know About ${topKeywords[0] || 'This'}`, type: 'listicle' },
    { title: `How to Choose the Best ${topKeywords[0] || 'Service'}`, type: 'howto' },
    { title: `${topKeywords[0] || 'Service'} vs Competitors: What's Right for You?`, type: 'comparison' },
    { title: `Why ${topKeywords[0] || 'Local Business'} is the Future`, type: 'trend' }
  ];
  
  // Questions people ask (for FAQ content)
  const questionStarters = [
    'how much', 'what is', 'how to', 'where to', 'when should',
    'who is', 'why is', 'can you', 'do they', 'is it worth'
  ];
  
  const questions = [];
  topKeywords.slice(0, 3).forEach(kw => {
    questionStarters.forEach(q => {
      questions.push(`${q} ${kw}?`);
    });
  });
  
  return {
    primary: keywords.slice(0, 10),
    secondary: keywords.slice(10, 25),
    contentPillars: contentPillars.slice(0, 5),
    questionsForFAQ: questions.slice(0, 10),
    longTailOpportunities: Array.from(related).slice(0, 20)
  };
}

function analyzeCompetitorGaps(ownKeywords, competitorKeywords) {
  const ownSet = new Set(ownKeywords.map(k => k.word));
  const competitorSet = new Set(competitorKeywords.map(k => k.word));
  
  const gaps = competitorKeywords.filter(k => !ownSet.has(k.word));
  const opportunities = gaps.slice(0, 10);
  
  return {
    opportunities,
    missedKeywords: gaps.length,
    recommendation: gaps.length > 0 
      ? `Consider targeting these ${gaps.length} keywords that competitors rank for.`
      : 'Great job! You\'re targeting similar keywords as competitors.'
  };
}

module.exports = {
  extractKeywords,
  generateRelatedKeywords,
  analyzeCompetitorGaps
};
