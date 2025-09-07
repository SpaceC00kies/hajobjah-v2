/**
 * WCAG 2.2 Compliance Hook
 * Provides utilities for ensuring WCAG 2.2 compliance in React components
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  checkWCAGCompliance, 
  generateUniqueId, 
  announceToScreenReader,
  createFocusTrap,
  performWCAGAudit,
  type AccessibilityAuditResult
} from '../utils/wcagAccessibilityUtils';

export interface UseWCAGComplianceOptions {
  enableAudit?: boolean;
  enableFocusTrap?: boolean;
  enableScreenReaderAnnouncements?: boolean;
}

export function useWCAGCompliance(options: UseWCAGComplianceOptions = {}) {
  const {
    enableAudit = false,
    enableFocusTrap = false,
    enableScreenReaderAnnouncements = true
  } = options;

  const containerRef = useRef<HTMLElement>(null);
  const focusTrapRef = useRef<ReturnType<typeof createFocusTrap> | null>(null);
  const [auditResults, setAuditResults] = useState<ReturnType<typeof performWCAGAudit> | null>(null);

  // Generate unique IDs for ARIA relationships
  const generateId = useCallback((prefix: string = 'wcag') => {
    return generateUniqueId(prefix);
  }, []);

  // Screen reader announcements
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (enableScreenReaderAnnouncements) {
      announceToScreenReader(message, priority);
    }
  }, [enableScreenReaderAnnouncements]);

  // Color contrast validation
  const validateColorContrast = useCallback((
    foreground: string,
    background: string,
    isLargeText: boolean = false
  ) => {
    return checkWCAGCompliance(foreground, background, isLargeText);
  }, []);

  // Focus trap management
  const activateFocusTrap = useCallback(() => {
    if (enableFocusTrap && containerRef.current && !focusTrapRef.current) {
      focusTrapRef.current = createFocusTrap(containerRef.current);
      focusTrapRef.current.activate();
    }
  }, [enableFocusTrap]);

  const deactivateFocusTrap = useCallback(() => {
    if (focusTrapRef.current) {
      focusTrapRef.current.deactivate();
      focusTrapRef.current = null;
    }
  }, []);

  // Accessibility audit
  const runAudit = useCallback(() => {
    if (enableAudit && containerRef.current) {
      const results = performWCAGAudit(containerRef.current);
      setAuditResults(results);
      return results;
    }
    return null;
  }, [enableAudit]);

  // Auto-run audit when enabled
  useEffect(() => {
    if (enableAudit) {
      const timer = setTimeout(runAudit, 100);
      return () => clearTimeout(timer);
    }
  }, [enableAudit, runAudit]);

  // Cleanup focus trap on unmount
  useEffect(() => {
    return () => {
      deactivateFocusTrap();
    };
  }, [deactivateFocusTrap]);

  return {
    containerRef,
    generateId,
    announce,
    validateColorContrast,
    activateFocusTrap,
    deactivateFocusTrap,
    runAudit,
    auditResults
  };
}

// Enhanced form accessibility hook with WCAG 2.2 compliance
export function useEnhancedFormAccessibility() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const fieldIds = useRef<Record<string, string>>({});

  const generateFieldId = useCallback((fieldName: string) => {
    if (!fieldIds.current[fieldName]) {
      fieldIds.current[fieldName] = generateUniqueId(`field-${fieldName}`);
    }
    return fieldIds.current[fieldName];
  }, []);

  const generateErrorId = useCallback((fieldName: string) => {
    return `${generateFieldId(fieldName)}-error`;
  }, [generateFieldId]);

  const generateDescriptionId = useCallback((fieldName: string) => {
    return `${generateFieldId(fieldName)}-description`;
  }, [generateFieldId]);

  const setFieldError = useCallback((fieldName: string, error: string) => {
    setErrors(prev => ({ ...prev, [fieldName]: error }));
    
    // Announce error to screen readers
    const announcement = `Error in ${fieldName}: ${error}`;
    setAnnouncements(prev => [...prev, announcement]);
    announceToScreenReader(announcement, 'assertive');
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
    setAnnouncements([]);
  }, []);

  // Enhanced input props with WCAG 2.2 compliance
  const getInputProps = useCallback((
    fieldName: string,
    hasError: boolean = false,
    description?: string
  ) => {
    const fieldId = generateFieldId(fieldName);
    const errorId = generateErrorId(fieldName);
    const descriptionId = generateDescriptionId(fieldName);
    
    const describedBy = [];
    if (hasError && errors[fieldName]) {
      describedBy.push(errorId);
    }
    if (description) {
      describedBy.push(descriptionId);
    }

    return {
      id: fieldId,
      'aria-invalid': hasError,
      'aria-describedby': describedBy.length > 0 ? describedBy.join(' ') : undefined,
      'aria-required': true,
    };
  }, [errors, generateFieldId, generateErrorId, generateDescriptionId]);

  // Enhanced label props
  const getLabelProps = useCallback((fieldName: string, required: boolean = false) => {
    const fieldId = generateFieldId(fieldName);
    
    return {
      htmlFor: fieldId,
      className: `form-label ${required ? 'required' : ''}`,
    };
  }, [generateFieldId]);

  // Enhanced error props with visual and non-visual indicators
  const getErrorProps = useCallback((fieldName: string) => {
    const errorId = generateErrorId(fieldName);
    const error = errors[fieldName];
    
    if (!error) return null;

    return {
      id: errorId,
      role: 'alert' as const,
      'aria-live': 'assertive' as const,
      className: 'form-error',
      children: error
    };
  }, [errors, generateErrorId]);

  // Description props
  const getDescriptionProps = useCallback((fieldName: string, description: string) => {
    const descriptionId = generateDescriptionId(fieldName);
    
    return {
      id: descriptionId,
      className: 'form-helper-text',
      children: description
    };
  }, [generateDescriptionId]);

  // Success state props
  const getSuccessProps = useCallback((fieldName: string, message: string) => {
    return {
      role: 'status' as const,
      'aria-live': 'polite' as const,
      className: 'form-success',
      children: message
    };
  }, []);

  // Fieldset props for grouped form elements
  const getFieldsetProps = useCallback((legend: string) => {
    const legendId = generateUniqueId('fieldset-legend');
    return {
      role: 'group' as const,
      'aria-labelledby': legendId,
      legendId,
      legend
    };
  }, []);

  // Live region for announcements
  const AnnouncementRegion = useCallback(() => {
    return React.createElement('div', {
      'aria-live': 'assertive',
      'aria-atomic': 'true',
      className: 'sr-only',
      role: 'status'
    }, announcements.map((announcement, index) => 
      React.createElement('div', { key: index }, announcement)
    ));
  }, [announcements]);

  return {
    errors,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    getInputProps,
    getLabelProps,
    getErrorProps,
    getDescriptionProps,
    getSuccessProps,
    getFieldsetProps,
    AnnouncementRegion,
    hasErrors: Object.keys(errors).length > 0
  };
}

// Keyboard navigation hook
export function useKeyboardNavigation() {
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);

  useEffect(() => {
    let hadKeyboardEvent = false;
    let hadMouseEvent = false;

    const handleKeyboard = () => {
      hadKeyboardEvent = true;
      setIsKeyboardUser(true);
    };

    const handleMouse = () => {
      hadMouseEvent = true;
      if (hadKeyboardEvent) {
        setIsKeyboardUser(false);
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    document.addEventListener('mousedown', handleMouse);
    document.addEventListener('mousemove', handleMouse);

    return () => {
      document.removeEventListener('keydown', handleKeyboard);
      document.removeEventListener('mousedown', handleMouse);
      document.removeEventListener('mousemove', handleMouse);
    };
  }, []);

  const handleKeyDown = useCallback((
    event: React.KeyboardEvent,
    handlers: {
      onEnter?: () => void;
      onSpace?: () => void;
      onEscape?: () => void;
      onArrowUp?: () => void;
      onArrowDown?: () => void;
      onArrowLeft?: () => void;
      onArrowRight?: () => void;
      onTab?: (shiftKey: boolean) => void;
    }
  ) => {
    switch (event.key) {
      case 'Enter':
        if (handlers.onEnter) {
          event.preventDefault();
          handlers.onEnter();
        }
        break;
      case ' ':
        if (handlers.onSpace) {
          event.preventDefault();
          handlers.onSpace();
        }
        break;
      case 'Escape':
        if (handlers.onEscape) {
          event.preventDefault();
          handlers.onEscape();
        }
        break;
      case 'ArrowUp':
        if (handlers.onArrowUp) {
          event.preventDefault();
          handlers.onArrowUp();
        }
        break;
      case 'ArrowDown':
        if (handlers.onArrowDown) {
          event.preventDefault();
          handlers.onArrowDown();
        }
        break;
      case 'ArrowLeft':
        if (handlers.onArrowLeft) {
          event.preventDefault();
          handlers.onArrowLeft();
        }
        break;
      case 'ArrowRight':
        if (handlers.onArrowRight) {
          event.preventDefault();
          handlers.onArrowRight();
        }
        break;
      case 'Tab':
        if (handlers.onTab) {
          handlers.onTab(event.shiftKey);
        }
        break;
    }
  }, []);

  return {
    isKeyboardUser,
    handleKeyDown
  };
}

// Reduced motion hook
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

// High contrast mode hook
export function useHighContrast() {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHighContrast(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersHighContrast(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersHighContrast;
}