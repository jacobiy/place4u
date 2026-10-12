import React from "react";
import { Loader2 } from "lucide-react";

/**
 * Loading component for displaying a consistent, accessible loading state
 * across all Place4U views and asynchronous flows.
 *
 * @param {Object} props
 * @param {string} [props.message] - Main loading text (defaults to 'Loading...')
 * @param {string} [props.text] - Alias for message
 * @param {string} [props.subtext] - Optional helper/secondary description
 * @param {boolean} [props.fullScreen=false] - Whether to render full viewport height
 * @param {'sm'|'md'|'lg'|'xl'} [props.size='md'] - Spinner & text size
 * @param {'primary'|'minimal'|'inline'} [props.variant='primary'] - Visual variation
 * @param {string} [props.className=''] - Custom container classes
 * @param {React.ReactNode} [props.children] - Custom children/message
 */
export default function Loading({
  message,
  text,
  subtext,
  fullScreen = false,
  size = "md",
  variant = "primary",
  className = "",
  children,
  ...rest
}) {
  const displayText = children || message || text || "Loading...";

  const sizeConfig = {
    sm: {
      spinner: 18,
      container: "py-3 gap-2",
      text: "text-xs",
      subtext: "text-[11px]",
    },
    md: {
      spinner: 28,
      container: "py-6 gap-3",
      text: "text-sm",
      subtext: "text-xs",
    },
    lg: {
      spinner: 40,
      container: "py-10 gap-4",
      text: "text-base",
      subtext: "text-xs",
    },
    xl: {
      spinner: 52,
      container: "py-16 gap-5",
      text: "text-lg",
      subtext: "text-sm",
    },
  }[size] || {
    spinner: 28,
    container: "py-6 gap-3",
    text: "text-sm",
    subtext: "text-xs",
  };

  if (variant === "inline") {
    return (
      <span
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-2 text-slate-400 font-medium ${sizeConfig.text} ${className}`}
        {...rest}
      >
        <Loader2
          size={sizeConfig.spinner}
          className="animate-spin text-blue-500 shrink-0"
          aria-hidden="true"
        />
        {displayText && <span>{displayText}</span>}
      </span>
    );
  }

  const containerClasses = [
    "flex flex-col items-center justify-center text-center select-none",
    fullScreen ? "min-h-screen w-full bg-slate-950 p-6" : sizeConfig.container,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      role="status"
      aria-live="polite"
      className={containerClasses}
      {...rest}
    >
      <div className="relative flex items-center justify-center">
        {/* Subtle glowing ambient pulse */}
        <div
          className="absolute rounded-full bg-blue-500/20 blur-md animate-pulse"
          style={{
            width: sizeConfig.spinner + 16,
            height: sizeConfig.spinner + 16,
          }}
          aria-hidden="true"
        />

        {/* Primary Spinner */}
        <Loader2
          size={sizeConfig.spinner}
          className="animate-spin text-blue-500 relative z-10"
          aria-hidden="true"
        />
      </div>

      {displayText && (
        <p
          className={`font-medium text-slate-300 tracking-wide transition-opacity ${sizeConfig.text}`}
        >
          {displayText}
        </p>
      )}

      {subtext && (
        <p className={`text-slate-500 max-w-sm ${sizeConfig.subtext}`}>
          {subtext}
        </p>
      )}

      {/* Screen reader fallback */}
      <span className="sr-only">Loading content, please wait...</span>
    </div>
  );
}

// Named export for flexible import syntaxes
export { Loading };
