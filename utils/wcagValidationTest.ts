/**
 * WCAG 2.2 Validation Test Suite
 * Comprehensive testing of accessibility implementation
 */

import { 
  checkWCAGCompliance, 
  getContrastRatio, 
  WCAG_COMPLIANT_COLORS 
} from './wcagAccessibilityUtils';
import { performAccessibilityAudit } from './accessibilityValidation';

interface ValidationTestResult {
  testName: string;
  passed: boolean;
  details: string;
  score?: number;
}

export function runWCAGValidationTests(): ValidationTestResult[] {
  const results: ValidationTestResult[] = [];

  // Test 1: Color Contrast Validation
  results.push(testColorContrast());
  
  // Test 2: WCAG Compliant Color Palette
  results.push(testCompliantColorPalette());
  
  // Test 3: Contrast Ratio Calculations
  results.push(testContrastRatioCalculations());
  
  // Test 4: Accessibility Utilities
  results.push(testAccessibilityUtilities());
  
  // Test 5: CSS Custom Properties
  results.push(testCSSCustomProperties());

  return results;
}

function testColorContrast(): ValidationTestResult {
  try {
    // Test primary text on white background
    const primaryTextContrast = checkWCAGCompliance('#111827', '#ffffff');
    
    if (!primaryTextContrast.AAA) {
      return {
        testName: 'Color Contrast - Primary Text',
        passed: false,
        details: `Primary text contrast ratio ${primaryTextContrast.ratio}:1 fails AAA requirements`
      };
    }

    // Test secondary text on white background
    const secondaryTextContrast = checkWCAGCompliance('#374151', '#ffffff');
    
    if (!secondaryTextContrast.AAA) {
      return {
        testName: 'Color Contrast - Secondary Text',
        passed: false,
        details: `Secondary text contrast ratio ${secondaryTextContrast.ratio}:1 fails AAA requirements`
      };
    }

    // Test primary button contrast
    const buttonContrast = checkWCAGCompliance('#ffffff', '#2563eb');
    
    if (!buttonContrast.AA) {
      return {
        testName: 'Color Contrast - Primary Button',
        passed: false,
        details: `Primary button contrast ratio ${buttonContrast.ratio}:1 fails AA requirements`
      };
    }

    return {
      testName: 'Color Contrast Validation',
      passed: true,
      details: 'All color combinations meet WCAG 2.2 requirements',
      score: 100
    };
  } catch (error) {
    return {
      testName: 'Color Contrast Validation',
      passed: false,
      details: `Error during color contrast testing: ${error}`
    };
  }
}

function testCompliantColorPalette(): ValidationTestResult {
  try {
    const palette = WCAG_COMPLIANT_COLORS;
    
    // Test primary colors
    const primaryBlueAA = checkWCAGCompliance('#ffffff', palette.primary.blue);
    const primaryBlueDarkAAA = checkWCAGCompliance('#ffffff', palette.primary.blueDark);
    
    if (!primaryBlueAA.AA || !primaryBlueDarkAAA.AAA) {
      return {
        testName: 'WCAG Compliant Color Palette',
        passed: false,
        details: 'Primary colors do not meet specified compliance levels'
      };
    }

    // Test semantic colors
    const successAA = checkWCAGCompliance('#ffffff', palette.semantic.success);
    const errorAA = checkWCAGCompliance('#ffffff', palette.semantic.error);
    
    if (!successAA.AA || !errorAA.AA) {
      return {
        testName: 'WCAG Compliant Color Palette',
        passed: false,
        details: 'Semantic colors do not meet AA compliance'
      };
    }

    // Test text colors
    const textPrimaryAAA = checkWCAGCompliance(palette.text.primary, '#ffffff');
    const textSecondaryAAA = checkWCAGCompliance(palette.text.secondary, '#ffffff');
    
    if (!textPrimaryAAA.AAA || !textSecondaryAAA.AAA) {
      return {
        testName: 'WCAG Compliant Color Palette',
        passed: false,
        details: 'Text colors do not meet AAA compliance'
      };
    }

    return {
      testName: 'WCAG Compliant Color Palette',
      passed: true,
      details: 'All palette colors meet their specified compliance levels',
      score: 100
    };
  } catch (error) {
    return {
      testName: 'WCAG Compliant Color Palette',
      passed: false,
      details: `Error during palette testing: ${error}`
    };
  }
}

function testContrastRatioCalculations(): ValidationTestResult {
  try {
    // Test known contrast ratios
    const blackOnWhite = getContrastRatio('#000000', '#ffffff');
    const whiteOnBlack = getContrastRatio('#ffffff', '#000000');
    
    // Black on white should be 21:1
    if (Math.abs(blackOnWhite - 21) > 0.1) {
      return {
        testName: 'Contrast Ratio Calculations',
        passed: false,
        details: `Black on white contrast ratio should be 21:1, got ${blackOnWhite}:1`
      };
    }

    // White on black should also be 21:1
    if (Math.abs(whiteOnBlack - 21) > 0.1) {
      return {
        testName: 'Contrast Ratio Calculations',
        passed: false,
        details: `White on black contrast ratio should be 21:1, got ${whiteOnBlack}:1`
      };
    }

    // Test same color (should be 1:1)
    const sameColor = getContrastRatio('#ff0000', '#ff0000');
    if (Math.abs(sameColor - 1) > 0.1) {
      return {
        testName: 'Contrast Ratio Calculations',
        passed: false,
        details: `Same color contrast ratio should be 1:1, got ${sameColor}:1`
      };
    }

    return {
      testName: 'Contrast Ratio Calculations',
      passed: true,
      details: 'Contrast ratio calculations are accurate',
      score: 100
    };
  } catch (error) {
    return {
      testName: 'Contrast Ratio Calculations',
      passed: false,
      details: `Error during contrast ratio testing: ${error}`
    };
  }
}

