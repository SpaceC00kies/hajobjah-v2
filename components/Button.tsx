

import React from 'react';

// Define own props for the Button
interface ButtonOwnProps {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'login' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  colorScheme?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'brandGreen';
}

// Combine own props with all valid props for a standard HTML button
type ButtonProps = ButtonOwnProps & React.ComponentProps<'button'>;

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  colorScheme = 'primary',
  className: passedClassName,
  type = 'button', // Default type to 'button'
  ...restProps 
}) => {
  const baseStyle = `inline-flex items-center justify-center font-sans font-medium rounded-full active:shadow-inner transition-[background-color,box-shadow,opacity,transform] duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none relative`;

  let variantStyle = '';
  switch (variant) {
    case 'primary':
      variantStyle = `bg-primary text-white hover:bg-primary-dark focus:ring-primary disabled:bg-primary-dark`;
      break;
    case 'secondary':
      variantStyle = `bg-secondary text-primary-dark hover:bg-secondary-hover focus:ring-secondary disabled:bg-secondary-hover`;
      break;
    case 'accent':
      variantStyle = `bg-accent text-white hover:bg-accent focus:ring-accent`;
      break;
    case 'login': // Alias for brandGreen
      variantStyle = `bg-brandGreen text-white hover:bg-brandGreen focus:ring-brandGreen`;
      break;
    case 'ghost':
      variantStyle = `bg-transparent hover:bg-neutral-light/50 text-neutral-dark focus:ring-neutral-dark disabled:bg-neutral-light/50`;
      break;
    case 'icon':
      variantStyle = 'bg-transparent hover:bg-transparent';
      break;
    case 'outline': {
      const scheme = colorScheme;
      if (scheme === 'neutral') {
        variantStyle = `
          bg-transparent border
          border-neutral-dark/30 text-neutral-dark hover:bg-neutral-dark/5 hover:border-neutral-dark/50 focus:ring-neutral-dark disabled:bg-neutral-dark/5
        `;
      } else if (scheme === 'brandGreen') {
        variantStyle = `
          bg-transparent border
          border-brandGreen text-brandGreen-text hover:bg-brandGreen hover:text-white focus:ring-brandGreen disabled:bg-brandGreen disabled:text-white
        `;
      } else if (scheme === 'secondary') {
        variantStyle = `
          bg-transparent border
          border-secondary text-neutral-dark hover:bg-secondary-hover hover:text-white focus:ring-secondary disabled:bg-secondary-hover disabled:text-white
        `;
      } else { // primary, accent
        variantStyle = `
          bg-primary-light border border-primary text-primary-dark
          hover:bg-primary-hover hover:text-white focus:ring-primary disabled:bg-primary-hover disabled:text-white
        `;
      }
      break;
    }
  }

  let sizeStyle = '';
  if (variant === 'icon') {
    switch (size) {
      case 'sm':
        sizeStyle = 'p-1.5 text-base';
        break;
      case 'md':
        sizeStyle = 'p-2.5 text-lg';
        break;
      case 'lg':
        sizeStyle = 'p-3 text-xl';
        break;
    }
  } else {
    switch (size) {
      case 'sm':
        sizeStyle = 'py-1 px-3 text-xs';
        break;
      case 'md':
        sizeStyle = 'py-2.5 px-6 text-sm';
        break;
      case 'lg':
        sizeStyle = 'py-3 px-8 text-base';
        break;
    }
  }
  
  const interactiveStyles = (variant !== 'icon' && variant !== 'outline')
    ? 'shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-opacity-60'
    : 'shadow-none focus:outline-none focus:ring-0 focus:ring-offset-0';


  const finalClassName = [
    baseStyle, 
    variantStyle, 
    sizeStyle,
    interactiveStyles,
    passedClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={finalClassName}
      type={type}
      {...restProps}
    >
        {children}
    </button>
  );
};