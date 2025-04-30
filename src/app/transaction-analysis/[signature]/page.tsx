"use client"

import { useParams } from 'next/navigation'
import TransactionAnalysisPage from '@/components/TransactionAnalysisPage'

export default function Page() {
  const params = useParams()
  const signature = params.signature as string

  return <TransactionAnalysisPage initialSignature={signature} />
} 