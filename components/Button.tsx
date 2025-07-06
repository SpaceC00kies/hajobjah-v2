import React from 'react';
import { motion, Transition } from 'framer-motion';

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
  const baseStyle = 'font-sans font-medium rounded-full shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-opacity-60 active:shadow-inner transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none';

  let variantStyle = '';
  switch (variant) {
    case 'primary':
      variantStyle = `bg-primary text-white hover:bg-primary-hover focus:ring-primary`;
      break;
    case 'secondary':
      variantStyle = `bg-secondary text-neutral-dark hover:bg-secondary-hover focus:ring-secondary`;
      break;
    case 'accent':
      variantStyle = `bg-accent text-white hover:bg-accent focus:ring-accent`;
      break;
    case 'login': // Alias for brandGreen
      variantStyle = `bg-brandGreen text-white hover:bg-brandGreen focus:ring-brandGreen`;
      break;
    case 'outline': {
      const scheme = colorScheme;
      if (scheme === 'neutral') {
        variantStyle = `
          bg-transparent border
          border-neutral-dark/30 text-neutral-dark hover:bg-neutral-dark/5 hover:border-neutral-dark/50 focus:ring-neutral-dark
        `;
      } else if (scheme === 'brandGreen') {
        variantStyle = `
          bg-transparent border
          border-brandGreen text-brandGreen-text hover:bg-brandGreen hover:text-white focus:ring-brandGreen
        `;
      } else if (scheme === 'secondary') {
        variantStyle = `
          bg-transparent border
          border-secondary text-neutral-dark hover:bg-secondary-hover hover:text-white focus:ring-secondary
        `;
      } else { // primary, accent
        variantStyle = `
          bg-primary-light border border-primary text-primary-dark
          hover:bg-primary-hover hover:text-white focus:ring-primary
        `;
      }
      break;
    }
  }

  let sizeStyle = '';
  switch (size) {
    case 'sm':
      sizeStyle = 'py-1.5 px-4 text-xs';
      break;
    case 'md':
      sizeStyle = 'py-2.5 px-6 text-sm';
      break;
    case 'lg':
      sizeStyle = 'py-3 px-8 text-base';
      break;
  }

  const finalClassName = [baseStyle, variantStyle, sizeStyle, passedClassName]
    .filter(Boolean)
    .join(' ');

  return (
    <motion.button
      className={finalClassName}
      whileHover={{ scale: 1.03, y: -1, transition: { duration: 0.2, ease: "easeOut" } }}
      whileTap={{ scale: 0.97, y: 0, transition: { duration: 0.1, ease: "easeOut" } }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      {...restProps}
    >
      {children}
    </motion.button>
  );
};
