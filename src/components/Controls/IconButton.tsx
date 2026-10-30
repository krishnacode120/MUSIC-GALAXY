import type { ButtonHTMLAttributes, ReactNode } from 'react';
export function IconButton({
  label,
  children,
  active = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <button
      {...props}
      type="button"
      className={`icon-button ${active ? 'active' : ''} ${props.className ?? ''}`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
