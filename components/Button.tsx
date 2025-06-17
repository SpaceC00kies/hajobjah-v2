
import React from 'react';
import { motion, type Transition } from 'framer-motion';

// Define own props for the Button
interface ButtonOwnProps {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'login';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  colorScheme?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'brandGreen';
}

// Combine own props with all valid props for motion.button
// This includes event handlers like onClick, attributes like type, disabled, className, and motion props.
type ButtonProps = ButtonOwnProps & React.ComponentProps<typeof motion.button>;

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  colorScheme = 'primary',
  className: passedClassName, // Capture the passed className, it will be undefined if not passed
  ...restProps // Captures onClick, type, disabled, motion props etc.
}) => {
  const baseStyle = 'font-sans font-medium rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-50 active:shadow-sm';

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
        let lightHoverTextColor = 'hover:text-neutral-dark';
        let darkHoverTextColor = 'dark:hover:text-dark-textOnPrimaryDark';

        if (scheme === 'secondary') {
          darkHoverTextColor = 'dark:hover:text-dark-textOnSecondaryDark';
        } else if (scheme === 'accent') {
          darkHoverTextColor = 'dark:hover:text-dark-textOnAccentDark';
        } else if (scheme === 'brandGreen') {
          darkHoverTextColor = 'dark:hover:text-dark-textOnBrandGreenDark';
        }
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
      sizeStyle = 'py-2 px-4 text-sm sm:py-2.5 sm:px-6 sm:text-base';
      break;
    case 'lg':
      sizeStyle = 'py-3 px-6 text-lg';
      break;
  }

  // Combine base, variant, size, and any passed className
  const finalClassName = [baseStyle, variantStyle, sizeStyle, passedClassName]
    .filter(Boolean) // Remove any empty strings (e.g., if passedClassName is undefined)
    .join(' ');

  return (
    <motion.button
      className={finalClassName}
      whileHover={{ scale: 1.03, transition: { duration: 0.15, ease: "easeOut" } as Transition }}
      whileTap={{ scale: 0.97, y: 1, transition: { duration: 0.1, ease: "easeOut" } as Transition }}
      transition={{ duration: 0.15, ease: "easeOut" } as Transition}
      {...restProps} // Spread other props like onClick, type, disabled, and motion-specific props
    >
      {children}
    </motion.button>
  );
};
