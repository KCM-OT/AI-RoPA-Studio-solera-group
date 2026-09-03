'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

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
  bell: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/63ef7a93dff0387bb60d3ed39161a88fda71160348a1c6fcaaee8a22bc63b944.svg',
  comment: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/30fd1fbcb4b034847756aa361d6be8fc77576d7aff465704953148c84bb20f61.svg',
  calendar: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/1ae735db74b5ca6ef7196dc947bb6b6bf3cb224933458708dc6423b87789f64b.svg',
  phone: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/216c4f2c1514e0f8c231fd97e5dfb4eb76a4d9931d9ce1d2c554c460b72c5ccb.svg',
  cloud: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/eff617c474af52e1109ef29ba7e8ca18dd501ea4d1b793d9d3b732f17d2780e5.svg',
  squarePlus: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/cb15f41f05c6f54366b7565fd78653874d85de38f689531f824d5b97597d2906.svg',
  ellipsis: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/da5b2a2c0047c6e4b2bddf9e759c0463055f166913ae52a4c24c1cfef3ba4bd0.svg',
  grip: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/a34f2611e60ed5747be84b4f64282a38ea7bca53ecb21a05160e42a0cd90fe58.svg',
  sidebar: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/6aab8d7e2008e7dd2ff5497532411bb9b578642a3ca2687c9c44d9529e80c899.svg',
  angleLeft: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/54c213c6c7fcfaedc36c64b55fe54199ab386203bd955fd1d582fb0c2482ca7d.svg',
  angleRight: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/7df72bfd0822803914be53653ba76bbbba4a940ec9589c725138ee9160fc7b24.svg',
  search: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/afb1555daf1692de5713872aba0b98f3debe4840c7ce73c609cd939c40e2c9a2.svg',
  circleUser: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/c47fde0772738eed50eeaa5f2c9bf7d649b9976b35fb511274f34d8103b104a7.svg',
  aiSparkle: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/c9ea5b6e8f807223074c56fd1b7895b34c1db7faec6de27ebb46d5aa78fc9bd1.svg',
  arrowRight: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/851f3fb86ba80f3a8113edf6d39431fa1635e3ce412024187c0da7f8724cdec8.svg',
  aiSparkleSmall: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/7480169ac30cd7798bc0bf3312656603f8215a5808916675acc9f66f099fea6c.svg',
  pencil: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/c1f9641555f365188ce6fd900525e70a68ba333fd677967f064805272252b67a.svg',
  smile: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/fa753ba3dbb251b682aba8c9abb6812b3d10195b6517dce4030dca2c8345adbf.svg',
  paperclip: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/e4d911badf10e3150294e63aeb668b6e232d99555292d3dd5a9deaebe6b9ddb5.svg',
  penClip: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/5146e01432ef1812be4c5dab7c75a19e9bbc2388eb62015734c94083ffaa551d.svg',
  send: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/119160321a4351a3644dabefa9b45925f5362ab62015adaccfe57810e5618741.svg',
  plus: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/figma-assets/615de3c58bfab08121c1047861fdf49529059de6737e2711216c7e76b49586ad.svg',
}

const REBECCA_PHOTO =
  'https://s3-alpha-sig.figma.com/img/20ed/b29f/549745f583646ef1d45b255c319fe3f9?Expires=1789344000&Key-Pair-Id=APKAQ4GOSFWCW27IBOMQ&Signature=QXZUWHke0aXi-I3NZ3JLM9ASLeAtQ4pID~f7~2he-opEc6cTB79LcM0ttpOIszotCFAzZA3MNPixlFGmAR3ZWKKB~Ie7V8m8Sp6ah3TMwcVfWl9RsuX3noXMylx-6~0PexYVzgbcAzGnnX9M57CI43M8LKRuTVo5tbXIwJCmsp8oVxT1QkCXojdQkZNPULgo8r9in~KD1gdDF7qR7LvluABV4HYEbzlZOJ-LZ7TdRvoivXXSICrKQa0-6mR9pBkadsmT6T0zJ5juEaX~k2YTVj9Tx3XiEHtEgMt4SxREEiBnO6DbpZvY4P9-oOv6PeV7~m2DV~4GBegiKfl-MH4dtg__'

const RECORD_LINK_LABEL = 'AI-Assisted Candidate Screening & Recruitment'
const RECORD_LINK_HREF = '/records/recertification-example'
const SOLERA_PREFIX = 'Rebecca, the RoPA record titled \u201c'
const SOLERA_SUFFIX = '\u201d is in need of recertification as of 09:34 AM 9/05/2026.'
const SOLERA_MESSAGE_LENGTH = SOLERA_PREFIX.length + RECORD_LINK_LABEL.length + SOLERA_SUFFIX.length
const REBECCA_MESSAGE = 'Thank you, I will look at it immediately'

