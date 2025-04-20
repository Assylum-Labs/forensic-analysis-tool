"use client"

import { useState } from 'react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import ForceDirectedGraph from '@/components/ForceDirectedGraph'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { formatAddress } from '@/lib/utils'
import { 
  Calendar, 
  FilterIcon, 
  HelpCircle,
  Download,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Search
} from 'lucide-react'

export default function TransactionFlowPage() {
  const [walletAddress, setWalletAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleAnalyze = () => {
    if (!walletAddress) {
      toast({
        title: "Error",
        description: "Please enter a wallet address",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Analysis Complete",
        description: `Transaction flow analysis for ${formatAddress(walletAddress)} is ready`
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
              <h1 className="text-2xl font-bold">Transaction Flow Analysis</h1>
              <p className="text-sm text-muted-foreground">
                Visualize fund movements between wallets with interactive flow charts
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <HelpCircle className="mr-2 h-4 w-4" />
                Help
              </Button>
              <Button variant="outline" size="sm">
                <FilterIcon className="mr-2 h-4 w-4" />
                Filters
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
          
          <div className="mt-4 flex flex-col gap-4 md:flex-row">
            <div className="w-full md:w-2/3 flex gap-2">
              <Input
                placeholder="Enter wallet address or transaction ID"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAnalyze} disabled={isLoading}>
                {isLoading ? "Analyzing..." : "Analyze"}
              </Button>
            </div>
            <div className="w-full md:w-1/3 flex gap-2">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  type="date"
                  className="pl-10"
                  placeholder="Date range"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
          <Tabs defaultValue="visual" className="w-full h-full flex flex-col">
            <TabsList>
              <TabsTrigger value="visual">Visual Flow</TabsTrigger>
              <TabsTrigger value="table">Transaction Table</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="visual" className="flex-1 overflow-hidden flex flex-col">
              <div className="border border-border rounded-md h-full relative">
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                  <Button variant="secondary" size="icon" className="rounded-full bg-background/80 backdrop-blur-sm">
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" size="icon" className="rounded-full bg-background/80 backdrop-blur-sm">
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" size="icon" className="rounded-full bg-background/80 backdrop-blur-sm">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <ForceDirectedGraph className="h-full" />
              </div>
            </TabsContent>
            
            <TabsContent value="table" className="flex-1 overflow-auto">
              <div className="rounded-md border border-border">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-medium">Transaction History</h3>
                  <div className="relative w-64">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Search className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Input className="pl-10" placeholder="Search transactions" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium">Transaction ID</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">From</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">To</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Amount</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <tr key={i} className="hover:bg-muted/50">
                          <td className="px-4 py-3 text-sm">{formatAddress(`tx${i}abcdef1234567890`, 8)}</td>
                          <td className="px-4 py-3 text-sm">{formatAddress(`wallet${i}sender`)}</td>
                          <td className="px-4 py-3 text-sm">{formatAddress(`wallet${i}receiver`)}</td>
                          <td className="px-4 py-3 text-sm">{(Math.random() * 100).toFixed(4)} SOL</td>
                          <td className="px-4 py-3 text-sm">{new Date().toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            <Button size="sm" variant="ghost">View</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="stats" className="flex-1 overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-md border border-border p-4">
                  <h3 className="font-medium mb-2">Transaction Volume</h3>
                  <div className="h-64 flex items-center justify-center bg-muted/20 rounded">
                    [Volume Chart Placeholder]
                  </div>
                </div>
                <div className="rounded-md border border-border p-4">
                  <h3 className="font-medium mb-2">Top Connected Wallets</h3>
                  <div className="h-64 overflow-auto">
                    <ul className="divide-y divide-border">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <li key={i} className="py-2 flex justify-between items-center">
                          <div>
                            <div className="font-medium">{formatAddress(`wallet${i}abcdef1234567890`, 8)}</div>
                            <div className="text-sm text-muted-foreground">{i + 1} transactions</div>
                          </div>
                          <Button size="sm" variant="outline">Analyze</Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="rounded-md border border-border p-4">
                  <h3 className="font-medium mb-2">Transaction Types</h3>
                  <div className="h-64 flex items-center justify-center bg-muted/20 rounded">
                    [Types Chart Placeholder]
                  </div>
                </div>
                <div className="rounded-md border border-border p-4">
                  <h3 className="font-medium mb-2">Activity Timeline</h3>
                  <div className="h-64 flex items-center justify-center bg-muted/20 rounded">
                    [Timeline Chart Placeholder]
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