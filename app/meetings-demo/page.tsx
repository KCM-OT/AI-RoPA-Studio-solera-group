'use client'

import { useEffect, useState } from 'react'

const WALLPAPER =
  'https://s3-alpha-sig.figma.com/img/0b46/3309/588cf1a48db6d1310cf6781dbec6138e?Expires=1789344000&Key-Pair-Id=APKAQ4GOSFWCW27IBOMQ&Signature=YwPBbKB7v3~fhroVNXJNHtqovfvJOTfG1A4e0IwS1H3NIg~rfsJjjNKOdDv5ZhCSb~ZucgBNnoSP-T3nUV4TNdTbGLT46aYoDAk~4gO6BlanBHF85FxyHQBndfOMlMYL053r8SPyx4O~afGJUCQNC~DkMlGuRq46G8sQO5Nl25Br2LCy6oE4FQjORQSehRnDUJ01dlZf2XrAQV2iywjtcSqf4TT0HDlLQ886FERXQ-H2BIQjF8O05qVOV5C-lPLkXOnPhtoXgRBT73dPbvl28MhnTamEi1EF1L1STXmfDYA72zpyarMPUusZFQDu49IyRO0OLyhwAtJxiSdGTNvZYQ__'

const icons = [
  ['https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/613dd97001679bd28cb0c8661ed7d2e274b58b30c21c4ee87745fa956b635a62.svg', 'Search'],
  ['https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/a9bd9f9ea2087ddc817fbc822e2297cf14a7bc7f3eea1152c3a48bcf2899a608.svg', 'Microsoft Edge'],
  ['https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/528c35ae34024c05aa731da04eaae3b48d83256a6559ccfcd852294dbef791e2.svg', 'File Explorer'],
  ['https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/c0aebccd8fb0007c7bfc16129ac4912f97424070958b97144a1b9cedf117064b.svg', 'Work'],
  ['https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/d1e467919c9e71988305763132725bc17fabf05812280543bffa31601ccae719.svg', 'Video'],
]

const PLUG = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/278b96b8a92d23d60b1db62cbacad8f21aef03a7a2cad2b4a9eb298da5e95518.svg'
const VOLUME = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/017b1b295c701c52b3763c09c7ae97c119d536d728ba32945981560ac57190bb.svg'
const START = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/ed092091808532dd7064f3c8ec0217a67b9185b552f7a5b11c0415213fd2e468.svg'

function Clock() {
  const [now, setNow] = useState(new Date('2026-09-10T12:11:00'))

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="flex items-center gap-5 text-[#000000]">
      <div className="flex items-center gap-3 text-xl">
        <span aria-label="Show hidden icons" className="text-3xl leading-none">⌃</span>
        <img src={PLUG} alt="" className="h-6 w-5" />
        <img src={VOLUME} alt="" className="h-6 w-6" />
      </div>
      <div className="text-center font-sans text-[14px] leading-[17px]">
        <div>{now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
        <div>{now.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}</div>
      </div>
      <span className="flex size-10 items-center justify-center rounded-full bg-[#2e9fe5] text-lg text-white">3</span>
    </div>
  )
}

export default function MeetingsDemoPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#9bbbd4]" aria-label="Meetings demo">
      <img src={WALLPAPER} alt="Windows blue abstract wallpaper" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 flex h-[53px] items-center justify-center bg-[#deebf5] px-6">
        <div className="flex items-center gap-[13px]">
          <img src={START} alt="Start" className="h-[22px] w-[22px]" />
          {icons.map(([file, label]) => (
            <img key={file} src={file} alt={label} className="h-7 w-7 object-contain" />
          ))}
          <div className="flex h-[41px] items-center bg-white px-3">
            <span className="flex size-7 items-center justify-center rounded bg-[#426ec2] text-lg font-semibold text-white">T</span>
          </div>
        </div>
        <div className="absolute right-5">
          <Clock />
        </div>
      </div>
    </main>
  )
}
