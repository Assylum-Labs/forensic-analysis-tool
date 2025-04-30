"use client"

import { useParams } from 'next/navigation'
import TransactionClusteringPage from '@/components/TransactionClusteringPage'

export default function Page() {
  const params = useParams()
  const token = params.token as string

  return <TransactionClusteringPage initialTokenAddress={token} />
} 