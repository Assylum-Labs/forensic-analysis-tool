"use client"

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullScreen?: boolean;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'md',
  className = '',
  fullScreen = false
}) => {
  // Map sizes to classes
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  // Calculate font size based on spinner size
  const fontSizeClass = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={`
      flex flex-col items-center justify-center
      ${fullScreen ? 'fixed inset-0 bg-background/80 backdrop-blur-sm z-50' : 'w-full h-full min-h-[100px]'}
      ${className}
    `}>
      <Loader2 className={`animate-spin text-primary mb-2 ${sizeClasses[size]}`} />
      {message && (
        <p className={`text-muted-foreground ${fontSizeClass[size]}`}>{message}</p>
      )}
    </div>
  );
};

export default LoadingState;