import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@goalos/shared', '@goalos/ui'],
  // Transformers.js runs client-side only; keep it out of the server bundle.
  serverExternalPackages: ['@huggingface/transformers'],
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: true,
})
