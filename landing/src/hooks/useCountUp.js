export function animateNumber(el, from, to, dur, fmt) {
  const start = performance.now()
  const ease = t => 1 - Math.pow(1 - t, 3)
  function tick(now) {
    const t = Math.min(1, (now - start) / dur)
    const v = from + (to - from) * ease(t)
    el.textContent = fmt ? fmt(v) : Math.round(v).toLocaleString()
    if (t < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
