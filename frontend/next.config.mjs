import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  turbopack: {
    // Pin root to this app so Turbopack doesn't use a stale/hardcoded path
    root: __dirname,
  },
}

export default nextConfig
