import React from 'react';

interface LogoProps {
  className?: string;
  isAnimated?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'static' | 'minimal' | 'icon';
}

const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  isAnimated = true, 
  size = 'md',
  variant = 'full'
}) => {
  // Determine logo variant based on screen size and preferences
  const getLogoSrc = () => {
    if (variant === 'icon') {
      return '/assets/logo-vasukii-icon.svg';
    }
    
    if (variant === 'minimal') {
      return '/assets/logo-vasukii-infinity-minimal.svg';
    }
    
    if (variant === 'static') {
      return '/assets/logo-vasukii-infinity-static.svg';
    }
    
    // Default to full animated version
    return '/assets/finallogo.png';
  };

  // Size classes
  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-12 w-12 sm:h-14 sm:w-14',
    lg: 'h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20',
    xl: 'h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24'
  };

  // Animation classes
  const animationClasses = isAnimated ? 'logo-hover' : '';

  return (
    <img 
      src={getLogoSrc()}
      alt="Vasukii Logo" 
      className={`${sizeClasses[size]} ${animationClasses} ${className}`}
      onError={(e) => {
        // Fallback to static version if animated fails
        if (isAnimated && variant === 'full') {
          e.currentTarget.src = '/assets/logo-vasukii-infinity-static.svg';
        }
      }}
    />
  );
};

export default Logo;