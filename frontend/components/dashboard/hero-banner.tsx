"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export type HeroSlide = {
  id: number | string
  title: string
  description: string
  ctaLabel: string
  ctaHref: string
  gradient: string
  imageUrl?: string
}

export function HeroBanner({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0)
  const count = slides.length

  const goTo = useCallback(
    (next: number) => {
      if (!count) return
      setIndex(((next % count) + count) % count)
    },
    [count]
  )

  useEffect(() => {
    if (count <= 1) return
    const timer = window.setInterval(() => goTo(index + 1), 7000)
    return () => window.clearInterval(timer)
  }, [count, goTo, index])

  if (!slides.length) {
    return (
      <section className="flex h-full min-h-[220px] items-end overflow-hidden rounded-[24px] bg-bg-panel-dark p-6 sm:p-8">
        <div>
          <h1 className="text-[28px] font-bold text-white sm:text-[32px]">Featured Tournaments</h1>
          <p className="mt-2 text-sm text-white/60">No featured tournaments right now.</p>
          <Link
            href="/player/tournament"
            className="mt-5 inline-flex rounded-xl bg-accent-lime px-7 py-3.5 text-sm font-bold text-text-primary"
          >
            Browse Tournaments
          </Link>
        </div>
      </section>
    )
  }

  const slide = slides[index]

  return (
    <section className="relative h-full min-h-[220px] overflow-hidden rounded-[24px] bg-bg-panel-dark">
      <div
        className="absolute inset-0 bg-cover bg-center transition-[background-image] duration-500"
        style={{
          backgroundImage: slide.imageUrl
            ? `url(${slide.imageUrl})`
            : slide.gradient,
          backgroundColor: "#141414",
        }}
      />
      {!slide.imageUrl && (
        <div className="absolute inset-0" style={{ background: slide.gradient }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />

      <div className="relative z-10 flex h-full min-h-[220px] flex-col justify-end p-6 sm:p-8 lg:max-w-[60%]">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-lime">
          Featured Tournament
        </p>
        <h1 className="text-[28px] font-bold leading-[1.05] tracking-tight text-text-primary-inverse sm:text-[34px]">
          {slide.title}
        </h1>
        <p className="mt-3 line-clamp-3 text-sm font-normal leading-relaxed text-white/70">
          {slide.description}
        </p>
        <Link
          href={slide.ctaHref}
          className="mt-5 inline-flex w-fit items-center rounded-xl bg-accent-lime px-7 py-3.5 text-sm font-bold text-text-primary transition-colors hover:bg-accent-lime-dim"
        >
          {slide.ctaLabel}
        </Link>
      </div>

      {count > 1 && (
        <div className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => goTo(i)}
              className={cn(
                "h-2 w-2 rounded-full transition-all duration-150",
                i === index ? "h-6 bg-accent-lime" : "bg-white/40 hover:bg-white/70"
              )}
            />
          ))}
        </div>
      )}
    </section>
  )
}
