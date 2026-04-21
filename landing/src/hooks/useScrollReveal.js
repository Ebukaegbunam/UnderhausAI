import { useEffect } from 'react'

export function useScrollReveal() {
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in')
          io.unobserve(e.target)
        }
      })
    }, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' })

    document.querySelectorAll('.reveal, .fade-up').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
}
