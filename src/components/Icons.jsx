const base = {
  width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
}

export function ChevronLeft() {
  return <svg {...base}><path d="M10 3.5 5.5 8l4.5 4.5" /></svg>
}

export function ChevronRight() {
  return <svg {...base}><path d="M6 3.5 10.5 8 6 12.5" /></svg>
}

export function Check() {
  return <svg {...base} width={12} height={12} strokeWidth={2.2}><path d="M3.5 8.5 6.5 11.5 12.5 4.5" /></svg>
}

export function Refresh() {
  return <svg {...base}><path d="M13 8a5 5 0 1 1-1.46-3.54M13.2 2.5v2.4h-2.4" /></svg>
}
