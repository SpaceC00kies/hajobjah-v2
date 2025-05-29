
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'login';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  colorScheme?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'brandGreen';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  colorScheme = 'primary', 
  ...props
}) => {
  const baseStyle = 'font-sans font-medium rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors duration-150 ease-in-out';

  let variantStyle = '';
  switch (variant) {
    case 'primary':
      variantStyle = `bg-primary text-neutral-dark hover:bg-primary-hover focus:ring-primary
                      dark:bg-dark-primary dark:text-dark-textOnPrimaryDark dark:hover:bg-dark-primary-hover dark:focus:ring-dark-primary`;
      break;
    case 'secondary':
      variantStyle = `bg-secondary text-neutral-dark hover:bg-secondary-hover focus:ring-secondary
                      dark:bg-dark-secondary dark:text-dark-textOnSecondaryDark dark:hover:bg-dark-secondary-hover dark:focus:ring-dark-secondary`;
      break;
    case 'accent':
      variantStyle = `bg-accent text-neutral-dark hover:bg-accent-hover focus:ring-accent
                      dark:bg-dark-accent dark:text-dark-textOnAccentDark dark:hover:bg-dark-accent-hover dark:focus:ring-dark-accent`;
      break;
    case 'login': 
      variantStyle = `bg-brandGreen text-neutral-dark hover:bg-brandGreen-hover focus:ring-brandGreen
                      dark:bg-dark-brandGreen dark:text-dark-textOnBrandGreenDark dark:hover:bg-dark-brandGreen-hover dark:focus:ring-dark-brandGreen`;
      break;
    case 'outline': {
      const scheme = colorScheme;
      if (scheme === 'neutral') {
        variantStyle = `
          bg-transparent border-2
          border-neutral text-neutral-dark hover:bg-neutral hover:text-neutral-dark focus:ring-neutral
          dark:border-dark-neutral dark:text-dark-textMuted dark:hover:bg-dark-neutral-hover dark:hover:text-dark-text dark:focus:ring-dark-neutral
        `;
      } else {
        // For primary, secondary, accent, brandGreen
        let lightHoverTextColor = 'hover:text-neutral-dark'; // Default for light mode hover on colored bg
        let darkHoverTextColor = 'dark:hover:text-dark-textOnPrimaryDark'; // Default for dark primary hover

        if (scheme === 'secondary') {
          darkHoverTextColor = 'dark:hover:text-dark-textOnSecondaryDark';
        } else if (scheme === 'accent') {
          darkHoverTextColor = 'dark:hover:text-dark-textOnAccentDark';
        } else if (scheme === 'brandGreen') {
          // lightHoverTextColor remains 'hover:text-neutral-dark'
          darkHoverTextColor = 'dark:hover:text-dark-textOnBrandGreenDark';
        }
        // For 'primary', lightHoverTextColor and darkHoverTextColor use their default assignments.

        variantStyle = `
          bg-transparent border-2
          border-${scheme} text-${scheme} ${lightHoverTextColor} hover:bg-${scheme} focus:ring-${scheme}
          dark:border-dark-${scheme} dark:text-dark-${scheme} ${darkHoverTextColor} dark:hover:bg-dark-${scheme} dark:focus:ring-dark-${scheme}
        `;
      }
      break;
    }
  }

  let sizeStyle = '';
  switch (size) {
    case 'sm':
      sizeStyle = 'py-1.5 px-4 text-xs sm:py-2 sm:px-4 sm:text-sm';
      break;
    case 'md':
      sizeStyle = 'py-2.5 px-6 text-base';
      break;
    case 'lg':
      sizeStyle = 'py-3 px-6 text-lg';
      break;
  }

  return (
    <button
      className={`${baseStyle} ${variantStyle} ${sizeStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
