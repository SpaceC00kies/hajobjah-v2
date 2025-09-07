import React from 'react';

/**
 * Mobile Form Enhancements Component
 * 
 * This component demonstrates the enhanced mobile touch and form experience
 * implemented as part of Task 7.1: Mobile Touch & Form Experience Enhancement
 * 
 * Features:
 * - WCAG AA compliant touch targets (48px minimum)
 * - iOS zoom prevention (16px minimum font size)
 * - Enhanced spacing to prevent mis-taps
 * - Visual indicators beyond color for accessibility
 * - Improved focus states and touch feedback
 */

interface MobileFormEnhancementsProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileFormEnhancements: React.FC<MobileFormEnhancementsProps> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`mobile-form-container ${className}`}>
      {children}
    </div>
  );
};

/**
 * Enhanced Form Input with Mobile Optimizations
 */
interface EnhancedFormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  success?: boolean;
  warning?: boolean;
  required?: boolean;
}

export const EnhancedFormInput: React.FC<EnhancedFormInputProps> = ({
  label,
  error,
  helperText,
  success,
  warning,
  required,
  id,
  className = '',
  ...inputProps
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  const getInputClassName = () => {
    let baseClass = 'form-input touch-target-md';
    
    if (error) baseClass += ' error';
    if (success) baseClass += ' success';
    if (warning) baseClass += ' warning';
    
    return `${baseClass} ${className}`;
  };

  return (
    <div className="form-field-container">
      <label 
        htmlFor={inputId}
        className={`form-label ${required ? 'required' : ''}`}
      >
        {label}
        {required && <span className="status-error" aria-label="required">*</span>}
      </label>
      
      <input
        id={inputId}
        className={getInputClassName()}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={
          error ? `${inputId}-error` : 
          helperText ? `${inputId}-helper` : 
          undefined
        }
        {...inputProps}
      />
      
      {error && (
        <div 
          id={`${inputId}-error`}
          className="form-error status-error indicator-border-left"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}
      
      {helperText && !error && (
        <div 
          id={`${inputId}-helper`}
          className="form-helper-text indicator-border-left"
        >
          {helperText}
        </div>
      )}
      
      {success && !error && (
        <div className="form-success status-success">
          Input is valid
        </div>
      )}
      
      {warning && !error && (
        <div className="form-warning status-warning">
          Please review this field
        </div>
      )}
    </div>
  );
};

/**
 * Enhanced Button Group with Mobile Spacing
 */
interface EnhancedButtonGroupProps {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const EnhancedButtonGroup: React.FC<EnhancedButtonGroupProps> = ({
  children,
  orientation = 'horizontal',
  spacing = 'md',
  className = ''
}) => {
  const getGroupClassName = () => {
    let baseClass = 'button-group';
    
    if (orientation === 'vertical') {
      baseClass += ' flex flex-col';
    } else {
      baseClass += ' flex flex-row flex-wrap';
    }
    
    switch (spacing) {
      case 'sm':
        baseClass += ' gap-2';
        break;
      case 'md':
        baseClass += ' gap-4';
        break;
      case 'lg':
        baseClass += ' gap-6';
        break;
    }
    
    return `${baseClass} ${className}`;
  };

  return (
    <div className={getGroupClassName()}>
      {React.Children.map(children, (child, index) => (
        <div key={index} className="prevent-mistap">
          {child}
        </div>
      ))}
    </div>
  );
};

/**
 * Enhanced Card with Mobile Touch Optimizations
 */
interface EnhancedCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  interactive?: boolean;
  status?: 'default' | 'success' | 'warning' | 'error';
}

export const EnhancedCard: React.FC<EnhancedCardProps> = ({
  children,
  onClick,
  className = '',
  interactive = false,
  status = 'default'
}) => {
  const getCardClassName = () => {
    let baseClass = 'app-card';
    
    if (interactive || onClick) {
      baseClass += ' touch-optimized focus-enhanced touch-feedback';
    }
    
    switch (status) {
      case 'success':
        baseClass += ' border-success-green';
        break;
      case 'warning':
        baseClass += ' border-warning-yellow';
        break;
      case 'error':
        baseClass += ' border-error-red';
        break;
    }
    
    return `${baseClass} ${className}`;
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={getCardClassName()}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-pressed={onClick ? 'false' : undefined}
    >
      {status !== 'default' && (
        <div className={`card-status-indicator status-${status}`}>
          {status === 'success' && 'Success'}
          {status === 'warning' && 'Warning'}
          {status === 'error' && 'Error'}
        </div>
      )}
      {children}
    </div>
  );
};

/**
 * Mobile Touch Target Validator
 * Development utility to validate touch targets meet accessibility requirements
 */
export const TouchTargetValidator: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const validateTouchTargets = () => {
        const interactiveElements = document.querySelectorAll(
          'button, a, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])'
        );
        
        interactiveElements.forEach((element) => {
          const rect = element.getBoundingClientRect();
          const minSize = 44; // WCAG AA minimum
          
          if (rect.width < minSize || rect.height < minSize) {
            console.warn(
              `Touch target too small: ${element.tagName} (${rect.width}x${rect.height}px). ` +
              `Minimum size should be ${minSize}x${minSize}px.`,
              element
            );
          }
        });
      };
      
      // Validate after component mounts and on resize
      setTimeout(validateTouchTargets, 100);
      window.addEventListener('resize', validateTouchTargets);
      
      return () => {
        window.removeEventListener('resize', validateTouchTargets);
      };
    }
  }, []);
  
  return <>{children}</>;
};