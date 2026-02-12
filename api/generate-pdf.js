/**
 * PDF Report Generation API
 * Generates professional audit reports in PDF format
 */

const { generateAuditReport } = require('./pdf-report');

module.exports = async (req, res) => {
  try {
    const { 
      url, 
      // White-label options
      companyName = 'Website Audit Report',
      logoUrl = null,
      primaryColor = '#2563eb',
      // Audit data (passed directly or reference)
      auditData,
      // Report options
      includeCharts = true,
      includeRecommendations = true
    } = req.body;

    // Validate input
    if (!auditData) {
      return res.status(400).json({
        error: 'auditData is required',
        example: {
          url: 'https://example.com',
          auditData: { /* full audit result object */ },
          companyName: 'My SEO Agency',
          primaryColor: '#2563eb'
        }
      });
    }

    // Validate audit data has required fields
    const requiredFields = ['url', 'score', 'grade'];
    for (const field of requiredFields) {
      if (!auditData[field]) {
        return res.status(400).json({
          error: `Missing required field: ${field}`,
          auditData: auditData
        });
      }
    }

    console.log(`[PDF Report] Generating report for: ${auditData.url}`);

    // Generate PDF
    const pdfBuffer = await generateAuditReport(auditData, {
      companyName,
      logoUrl,
      primaryColor,
      includeCharts,
      includeRecommendations
    });

    console.log(`[PDF Report] Generated ${pdfBuffer.length} bytes`);

    // Send response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="audit-report-${new URL(auditData.url).hostname}-${Date.now()}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('[PDF Report] Error:', error.message);
    res.status(500).json({
      error: 'Failed to generate PDF report',
      message: error.message,
      suggestion: 'Check that all required audit data is present'
    });
  }
};
