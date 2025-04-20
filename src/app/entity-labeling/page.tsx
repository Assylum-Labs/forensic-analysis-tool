"use client"

import { useState } from 'react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { formatAddress } from '@/lib/utils'
import { 
  Download,
  Upload,
  HelpCircle,
  Search,
  Tag,
  Plus,
  Building,
  CheckCircle2,
  Edit,
  Filter,
  Trash2,
  ExternalLink,
  Eye
} from 'lucide-react'

export default function EntityLabelingPage() {
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
        description: `Found entity information for ${formatAddress(searchQuery)}`
      })
      setIsLoading(false)
    }, 1000)
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">Entity and Exchange Labeling</h1>
              <p className="text-sm text-muted-foreground">
                Identify and label exchanges, projects, and entities in the Solana ecosystem
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <HelpCircle className="mr-2 h-4 w-4" />
                Help
              </Button>
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
          
          <form onSubmit={handleSearch} className="mt-4 flex gap-2">
            <Input
              placeholder="Search entity, wallet address or label"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Searching..." : "Search"}
            </Button>
          </form>
        </div>

        <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
          <Tabs defaultValue="entities" className="w-full h-full flex flex-col">
            <TabsList>
              <TabsTrigger value="entities">Known Entities</TabsTrigger>
              <TabsTrigger value="exchanges">Exchanges</TabsTrigger>
              <TabsTrigger value="labels">Custom Labels</TabsTrigger>
              <TabsTrigger value="detection">Pattern Detection</TabsTrigger>
            </TabsList>
            
            <TabsContent value="entities" className="flex-1 overflow-auto">
              <div className="rounded-md border border-border overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Entity Database</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Known projects, protocols, and entities on Solana
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="relative w-64">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Input className="pl-10" placeholder="Filter entities" />
                    </div>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Entity
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium">Entity Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Main Address</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Related Addresses</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Verified</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {['Solana Foundation', 'Serum DEX', 'Mango Markets', 'Magic Eden', 'Raydium', 'Marinade Finance'].map((entity, i) => (
                        <tr key={i} className="hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-solana-purple to-solana-blue mr-3 flex items-center justify-center text-white font-medium">
                                {entity.charAt(0)}
                              </div>
                              <div>
                                <div className="font-medium">{entity}</div>
                                <div className="text-xs text-muted-foreground">
                                  Added: {new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              i % 4 === 0 ? 'bg-solana-purple/10 text-solana-purple' : 
                              i % 4 === 1 ? 'bg-solana-blue/10 text-solana-blue' : 
                              i % 4 === 2 ? 'bg-solana-green/10 text-solana-green' :
                              'bg-amber-500/10 text-amber-500'}`}>
                              {i % 4 === 0 ? 'Foundation' : i % 4 === 1 ? 'DEX' : i % 4 === 2 ? 'NFT Marketplace' : 'DeFi Protocol'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {formatAddress(`addr${i}abcdef1234567890`, 8)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {(i + 1) * 5} addresses
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <CheckCircle2 className={`h-4 w-4 ${i < 4 ? 'text-green-500' : 'text-muted-foreground'}`} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="exchanges" className="flex-1 overflow-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="col-span-1 lg:col-span-2 rounded-md border border-border overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-medium">Exchange Address Database</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Known centralized and decentralized exchanges on Solana
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="px-4 py-3 text-left text-sm font-medium">Exchange</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Deposit Addresses</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Withdrawal Patterns</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {['Binance', 'OKX', 'Bybit', 'Kraken', 'Raydium', 'Jupiter'].map((exchange, i) => (
                          <tr key={i} className="hover:bg-muted/50">
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-solana-purple to-solana-blue mr-3 flex items-center justify-center text-white font-medium">
                                  {exchange.charAt(0)}
                                </div>
                                <div className="font-medium">{exchange}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs ${i < 4 ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'}`}>
                                {i < 4 ? 'CEX' : 'DEX'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {(i + 5) * 10} addresses
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {i % 3 === 0 ? 'Batched withdrawals' : i % 3 === 1 ? 'Direct payments' : 'Mixed pattern'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button size="sm" variant="outline">Details</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="col-span-1 rounded-md border border-border overflow-auto">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-medium">Exchange Detection</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Automatic detection of exchange patterns
                    </p>
                  </div>
                  <div className="p-4">
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2">Recognition Patterns</h4>
                      <div className="space-y-2">
                        {['Hot wallet patterns', 'Deposit clustering', 'Transaction signatures', 'Fee structures'].map((pattern, i) => (
                          <div key={i} className="flex items-center justify-between bg-muted/20 p-2 rounded">
                            <span>{pattern}</span>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2">Recent Detections</h4>
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="p-2 border border-border rounded">
                            <div className="font-medium text-sm">{formatAddress(`newexchange${i}`, 8)}</div>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-xs text-muted-foreground">Detected today</span>
                              <Button size="sm" variant="outline" className="h-6 text-xs">Verify</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <Button className="w-full">
                      <Search className="h-4 w-4 mr-2" />
                      Scan For New Exchanges
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="labels" className="flex-1 overflow-auto">
              <div className="rounded-md border border-border overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Custom Labels</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create and manage your own wallet and entity labels
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      New Label
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="border border-border rounded-md p-4 hover:border-primary/50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          <Tag className={`h-5 w-5 mr-2 ${
                            i % 5 === 0 ? 'text-solana-purple' : 
                            i % 5 === 1 ? 'text-solana-blue' : 
                            i % 5 === 2 ? 'text-solana-green' :
                            i % 5 === 3 ? 'text-amber-500' :
                            'text-red-500'
                          }`} />
                          <span className="font-medium">
                            {i % 3 === 0 ? 'Whale Account' : i % 3 === 1 ? 'Team Wallet' : 'Smart Contract'}
                            {i > 2 ? ` ${Math.floor(i/3)}` : ''}
                          </span>
                        </div>
                        <div className="flex">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-3 text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">Addresses:</span>
                          <span>{(i + 1) * 2}</span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">Created:</span>
                          <span>{new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Category:</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            i % 4 === 0 ? 'bg-solana-purple/10 text-solana-purple' : 
                            i % 4 === 1 ? 'bg-solana-blue/10 text-solana-blue' : 
                            i % 4 === 2 ? 'bg-solana-green/10 text-solana-green' :
                            'bg-amber-500/10 text-amber-500'
                          }`}>
                            {i % 4 === 0 ? 'Custom' : i % 4 === 1 ? 'Project' : i % 4 === 2 ? 'Entity' : 'Watchlist'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3 text-sm">
                        {i % 3 === 0 
                          ? 'Large holder account with significant activity' 
                          : i % 3 === 1 
                            ? 'Project team wallet for controlled assets'
                            : 'Smart contract with automated functions'
                        }
                      </div>
                      
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Address
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="detection" className="flex-1 overflow-auto">
              <div className="rounded-md border border-border overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-medium">Automatic Pattern Detection</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure automated detection of wallet types and patterns
                  </p>
                </div>
                
                <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium mb-3">Detection Rules</h4>
                    <div className="space-y-3">
                      {[
                        'Exchange deposit/withdrawal patterns',
                        'NFT marketplace trading activity',
                        'DeFi protocol interaction',
                        'Bot-like transaction behavior',
                        'Staking contract patterns'
                      ].map((rule, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border border-border rounded-md">
                          <div className="flex items-center">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                              i % 3 === 0 ? 'bg-solana-purple/10 text-solana-purple' : 
                              i % 3 === 1 ? 'bg-solana-blue/10 text-solana-blue' : 
                              'bg-solana-green/10 text-solana-green'
                            }`}>
                              {i + 1}
                            </div>
                            <span className="ml-3">{rule}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">Edit</Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      <Button className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Detection Rule
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-3">Latest Detections</h4>
                    <div className="border border-border rounded-md overflow-hidden">
                      <div className="p-3 border-b border-border bg-muted/20">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium">Recent Pattern Matches</h5>
                          <Button size="sm" variant="outline">Refresh</Button>
                        </div>
                      </div>
                      <div className="divide-y divide-border">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="p-3 hover:bg-muted/20">
                            <div className="flex justify-between">
                              <div>
                                <div className="font-medium">
                                  {i % 3 === 0 ? 'Exchange Pattern' : i % 3 === 1 ? 'NFT Trading' : 'DeFi Interaction'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Matched: {formatAddress(`wallet${i}pattern`, 6)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm">{new Date(Date.now() - i * 3600000).toLocaleTimeString()}</div>
                                <div className="text-xs text-muted-foreground">
                                  {i === 0 ? 'Just now' : i === 1 ? '1 hour ago' : `${i} hours ago`}
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 flex justify-between">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${
                                i % 3 === 0 ? 'bg-solana-blue/10 text-solana-blue' : 
                                i % 3 === 1 ? 'bg-solana-purple/10 text-solana-purple' : 
                                'bg-solana-green/10 text-solana-green'
                              }`}>
                                {i % 3 === 0 ? 'High confidence' : i % 3 === 1 ? 'Medium confidence' : 'Needs review'}
                              </span>
                              <Button size="sm" variant="outline" className="h-6 text-xs">
                                Apply Label
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mt-4 p-4 border border-border rounded-md">
                      <h4 className="text-sm font-medium mb-2">Auto-Labeling</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Configure automatic application of labels based on detection rules
                      </p>
                      <div className="flex justify-between">
                        <div className="space-x-2">
                          <Button variant="outline" size="sm">Configure</Button>
                          <Button variant="outline" size="sm">View History</Button>
                        </div>
                        <Button variant="default" size="sm">Enable Auto-Labeling</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  )
}