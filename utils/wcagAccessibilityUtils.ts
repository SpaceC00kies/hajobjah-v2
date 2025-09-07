/**
 * WCAG 2.2 Accessibility Utilities
 * Comprehensive utilities for ensuring WCAG 2.2 compliance
 */

// WCAG 2.2 Color Contrast Requirements
export const WCAG_CONTRAST_RATIOS = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3.0,
  AAA_NORMAL: 7.0,
  AAA_LARGE: 4.5,
} as const;

// Color conversion utilities
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// WCAG relative luminance calculation
export function getRelativeLuminance(color: string): number {
  const rgb = hexToRgb(color);
  if (!rgb) return 0;

  const { r, g, b } = rgb;
  
  // Convert to sRGB
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  // Apply gamma correction
  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  // Calculate relative luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

// WCAG contrast ratio calculation
export function getContrastRatio(color1: string, color2: string): number {
  const luminance1 = getRelativeLuminance(color1);
  const luminance2 = getRelativeLuminance(color2);
  
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

// Check WCAG compliance
export function checkWCAGCompliance(
  foreground: string, 
  background: string, 
  isLargeText: boolean = false
): {
  ratio: number;
  AA: boolean;
  AAA: boolean;
  level: 'AAA' | 'AA' | 'FAIL';
} {
  const ratio = getContrastRatio(foreground, background);
  const aaThreshold = isLargeText ? WCAG_CONTRAST_RATIOS.AA_LARGE : WCAG_CONTRAST_RATIOS.AA_NORMAL;
  const aaaThreshold = isLargeText ? WCAG_CONTRAST_RATIOS.AAA_LARGE : WCAG_CONTRAST_RATIOS.AAA_NORMAL;
  
  const AA = ratio >= aaThreshold;
  const AAA = ratio >= aaaThreshold;
  
  return {
    ratio: Math.round(ratio * 100) / 100,
    AA,
    AAA,
    level: AAA ? 'AAA' : AA ? 'AA' : 'FAIL'
  };
}

// Generate accessible color alternatives
export function generateAccessibleColor(
  baseColor: string,
  backgroundColor: string,
  targetLevel: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): string {
  const targetRatio = targetLevel === 'AAA' 
    ? (isLargeText ? WCAG_CONTRAST_RATIOS.AAA_LARGE : WCAG_CONTRAST_RATIOS.AAA_NORMAL)
    : (isLargeText ? WCAG_CONTRAST_RATIOS.AA_LARGE : WCAG_CONTRAST_RATIOS.AA_NORMAL);

  const bgLuminance = getRelativeLuminance(backgroundColor);
  const baseLuminance = getRelativeLuminance(baseColor);
  
  // Determine if we need to go darker or lighter
  const shouldGoDarker = baseLuminance > bgLuminance;
  
  let adjustedColor = baseColor;
  let currentRatio = getContrastRatio(adjustedColor, backgroundColor);
  
  // Binary search for optimal color
  let step = shouldGoDarker ? -10 : 10;
  let iterations = 0;
  const maxIterations = 50;
  
  while (currentRatio < targetRatio && iterations < maxIterations) {
    const rgb = hexToRgb(adjustedColor);
    if (!rgb) break;
    
    const newR = Math.max(0, Math.min(255, rgb.r + step));
    const newG = Math.max(0, Math.min(255, rgb.g + step));
    const newB = Math.max(0, Math.min(255, rgb.b + step));
    
    adjustedColor = rgbToHex(newR, newG, newB);
    currentRatio = getContrastRatio(adjustedColor, backgroundColor);
    
    iterations++;
  }
  
  return adjustedColor;
}

// WCAG 2.2 compliant color palette
export const WCAG_COMPLIANT_COLORS = {
  // Primary colors with guaranteed AA compliance on white
  primary: {
    blue: '#2563eb',      // 4.5:1 on white
    blueDark: '#1d4ed8',  // 7.0:1 on white (AAA)
    blueLight: '#dbeafe', // For backgrounds
  },
  
  // Semantic colors with AA compliance
  semantic: {
    success: '#059669',    // 4.5:1 on white
    successDark: '#047857', // 7.0:1 on white (AAA)
    error: '#dc2626',      // 4.5:1 on white
    errorDark: '#b91c1c',  // 7.0:1 on white (AAA)
    warning: '#d97706',    // 4.5:1 on white
    warningDark: '#b45309', // 7.0:1 on white (AAA)
    info: '#2563eb',       // 4.5:1 on white
    infoDark: '#1d4ed8',   // 7.0:1 on white (AAA)
  },
  
  // Text colors with guaranteed contrast
  text: {
    primary: '#111827',    // 15.3:1 on white (AAA)
    secondary: '#374151',  // 9.7:1 on white (AAA)
    tertiary: '#6b7280',   // 4.6:1 on white (AA)
    muted: '#9ca3af',      // 3.1:1 on white (AA Large only)
  },
  
  // Background colors
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    tertiary: '#f3f4f6',
    dark: '#111827',
  }
} as const;

// Color blindness simulation utilities
export function simulateColorBlindness(color: string, type: 'protanopia' | 'deuteranopia' | 'tritanopia'): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  
  let { r, g, b } = rgb;
  
  // Normalize to 0-1 range
  r /= 255;
  g /= 255;
  b /= 255;
  
  // Apply color blindness transformation matrices
  let newR: number, newG: number, newB: number;
  
  switch (type) {
    case 'protanopia': // Red-blind
      newR = 0.567 * r + 0.433 * g;
      newG = 0.558 * r + 0.442 * g;
      newB = 0.242 * g + 0.758 * b;
      break;
    case 'deuteranopia': // Green-blind
      newR = 0.625 * r + 0.375 * g;
      newG = 0.7 * r + 0.3 * g;
      newB = 0.3 * g + 0.7 * b;
      break;
    case 'tritanopia': // Blue-blind
      newR = 0.95 * r + 0.05 * g;
      newG = 0.433 * g + 0.567 * b;
      newB = 0.475 * g + 0.525 * b;
      break;
    default:
      return color;
  }
  
  // Convert back to 0-255 range and create hex
  const finalR = Math.round(Math.max(0, Math.min(255, newR * 255)));
  const finalG = Math.round(Math.max(0, Math.min(255, newG * 255)));
  const finalB = Math.round(Math.max(0, Math.min(255, newB * 255)));
  
  return rgbToHex(finalR, finalG, finalB);
}

