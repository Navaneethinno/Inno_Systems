/**
 * Shimmering placeholder blocks shown while content loads.
 * Styles live in src/styles/primitives.css (.skeleton).
 */
export function Skeleton({ width = "100%", height = 14, radius, className = "" }) {
  return <span className={`skeleton ${className}`} style={{ width, height, borderRadius: radius }} aria-hidden="true" />;
}

export function SkeletonList({ count = 3, height = 46 }) {
  return (
    <div className="skeleton-stack" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={height} />
      ))}
    </div>
  );
}