function TeamsWindow({ open }: { open: boolean }) {
  const [typedCount, setTypedCount] = useState(0)
  const [rebeccaVisible, setRebeccaVisible] = useState(false)
  const [rebeccaMessage, setRebeccaMessage] = useState('')
  const [chatStarted, setChatStarted] = useState(false)

  useEffect(() => {
    if (!open) return
    const openTimer = window.setTimeout(() => setChatStarted(true), 500)
    return () => window.clearTimeout(openTimer)
  }, [open])

  useEffect(() => {
    if (!chatStarted) return
    let index = 0
    const typingTimer = window.setInterval(() => {
      index += 1
      setTypedCount(index)
      if (index >= SOLERA_MESSAGE_LENGTH) {
        window.clearInterval(typingTimer)
        setRebeccaVisible(true)
      }
    }, 20)
    return () => window.clearInterval(typingTimer)
  }, [chatStarted])

  useEffect(() => {
    if (!rebeccaVisible) return
    const startTimer = window.setTimeout(() => {
      let index = 0
      const typingTimer = window.setInterval(() => {
        index += 1
        setRebeccaMessage(REBECCA_MESSAGE.slice(0, index))
        if (index >= REBECCA_MESSAGE.length) {
          window.clearInterval(typingTimer)
        }
      }, 20)
    }, 400)
    return () => window.clearTimeout(startTimer)
  }, [rebeccaVisible])

  const prefixShown = SOLERA_PREFIX.slice(0, Math.min(typedCount, SOLERA_PREFIX.length))
  const linkShown = typedCount > SOLERA_PREFIX.length
  const suffixCount = Math.max(0, typedCount - SOLERA_PREFIX.length - RECORD_LINK_LABEL.length)
  const suffixShown = SOLERA_SUFFIX.slice(0, suffixCount)

  return (
    <section
      className={`absolute right-12 top-1/2 -mt-[397.5px] h-[795px] w-[754px] overflow-hidden rounded-[10px] bg-white text-[#1a1a1a] shadow-2xl ${
        open ? 'animate-[teams-window-slide-in_500ms_ease-out_forwards] opacity-100' : 'pointer-events-none translate-x-full opacity-0'
      }`}
      style={{ transformOrigin: 'bottom right' }}
      aria-label="Teams conversation"
      aria-hidden={!open}
    >
      <header className="flex h-[75px] items-center gap-6 bg-[#167cbb] px-6 text-white">
        <div className="flex items-center gap-3">
          <span className="size-3 rounded-full bg-[#0f5580]" />
          <span className="size-3 rounded-full bg-[#0f5580]" />
          <span className="size-3 rounded-full bg-[#0f5580]" />
        </div>
        <img src={TEAM_ICONS.sidebar} alt="" className="h-5 w-5 brightness-0 invert" />
        <div className="flex items-center gap-3 opacity-90">
          <img src={TEAM_ICONS.angleLeft} alt="" className="h-4 w-4 brightness-0 invert" />
          <img src={TEAM_ICONS.angleRight} alt="" className="h-4 w-4 brightness-0 invert" />
        </div>
        <div className="flex h-9 flex-1 items-center gap-2 rounded-md border border-[#c8c8c8] bg-white px-4 text-[#bdbdbd]">
          <img src={TEAM_ICONS.search} alt="" className="h-4 w-4 opacity-60" />
          <span className="text-[15px]">Search</span>
        </div>
        <img src={TEAM_ICONS.ellipsis} alt="" className="h-5 w-5 brightness-0 invert" />
        <span className="flex size-8 items-center justify-center rounded-full bg-white">
          <img src={TEAM_ICONS.circleUser} alt="" className="h-6 w-6" />
        </span>
      </header>
      <div className="flex h-[720px]">
        <aside className="relative flex w-[51px] flex-col items-center gap-9 bg-[#e4e4e4] py-9">
          <img src={TEAM_ICONS.bell} alt="Notifications" className="h-5 w-5 opacity-70" />
          <img src={TEAM_ICONS.comment} alt="Chat" className="h-5 w-5 opacity-70" />
          <img src={TEAM_ICONS.calendar} alt="Calendar" className="h-5 w-5 opacity-70" />
          <img src={TEAM_ICONS.phone} alt="Calls" className="h-5 w-5 opacity-70" />
          <img src={TEAM_ICONS.cloud} alt="OneDrive" className="h-5 w-5 opacity-70" />
          <img src={TEAM_ICONS.ellipsis} alt="More" className="h-5 w-5 opacity-60" />
          <img src={TEAM_ICONS.squarePlus} alt="Add" className="mt-auto h-5 w-5 opacity-70" />
          <img src={TEAM_ICONS.grip} alt="" className="absolute bottom-3 h-4 w-2 opacity-40" />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col bg-white">
          <div className="flex h-[68px] items-center gap-3 border-b border-[#e1e1e1] px-6">
            <span className="flex size-9 items-center justify-center rounded-full bg-[#e5d8ff]">
              <img src={TEAM_ICONS.aiSparkle} alt="" className="h-4 w-4" />
            </span>
            <strong className="text-[17px] font-semibold">Solera Group AI Agent</strong>
            <img src={TEAM_ICONS.arrowRight} alt="" className="h-4 w-4 opacity-70" />
            <strong className="text-[17px] font-semibold">Rebecca Nordstrum</strong>
            <button className="ml-auto rounded-md bg-[#167cbb] px-4 py-2 text-[15px] font-semibold text-white">
              Join
            </button>
            <img src={TEAM_ICONS.search} alt="" className="h-4 w-4 opacity-60" />
            <img src={TEAM_ICONS.ellipsis} alt="" className="h-4 w-4 opacity-60" />
          </div>
          <div className="flex flex-1 flex-col gap-9 px-8 py-8 text-[15px]">
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-[13px] text-[#727272]">
                <img src={TEAM_ICONS.aiSparkleSmall} alt="" className="h-4 w-4" />
                <span className="text-[#1a1a1a]">Solera group AI Agent</span>
                <span>10:05 AM</span>
              </div>
              <div className="min-h-[1.5em] max-w-[420px] rounded-lg bg-[#f6f6f6] px-5 py-4 leading-[1.5]">
                {prefixShown}
                {linkShown && (
                  <Link href={RECORD_LINK_HREF} className="text-[#167cbb] underline hover:text-[#0f5580]">
                    {RECORD_LINK_LABEL}
                  </Link>
                )}
                {suffixShown}
              </div>
            </div>
            {/* Rebecca Chat */}
            <div
              data-chat-name="Rebecca Chat"
              className={`ml-auto flex items-start gap-3 transition-opacity duration-500 ${
                rebeccaVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              <div>
                <div className="mb-1.5 flex justify-end gap-2 text-[13px] text-[#727272]">
                  <span className="text-[#1a1a1a]">Rebecca Nordstrum</span>
                  <span>10:09 AM</span>
                </div>
                <div className="min-h-[1.5em] w-[380px] rounded-lg bg-[#f6f6f6] px-5 py-4 text-[#1a1a1a]">
                  {rebeccaMessage}
                </div>
              </div>
              <img src={REBECCA_PHOTO} alt="Rebecca Nordstrum" className="size-9 rounded-full object-cover" />
            </div>
          </div>
          <div className="mx-6 mb-6 flex h-[62px] items-center gap-4 rounded-lg border border-[#c8c8c8] px-5 text-[15px] text-[#727272]">
            <span className="flex-1">Type a message</span>
            <img src={TEAM_ICONS.pencil} alt="" className="h-4 w-4" />
            <img src={TEAM_ICONS.smile} alt="" className="h-4 w-4" />
            <img src={TEAM_ICONS.paperclip} alt="" className="h-4 w-4" />
            <img src={TEAM_ICONS.penClip} alt="" className="h-4 w-4" />
            <img src={TEAM_ICONS.plus} alt="" className="h-4 w-4" />
            <span className="h-6 w-px bg-[#e0e0e0]" />
            <img src={TEAM_ICONS.send} alt="Send" className="h-4 w-4" />
          </div>
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
  const [teamsOpen, setTeamsOpen] = useState(false)

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#9bbbd4]" aria-label="Meetings demo">
      <img src={WALLPAPER} alt="Windows blue abstract wallpaper" className="absolute inset-0 size-full object-cover" />
      <TeamsWindow open={teamsOpen} />
      <div className="absolute inset-x-0 bottom-0 flex h-[53px] items-center justify-center bg-[#deebf5] px-6">
        <div className="flex items-center gap-[13px]">
          <img src={START} alt="Start" className="h-[22px] w-[22px]" />
          {icons.map(([file, label]) => (
            <img key={file} src={file} alt={label} className="h-7 w-7 object-contain" />
          ))}
          <button
            type="button"
            onClick={() => setTeamsOpen(true)}
            aria-label="Teams"
            className="relative flex h-[41px] items-center bg-white px-3"
          >
            <span className="flex size-7 items-center justify-center rounded bg-[#426ec2] text-lg font-semibold text-white">
              T
            </span>
            <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-[#e81123] ring-2 ring-[#deebf5]" />
          </button>
        </div>
        <div className="absolute right-5">
          <Clock />
        </div>
      </div>
    </main>
  )
}
