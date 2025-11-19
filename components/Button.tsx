import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading = false, 
  className = '', 
  disabled, 
  ...props 
}) => {
  const baseStyles = "w-full py-3 px-6 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/50 focus:ring-blue-500",
    secondary: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50 focus:ring-emerald-500",
    outline: "border-2 border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white bg-transparent focus:ring-gray-500",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className} ${(disabled || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Procesando...</span>
        </>
      ) : children}
    </button>
  );
};