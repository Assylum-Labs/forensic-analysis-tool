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
  Filter,
  HelpCircle,
  Search,
  Upload,
  Layers,
  AlertTriangle,
  Flag
} from 'lucide-react'
import ForceDirectedGraph from '@/components/ForceDirectedGraph'

export default function TransactionClusteringPage() {
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
        title: "Clustering Complete",
        description: `Identified transaction clusters for ${formatAddress(searchQuery)}`
      })
      setIsLoading(false)
    }, 1500)
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">Transaction Clustering</h1>
              <p className="text-sm text-muted-foreground">
                Group related transactions and identify associated wallets
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <HelpCircle className="mr-2 h-4 w-4" />
                Help
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filters
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
              placeholder="Enter wallet address, token, or transaction pattern"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Analyzing..." : "Cluster"}
            </Button>
          </form>
        </div>

        <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
          <Tabs defaultValue="clusters" className="w-full h-full flex flex-col">
            <TabsList>
              <TabsTrigger value="clusters">Cluster Analysis</TabsTrigger>
              <TabsTrigger value="patterns">Transaction Patterns</TabsTrigger>
              <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
              <TabsTrigger value="wallets">Related Wallets</TabsTrigger>
            </TabsList>
            
            <TabsContent value="clusters" className="flex-1 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
                <div className="col-span-1 rounded-md border border-border overflow-auto">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-medium">Identified Clusters</h3>
                    <div className="relative w-full max-w-xs">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Input className="pl-10" placeholder="Filter clusters" />
                    </div>
                  </div>
                  <div className="divide-y divide-border">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className={`p-4 hover:bg-muted/50 cursor-pointer ${i === 0 ? 'bg-muted' : ''}`}>
                        <div className="flex justify-between items-center">
                          <div className="font-medium">Cluster #{i+1}</div>
                          <div className={`px-2 py-1 rounded text-xs ${i === 2 ? 'bg-red-500/10 text-red-500' : 'bg-muted-foreground/10 text-muted-foreground'}`}>
                            {i === 2 ? 'Suspicious' : `${i*5 + 10} transactions`}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {i % 3 === 0 ? 'Sequential transfers' : i % 3 === 1 ? 'Circular flow' : 'Divergent pattern'}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <div className="text-xs px-2 py-0.5 rounded-full bg-solana-purple/10 text-solana-purple">
                            {3 + i} wallets
                          </div>
                          <div className="text-xs px-2 py-0.5 rounded-full bg-solana-blue/10 text-solana-blue">
                            {(i + 1) * 10}.2 SOL
                          </div>
                          <div className="text-xs px-2 py-0.5 rounded-full bg-solana-green/10 text-solana-green">
                            {['High', 'Medium', 'Low'][i % 3]} confidence
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="col-span-2 rounded-md border border-border flex flex-col">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Cluster Visualization</h3>
                      <p className="text-sm text-muted-foreground">Cluster #1 - Sequential transfers</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Layers className="mr-2 h-4 w-4" />
                        Layers
                      </Button>
                      <Button variant="outline" size="sm">
                        <Flag className="mr-2 h-4 w-4" />
                        Flag
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <ForceDirectedGraph className="h-full" />
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="patterns" className="flex-1 overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {['Sequential', 'Circular', 'Hub and Spoke', 'Layering', 'Smurfing', 'Fan-out'].map((pattern, i) => (
                  <div key={i} className="rounded-md border border-border overflow-hidden">
                    <div className="p-4 border-b border-border">
                      <h3 className="font-medium">{pattern} Pattern</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {i % 3 === 0 ? 'Sequential transfers between wallets' : 
                         i % 3 === 1 ? 'Circular flow returning to origin' : 
                         'Funds distributed across multiple wallets'}
                      </p>
                    </div>
                    <div className="h-40 bg-muted/20 flex items-center justify-center">
                      [Pattern Illustration]
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-center">
                        <div className="text-sm">Detection count:</div>
                        <div className="font-medium">{(i + 2) * 3}</div>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <div className="text-sm">Average value:</div>
                        <div className="font-medium">{(i + 1) * 125}.4 SOL</div>
                      </div>
                      <Button className="w-full mt-3" variant="outline" size="sm">View Examples</Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="anomalies" className="flex-1 overflow-auto">
              <div className="rounded-md border border-border overflow-hidden">
                <div className="p-4 border-b border-border flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">Detected Anomalies</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Unusual transactions and patterns flagged for review
                    </p>
                  </div>
                  <Button variant="outline">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Report All
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium">Anomaly Type</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Severity</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Detected</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Wallets</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {['Unusual volume', 'Suspicious timing', 'Known pattern', 'Erratic behavior', 'Mixing', 'Large transfer'].map((anomaly, i) => (
                        <tr key={i} className="hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <AlertTriangle className={`h-4 w-4 mr-2 ${i % 3 === 0 ? 'text-red-500' : i % 3 === 1 ? 'text-amber-500' : 'text-blue-500'}`} />
                              <span>{anomaly}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {i % 3 === 0 ? 'Unusually high transaction volume from a new wallet' : 
                             i % 3 === 1 ? 'Transactions occurring at consistent off-hours' : 
                             'Multiple small transactions followed by a large withdrawal'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              i % 3 === 0 ? 'bg-red-500/10 text-red-500' : 
                              i % 3 === 1 ? 'bg-amber-500/10 text-amber-500' : 
                              'bg-blue-500/10 text-blue-500'}`}>
                              {i % 3 === 0 ? 'High' : i % 3 === 1 ? 'Medium' : 'Low'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {i * 2 + 3} involved
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant="outline">Investigate</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="wallets" className="flex-1 overflow-auto">
              <div className="rounded-md border border-border">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-medium">Associated Wallets</h3>
                  <div className="relative w-64">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Search className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Input className="pl-10" placeholder="Search wallets" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium">Wallet Address</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Cluster ID</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Transactions</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Volume</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="hover:bg-muted/50">
                          <td className="px-4 py-3 text-sm">{formatAddress(`wallet${i}abcdef1234567890`, 8)}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${
                              i % 4 === 0 ? 'bg-solana-purple/10 text-solana-purple' : 
                              i % 4 === 1 ? 'bg-solana-blue/10 text-solana-blue' : 
                              i % 4 === 2 ? 'bg-solana-green/10 text-solana-green' :
                              'bg-amber-500/10 text-amber-500'}`}>
                              {i % 4 === 0 ? 'Source' : i % 4 === 1 ? 'Intermediary' : i % 4 === 2 ? 'Recipient' : 'Mix'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            Cluster #{Math.floor(i / 3) + 1}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {(i + 2) * 5}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {(i + 1) * 125}.4 SOL
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant="outline">Analyze</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  )
}