
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
type ButtonProps = ButtonOwnProps & React.ComponentProps<typeof motion.button>;

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  colorScheme = 'primary',
  className: passedClassName,
  ...restProps 
}) => {
  const baseStyle = 'font-sans font-medium rounded-md shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-50 active:shadow-sm';

  let variantStyle = '';
  switch (variant) {
    case 'primary':
      variantStyle = `bg-primary text-neutral-dark hover:bg-primary-hover focus:ring-primary`;
      break;
    case 'secondary':
      variantStyle = `bg-secondary text-neutral-dark hover:bg-secondary-hover focus:ring-secondary`;
      break;
    case 'accent':
      variantStyle = `bg-accent text-neutral-dark hover:bg-accent-hover focus:ring-accent`;
      break;
    case 'login':
      variantStyle = `bg-brandGreen text-neutral-dark hover:bg-brandGreen-hover focus:ring-brandGreen`;
      break;
    case 'outline': {
      const scheme = colorScheme;
      if (scheme === 'neutral') {
        variantStyle = `
          bg-transparent border-2
          border-neutral text-neutral-dark hover:bg-neutral hover:text-neutral-dark focus:ring-neutral
        `;
      } else {
        let lightHoverTextColor = 'hover:text-neutral-dark';

        // Removed dark mode specific text color logic
        variantStyle = `
          bg-transparent border-2
          border-${scheme} text-${scheme} ${lightHoverTextColor} hover:bg-${scheme} focus:ring-${scheme}
        `;
      }
      break;
    }
  }

  let sizeStyle = '';
  switch (size) {
    case 'sm':
      sizeStyle = 'py-2 px-3 text-xs'; // py: 8px, px: 12px, text: 12px
      break;
    case 'md':
      sizeStyle = 'py-2 px-4 text-sm'; // py: 8px, px: 16px, text: 14px
      break;
    case 'lg':
      sizeStyle = 'py-3 px-6 text-base'; // py: 12px, px: 24px, text: 16px
      break;
  }

  const finalClassName = [baseStyle, variantStyle, sizeStyle, passedClassName]
    .filter(Boolean)
    .join(' ');

  return (
    <motion.button
      className={finalClassName}
      whileHover={{ scale: 1.03, transition: { duration: 0.15, ease: "easeOut" } as Transition }}
      whileTap={{ scale: 0.97, y: 1, transition: { duration: 0.1, ease: "easeOut" } as Transition }}
      transition={{ duration: 0.15, ease: "easeOut" } as Transition}
      {...restProps}
    >
      {children}
    </motion.button>
  );
};
