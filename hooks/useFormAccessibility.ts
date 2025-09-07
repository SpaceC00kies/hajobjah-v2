import React, { useCallback, useRef } from 'react';

interface FormError {
  field: string;
  message: string;
}

interface UseFormAccessibilityOptions {
  onValidationError?: (errors: FormError[]) => void;
  focusFirstError?: boolean;
}

export const useFormAccessibility = (options: UseFormAccessibilityOptions = {}) => {
  const { onValidationError, focusFirstError = true } = options;
  const errorAnnouncementRef = useRef<HTMLDivElement>(null);

  // Focus management for validation errors
  const focusFirstErrorField = useCallback((errors: Record<string, string>) => {
    if (!focusFirstError) return;

    const firstErrorField = Object.keys(errors)[0];
    if (firstErrorField) {
      const element = document.getElementById(firstErrorField);
      if (element) {
        element.focus();
        // Scroll into view if needed
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [focusFirstError]);

  // Announce errors to screen readers
  const announceErrors = useCallback((errors: Record<string, string>) => {
    const errorMessages = Object.values(errors);
    if (errorMessages.length > 0 && errorAnnouncementRef.current) {
      const announcement = `Form validation errors: ${errorMessages.join('. ')}`;
      errorAnnouncementRef.current.textContent = announcement;
      
      // Clear announcement after a delay to allow re-announcement if needed
      setTimeout(() => {
        if (errorAnnouncementRef.current) {
          errorAnnouncementRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  // Enhanced validation handler
  const handleValidationErrors = useCallback((errors: Record<string, string>) => {
    if (Object.keys(errors).length > 0) {
      focusFirstErrorField(errors);
      announceErrors(errors);
      
      if (onValidationError) {
        const formErrors = Object.entries(errors).map(([field, message]) => ({
          field,
          message
        }));
        onValidationError(formErrors);
      }
    }
  }, [focusFirstErrorField, announceErrors, onValidationError]);

  // Generate accessibility props for form inputs
  const getInputProps = useCallback((
    fieldName: string,
    hasError: boolean,
    errorMessage?: string,
    helperText?: string
  ) => {
    const props: Record<string, any> = {
      id: fieldName,
      'aria-invalid': hasError ? 'true' : 'false',
    };

    // Connect to error message or helper text
    if (hasError && errorMessage) {
      props['aria-describedby'] = `${fieldName}-error`;
    } else if (helperText) {
      props['aria-describedby'] = `${fieldName}-helper`;
    }

    return props;
  }, []);

  // Generate accessibility props for labels
  const getLabelProps = useCallback((fieldName: string, required: boolean = false) => ({
    htmlFor: fieldName,
    className: required ? 'form-label required' : 'form-label'
  }), []);

  // Generate accessibility props for error messages
  const getErrorProps = useCallback((fieldName: string) => ({
    id: `${fieldName}-error`,
    role: 'alert' as const,
    'aria-live': 'polite' as const,
    className: 'form-error'
  }), []);

  // Generate accessibility props for helper text
  const getHelperProps = useCallback((fieldName: string) => ({
    id: `${fieldName}-helper`,
    className: 'form-helper-text'
  }), []);

  // Screen reader announcement element
  const ErrorAnnouncement: React.FC = () => {
    return React.createElement('div', {
      ref: errorAnnouncementRef,
      role: 'alert' as const,
      'aria-live': 'assertive' as const,
      className: 'sr-only',
      'aria-atomic': 'true' as const
    });
  };

  return {
    handleValidationErrors,
    getInputProps,
    getLabelProps,
    getErrorProps,
    getHelperProps,
    ErrorAnnouncement,
    focusFirstErrorField,
    announceErrors
  };
};

// Utility function to validate form accessibility
export const validateFormAccessibility = (formElement: HTMLFormElement): string[] => {
  const issues: string[] = [];
  
  // Check for inputs without labels
  const inputs = formElement.querySelectorAll('input, select, textarea');
  inputs.forEach((input) => {
    const id = input.getAttribute('id');
    if (!id) {
      issues.push(`Input element missing ID attribute`);
      return;
    }
    
    const label = formElement.querySelector(`label[for="${id}"]`);
    if (!label) {
      issues.push(`Input with ID "${id}" missing associated label`);
    }
  });
  
  // Check for error messages without proper ARIA
  const errorMessages = formElement.querySelectorAll('.form-error');
  errorMessages.forEach((error) => {
    if (!error.getAttribute('role') || !error.getAttribute('id')) {
      issues.push('Error message missing role="alert" or ID attribute');
    }
  });
  
  return issues;
};