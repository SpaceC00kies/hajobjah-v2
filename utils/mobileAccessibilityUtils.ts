/**
 * Mobile Accessibility Utilities
 * 
 * Utilities for validating and enhancing mobile accessibility
 * as part of Task 7.1: Mobile Touch & Form Experience Enhancement
 */

export interface TouchTargetValidationResult {
  element: Element;
  width: number;
  height: number;
  isValid: boolean;
  recommendation: string;
}

export interface AccessibilityAuditResult {
  touchTargets: TouchTargetValidationResult[];
  formAccessibility: FormAccessibilityResult[];
  colorContrast: ColorContrastResult[];
  summary: {
    totalIssues: number;
    criticalIssues: number;
    warnings: number;
  };
}

export interface FormAccessibilityResult {
  element: Element;
  issue: string;
  severity: 'critical' | 'warning' | 'info';
  recommendation: string;
}

export interface ColorContrastResult {
  element: Element;
  foreground: string;
  background: string;
  ratio: number;
  isValid: boolean;
  level: 'AA' | 'AAA' | 'fail';
}

/**
 * Validates touch targets meet WCAG accessibility requirements
 */
export const validateTouchTargets = (container?: Element): TouchTargetValidationResult[] => {
  const root = container || document.body;
  const interactiveElements = root.querySelectorAll(
    'button, a, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])'
  );
  
  const results: TouchTargetValidationResult[] = [];
  const minSize = 44; // WCAG AA minimum (44x44 CSS pixels)
  const recommendedSize = 48; // Enhanced recommendation
  
  interactiveElements.forEach((element) => {
    const rect = element.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    
    let isValid = true;
    let recommendation = '';
    
    if (width < minSize || height < minSize) {
      isValid = false;
      recommendation = `Increase size to at least ${minSize}x${minSize}px (WCAG AA minimum)`;
    } else if (width < recommendedSize || height < recommendedSize) {
      recommendation = `Consider increasing to ${recommendedSize}x${recommendedSize}px for better usability`;
    } else {
      recommendation = 'Touch target size is optimal';
    }
    
    results.push({
      element,
      width,
      height,
      isValid,
      recommendation
    });
  });
  
  return results;
};

/**
 * Validates form accessibility requirements
 */
export const validateFormAccessibility = (container?: Element): FormAccessibilityResult[] => {
  const root = container || document.body;
  const results: FormAccessibilityResult[] = [];
  
  // Check for inputs without labels
  const inputs = root.querySelectorAll('input, select, textarea');
  inputs.forEach((input) => {
    const id = input.getAttribute('id');
    if (!id) {
      results.push({
        element: input,
        issue: 'Input missing ID attribute',
        severity: 'critical',
        recommendation: 'Add unique ID attribute to enable label association'
      });
      return;
    }
    
    const label = root.querySelector(`label[for="${id}"]`);
    const ariaLabel = input.getAttribute('aria-label');
    const ariaLabelledBy = input.getAttribute('aria-labelledby');
    
    if (!label && !ariaLabel && !ariaLabelledBy) {
      results.push({
        element: input,
        issue: 'Input missing accessible label',
        severity: 'critical',
        recommendation: 'Add associated label, aria-label, or aria-labelledby attribute'
      });
    }
    
    // Check font size for iOS zoom prevention
    const computedStyle = window.getComputedStyle(input);
    const fontSize = parseFloat(computedStyle.fontSize);
    if (fontSize < 16) {
      results.push({
        element: input,
        issue: 'Font size too small (may cause iOS zoom)',
        severity: 'warning',
        recommendation: 'Use minimum 16px font size to prevent unwanted zoom on iOS'
      });
    }
  });
  
  // Check for error messages without proper ARIA
  const errorMessages = root.querySelectorAll('.form-error, [role="alert"]');
  errorMessages.forEach((error) => {
    if (!error.getAttribute('role') && !error.classList.contains('form-error')) {
      results.push({
        element: error,
        issue: 'Error message missing role="alert"',
        severity: 'warning',
        recommendation: 'Add role="alert" for screen reader announcement'
      });
    }
    
    if (!error.getAttribute('id')) {
      results.push({
        element: error,
        issue: 'Error message missing ID for aria-describedby association',
        severity: 'warning',
        recommendation: 'Add ID attribute to enable association with form field'
      });
    }
  });
  
  return results;
};

/**
 * Calculates color contrast ratio between two colors
 */
export const calculateContrastRatio = (foreground: string, background: string): number => {
  const getLuminance = (color: string): number => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    // Calculate relative luminance
    const sRGB = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  };
  
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Validates color contrast for text elements
 */
