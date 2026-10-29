import { ICONS } from "./icons";

/**
 * <Icon name="key" /> — an inline stroke icon from icons.js that takes the
 * surrounding text colour. Decorative by default; pass `label` when the
 * icon is the only thing saying what a control does.
 */
export function Icon({ name, size = 18, strokeWidth = 1.75, label, className }) {
  const shapes = ICONS[name];
  if (!shapes) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {shapes.map((shape, i) => {
        if (typeof shape === "string") return <path key={i} d={shape} />;
        if (shape.circle) {
          const [cx, cy, r] = shape.circle;
          return <circle key={i} cx={cx} cy={cy} r={r} />;
        }
        const [x, y, width, height, rx] = shape.rect;
        return <rect key={i} x={x} y={y} width={width} height={height} rx={rx} />;
      })}
    </svg>
  );
}
