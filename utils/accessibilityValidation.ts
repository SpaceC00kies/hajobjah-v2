/**
 * Accessibility Validation Utilities
 * Runtime validation for WCAG 2.2 compliance
 */

import { 
  checkWCAGCompliance, 
  validateTouchTargets, 
  announceToScreenReader 
} from './wcagAccessibilityUtils';

// Validation result types
export interface ValidationResult {
  isValid: boolean;
  level: 'error' | 'warning' | 'info';
  message: string;
  element?: HTMLElement;
  fix?: string;
}

export interface AccessibilityReport {
  score: number; // 0-100
  results: ValidationResult[];
  summary: {
    errors: number;
    warnings: number;
    passed: number;
  };
}

// Color contrast validation
export function validateColorContrast(element: HTMLElement): ValidationResult[] {
  const results: ValidationResult[] = [];
  const computedStyle = window.getComputedStyle(element);
  const color = computedStyle.color;
  const backgroundColor = computedStyle.backgroundColor;
  
  // Skip if transparent or no background
  if (backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') {
    return results;
  }
  
  try {
    const fontSize = parseFloat(computedStyle.fontSize);
    const fontWeight = computedStyle.fontWeight;
    const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
    
    // Convert RGB to hex for validation (simplified)
    const rgbToHex = (rgb: string): string => {
      const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (!match) return '#000000';
      
      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);
      
      return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    };
    
    const foregroundHex = rgbToHex(color);
    const backgroundHex = rgbToHex(backgroundColor);
    
    const compliance = checkWCAGCompliance(foregroundHex, backgroundHex, isLargeText);
    
    if (!compliance.AA) {
      results.push({
        isValid: false,
        level: 'error',
        message: `Color contrast ratio ${compliance.ratio}:1 fails WCAG AA requirements (${isLargeText ? '3:1' : '4.5:1'} required)`,
        element,
        fix: 'Increase color contrast by using darker text or lighter background colors'
      });
    } else if (!compliance.AAA) {
      results.push({
        isValid: false,
        level: 'warning',
        message: `Color contrast ratio ${compliance.ratio}:1 passes AA but fails AAA requirements (${isLargeText ? '4.5:1' : '7:1'} required)`,
        element,
        fix: 'Consider using higher contrast colors for AAA compliance'
      });
    } else {
      results.push({
        isValid: true,
        level: 'info',
        message: `Color contrast ratio ${compliance.ratio}:1 passes AAA requirements`,
        element
      });
    }
  } catch (error) {
    results.push({
      isValid: false,
      level: 'warning',
      message: 'Could not validate color contrast',
      element
    });
  }
  
  return results;
}

// Form accessibility validation
export function validateFormAccessibility(form: HTMLFormElement): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  // Check for form labels
  const inputs = form.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    const element = input as HTMLElement;
    const id = element.getAttribute('id');
    const ariaLabel = element.getAttribute('aria-label');
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    
    let hasLabel = false;
    
    if (id) {
      const label = form.querySelector(`label[for="${id}"]`);
      if (label) hasLabel = true;
    }
    
    if (ariaLabel || ariaLabelledBy) hasLabel = true;
    
    if (!hasLabel) {
      results.push({
        isValid: false,
        level: 'error',
        message: 'Form input missing accessible label',
        element,
        fix: 'Add a <label> element with for attribute, aria-label, or aria-labelledby'
      });
    }
  });
  
  // Check for fieldsets with multiple related inputs
  const radioGroups = form.querySelectorAll('input[type="radio"]');
  const radioNames = new Set();
  radioGroups.forEach(radio => {
    const name = (radio as HTMLInputElement).name;
    if (name) radioNames.add(name);
  });
  
  radioNames.forEach(name => {
    const radios = form.querySelectorAll(`input[type="radio"][name="${name}"]`);
    if (radios.length > 1) {
      const fieldset = (radios[0] as HTMLElement).closest('fieldset');
      if (!fieldset) {
        results.push({
          isValid: false,
          level: 'warning',
          message: `Radio group "${name}" should be wrapped in a fieldset with legend`,
          element: radios[0] as HTMLElement,
          fix: 'Wrap related radio buttons in <fieldset> with <legend>'
        });
      }
    }
  });
  
  // Check for error messages
  const errorElements = form.querySelectorAll('[aria-invalid="true"]');
  errorElements.forEach(element => {
    const describedBy = element.getAttribute('aria-describedby');
    if (describedBy) {
      const errorElement = document.getElementById(describedBy);
      if (!errorElement) {
        results.push({
          isValid: false,
          level: 'error',
          message: 'aria-describedby references non-existent element',
          element: element as HTMLElement,
          fix: 'Ensure error message element exists with matching ID'
        });
      }
    } else {
      results.push({
        isValid: false,
        level: 'warning',
        message: 'Invalid input should have aria-describedby pointing to error message',
        element: element as HTMLElement,
        fix: 'Add aria-describedby attribute pointing to error message'
      });
    }
  });
  
  return results;
}

