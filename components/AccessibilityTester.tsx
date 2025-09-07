/**
 * WCAG 2.2 Accessibility Testing Component
 * Development tool for testing and validating accessibility compliance
 */

import React, { useState, useEffect } from 'react';
import { 
  performWCAGAudit, 
  checkWCAGCompliance, 
  WCAG_COMPLIANT_COLORS,
  simulateColorBlindness,
  type AccessibilityAuditResult 
} from '../utils/wcagAccessibilityUtils';

interface AccessibilityTesterProps {
  enabled?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const AccessibilityTester: React.FC<AccessibilityTesterProps> = ({ 
  enabled = process.env.NODE_ENV === 'development',
  position = 'bottom-right'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [auditResults, setAuditResults] = useState<ReturnType<typeof performWCAGAudit> | null>(null);
  const [colorBlindnessMode, setColorBlindnessMode] = useState<'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'>('none');
  const [contrastMode, setContrastMode] = useState<'normal' | 'high'>('normal');

  // Don't render in production unless explicitly enabled
  if (!enabled) return null;

  const runAudit = () => {
    const results = performWCAGAudit();
    setAuditResults(results);
  };

  const toggleColorBlindness = (type: typeof colorBlindnessMode) => {
    setColorBlindnessMode(type);
    
    if (type === 'none') {
      document.documentElement.style.filter = '';
    } else {
      // Apply CSS filter for color blindness simulation
      const filters = {
        protanopia: 'url("data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGZpbHRlciBpZD0icHJvdGFub3BpYSI+PGZlQ29sb3JNYXRyaXggdmFsdWVzPSIwLjU2NyAwLjQzMyAwIDAgMCAwLjU1OCAwLjQ0MiAwIDAgMCAwIDAgMC4yNDIgMC43NTggMCAwIDAgMSAwIi8+PC9maWx0ZXI+PC9kZWZzPjwvc3ZnPiMjcHJvdGFub3BpYSI=)',
        deuteranopia: 'url("data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGZpbHRlciBpZD0iZGV1dGVyYW5vcGlhIj48ZmVDb2xvck1hdHJpeCB2YWx1ZXM9IjAuNjI1IDAuMzc1IDAgMCAwIDAuNyAwLjMgMCAwIDAgMCAwLjMgMC43IDAgMCAwIDAgMCAxIDAiLz48L2ZpbHRlcj48L2RlZnM+PC9zdmc+IyNkZXV0ZXJhbm9waWE=)',
        tritanopia: 'url("data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGZpbHRlciBpZD0idHJpdGFub3BpYSI+PGZlQ29sb3JNYXRyaXggdmFsdWVzPSIwLjk1IDAuMDUgMCAwIDAgMCAwLjQzMyAwLjU2NyAwIDAgMCAwLjQ3NSAwLjUyNSAwIDAgMCAwIDAgMSAwIi8+PC9maWx0ZXI+PC9kZWZzPjwvc3ZnPiMjdHJpdGFub3BpYQ==")'
      };
      document.documentElement.style.filter = filters[type];
    }
  };

  const toggleHighContrast = () => {
    const newMode = contrastMode === 'normal' ? 'high' : 'normal';
    setContrastMode(newMode);
    
    if (newMode === 'high') {
      document.documentElement.classList.add('high-contrast-mode');
    } else {
      document.documentElement.classList.remove('high-contrast-mode');
    }
  };

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-[9999] font-sans`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        aria-label="Toggle Accessibility Tester"
        title="Accessibility Testing Tools"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 7.5V9M15 10.5V19L13.5 17.5V14.5L10.5 17.5V22H9V18L12 15L9 12V9C9 8.45 9.45 8 10 8H14C14.55 8 15 8.45 15 9V10.5Z"/>
        </svg>
      </button>

      {/* Testing Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-4 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Accessibility Tester</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded p-1"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          {/* Color Blindness Simulation */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Color Blindness Simulation</h4>
            <div className="space-y-2">
              {[
                { value: 'none', label: 'Normal Vision' },
                { value: 'protanopia', label: 'Protanopia (Red-blind)' },
                { value: 'deuteranopia', label: 'Deuteranopia (Green-blind)' },
                { value: 'tritanopia', label: 'Tritanopia (Blue-blind)' }
              ].map(option => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="radio"
                    name="colorBlindness"
                    value={option.value}
                    checked={colorBlindnessMode === option.value}
                    onChange={(e) => toggleColorBlindness(e.target.value as typeof colorBlindnessMode)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Contrast Mode */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Contrast Mode</h4>
            <button
              onClick={toggleHighContrast}
              className={`px-3 py-1 text-sm rounded ${
                contrastMode === 'high' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {contrastMode === 'high' ? 'High Contrast ON' : 'High Contrast OFF'}
            </button>
          </div>

          {/* Audit Tools */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Audit Tools</h4>
            <button
              onClick={runAudit}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Run WCAG Audit
            </button>
          </div>

          {/* Audit Results */}
          {auditResults && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Audit Results</h4>
              
              {/* Touch Targets */}
              <div className="mb-3">
                <h5 className="text-xs font-medium text-gray-600 mb-1">Touch Targets</h5>
                <div className="text-xs text-gray-500">
                  {auditResults.touchTargets.filter(t => !t.compliant).length} non-compliant targets
                </div>
                {auditResults.touchTargets.filter(t => !t.compliant).slice(0, 3).map((target, index) => (
                  <div key={index} className="text-xs text-red-600 ml-2">
                    • {target.width}×{target.height}px (min: 44×44px)
                  </div>
                ))}
              </div>

              {/* ARIA Issues */}
              <div className="mb-3">
                <h5 className="text-xs font-medium text-gray-600 mb-1">ARIA Issues</h5>
                {auditResults.ariaIssues.length === 0 ? (
                  <div className="text-xs text-green-600">No issues found</div>
                ) : (
                  auditResults.ariaIssues.map((issue, index) => (
                    <div key={index} className="text-xs text-red-600">
                      • {issue}
                    </div>
                  ))
                )}
              </div>

              {/* Focusable Elements */}
              <div>
                <h5 className="text-xs font-medium text-gray-600 mb-1">Focusable Elements</h5>
                <div className="text-xs text-gray-500">
                  {auditResults.focusableElements.length} elements found
                </div>
              </div>
            </div>
          )}

          {/* Color Palette Reference */}
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">WCAG Compliant Colors</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="font-medium text-gray-600 mb-1">Primary</div>
                <div className="flex items-center gap-1">
                  <div 
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: WCAG_COMPLIANT_COLORS.primary.blue }}
                  ></div>
                  <span>AA</span>
                </div>
                <div className="flex items-center gap-1">
                  <div 
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: WCAG_COMPLIANT_COLORS.primary.blueDark }}
                  ></div>
                  <span>AAA</span>
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-600 mb-1">Status</div>
                <div className="flex items-center gap-1">
                  <div 
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: WCAG_COMPLIANT_COLORS.semantic.success }}
                  ></div>
                  <span>Success</span>
                </div>
                <div className="flex items-center gap-1">
                  <div 
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: WCAG_COMPLIANT_COLORS.semantic.error }}
                  ></div>
                  <span>Error</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* High Contrast Mode Styles */}
      <style jsx>{`
        .high-contrast-mode {
          filter: contrast(150%) brightness(120%);
        }
        
        .high-contrast-mode * {
          text-shadow: none !important;
          box-shadow: none !important;
        }
        
        .high-contrast-mode button,
        .high-contrast-mode input,
        .high-contrast-mode select,
        .high-contrast-mode textarea {
          border: 2px solid #000 !important;
        }
        
        .high-contrast-mode a {
          text-decoration: underline !important;
        }
      `}</style>
    </div>
  );
};

