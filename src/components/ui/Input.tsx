import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  fullWidth = true,
  className = '',
  ...props
}) => {
  return (
    <div className={`form-group ${fullWidth ? 'w-full' : ''}`}>
      {label && <label>{label}</label>}
      <div className="input-wrapper">
        {icon && <span className="input-icon">{icon}</span>}
        <input
          className={`
            ${icon ? 'pl-10' : ''} 
            ${error ? 'input-error' : ''} 
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <span className="error-text">{error}</span>}
    </div>
  );
};