// Image accessibility validation
export function validateImageAccessibility(container: HTMLElement): ValidationResult[] {
  const results: ValidationResult[] = [];
  const images = container.querySelectorAll('img');
  
  images.forEach(img => {
    const alt = img.getAttribute('alt');
    const role = img.getAttribute('role');
    const ariaLabel = img.getAttribute('aria-label');
    
    // Decorative images should have empty alt or role="presentation"
    if (role === 'presentation' || role === 'none') {
      if (alt && alt.trim() !== '') {
        results.push({
          isValid: false,
          level: 'warning',
          message: 'Decorative image has non-empty alt text',
          element: img,
          fix: 'Use empty alt="" for decorative images or remove role="presentation"'
        });
      }
    } else {
      // Content images should have meaningful alt text
      if (alt === null) {
        results.push({
          isValid: false,
          level: 'error',
          message: 'Image missing alt attribute',
          element: img,
          fix: 'Add alt attribute with descriptive text or alt="" if decorative'
        });
      } else if (alt.trim() === '' && !ariaLabel) {
        results.push({
          isValid: false,
          level: 'warning',
          message: 'Content image has empty alt text',
          element: img,
          fix: 'Add descriptive alt text or use role="presentation" if decorative'
        });
      } else if (alt && (alt.toLowerCase().includes('image') || alt.toLowerCase().includes('picture'))) {
        results.push({
          isValid: false,
          level: 'warning',
          message: 'Alt text contains redundant words like "image" or "picture"',
          element: img,
          fix: 'Remove redundant words from alt text - screen readers already announce it as an image'
        });
      }
    }
  });
  
  return results;
}

// Heading structure validation
export function validateHeadingStructure(container: HTMLElement): ValidationResult[] {
  const results: ValidationResult[] = [];
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  
  let previousLevel = 0;
  let hasH1 = false;
  
  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1));
    
    if (level === 1) {
      if (hasH1) {
        results.push({
          isValid: false,
          level: 'warning',
          message: 'Multiple H1 elements found - consider using only one H1 per page',
          element: heading as HTMLElement,
          fix: 'Use only one H1 element per page for the main heading'
        });
      }
      hasH1 = true;
    }
    
    if (index === 0 && level !== 1) {
      results.push({
        isValid: false,
        level: 'warning',
        message: 'First heading is not H1',
        element: heading as HTMLElement,
        fix: 'Consider starting with H1 for the main page heading'
      });
    }
    
    if (previousLevel > 0 && level > previousLevel + 1) {
      results.push({
        isValid: false,
        level: 'error',
        message: `Heading level skipped from H${previousLevel} to H${level}`,
        element: heading as HTMLElement,
        fix: 'Use sequential heading levels (H1, H2, H3, etc.) without skipping'
      });
    }
    
    const text = heading.textContent?.trim();
    if (!text) {
      results.push({
        isValid: false,
        level: 'error',
        message: 'Empty heading element',
        element: heading as HTMLElement,
        fix: 'Add descriptive text to heading or remove empty heading'
      });
    }
    
    previousLevel = level;
  });
  
  if (!hasH1 && headings.length > 0) {
    results.push({
      isValid: false,
      level: 'warning',
      message: 'No H1 element found on page',
      element: headings[0] as HTMLElement,
      fix: 'Add an H1 element for the main page heading'
    });
  }
  
  return results;
}

// Link accessibility validation
export function validateLinkAccessibility(container: HTMLElement): ValidationResult[] {
  const results: ValidationResult[] = [];
  const links = container.querySelectorAll('a');
  
  links.forEach(link => {
    const href = link.getAttribute('href');
    const text = link.textContent?.trim();
    const ariaLabel = link.getAttribute('aria-label');
    const title = link.getAttribute('title');
    
    // Check for missing href
    if (!href) {
      results.push({
        isValid: false,
        level: 'error',
        message: 'Link missing href attribute',
        element: link,
        fix: 'Add href attribute or use button element for interactive elements'
      });
    }
    
    // Check for accessible name
    if (!text && !ariaLabel && !title) {
      results.push({
        isValid: false,
        level: 'error',
        message: 'Link has no accessible name',
        element: link,
        fix: 'Add descriptive text, aria-label, or title attribute'
      });
    }
    
    // Check for generic link text
    if (text && ['click here', 'read more', 'more', 'link'].includes(text.toLowerCase())) {
      results.push({
        isValid: false,
        level: 'warning',
        message: 'Link has generic text that may not be descriptive enough',
        element: link,
        fix: 'Use more descriptive link text that explains the destination or purpose'
      });
    }
    
    // Check for external links
    if (href && (href.startsWith('http') && !href.includes(window.location.hostname))) {
      const hasExternalIndicator = link.querySelector('[aria-label*="external"]') || 
                                  text?.includes('(external)') ||
                                  ariaLabel?.includes('external');
      
      if (!hasExternalIndicator) {
        results.push({
          isValid: false,
          level: 'info',
          message: 'External link should indicate it opens in new context',
          element: link,
          fix: 'Add "(external link)" to text or aria-label for external links'
        });
      }
    }
  });
  
  return results;
}

