'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AutoRefresh({ interval = 5000 }: { interval?: number }) {
  const router = useRouter()

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined

    const start = () => {
      if (!timer && document.visibilityState === 'visible') {
        timer = setInterval(() => router.refresh(), interval)
      }
    }
    const stop = () => {
      if (timer) clearInterval(timer)
      timer = undefined
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        router.refresh()
        start()
      } else {
        stop()
      }
    }

    start()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [router, interval])

  return null
}