// Color Contrast Checker Component
interface ColorContrastCheckerProps {
  foreground: string;
  background: string;
  text?: string;
  isLargeText?: boolean;
}

export const ColorContrastChecker: React.FC<ColorContrastCheckerProps> = ({
  foreground,
  background,
  text = "Sample Text",
  isLargeText = false
}) => {
  const compliance = checkWCAGCompliance(foreground, background, isLargeText);
  
  return (
    <div className="border rounded-lg p-4 m-2">
      <div 
        className="p-4 rounded mb-2"
        style={{ 
          color: foreground, 
          backgroundColor: background,
          fontSize: isLargeText ? '18px' : '16px',
          fontWeight: isLargeText ? 'bold' : 'normal'
        }}
      >
        {text}
      </div>
      <div className="text-sm space-y-1">
        <div>Contrast Ratio: <strong>{compliance.ratio}:1</strong></div>
        <div className="flex gap-4">
          <span className={`px-2 py-1 rounded text-xs ${
            compliance.AA ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            AA: {compliance.AA ? 'Pass' : 'Fail'}
          </span>
          <span className={`px-2 py-1 rounded text-xs ${
            compliance.AAA ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            AAA: {compliance.AAA ? 'Pass' : 'Fail'}
          </span>
        </div>
        <div className="text-xs text-gray-600">
          Level: <strong>{compliance.level}</strong>
          {isLargeText && ' (Large Text)'}
        </div>
      </div>
    </div>
  );
};

export default AccessibilityTester;