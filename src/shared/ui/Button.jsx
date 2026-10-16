export default function Button({
  as: Component = 'button',
  variant = 'secondary',
  size = 'md',
  iconOnly = false,
  className = '',
  children,
  type,
  ...props
}) {
  const classes = [
    'go-btn',
    variant === 'primary' ? 'go-btn--primary' : '',
    variant === 'danger' ? 'go-btn--danger' : '',
    variant === 'ghost' ? 'go-btn--ghost' : '',
    size === 'sm' ? 'go-btn--sm' : '',
    iconOnly ? 'go-btn--icon' : '',
    className,
  ].filter(Boolean).join(' ');

  const componentProps = Component === 'button' ? { type: type || 'button', ...props } : props;
  return <Component className={classes} {...componentProps}>{children}</Component>;
}