// Touch target validation
export function validateTouchTargetAccessibility(container: HTMLElement): ValidationResult[] {
  const results: ValidationResult[] = [];
  const touchTargets = validateTouchTargets(container);
  
  touchTargets.forEach(target => {
    if (!target.compliant) {
      results.push({
        isValid: false,
        level: 'error',
        message: `Touch target too small: ${target.width}×${target.height}px (minimum 44×44px required)`,
        element: target.element,
        fix: 'Increase padding or minimum dimensions to meet 44×44px requirement'
      });
    }
  });
  
  return results;
}

// Comprehensive accessibility audit
export function performAccessibilityAudit(container: HTMLElement = document.body): AccessibilityReport {
  const allResults: ValidationResult[] = [];
  
  // Run all validations
  allResults.push(...validateColorContrast(container));
  allResults.push(...validateImageAccessibility(container));
  allResults.push(...validateHeadingStructure(container));
  allResults.push(...validateLinkAccessibility(container));
  allResults.push(...validateTouchTargetAccessibility(container));
  
  // Validate forms
  const forms = container.querySelectorAll('form');
  forms.forEach(form => {
    allResults.push(...validateFormAccessibility(form));
  });
  
  // Calculate summary
  const errors = allResults.filter(r => r.level === 'error').length;
  const warnings = allResults.filter(r => r.level === 'warning').length;
  const passed = allResults.filter(r => r.isValid).length;
  const total = allResults.length;
  
  // Calculate score (0-100)
  const score = total > 0 ? Math.round(((passed + (warnings * 0.5)) / total) * 100) : 100;
  
  return {
    score,
    results: allResults,
    summary: {
      errors,
      warnings,
      passed
    }
  };
}

// Auto-fix utilities
export function autoFixAccessibilityIssues(container: HTMLElement): number {
  let fixedCount = 0;
  
  // Auto-fix missing alt attributes on decorative images
  const decorativeImages = container.querySelectorAll('img:not([alt])');
  decorativeImages.forEach(img => {
    // Only auto-fix if image appears decorative (in certain contexts)
    const parent = img.parentElement;
    if (parent && (parent.classList.contains('decoration') || parent.classList.contains('background'))) {
      img.setAttribute('alt', '');
      fixedCount++;
    }
  });
  
  // Auto-fix missing form labels where possible
  const unlabeledInputs = container.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
  unlabeledInputs.forEach(input => {
    const id = input.getAttribute('id');
    if (id) {
      const existingLabel = container.querySelector(`label[for="${id}"]`);
      if (!existingLabel) {
        // Look for adjacent text that could be a label
        const previousSibling = input.previousElementSibling;
        if (previousSibling && previousSibling.textContent?.trim()) {
          const label = document.createElement('label');
          label.setAttribute('for', id);
          label.textContent = previousSibling.textContent.trim();
          previousSibling.replaceWith(label);
          fixedCount++;
        }
      }
    }
  });
  
  // Auto-fix missing button text
  const emptyButtons = container.querySelectorAll('button:empty, button:not([aria-label])');
  emptyButtons.forEach(button => {
    const icon = button.querySelector('svg, i, .icon');
    if (icon && !button.getAttribute('aria-label')) {
      // Try to infer purpose from class names or context
      const classes = button.className.toLowerCase();
      if (classes.includes('close')) {
        button.setAttribute('aria-label', 'Close');
        fixedCount++;
      } else if (classes.includes('menu')) {
        button.setAttribute('aria-label', 'Menu');
        fixedCount++;
      } else if (classes.includes('search')) {
        button.setAttribute('aria-label', 'Search');
        fixedCount++;
      }
    }
  });
  
  return fixedCount;
}

// Real-time accessibility monitoring
export function startAccessibilityMonitoring(container: HTMLElement = document.body): () => void {
  let observer: MutationObserver;
  
  const checkNewElements = (mutations: MutationRecord[]) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          
          // Quick validation of new elements
          const results = performAccessibilityAudit(element);
          const errors = results.results.filter(r => r.level === 'error');
          
          if (errors.length > 0) {
            console.warn('Accessibility issues detected in new elements:', errors);
            
            // Announce critical issues to screen readers
            const criticalIssues = errors.filter(e => 
              e.message.includes('missing alt') || 
              e.message.includes('missing label')
            );
            
            if (criticalIssues.length > 0) {
              announceToScreenReader(
                `${criticalIssues.length} accessibility issues detected`,
                'assertive'
              );
            }
          }
        }
      });
    });
  };
  
  observer = new MutationObserver(checkNewElements);
  observer.observe(container, {
    childList: true,
    subtree: true
  });
  
  // Return cleanup function
  return () => {
    observer.disconnect();
  };
}

// All validation utilities are already exported individually above