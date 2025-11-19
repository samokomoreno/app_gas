import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  options?: string[];
}

export const Input: React.FC<InputProps> = ({ label, error, options, className = '', ...props }) => {
  const dataListId = useId();

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label}
      </label>
      <input
        list={options ? dataListId : undefined}
        className={`w-full bg-gray-800 border ${error ? 'border-red-500' : 'border-gray-700'} text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors placeholder-gray-500 ${className}`}
        {...props}
      />
      {options && (
        <datalist id={dataListId}>
          {options.map((opt) => (
            <option key={opt} value={opt} />
          ))}
        </datalist>
      )}
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
};