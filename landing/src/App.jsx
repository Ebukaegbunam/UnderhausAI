import { useEffect } from 'react'
import Nav from './components/Nav'
import Hero from './components/Hero'
import Contrast from './components/Contrast'
import HowItWorks from './components/HowItWorks'
import Pricing from './components/Pricing'
import FinalCTA from './components/FinalCTA'
import Footer from './components/Footer'
import { useScrollReveal } from './hooks/useScrollReveal'

export default function App() {
  useScrollReveal()

  return (
    <>
      <Nav />
      <Hero />
      <Contrast />
      <HowItWorks />
      <Pricing />
      <FinalCTA />
      <Footer />
    </>
  )
}
