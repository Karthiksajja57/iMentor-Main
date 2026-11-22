// src/components/core/Button.jsx
import React from 'react';
import { Loader2 } from 'lucide-react'; // For loading spinner

const Button = ({
    children,
    onClick,
    type = 'button',
    variant = 'primary', // 'primary', 'secondary', 'danger', 'outline', 'ghost'
    size = 'md', // 'sm', 'md', 'lg'
    leftIcon,
    rightIcon,
    isLoading = false,
    disabled = false,
    fullWidth = false,
    className = '',
    ...props
}) => {
    const baseStyles = "font-semibold rounded-xl focus:outline-none transition-all duration-150 ease-in-out flex items-center justify-center gap-2";

    const variantStyles = {
        primary: "bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:opacity-95 text-white shadow-md shadow-indigo-500/25 active:scale-98",
        secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 active:scale-98",
        danger: "bg-red-500 hover:bg-red-600 text-white focus:ring-red-500 active:scale-98",
        outline: "border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 active:scale-98",
        ghost: "text-slate-300 hover:text-white hover:bg-white/10 active:scale-98",
        monochrome: "bg-white hover:bg-slate-100 text-black shadow-md active:scale-98",
        'monochrome-outline': "border border-white/20 text-white hover:bg-white/10 active:scale-98",
    };

    const sizeStyles = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
    };

    const widthStyle = fullWidth ? "w-full" : "";
    const isDisabled = disabled || isLoading;
    const finalDisabledStyle = isDisabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer";

    const spinnerSize = size === 'sm' ? 14 : (size === 'lg' ? 20 : 16);

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={isDisabled} // Use the corrected variable
            className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${finalDisabledStyle} ${className}`}
            {...props}
        >
            {isLoading && (
                <Loader2 size={spinnerSize} className="animate-spin" />
            )}
            {!isLoading && leftIcon && <span className="icon-left">{leftIcon}</span>}

            <span className={isLoading ? 'ml-2' : ''}>{children}</span>

            {!isLoading && rightIcon && <span className="icon-right">{rightIcon}</span>}
        </button>
    );
};

export default Button;