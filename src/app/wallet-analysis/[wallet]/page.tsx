// src/app/transaction-clustering/page.tsx
"use client"

import { useParams } from 'next/navigation'
import WalletAnalysisPage from '@/components/WaletAnalysisPage'

export default function Page() {
  const params = useParams()
  const wallet = params.wallet as string

  return <WalletAnalysisPage initialWalletAddress={wallet} />
}