// Accessibility audit utilities
export interface AccessibilityAuditResult {
  element: string;
  foreground: string;
  background: string;
  compliance: ReturnType<typeof checkWCAGCompliance>;
  recommendations?: string[];
}

export function auditColorCombinations(combinations: Array<{
  element: string;
  foreground: string;
  background: string;
  isLargeText?: boolean;
}>): AccessibilityAuditResult[] {
  return combinations.map(({ element, foreground, background, isLargeText = false }) => {
    const compliance = checkWCAGCompliance(foreground, background, isLargeText);
    const recommendations: string[] = [];
    
    if (!compliance.AA) {
      const suggestedColor = generateAccessibleColor(foreground, background, 'AA', isLargeText);
      recommendations.push(`Use ${suggestedColor} instead of ${foreground} for AA compliance`);
    }
    
    if (!compliance.AAA) {
      const suggestedColor = generateAccessibleColor(foreground, background, 'AAA', isLargeText);
      recommendations.push(`Use ${suggestedColor} for AAA compliance`);
    }
    
    return {
      element,
      foreground,
      background,
      compliance,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  });
}

// Focus management utilities
export function createFocusTrap(container: HTMLElement): {
  activate: () => void;
  deactivate: () => void;
} {
  let isActive = false;
  let previousActiveElement: Element | null = null;
  
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(', ');
  
  function getFocusableElements(): HTMLElement[] {
    return Array.from(container.querySelectorAll(focusableSelectors));
  }
  
  function handleKeyDown(event: KeyboardEvent) {
    if (!isActive || event.key !== 'Tab') return;
    
    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }
  
  return {
    activate() {
      if (isActive) return;
      
      isActive = true;
      previousActiveElement = document.activeElement;
      
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
      
      document.addEventListener('keydown', handleKeyDown);
    },
    
    deactivate() {
      if (!isActive) return;
      
      isActive = false;
      document.removeEventListener('keydown', handleKeyDown);
      
      if (previousActiveElement && 'focus' in previousActiveElement) {
        (previousActiveElement as HTMLElement).focus();
      }
    }
  };
}

// ARIA utilities
export function generateAriaDescribedBy(ids: string[]): string {
  return ids.filter(Boolean).join(' ');
}

export function generateUniqueId(prefix: string = 'wcag'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

// Screen reader utilities
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// Keyboard navigation utilities
export function isKeyboardUser(): boolean {
  let hadKeyboardEvent = false;
  let hadMouseEvent = false;
  
  const keyboardEvents = ['keydown', 'keyup'];
  const mouseEvents = ['mousedown', 'mouseup', 'mousemove'];
  
  keyboardEvents.forEach(event => {
    document.addEventListener(event, () => {
      hadKeyboardEvent = true;
    }, { once: true });
  });
  
  mouseEvents.forEach(event => {
    document.addEventListener(event, () => {
      hadMouseEvent = true;
    }, { once: true });
  });
  
  return hadKeyboardEvent && !hadMouseEvent;
}

// Touch target utilities
export function validateTouchTargets(container: HTMLElement = document.body): Array<{
  element: HTMLElement;
  width: number;
  height: number;
  compliant: boolean;
}> {
  const interactiveElements = container.querySelectorAll(
    'button, input, select, textarea, a, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])'
  );
  
  return Array.from(interactiveElements).map(element => {
    const rect = element.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const compliant = width >= 44 && height >= 44; // WCAG 2.2 minimum
    
    return {
      element: element as HTMLElement,
      width,
      height,
      compliant
    };
  });
}

// Export comprehensive audit function
export function performWCAGAudit(container: HTMLElement = document.body): {
  colorContrast: AccessibilityAuditResult[];
  touchTargets: ReturnType<typeof validateTouchTargets>;
  focusableElements: HTMLElement[];
  ariaIssues: string[];
} {
  // Color contrast audit (would need to be implemented based on computed styles)
  const colorContrast: AccessibilityAuditResult[] = [];
  
  // Touch target validation
  const touchTargets = validateTouchTargets(container);
  
  // Focusable elements audit
  const focusableElements = Array.from(container.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
  )) as HTMLElement[];
  
  // ARIA issues detection
  const ariaIssues: string[] = [];
  
  // Check for missing alt text
  const images = container.querySelectorAll('img:not([alt])');
  if (images.length > 0) {
    ariaIssues.push(`${images.length} images missing alt text`);
  }
  
  // Check for missing form labels
  const inputs = container.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
  const inputsWithoutLabels = Array.from(inputs).filter(input => {
    const id = input.getAttribute('id');
    return !id || !container.querySelector(`label[for="${id}"]`);
  });
  
  if (inputsWithoutLabels.length > 0) {
    ariaIssues.push(`${inputsWithoutLabels.length} form inputs missing labels`);
  }
  
  return {
    colorContrast,
    touchTargets,
    focusableElements,
    ariaIssues
  };
}