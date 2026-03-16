import React from 'react';

interface BadgeProps {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'sm',
  children,
  className = ''
}) => {
  const variants = {
    primary: 'badge-blue',
    success: 'badge-green',
    warning: 'badge-orange',
    danger: 'badge-red',
    neutral: 'badge-neutral'
  };

  const sizes = {
    sm: 'badge-sm',
    md: 'badge-md'
  };

  return (
    <span className={`badge ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
};