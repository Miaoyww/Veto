export function getThemeTransitionClipPaths(
  cx: number,
  cy: number,
  maxRadius: number,
  viewportWidth: number,
  viewportHeight: number
): [string, string] {
  const toX = (x: number) => `${(x / viewportWidth) * 100}%`
  const toY = (y: number) => `${(y / viewportHeight) * 100}%`
  const point = (x: number, y: number) => `${toX(x)} ${toY(y)}`
  const referenceRadius = Math.hypot(viewportWidth, viewportHeight) / Math.SQRT2
  const radius = (maxRadius / referenceRadius) * 100

  return [`circle(0% at ${point(cx, cy)})`, `circle(${radius}% at ${point(cx, cy)})`]
}
