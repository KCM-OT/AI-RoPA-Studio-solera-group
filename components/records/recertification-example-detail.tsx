'use client'

import { useEffect, useState } from 'react'
import type { ProcessingActivity } from '@/lib/types'

export function RecertificationExampleDetail({ record: _record }: { record: ProcessingActivity }) {
  const [height, setHeight] = useState('1500px')

  useEffect(() => {
    const updateHeight = () => {
      const viewportHeight = window.innerHeight
      setHeight(`${Math.max(1500, viewportHeight - 80)}px`)
    }
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  return (
    <iframe
      title="AI-Assisted Candidate Screening & Recruitment recertification"
      src="/recertification-example.html"
      className="block w-full border-0"
      style={{ height }}
    />
  )
}
