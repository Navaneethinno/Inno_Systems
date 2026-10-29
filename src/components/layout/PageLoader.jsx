/** Shown while a lazily loaded page's code arrives. */
export function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-label="Loading page">
      <span className="page-loader__spinner" aria-hidden="true" />
    </div>
  );
}
