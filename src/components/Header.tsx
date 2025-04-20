"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { HelpCircleIcon, BellIcon, Glasses } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export function Header() {
  const [searchQuery, setSearchQuery] = useState('')
  const { toast } = useToast()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    
    toast({
      title: "Search initiated",
      description: `Searching for "${searchQuery}"...`,
    })
    
    // In a real app, this would trigger a search action
    console.log('Searching for:', searchQuery)
  }

  return (
    <header className="bg-card border-b border-[#333]">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex flex-1 items-center">
          <form onSubmit={handleSearch} className="relative w-full max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Glasses className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              {/* <MagnifyingGlassIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" /> */}
            </div>
            <Input
              type="search"
              placeholder="Search wallet, transaction, or token..."
              className="pl-10 py-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <HelpCircleIcon className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <BellIcon className="h-5 w-5" />
          </Button>
          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-solana-purple to-solana-blue flex items-center justify-center text-white font-medium">
            A
          </div>
        </div>
      </div>
    </header>
  )
}