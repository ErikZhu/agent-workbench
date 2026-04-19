import { useCallback, useEffect, useRef, useState } from 'react'
import type { Lang } from '../lib/i18n'

interface Props {
  lang: Lang
  onTranscript: (text: string) => void
  disabled?: boolean
}

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string
}
declare class SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}
declare const webkitSpeechRecognition: typeof SpeechRecognition

export default function VoiceButton({ lang, onTranscript, disabled }: Props) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const recRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    const SR = (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
    setSupported(!!SR)
  }, [])

  const toggle = useCallback(() => {
    const SR = (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
    if (!SR) return

    if (listening) {
      recRef.current?.stop()
      setListening(false)
      return
    }

    const rec = new SR()
    rec.lang = lang === 'zh' ? 'zh-CN' : 'en-US'
    rec.continuous = false
    rec.interimResults = false

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[e.results.length - 1][0].transcript
      onTranscript(transcript)
    }

    rec.onerror = () => {
      setListening(false)
    }

    rec.onend = () => {
      setListening(false)
    }

    recRef.current = rec
    rec.start()
    setListening(true)
  }, [lang, listening, onTranscript])

  if (!supported) return null

  return (
    <button
      onClick={toggle}
      disabled={disabled}
      title={lang === 'zh' ? (listening ? '停止录音' : '语音输入') : (listening ? 'Stop recording' : 'Voice input')}
      className={`flex-shrink-0 w-10 h-10 rounded-xl border transition-all flex items-center justify-center ${
        listening
          ? 'border-red-500/50 bg-red-500/10 text-red-400 animate-pulse'
          : 'border-white/10 text-white/30 hover:text-white/60 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed'
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z"/>
        <path d="M19.07 10.93a1 1 0 0 0-1.41 1.41A5.98 5.98 0 0 1 12 18a5.98 5.98 0 0 1-5.66-5.66 1 1 0 1 0-1.99.15A7.98 7.98 0 0 0 11 19.92V22H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-2.08a7.98 7.98 0 0 0 6.65-7.43 1 1 0 0 0-.58-.56z" opacity=".5"/>
      </svg>
    </button>
  )
}
