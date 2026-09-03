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
const TEAM_ICONS = {
  comment: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/30fd1fbcb4b034847756aa361d6be8fc77576d7aff465704953148c84bb20f61.svg',
  calendar: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/1ae735db74b5ca6ef7196dc947bb6b6bf3cb224933458708dc6423b87789f64b.svg',
  phone: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/3bfe8894dc8f92f022013ddc282fc24cfbabd606c75887091250d90fbf861158.svg',
  cloud: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/eff617c474af52e1109ef29ba7e8ca18dd501ea4d1b793d9d3b732f17d2780e5.svg',
  plus: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/cb15f41f05c6f54366b7565fd78653874d85de38f689531f824d5b97597d2906.svg',
  ai: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/e56dca9e22c9c6f68653875976085799167f3a3b963c2d0c8738e40abfca1f47.svg',
  arrow: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/851f3fb86ba80f3a8113edf6d39431fa1635e3ce412024187c0da7f8724cdec8.svg',
  pencil: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/c1f9641555f365188ce6fd900525e70a68ba333fd677967f064805272252b67a.svg',
  smile: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/fa753ba3dbb251b682aba8c9abb6812b3d10195b6517dce4030dca2c8345adbf.svg',
  clip: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/e4d911badf10e3150294e63aeb668b6e232d99555292d3dd5a9deaebe6b9ddb5.svg',
  send: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/119160321a4351a3644dabefa9b45925f5362ab62015adaccfe57810e5618741.svg',
}

function TeamsWindow() {
  const railIcons = [TEAM_ICONS.comment, TEAM_ICONS.calendar, TEAM_ICONS.phone, TEAM_ICONS.cloud]
  return (
    <section className="absolute right-12 top-1/2 h-[795px] w-[754px] -translate-y-1/2 overflow-hidden rounded-[10px] bg-white text-[#1a1a1a] shadow-2xl" aria-label="Teams conversation">
      <header className="flex h-[108px] items-center gap-8 bg-[#167cbb] px-8 text-white">
        <div className="flex gap-4"><span className="size-7 rounded-full bg-[#0f5580]" /><span className="size-7 rounded-full bg-[#0f5580]" /><span className="size-7 rounded-full bg-[#0f5580]" /></div>
        <img src={TEAM_ICONS.comment} alt="" className="h-7 w-7 brightness-0 invert" />
        <img src={TEAM_ICONS.arrow} alt="" className="h-8 w-8 brightness-0 invert" />
        <div className="flex h-14 flex-1 items-center rounded-lg border border-[#c8c8c8] bg-white px-5 text-2xl text-[#bdbdbd]">Search</div>
        <span className="text-2xl tracking-[0.3em]">•••</span><span className="flex size-14 items-center justify-center rounded-full bg-white text-[#167cbb]">●</span>
      </header>
      <div className="flex h-[687px]">
        <aside className="flex w-[51px] flex-col items-center gap-10 bg-[#e4e4e4] py-16">{railIcons.map((icon) => <img key={icon} src={icon} alt="" className="h-6 w-6 opacity-70" />)}<img src={TEAM_ICONS.plus} alt="" className="mt-auto h-6 w-6 opacity-70" /></aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-[114px] items-center gap-6 border-b border-[#e1e1e1] px-12"><span className="flex size-12 items-center justify-center rounded-full bg-[#e5d8ff] text-2xl text-[#7257d8]">✦</span><strong className="text-[24px]">Solera Group AI Agent</strong><span className="text-4xl">→</span><strong className="text-[24px]">Rebecca Nordstrum</strong><button className="ml-auto rounded-lg bg-[#167cbb] px-5 py-3 text-xl font-semibold text-white">Join</button></div>
          <div className="flex flex-1 flex-col gap-16 px-12 py-24 text-[20px]"><div><div className="mb-3 text-[#727272]">Solera group AI Agent　10:05 AM</div><div className="max-w-[410px] rounded-xl bg-[#f6f6f6] p-7 leading-[1.45]">Rebecca, the RoPA record titled “AI-Assisted Candidate Screening &amp; Recruitment” is in need of recertification as of 09:34 AM 9/05/2026.</div></div><div className="ml-auto"><div className="mb-3 text-right text-[#727272]">Rebecca Nordstrum　10:09 AM</div><div className="w-[400px] rounded-xl bg-[#f6f6f6] p-7">reply message...</div></div></div>
          <div className="mx-8 mb-8 flex h-[96px] items-center gap-7 rounded-xl border border-[#c8c8c8] px-7 text-[20px] text-[#727272]"><span>Type a message</span><span className="ml-auto flex items-center gap-6"><img src={TEAM_ICONS.pencil} alt="" className="h-7 w-7" /><img src={TEAM_ICONS.smile} alt="" className="h-7 w-7" /><img src={TEAM_ICONS.clip} alt="" className="h-7 w-7" /><span className="text-3xl">＋</span><img src={TEAM_ICONS.send} alt="Send" className="h-8 w-8" /></span></div>
        </div>
      </div>
    </section>
  )
}

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
      <TeamsWindow />
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
