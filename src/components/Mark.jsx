/**
 * The Cinematics mark — an aperture iris.
 *
 * Drawn rather than imported so it inherits currentColor, scales without an
 * asset request, and can animate its blades open on hover. Replace with the
 * club's own logo when one is supplied: keep the 24×24 viewBox and the
 * `currentColor` fills and every placement in the interface keeps working.
 */

export default function Mark({ size = 16, blades = 6, className = '', open = 0 }) {
  const r = 9
  const inner = 2.4 + open * 3.4

  const paths = Array.from({ length: blades }).map((_, i) => {
    const a0 = (i / blades) * Math.PI * 2 - Math.PI / 2
    const a1 = ((i + 1) / blades) * Math.PI * 2 - Math.PI / 2
    const x0 = 12 + Math.cos(a0) * r
    const y0 = 12 + Math.sin(a0) * r
    const x1 = 12 + Math.cos(a1) * r
    const y1 = 12 + Math.sin(a1) * r
    const xi = 12 + Math.cos(a1 - 0.35) * inner
    const yi = 12 + Math.sin(a1 - 0.35) * inner
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(
      2,
    )} L ${xi.toFixed(2)} ${yi.toFixed(2)} Z`
  })

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="currentColor"
          opacity={i % 2 === 0 ? 0.95 : 0.62}
        />
      ))}
      <circle cx="12" cy="12" r={r} fill="none" stroke="currentColor" strokeWidth="1" opacity="0.35" />
    </svg>
  )
}
