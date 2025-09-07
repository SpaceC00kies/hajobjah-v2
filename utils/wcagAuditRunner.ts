/**
 * WCAG 2.2 Audit Runner
 * Automated accessibility testing and reporting
 */

import { 
  performAccessibilityAudit, 
  autoFixAccessibilityIssues,
  startAccessibilityMonitoring,
  type AccessibilityReport 
} from './accessibilityValidation';
import { 
  auditColorCombinations, 
  WCAG_COMPLIANT_COLORS,
  type AccessibilityAuditResult 
} from './wcagAccessibilityUtils';

// Color combinations to audit
const COLOR_COMBINATIONS = [
  // Primary text combinations
  { element: 'Primary text on white', foreground: '#111827', background: '#ffffff' },
  { element: 'Secondary text on white', foreground: '#374151', background: '#ffffff' },
  { element: 'Tertiary text on white', foreground: '#4b5563', background: '#ffffff' },
  { element: 'Muted text on white', foreground: '#6b7280', background: '#ffffff' },
  
  // Button combinations
  { element: 'Primary button', foreground: '#ffffff', background: '#2563eb' },
  { element: 'Accent button', foreground: '#ffffff', background: '#d97706' },
  { element: 'Success button', foreground: '#ffffff', background: '#059669' },
  { element: 'Error button', foreground: '#ffffff', background: '#dc2626' },
  
  // Status combinations
  { element: 'Success text', foreground: '#047857', background: '#ffffff' },
  { element: 'Error text', foreground: '#b91c1c', background: '#ffffff' },
  { element: 'Warning text', foreground: '#b45309', background: '#ffffff' },
  { element: 'Info text', foreground: '#1d4ed8', background: '#ffffff' },
  
  // Background combinations
  { element: 'Text on secondary background', foreground: '#111827', background: '#f9fafb' },
  { element: 'Text on tertiary background', foreground: '#111827', background: '#f3f4f6' },
];

export interface ComprehensiveAuditReport {
  timestamp: string;
  url: string;
  score: number;
  colorContrast: AccessibilityAuditResult[];
  accessibility: AccessibilityReport;
  recommendations: string[];
  autoFixable: number;
}

export async function runComprehensiveAudit(): Promise<ComprehensiveAuditReport> {
  console.log('🔍 Starting WCAG 2.2 Comprehensive Audit...');
  
  const timestamp = new Date().toISOString();
  const url = window.location.href;
  
  // Color contrast audit
  console.log('📊 Auditing color contrast...');
  const colorContrast = auditColorCombinations(COLOR_COMBINATIONS);
  
  // Accessibility audit
  console.log('♿ Auditing accessibility compliance...');
  const accessibility = performAccessibilityAudit();
  
  // Auto-fix analysis
  console.log('🔧 Analyzing auto-fixable issues...');
  const autoFixable = autoFixAccessibilityIssues(document.body);
  
  // Generate recommendations
  const recommendations = generateRecommendations(colorContrast, accessibility);
  
  // Calculate overall score
  const colorScore = calculateColorScore(colorContrast);
  const overallScore = Math.round((colorScore + accessibility.score) / 2);
  
  const report: ComprehensiveAuditReport = {
    timestamp,
    url,
    score: overallScore,
    colorContrast,
    accessibility,
    recommendations,
    autoFixable
  };
  
  // Log results
  console.log('✅ Audit Complete!');
  console.log(`📈 Overall Score: ${overallScore}/100`);
  console.log(`🎨 Color Contrast: ${colorScore}/100`);
  console.log(`♿ Accessibility: ${accessibility.score}/100`);
  console.log(`🔧 Auto-fixable issues: ${autoFixable}`);
  
  if (report.score < 80) {
    console.warn('⚠️ Accessibility score below 80. Review recommendations.');
  }
  
  return report;
}

function calculateColorScore(colorResults: AccessibilityAuditResult[]): number {
  if (colorResults.length === 0) return 100;
  
  const aaaCompliant = colorResults.filter(r => r.compliance.AAA).length;
  const aaCompliant = colorResults.filter(r => r.compliance.AA).length;
  const total = colorResults.length;
  
  // AAA gets full points, AA gets 80% points, failures get 0%
  const score = ((aaaCompliant * 100) + (aaCompliant * 80)) / (total * 100) * 100;
  return Math.round(score);
}

function generateRecommendations(
  colorResults: AccessibilityAuditResult[], 
  accessibilityResults: AccessibilityReport
): string[] {
  const recommendations: string[] = [];
  
  // Color contrast recommendations
  const failedColors = colorResults.filter(r => !r.compliance.AA);
  if (failedColors.length > 0) {
    recommendations.push(
      `🎨 ${failedColors.length} color combinations fail WCAG AA requirements. Use darker text or lighter backgrounds.`
    );
  }
  
  const aaOnlyColors = colorResults.filter(r => r.compliance.AA && !r.compliance.AAA);
  if (aaOnlyColors.length > 0) {
    recommendations.push(
      `⭐ ${aaOnlyColors.length} color combinations could be improved for AAA compliance.`
    );
  }
  
  // Accessibility recommendations
  const { errors, warnings } = accessibilityResults.summary;
  
  if (errors > 0) {
    recommendations.push(
      `🚨 ${errors} critical accessibility errors found. These must be fixed for compliance.`
    );
  }
  
  if (warnings > 0) {
    recommendations.push(
      `⚠️ ${warnings} accessibility warnings found. Consider addressing these for better user experience.`
    );
  }
  
  // Specific recommendations based on common issues
  const errorMessages = accessibilityResults.results
    .filter(r => r.level === 'error')
    .map(r => r.message);
  
  if (errorMessages.some(msg => msg.includes('missing alt'))) {
    recommendations.push('🖼️ Add alt text to images for screen reader users.');
  }
  
  if (errorMessages.some(msg => msg.includes('missing label'))) {
    recommendations.push('🏷️ Add labels to form inputs for better accessibility.');
  }
  
  if (errorMessages.some(msg => msg.includes('touch target'))) {
    recommendations.push('👆 Increase touch target sizes to minimum 44×44px.');
  }
  
  if (errorMessages.some(msg => msg.includes('heading'))) {
    recommendations.push('📝 Fix heading structure to use sequential levels (H1, H2, H3...).');
  }
  
  // Performance recommendations
  if (accessibilityResults.results.length > 100) {
    recommendations.push('⚡ Consider optimizing page complexity for better accessibility performance.');
  }
  
  return recommendations;
}