export const validateColorContrast = (container?: Element): ColorContrastResult[] => {
  const root = container || document.body;
  const textElements = root.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button, label, input, textarea, select');
  const results: ColorContrastResult[] = [];
  
  textElements.forEach((element) => {
    const computedStyle = window.getComputedStyle(element);
    const foreground = computedStyle.color;
    const background = computedStyle.backgroundColor;
    
    // Skip if we can't determine colors
    if (!foreground || !background || background === 'rgba(0, 0, 0, 0)') {
      return;
    }
    
    try {
      // Convert RGB to hex for calculation (simplified)
      const rgbToHex = (rgb: string): string => {
        const match = rgb.match(/\d+/g);
        if (!match) return '#000000';
        
        const r = parseInt(match[0]).toString(16).padStart(2, '0');
        const g = parseInt(match[1]).toString(16).padStart(2, '0');
        const b = parseInt(match[2]).toString(16).padStart(2, '0');
        
        return `#${r}${g}${b}`;
      };
      
      const fgHex = rgbToHex(foreground);
      const bgHex = rgbToHex(background);
      const ratio = calculateContrastRatio(fgHex, bgHex);
      
      let level: 'AA' | 'AAA' | 'fail' = 'fail';
      let isValid = false;
      
      if (ratio >= 7) {
        level = 'AAA';
        isValid = true;
      } else if (ratio >= 4.5) {
        level = 'AA';
        isValid = true;
      }
      
      results.push({
        element,
        foreground: fgHex,
        background: bgHex,
        ratio: Math.round(ratio * 100) / 100,
        isValid,
        level
      });
    } catch (error) {
      // Skip elements where color calculation fails
    }
  });
  
  return results;
};

/**
 * Runs comprehensive accessibility audit
 */
export const runAccessibilityAudit = (container?: Element): AccessibilityAuditResult => {
  const touchTargets = validateTouchTargets(container);
  const formAccessibility = validateFormAccessibility(container);
  const colorContrast = validateColorContrast(container);
  
  const criticalIssues = formAccessibility.filter(issue => issue.severity === 'critical').length +
                        touchTargets.filter(target => !target.isValid).length +
                        colorContrast.filter(color => !color.isValid).length;
  
  const warnings = formAccessibility.filter(issue => issue.severity === 'warning').length;
  
  const totalIssues = criticalIssues + warnings;
  
  return {
    touchTargets,
    formAccessibility,
    colorContrast,
    summary: {
      totalIssues,
      criticalIssues,
      warnings
    }
  };
};

/**
 * Applies mobile touch optimizations to existing elements
 */
export const applyMobileTouchOptimizations = (container?: Element): void => {
  const root = container || document.body;
  
  // Add touch optimization classes to interactive elements
  const interactiveElements = root.querySelectorAll(
    'button, a, input, select, textarea, [role="button"]'
  );
  
  interactiveElements.forEach((element) => {
    element.classList.add('touch-optimized');
    
    // Add appropriate touch target class based on current size
    const rect = element.getBoundingClientRect();
    if (rect.width < 44 || rect.height < 44) {
      element.classList.add('touch-target-md');
    }
  });
  
  // Add spacing classes to prevent mis-taps
  const buttons = root.querySelectorAll('button, .btn');
  buttons.forEach((button, index) => {
    if (index > 0) {
      button.classList.add('prevent-mistap');
    }
  });
  
  // Add enhanced focus classes
  const focusableElements = root.querySelectorAll(
    'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  focusableElements.forEach((element) => {
    element.classList.add('focus-enhanced');
  });
};

/**
 * Logs accessibility audit results to console
 */
export const logAccessibilityAudit = (results: AccessibilityAuditResult): void => {
  console.group('🔍 Mobile Accessibility Audit Results');
  
  console.log(`📊 Summary: ${results.summary.totalIssues} total issues found`);
  console.log(`🚨 Critical: ${results.summary.criticalIssues}`);
  console.log(`⚠️ Warnings: ${results.summary.warnings}`);
  
  if (results.touchTargets.some(t => !t.isValid)) {
    console.group('👆 Touch Target Issues');
    results.touchTargets
      .filter(t => !t.isValid)
      .forEach(target => {
        console.warn(
          `Touch target too small: ${target.width}x${target.height}px`,
          target.element,
          target.recommendation
        );
      });
    console.groupEnd();
  }
  
  if (results.formAccessibility.length > 0) {
    console.group('📝 Form Accessibility Issues');
    results.formAccessibility.forEach(issue => {
      const logMethod = issue.severity === 'critical' ? console.error : console.warn;
      logMethod(`${issue.issue}:`, issue.element, issue.recommendation);
    });
    console.groupEnd();
  }
  
  if (results.colorContrast.some(c => !c.isValid)) {
    console.group('🎨 Color Contrast Issues');
    results.colorContrast
      .filter(c => !c.isValid)
      .forEach(color => {
        console.warn(
          `Low contrast ratio: ${color.ratio}:1 (${color.foreground} on ${color.background})`,
          color.element
        );
      });
    console.groupEnd();
  }
  
  console.groupEnd();
};

/**
 * Development helper to run audit on page load
 */
export const enableDevelopmentAudit = (): void => {
  if (process.env.NODE_ENV === 'development') {
    const runAudit = () => {
      setTimeout(() => {
        const results = runAccessibilityAudit();
        logAccessibilityAudit(results);
      }, 1000);
    };
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runAudit);
    } else {
      runAudit();
    }
  }
};