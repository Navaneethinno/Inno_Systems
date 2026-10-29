// Small stroke icons used inside the shared UI components (row actions,
// buttons, empty states). 20×20 grid, drawn in currentColor.
const PATHS = {
  plus: <path d="M10 4.5v11M4.5 10h11" />,
  edit: (
    <>
      <path d="M11.8 4.7 15.3 8.2" />
      <path d="M4 16l.7-3.2 8.6-8.6a1.6 1.6 0 0 1 2.3 0l.2.2a1.6 1.6 0 0 1 0 2.3l-8.6 8.6L4 16Z" />
    </>
  ),
  trash: (
    <>
      <path d="M4 6h12M8 6V4.5h4V6" />
      <path d="M5.5 6l.7 9.2a1.5 1.5 0 0 0 1.5 1.3h4.6a1.5 1.5 0 0 0 1.5-1.3l.7-9.2" />
      <path d="M8.5 9v4.5M11.5 9v4.5" />
    </>
  ),
  expand: <path d="M12 3.5h4.5V8M8 16.5H3.5V12M16.5 3.5 11.5 8.5M3.5 16.5l5-5" />,
  refresh: (
    <>
      <path d="M16 10a6 6 0 1 1-1.8-4.3" />
      <path d="M16 3.5v3.7h-3.7" />
    </>
  ),
  search: (
    <>
      <circle cx="9" cy="9" r="5.5" />
      <path d="m16.5 16.5-3.6-3.6" />
    </>
  ),
  close: <path d="M5 5l10 10M15 5 5 15" />,
  inbox: (
    <>
      <path d="M3 11h4l1 2h4l1-2h4" />
      <path d="M5 4.5h10l2 6.5v4a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15v-4l2-6.5Z" />
    </>
  ),
  chevronLeft: <path d="m12 5-5 5 5 5" />,
  chevronRight: <path d="m8 5 5 5-5 5" />,
  arrowRight: <path d="M4 10h12M11 5l5 5-5 5" />,
  filter: <path d="M3.5 5h13M6 10h8M8.5 15h3" />,
  alert: (
    <>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 6v4.5M10 13.5v.01" />
    </>
  ),
  check: <path d="m5 10.5 3.2 3.2L15 6.5" />,
};

export function Glyph({ name, size = 16, className = "", strokeWidth = 1.7 }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
