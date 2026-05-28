import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: ReactNode;
  variant?: ButtonVariant;
}

export function Button({ children, className = "", icon, variant = "secondary", ...props }: ButtonProps) {
  return (
    <button className={`sf-button sf-button-${variant} ${className}`} type="button" {...props}>
      {icon ? <span className="sf-button-icon">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  icon: ReactNode;
}

export function IconButton({ className = "", icon, ...props }: IconButtonProps) {
  return (
    <button className={`sf-icon-button ${className}`} type="button" {...props}>
      {icon}
    </button>
  );
}
