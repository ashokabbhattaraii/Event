// Deterministic faux-QR matrix from a seed string (decorative, for demo tickets)
function hash(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function QrCode({ seed, size = 84 }: { seed: string; size?: number }) {
  const grid = 11
  const cells: boolean[] = []
  let h = hash(seed)
  for (let i = 0; i < grid * grid; i++) {
    h = Math.imul(h ^ (h >>> 15), 2246822519)
    cells.push((h & 1) === 1)
  }
  const cell = size / grid

  // force finder-pattern corners for QR feel
  const isFinder = (r: number, c: number) => {
    const inBox = (br: number, bc: number) => r >= br && r < br + 3 && c >= bc && c < bc + 3
    return inBox(0, 0) || inBox(0, grid - 3) || inBox(grid - 3, 0)
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="QR code">
      <rect width={size} height={size} fill="white" />
      {cells.map((on, i) => {
        const r = Math.floor(i / grid)
        const c = i % grid
        const finder = isFinder(r, c)
        if (!on && !finder) return null
        return <rect key={i} x={c * cell} y={r * cell} width={cell} height={cell} fill="#1a1a2e" rx={0.5} />
      })}
    </svg>
  )
}