function testAccessibilityUtilities(): ValidationTestResult {
  try {
    // Test if accessibility audit can run without errors
    if (typeof document !== 'undefined') {
      const auditResults = performAccessibilityAudit(document.body);
      
      if (!auditResults || typeof auditResults.score !== 'number') {
        return {
          testName: 'Accessibility Utilities',
          passed: false,
          details: 'Accessibility audit did not return valid results'
        };
      }

      return {
        testName: 'Accessibility Utilities',
        passed: true,
        details: `Accessibility audit completed successfully with score: ${auditResults.score}/100`,
        score: auditResults.score
      };
    } else {
      return {
        testName: 'Accessibility Utilities',
        passed: true,
        details: 'Accessibility utilities loaded successfully (DOM not available in test environment)'
      };
    }
  } catch (error) {
    return {
      testName: 'Accessibility Utilities',
      passed: false,
      details: `Error during accessibility utilities testing: ${error}`
    };
  }
}

function testCSSCustomProperties(): ValidationTestResult {
  try {
    if (typeof document === 'undefined') {
      return {
        testName: 'CSS Custom Properties',
        passed: true,
        details: 'CSS custom properties test skipped (DOM not available)'
      };
    }

    const rootStyles = getComputedStyle(document.documentElement);
    
    // Test if WCAG compliant colors are defined
    const primaryBlue = rootStyles.getPropertyValue('--primary-blue').trim();
    const textPrimary = rootStyles.getPropertyValue('--text-primary').trim();
    const successGreen = rootStyles.getPropertyValue('--success-green').trim();
    
    if (!primaryBlue || !textPrimary || !successGreen) {
      return {
        testName: 'CSS Custom Properties',
        passed: false,
        details: 'Required WCAG compliant CSS custom properties are not defined'
      };
    }

    // Test if the colors match expected values
    const expectedColors = {
      '--primary-blue': '#2563eb',
      '--text-primary': '#111827',
      '--success-green': '#059669'
    };

    const mismatches: string[] = [];
    
    Object.entries(expectedColors).forEach(([property, expected]) => {
      const actual = rootStyles.getPropertyValue(property).trim();
      if (actual && actual !== expected) {
        mismatches.push(`${property}: expected ${expected}, got ${actual}`);
      }
    });

    if (mismatches.length > 0) {
      return {
        testName: 'CSS Custom Properties',
        passed: false,
        details: `Color mismatches found: ${mismatches.join(', ')}`
      };
    }

    return {
      testName: 'CSS Custom Properties',
      passed: true,
      details: 'All WCAG compliant CSS custom properties are correctly defined',
      score: 100
    };
  } catch (error) {
    return {
      testName: 'CSS Custom Properties',
      passed: false,
      details: `Error during CSS custom properties testing: ${error}`
    };
  }
}

export function generateValidationReport(results: ValidationTestResult[]): string {
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const overallScore = results.reduce((sum, r) => sum + (r.score || 0), 0) / results.filter(r => r.score).length;

  let report = `
# WCAG 2.2 Implementation Validation Report

**Generated:** ${new Date().toLocaleString()}
**Tests Passed:** ${passed}/${total}
**Overall Score:** ${Math.round(overallScore || 0)}/100

## Test Results

`;

  results.forEach((result, index) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const score = result.score ? ` (${result.score}/100)` : '';
    
    report += `### ${index + 1}. ${result.testName} ${status}${score}

${result.details}

`;
  });

  report += `
## Summary

`;

  if (passed === total) {
    report += `🎉 **All tests passed!** Your WCAG 2.2 implementation is working correctly.

`;
  } else {
    const failed = total - passed;
    report += `⚠️ **${failed} test(s) failed.** Please review the failed tests and fix the issues.

`;
  }

  report += `
## Next Steps

1. **Run Comprehensive Audit:** Use \`window.runAccessibilityAudit()\` in the browser console
2. **Download Report:** Use \`window.downloadAuditReport()\` for detailed analysis
3. **Monitor Real-time:** Accessibility monitoring is active in development mode
4. **Test Components:** Use the AccessibilityTester component for interactive testing

---

*This validation report ensures your WCAG 2.2 implementation is functioning correctly.*
`;

  return report;
}

export function logValidationResults(): void {
  if (process.env.NODE_ENV !== 'development') return;

  console.log('🧪 Running WCAG 2.2 Validation Tests...');
  
  const results = runWCAGValidationTests();
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log(`📊 Validation Results: ${passed}/${total} tests passed`);
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const score = result.score ? ` (${result.score}/100)` : '';
    console.log(`${icon} ${result.testName}${score}: ${result.details}`);
  });

  if (passed === total) {
    console.log('🎉 All WCAG 2.2 validation tests passed!');
  } else {
    console.warn('⚠️ Some validation tests failed. Check the details above.');
  }

  // Add global function to generate report
  (window as any).generateValidationReport = () => {
    const report = generateValidationReport(results);
    console.log(report);
    return report;
  };
}

export default {
  runWCAGValidationTests,
  generateValidationReport,
  logValidationResults
};