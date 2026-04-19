import { forwardRef } from "react";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

type Variant = "primary" | "secondary" | "tertiary" | "destructive";
type Size = "sm" | "md" | "lg";
type Tone = "light" | "dark";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  tone?: Tone;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  loading?: boolean;
  children: ReactNode;
}

type ButtonProps = CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { as?: "button" };
type LinkProps = CommonProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "href"> & { as: "link"; to: string; state?: unknown };
type AnchorProps = CommonProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children"> & { as: "a"; href: string };

type Props = ButtonProps | LinkProps | AnchorProps;

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5 rounded-lg",
  md: "h-11 px-5 text-sm gap-2 rounded-lg",
  lg: "h-12 px-6 text-[15px] gap-2 rounded-xl",
};

function variantClasses(variant: Variant, tone: Tone): string {
  if (tone === "light") {
    switch (variant) {
      case "primary":
        return "bg-white text-primary hover:bg-white/95 active:bg-white/90 shadow-sm";
      case "secondary":
        return "border border-white/30 bg-white/5 text-white hover:bg-white/12 hover:border-white/55 active:bg-white/16";
      case "tertiary":
        return "text-white/80 hover:text-white hover:bg-white/8";
      case "destructive":
        return "bg-destructive text-white hover:bg-destructive/90 active:bg-destructive/95";
    }
  }
  switch (variant) {
    case "primary":
      return "bg-primary text-white hover:bg-primary-light active:bg-primary/95 shadow-sm";
    case "secondary":
      return "border border-border bg-bg-card text-foreground hover:bg-foreground/[0.04] hover:border-foreground/30 active:bg-foreground/[0.06]";
    case "tertiary":
      return "text-foreground/85 hover:text-foreground hover:bg-foreground/[0.04]";
    case "destructive":
      return "bg-destructive text-white hover:bg-destructive/90 active:bg-destructive/95";
  }
}

function buildClassName(
  variant: Variant,
  size: Size,
  tone: Tone,
  fullWidth: boolean,
  disabled: boolean,
  className?: string,
): string {
  return [
    "inline-flex items-center justify-center font-medium transition-colors select-none",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
    tone === "light" ? "focus-visible:ring-offset-primary" : "focus-visible:ring-offset-white",
    SIZES[size],
    variantClasses(variant, tone),
    fullWidth ? "w-full" : "",
    disabled ? "opacity-60 cursor-not-allowed pointer-events-none" : "",
    className ?? "",
  ].filter(Boolean).join(" ");
}

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, Props>((props, ref) => {
  const {
    variant = "primary",
    size = "md",
    tone = "dark",
    fullWidth = false,
    leadingIcon,
    trailingIcon,
    loading = false,
    children,
    className,
    ...rest
  } = props as CommonProps & { className?: string; as?: "button" | "link" | "a" };

  const disabled = loading || ("disabled" in rest && (rest as { disabled?: boolean }).disabled === true);
  const cls = buildClassName(variant, size, tone, fullWidth, disabled, className);

  const inner = (
    <>
      {leadingIcon && <span className="shrink-0 inline-flex" aria-hidden="true">{leadingIcon}</span>}
      <span>{children}</span>
      {trailingIcon && <span className="shrink-0 inline-flex" aria-hidden="true">{trailingIcon}</span>}
    </>
  );

  if (props.as === "link") {
    const { to, state, ...linkRest } = rest as { to: string; state?: unknown } & AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <Link ref={ref as React.Ref<HTMLAnchorElement>} to={to} state={state} className={cls} {...linkRest}>
        {inner}
      </Link>
    );
  }

  if (props.as === "a") {
    return (
      <a ref={ref as React.Ref<HTMLAnchorElement>} className={cls} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {inner}
      </a>
    );
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type="button"
      className={cls}
      disabled={disabled}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {inner}
    </button>
  );
});

Button.displayName = "Button";

export default Button;
