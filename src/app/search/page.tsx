"use client"

import { useState } from 'react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { formatAddress } from '@/lib/utils'
import { 
  Search as SearchIcon,
  Wallet,
  ArrowRightLeft,
  Tag,
  Building,
  History,
  Clock,
  Filter,
  Download,
  ExternalLink,
  ChevronRight
} from 'lucide-react'

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery) {
      toast({
        title: "Error",
        description: "Please enter a search query",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Search Complete",
        description: `Results found for "${searchQuery}"`
      })
      setIsLoading(false)
    }, 1000)
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        <div className="border-b border-border p-6 flex flex-col items-center justify-center">
          <h1 className="text-3xl font-bold mb-6 text-center">Solana Forensics Search</h1>
          <form onSubmit={handleSearch} className="w-full max-w-3xl flex gap-2">
            <Input
              placeholder="Search by wallet address, transaction hash, token, or entity name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 h-12"
            />
            <Button type="submit" disabled={isLoading} className="h-12 px-6">
              {isLoading ? 
                "Searching..." : 
                <SearchIcon className="mr-2 h-5 w-5" />
              }
              {!isLoading && "Search"}
            </Button>
          </form>
          <div className="flex gap-4 mt-6">
            <Button variant="outline" size="sm">
              <Wallet className="mr-2 h-4 w-4" />
              Wallet Lookup
            </Button>
            <Button variant="outline" size="sm">
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transaction Lookup
            </Button>
            <Button variant="outline" size="sm">
              <Tag className="mr-2 h-4 w-4" />
              Token Lookup
            </Button>
            <Button variant="outline" size="sm">
              <Building className="mr-2 h-4 w-4" />
              Entity Lookup
            </Button>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-hidden">
          <Tabs defaultValue="all" className="w-full h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="all">All Results</TabsTrigger>
                <TabsTrigger value="wallets">Wallets</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="tokens">Tokens</TabsTrigger>
                <TabsTrigger value="entities">Entities</TabsTrigger>
              </TabsList>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
            
            <TabsContent value="all" className="flex-1 overflow-auto">
              <div className="grid grid-cols-1 gap-4">
                {/* No results initially */}
                <div className="h-80 flex flex-col items-center justify-center text-center p-4">
                  <SearchIcon className="h-16 w-16 text-muted-foreground mb-6" />
                  <h3 className="text-xl font-semibold mb-2">Enter a search term to begin</h3>
                  <p className="text-muted-foreground max-w-md">
                    Search for any wallet address, transaction ID, token, or entity in the Solana ecosystem
                  </p>
                </div>
                
                {/* Search history section */}
                <div className="rounded-md border border-border overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-medium flex items-center">
                      <History className="h-5 w-5 mr-2" />
                      Recent Searches
                    </h3>
                  </div>
                  <div className="divide-y divide-border">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-4 hover:bg-muted/50 flex justify-between items-center">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-full mr-3 ${
                            i % 3 === 0 ? 'bg-solana-purple/10 text-solana-purple' : 
                            i % 3 === 1 ? 'bg-solana-blue/10 text-solana-blue' : 
                            'bg-solana-green/10 text-solana-green'
                          }`}>
                            {i % 3 === 0 ? <Wallet className="h-4 w-4" /> : 
                             i % 3 === 1 ? <ArrowRightLeft className="h-4 w-4" /> : 
                             <Building className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="font-medium">
                              {i % 3 === 0 
                                ? formatAddress('Gw21KvmScf3AxZJJVB9CRbdS5guESzgPZGJskwEKvdNJ', 12) 
                                : i % 3 === 1 
                                  ? formatAddress('4fuUiYxTQ6QCrdSq9ouBYcTM7bqSwYTSyLueGZLTy4U4K84tEpg1xfVNo9tNVzSKeW7o', 12)
                                  : 'Solana Foundation'}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {i === 0 ? 'Just now' : i === 1 ? '1 hour ago' : '2 days ago'}
                            </div>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Other tabs would have specific result layouts when implemented */}
            {['wallets', 'transactions', 'tokens', 'entities'].map((tab) => (
              <TabsContent key={tab} value={tab} className="flex-1 overflow-auto">
                <div className="h-60 flex items-center justify-center border border-border rounded-md bg-muted/20">
                  <div className="text-center">
                    <h3 className="text-lg font-medium mb-2">No {tab} found</h3>
                    <p className="text-muted-foreground">Enter a search term to find {tab}</p>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  )
}