"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { HelpCircleIcon, BellIcon, Glasses, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import RPCInput from './RPCInput'
import { isValidSolanaSignature, validateAddress } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { Connection, PublicKey } from '@solana/web3.js'
import { useRPC } from '@/contexts/RPCContext'

interface HeaderProps {
  children?: React.ReactNode;
}

export function Header({ children }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [inputType, setInputType] = useState<'signature' | 'address' | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { rpcEndpoint } = useRPC()

  const validateInput = (input: string) => {
    if (!input.trim()) {
      setIsValid(null)
      setInputType(null)
      return false
    }
    
    // Check if it's a signature
    if (isValidSolanaSignature(input)) {
      setIsValid(true)
      setInputType('signature')
      return 'signature'
    }
    
    // Check if it's a wallet address or token mint address
    // Both are Solana addresses, so we use the same validation
    if (validateAddress(input)) {
      setIsValid(true)
      setInputType('address')
      return 'address'
    }
    
    // Invalid input
    setIsValid(false)
    setInputType(null)
    return false
  }

  // Check if an address is a wallet or token mint
  const checkAddressType = async (address: string) => {
    try {
      // Create a connection to the Solana network
      const connection = new Connection(
        rpcEndpoint || process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com'
      )
      
      // Get the account info
      const accountInfo = await connection.getAccountInfo(new PublicKey(address))
      
      // Check if the account owner is the System Program (wallet address)
      // System Program ID: 11111111111111111111111111111111
      const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111'
      
      if (accountInfo) {
        // If owner is the System Program, it's a wallet
        if (accountInfo.owner.toString() === SYSTEM_PROGRAM_ID) {
          return 'wallet'
        } else {
          // Otherwise, it's likely a token mint or another program-owned account
          return 'token'
        }
      } else {
        // If no account info found, default to treating it as a wallet
        // This could happen for new accounts or ones that haven't been initialized
        return 'wallet'
      }
    } catch (error) {
      console.error('Error checking address type:', error)
      // Default to wallet if there's an error
      return 'wallet'
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    
    const inputType = validateInput(searchQuery)
    
    if (!inputType) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid signature, wallet address, or token address",
        variant: "destructive"
      })
      return
    }
    
    // Route based on the input type
    if (inputType === 'signature') {
      router.push(`/transaction-analysis/${searchQuery}`)
    } else if (inputType === 'address') {
      setIsChecking(true)
      
      try {
        // Check if the address is a wallet or token
        const addressType = await checkAddressType(searchQuery)
        
        if (addressType === 'wallet') {
          router.push(`/wallet-analysis/${searchQuery}`)
        } else {
          router.push(`/transaction-clustering/${searchQuery}`)
        }
      } catch (error) {
        console.error('Error during routing:', error)
        // Fallback to the simple length-based heuristic if there's an error
        if (searchQuery.length === 44) {
          router.push(`/transaction-clustering/${searchQuery}`)
        } else {
          router.push(`/wallet-analysis/${searchQuery}`)
        }
      } finally {
        setIsChecking(false)
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    if (value) {
      validateInput(value)
    } else {
      setIsValid(null)
      setInputType(null)
    }
  }

  return (
    <header className="bg-card border-b border-[#333]">
      <div className="flex h-16 items-center px-4 md:px-6">
        {children}
        <div className="flex flex-1 items-center gap-x-2 md:gap-x-4">
          <form onSubmit={handleSearch} className="relative flex-1 max-w-sm md:max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Glasses className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <Input
              type="search"
              placeholder={isChecking ? "Checking..." : "Search wallet, transaction..."}
              className={`pl-10 py-2 text-sm md:text-base ${
                isValid === false ? 'border-red-500' : ''
              }`}
              value={searchQuery}
              onChange={handleInputChange}
              disabled={isChecking}
            />
            {isChecking && (
              <div className="absolute inset-y-0 right-3 flex items-center">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            )}
          </form>
          <div className="ml-auto flex-shrink-0">
            <RPCInput />
          </div>
        </div>
      </div>
    </header>
  )
}