export function generateAccessibilityReport(report: ComprehensiveAuditReport): string {
  const { score, colorContrast, accessibility, recommendations, timestamp } = report;
  
  let reportText = `
# WCAG 2.2 Accessibility Audit Report

**Generated:** ${new Date(timestamp).toLocaleString()}
**URL:** ${report.url}
**Overall Score:** ${score}/100

## Summary

- **Color Contrast Score:** ${calculateColorScore(colorContrast)}/100
- **Accessibility Score:** ${accessibility.score}/100
- **Critical Errors:** ${accessibility.summary.errors}
- **Warnings:** ${accessibility.summary.warnings}
- **Passed Checks:** ${accessibility.summary.passed}

## Color Contrast Results

`;

  colorContrast.forEach(result => {
    const status = result.compliance.AAA ? '✅ AAA' : result.compliance.AA ? '⚠️ AA' : '❌ FAIL';
    reportText += `- **${result.element}:** ${status} (${result.compliance.ratio}:1)\n`;
  });

  reportText += `
## Accessibility Issues

`;

  const errors = accessibility.results.filter(r => r.level === 'error');
  const warnings = accessibility.results.filter(r => r.level === 'warning');

  if (errors.length > 0) {
    reportText += `### Critical Errors (${errors.length})\n\n`;
    errors.forEach((error, index) => {
      reportText += `${index + 1}. **${error.message}**\n`;
      if (error.fix) {
        reportText += `   - *Fix:* ${error.fix}\n`;
      }
      reportText += '\n';
    });
  }

  if (warnings.length > 0) {
    reportText += `### Warnings (${warnings.length})\n\n`;
    warnings.slice(0, 10).forEach((warning, index) => {
      reportText += `${index + 1}. **${warning.message}**\n`;
      if (warning.fix) {
        reportText += `   - *Fix:* ${warning.fix}\n`;
      }
      reportText += '\n';
    });
    
    if (warnings.length > 10) {
      reportText += `... and ${warnings.length - 10} more warnings.\n\n`;
    }
  }

  reportText += `
## Recommendations

`;

  recommendations.forEach((rec, index) => {
    reportText += `${index + 1}. ${rec}\n`;
  });

  reportText += `
## WCAG 2.2 Compliant Color Palette

Use these pre-validated colors for guaranteed compliance:

### Primary Colors
- **Blue (AA):** ${WCAG_COMPLIANT_COLORS.primary.blue}
- **Blue Dark (AAA):** ${WCAG_COMPLIANT_COLORS.primary.blueDark}

### Semantic Colors
- **Success (AA):** ${WCAG_COMPLIANT_COLORS.semantic.success}
- **Success Dark (AAA):** ${WCAG_COMPLIANT_COLORS.semantic.successDark}
- **Error (AA):** ${WCAG_COMPLIANT_COLORS.semantic.error}
- **Error Dark (AAA):** ${WCAG_COMPLIANT_COLORS.semantic.errorDark}

### Text Colors
- **Primary (AAA):** ${WCAG_COMPLIANT_COLORS.text.primary}
- **Secondary (AAA):** ${WCAG_COMPLIANT_COLORS.text.secondary}
- **Tertiary (AA):** ${WCAG_COMPLIANT_COLORS.text.tertiary}

---

*This report was generated by the WCAG 2.2 Accessibility Audit Tool*
`;

  return reportText;
}

export function downloadAuditReport(report: ComprehensiveAuditReport): void {
  const reportText = generateAccessibilityReport(report);
  const blob = new Blob([reportText], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `accessibility-audit-${new Date().toISOString().split('T')[0]}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Development mode audit runner
export function initDevelopmentAudit(): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.log('🔧 Development Mode: Accessibility monitoring enabled');
  
  // Start real-time monitoring
  const stopMonitoring = startAccessibilityMonitoring();
  
  // Add global audit function
  (window as any).runAccessibilityAudit = async () => {
    const report = await runComprehensiveAudit();
    console.table(report.colorContrast.map(r => ({
      Element: r.element,
      Ratio: `${r.compliance.ratio}:1`,
      AA: r.compliance.AA ? '✅' : '❌',
      AAA: r.compliance.AAA ? '✅' : '❌'
    })));
    return report;
  };
  
  (window as any).downloadAuditReport = async () => {
    const report = await runComprehensiveAudit();
    downloadAuditReport(report);
  };
  
  // Auto-run audit after page load
  setTimeout(async () => {
    const report = await runComprehensiveAudit();
    if (report.score < 90) {
      console.warn('💡 Run window.downloadAuditReport() to get detailed recommendations');
    }
  }, 2000);
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', stopMonitoring);
}

export default {
  runComprehensiveAudit,
  generateAccessibilityReport,
  downloadAuditReport,
  initDevelopmentAudit
};