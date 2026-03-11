'use client'

import dynamic from 'next/dynamic'

const SankeyFlow = dynamic(() => import('@/components/SankeyFlow'), { ssr: false })

export default function FlowClient() {
  return <SankeyFlow />
}
