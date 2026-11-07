import './index.css'

const root = document.getElementById('root')!
const start = () => import('./boot.tsx').then(({ boot }) => boot(root))

// The page arrives prerendered, so it's already complete on screen. Evaluating and hydrating the app
// keeps a slow phone's main thread busy for a while; start that only once the loading screen has
// begun its exit (a GPU-only transition that stays smooth while the main thread works), so it never
// delays or stutters the reveal. In dev the root is empty and the app renders straight away.
const w = window as Window & { __plDone?: boolean }
if (root.hasChildNodes() && document.getElementById('preloader') && !w.__plDone) {
  let started = false
  const go = () => {
    if (started) return
    started = true
    window.setTimeout(start, 60)
  }
  window.addEventListener('pl:done', go, { once: true })
  window.setTimeout(go, 4000)
} else {
  start()
}
