"use client";
import React from "react";

export const Card: React.FC<
  React.PropsWithChildren<{ className?: string }>
> = ({ children, className = "" }) => (
  <div
    className={`bg-white dark:bg-neutral-900 rounded-lg shadow p-4 ${className}`}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<
  React.PropsWithChildren<{ className?: string }>
> = ({ children, className = "" }) => (
  <div className={`mb-2 ${className}`}>{children}</div>
);

export const CardTitle: React.FC<
  React.PropsWithChildren<{ className?: string }>
> = ({ children, className = "" }) => (
  <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>
);

export const CardContent: React.FC<
  React.PropsWithChildren<{ className?: string }>
> = ({ children, className = "" }) => (
  <div className={`text-sm ${className}`}>{children}</div>
);

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ children, className = "", ...rest }) => (
  <button
    className={`inline-flex items-center px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded ${className}`}
    {...rest}
  >
    {children}
  </button>
);

export const Textarea: React.FC<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
> = ({ className = "", ...rest }) => (
  <textarea className={`w-full border rounded p-2 ${className}`} {...rest} />
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className = "",
  ...rest
}) => <input className={`w-full border rounded p-2 ${className}`} {...rest} />;

export const Label: React.FC<
  React.PropsWithChildren<{ className?: string }>
> = ({ children, className = "" }) => (
  <label className={`block text-sm font-medium mb-1 ${className}`}>
    {children}
  </label>
);
