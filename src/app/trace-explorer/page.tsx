"use client"

import { useState } from 'react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { formatAddress } from '@/lib/utils'
import { 
  ArrowRight,
  Clock,
  Download,
  ExternalLink,
  Filter,
  HelpCircle,
  History,
  Play,
  RefreshCw,
  Search,
  Share2
} from 'lucide-react'
import ForceDirectedGraph from '@/components/ForceDirectedGraph'

export default function TraceExplorerPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isTracing, setIsTracing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const { toast } = useToast()

  const handleTrace = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery) {
      toast({
        title: "Error",
        description: "Please enter a starting address or transaction",
        variant: "destructive"
      })
      return
    }

    setIsTracing(true)
    setCurrentStep(0)
    
    // Simulate trace analysis with steps
    const totalSteps = 5
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        const next = prev + 1
        if (next >= totalSteps) {
          clearInterval(interval)
          setIsTracing(false)
          toast({
            title: "Trace Complete",
            description: `Full transaction path traced for ${formatAddress(searchQuery)}`
          })
          return totalSteps
        }
        return next
      })
    }, 1000)
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        <div className="border-b border-[#333] p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">Trace Explorer</h1>
              <p className="text-sm text-muted-foreground">
                Track the complete journey of funds through the blockchain
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <HelpCircle className="mr-2 h-4 w-4" />
                Help
              </Button>
              <Button variant="outline" size="sm">
                <History className="mr-2 h-4 w-4" />
                History
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
          
          <form onSubmit={handleTrace} className="mt-4 flex flex-col gap-4 md:flex-row">
            <div className="w-full md:w-2/3 flex gap-2">
              <Input
                placeholder="Enter starting wallet address or transaction ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={isTracing}>
                {isTracing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Tracing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Trace
                  </>
                )}
              </Button>
            </div>
            <div className="w-full md:w-1/3 flex gap-2">
              <Button variant="outline" className="w-full md:w-auto">
                <Filter className="mr-2 h-4 w-4" />
                Trace Filters
              </Button>
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <select className="flex h-10 w-full appearance-none rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option>Last 24 hours</option>
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>All time</option>
                </select>
              </div>
            </div>
          </form>
          
          {isTracing && (
            <div className="mt-4 p-4 border border-[#333] rounded-md bg-muted/30">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  <span className="font-medium">Tracing transactions...</span>
                </div>
                <span className="text-sm">{currentStep === 5 ? 'Complete' : `Step ${currentStep + 1}/5`}</span>
              </div>
              <div className="w-full bg-muted/40 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all" 
                  style={{ width: `${(currentStep / 5) * 100}%` }}
                ></div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {currentStep === 0 && "Identifying starting point..."}
                {currentStep === 1 && "Finding direct connections..."}
                {currentStep === 2 && "Analyzing transaction patterns..."}
                {currentStep === 3 && "Tracing through intermediaries..."}
                {currentStep === 4 && "Identifying final destinations..."}
                {currentStep === 5 && "Trace complete! Visualizing results..."}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
          <Tabs defaultValue="graph" className="w-full h-full flex flex-col">
            <TabsList>
              <TabsTrigger value="graph">Graph View</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="path">Path Analysis</TabsTrigger>
              <TabsTrigger value="entities">Entity Identification</TabsTrigger>
            </TabsList>
            
            <TabsContent value="graph" className="flex-1 overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full">
                <div className="md:col-span-3 rounded-md border border-[#333] overflow-hidden relative">
                  <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <Button variant="secondary" size="sm" className="bg-background/80 backdrop-blur-sm">
                      Zoom In
                    </Button>
                    <Button variant="secondary" size="sm" className="bg-background/80 backdrop-blur-sm">
                      Zoom Out
                    </Button>
                  </div>
                  <div className="h-full">
                    <ForceDirectedGraph className="h-full" />
                  </div>
                </div>
                
                <div className="overflow-y-auto">
                  <div className="rounded-md border border-[#333] bg-card overflow-hidden mb-4">
                    <div className="p-4 border-b border-[#333]">
                      <h3 className="font-medium">Trace Summary</h3>
                    </div>
                    <div className="p-4">
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-muted-foreground">Start Point</div>
                          <div className="font-medium">{formatAddress(searchQuery || '5K...bQRz', 8)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Trace Depth</div>
                          <div className="font-medium">5 hops</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Wallets Involved</div>
                          <div className="font-medium">24 unique addresses</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Time Span</div>
                          <div className="font-medium">3 days, 4 hours</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Total Value</div>
                          <div className="font-medium">2,458.34 SOL</div>
                        </div>
                      </div>
                      
                      <div className="mt-6 space-y-2">
                        <Button variant="outline" size="sm" className="w-full justify-between">
                          <span>View Detailed Report</span>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="w-full justify-between">
                          <span>Export Trace Data</span>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="rounded-md border border-[#333] bg-card overflow-hidden">
                    <div className="p-4 border-b border-[#333] flex justify-between items-center">
                      <h3 className="font-medium">Key Nodes</h3>
                      <Button variant="outline" size="sm">
                        <Filter className="h-3 w-3 mr-1" />
                        Filter
                      </Button>
                    </div>
                    <div className="divide-y divide-[#333]">
                      {['Source', 'Intermediary', 'Mixer', 'Exchange', 'Destination'].map((type, i) => (
                        <div key={i} className="p-3 hover:bg-muted/20">
                          <div className="flex justify-between">
                            <div className="font-medium">{type}</div>
                            <div className={`px-2 py-0.5 text-xs rounded-full ${
                              i === 0 ? 'bg-solana-purple/10 text-solana-purple' : 
                              i === 1 ? 'bg-solana-blue/10 text-solana-blue' : 
                              i === 2 ? 'bg-red-500/10 text-red-500' :
                              i === 3 ? 'bg-amber-500/10 text-amber-500' :
                              'bg-solana-green/10 text-solana-green'
                            }`}>
                              {i === 0 ? 'Origin' : 
                               i === 1 ? 'Transit' : 
                               i === 2 ? 'High Risk' :
                               i === 3 ? 'Known' :
                               'Final'}
                            </div>
                          </div>
                          <div className="text-sm mt-1">{formatAddress(`wallet${i}xyzabcd123456`, 8)}</div>
                          <div className="flex justify-between mt-2">
                            <div className="text-xs text-muted-foreground">
                              {i === 0 ? 'Sent' : i === 4 ? 'Received' : 'Processed'} {(5 - i) * 123}.45 SOL
                            </div>
                            <Button variant="ghost" size="sm" className="h-6 px-2">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="timeline" className="flex-1 overflow-auto">
              <div className="rounded-md border border-[#333] p-4">
                <h3 className="font-medium mb-6">Transaction Timeline</h3>
                <div className="relative">
                  <div className="absolute left-5 h-full w-0.5 bg-muted"></div>
                  <div className="space-y-8">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="relative pl-10">
                        <div className={`absolute left-0 rounded-full p-2 ${
                          i === 0 ? 'bg-solana-purple/20 text-solana-purple' : 
                          i === 1 ? 'bg-solana-blue/20 text-solana-blue' : 
                          i === 2 ? 'bg-red-500/20 text-red-500' :
                          i === 3 ? 'bg-amber-500/20 text-amber-500' :
                          'bg-solana-green/20 text-solana-green'
                        }`}>
                          <span className="block h-2 w-2 rounded-full bg-current"></span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between">
                          <div>
                            <h4 className="font-medium">
                              {i === 0 ? 'Initial Transaction' : 
                               i === 1 ? 'Transfer to Intermediary' : 
                               i === 2 ? 'Multiple Splitting' :
                               i === 3 ? 'Exchange Deposit' :
                               'Final Destination'}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {i === 0 ? 'Source wallet initiated the transaction' : 
                               i === 1 ? 'Funds moved to an intermediary wallet' : 
                               i === 2 ? 'Funds split into 5 different transactions' :
                               i === 3 ? 'Funds deposited to a known exchange' :
                               'Funds reached final destination wallet'}
                            </p>
                          </div>
                          <div className="mt-2 sm:mt-0 text-sm">
                            <div className="text-muted-foreground">
                              {new Date(Date.now() - i * 3600000).toLocaleString()}
                            </div>
                            <div className="font-mono mt-1">
                              {formatAddress(`tx${i}xyzabcd123456`, 8)}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 rounded-md border border-[#333] p-3 bg-card/50">
                          <div className="flex justify-between text-sm">
                            <div>
                              <span className="text-muted-foreground">From: </span>
                              {formatAddress(`wallet${i}sender`, 8)}
                            </div>
                            <div>
                              <span className="text-muted-foreground">To: </span>
                              {formatAddress(`wallet${i}receiver`, 8)}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Amount: </span>
                              {(5 - i) * 123}.45 SOL
                            </div>
                          </div>
                          <div className="mt-2 flex justify-end gap-2">
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                              View Details
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="path" className="flex-1 overflow-auto">
              <div className="rounded-md border border-[#333] p-4">
                <h3 className="font-medium mb-4">Path Analysis</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Analysis of transaction paths, patterns, and anomalies
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-md border border-[#333] p-4">
                    <h4 className="font-medium mb-3">Path Structure</h4>
                    <div className="h-40 mb-3 bg-muted/20 rounded flex items-center justify-center">
                      [Path Structure Visualization]
                    </div>
                    <div className="text-sm">
                      <div className="grid grid-cols-2 gap-y-2">
                        <div className="text-muted-foreground">Path Type:</div>
                        <div>Splitting Pattern</div>
                        <div className="text-muted-foreground">Complexity:</div>
                        <div>High (Multiple Branches)</div>
                        <div className="text-muted-foreground">Max Depth:</div>
                        <div>5 hops</div>
                        <div className="text-muted-foreground">Recombination:</div>
                        <div>Yes (3 instances)</div>
                      </div>
                      <div className="mt-4">
                        <div className="text-muted-foreground mb-1">Pattern Match:</div>
                        <div className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded text-xs inline-block">
                          75% similar to known laundering pattern
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="rounded-md border border-[#333] p-4">
                    <h4 className="font-medium mb-3">Timing Analysis</h4>
                    <div className="h-40 mb-3 bg-muted/20 rounded flex items-center justify-center">
                      [Timing Distribution Chart]
                    </div>
                    <div className="text-sm">
                      <div className="grid grid-cols-2 gap-y-2">
                        <div className="text-muted-foreground">Total Duration:</div>
                        <div>3 days, 4 hours</div>
                        <div className="text-muted-foreground">Avg Time Between:</div>
                        <div>4.2 hours</div>
                        <div className="text-muted-foreground">Unusual Timing:</div>
                        <div>2 overnight transactions</div>
                        <div className="text-muted-foreground">Synchronized:</div>
                        <div>Yes (batch processing)</div>
                      </div>
                      <div className="mt-4">
                        <div className="text-muted-foreground mb-1">Anomaly:</div>
                        <div className="px-2 py-1 bg-red-500/10 text-red-500 rounded text-xs inline-block">
                          Suspicious timing correlation detected
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="rounded-md border border-[#333] p-4">
                    <h4 className="font-medium mb-3">Value Flow</h4>
                    <div className="text-sm">
                      <div className="mb-4">
                        <div className="flex justify-between mb-1">
                          <span>Initial Amount</span>
                          <span className="font-medium">2,500.00 SOL</span>
                        </div>
                        <div className="w-full h-2 bg-muted/20 rounded-full overflow-hidden">
                          <div className="h-full bg-solana-purple w-full"></div>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex justify-between mb-1">
                          <span>After Hop 1</span>
                          <span className="font-medium">2,496.25 SOL (- fees)</span>
                        </div>
                        <div className="w-full h-2 bg-muted/20 rounded-full overflow-hidden">
                          <div className="h-full bg-solana-blue w-[99.8%]"></div>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex justify-between mb-1">
                          <span>After Hop 3</span>
                          <span className="font-medium">2,482.78 SOL (- fees)</span>
                        </div>
                        <div className="w-full h-2 bg-muted/20 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 w-[99.3%]"></div>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex justify-between mb-1">
                          <span>Final Amount</span>
                          <span className="font-medium">2,458.34 SOL (- fees)</span>
                        </div>
                        <div className="w-full h-2 bg-muted/20 rounded-full overflow-hidden">
                          <div className="h-full bg-solana-green w-[98.3%]"></div>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex justify-between">
                        <div className="text-muted-foreground">Total Fees:</div>
                        <div>41.66 SOL (1.7%)</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="rounded-md border border-[#333] p-4">
                    <h4 className="font-medium mb-3">Risk Assessment</h4>
                    <div className="mb-4 flex gap-3">
                      <div className="flex-1 p-3 rounded bg-muted/20">
                        <div className="text-2xl font-bold mb-1 text-amber-500">75</div>
                        <div className="text-xs text-muted-foreground">Risk Score</div>
                      </div>
                      <div className="flex-1 p-3 rounded bg-muted/20">
                        <div className="text-2xl font-bold mb-1 text-solana-purple">60%</div>
                        <div className="text-xs text-muted-foreground">Suspicious</div>
                      </div>
                      <div className="flex-1 p-3 rounded bg-muted/20">
                        <div className="text-2xl font-bold mb-1 text-solana-blue">40%</div>
                        <div className="text-xs text-muted-foreground">Normal</div>
                      </div>
                    </div>
                    
                    <div className="text-sm space-y-2">
                      <div className="flex items-center p-2 rounded bg-red-500/10">
                        <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                        <span>Multiple intermediary hops</span>
                      </div>
                      <div className="flex items-center p-2 rounded bg-red-500/10">
                        <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                        <span>Transaction splitting pattern</span>
                      </div>
                      <div className="flex items-center p-2 rounded bg-amber-500/10">
                        <div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>
                        <span>Suspicious timing correlation</span>
                      </div>
                      <div className="flex items-center p-2 rounded bg-amber-500/10">
                        <div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>
                        <span>Known exchange deposit pattern</span>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Button variant="outline" size="sm" className="w-full">
                        Generate Detailed Risk Report
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="entities" className="flex-1 overflow-auto">
              <div className="rounded-md border border-[#333] p-4">
                <h3 className="font-medium mb-4">Entity Identification</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Identified entities involved in the transaction flow
                </p>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#333] bg-muted/50">
                          <th className="px-4 py-3 text-left text-sm font-medium">Entity</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Addresses</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Role in Flow</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Risk Level</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#333]">
                        {[
                          { name: 'Unknown Wallet', type: 'Unidentified', role: 'Source', risk: 'Medium' },
                          { name: 'Wallet Group A', type: 'Cluster', role: 'Intermediary', risk: 'High' },
                          { name: 'Mixer Service', type: 'Mixing Service', role: 'Processing', risk: 'Very High' },
                          { name: 'Binance', type: 'Exchange', role: 'Destination', risk: 'Low' },
                          { name: 'Whale Address', type: 'Large Holder', role: 'Final Destination', risk: 'Medium' },
                        ].map((entity, i) => (
                          <tr key={i} className="hover:bg-muted/20">
                            <td className="px-4 py-3">
                              <div className="font-medium">{entity.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {i === 3 ? 'Verified' : i === 2 ? 'Flagged' : 'Detected'} entity
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs ${
                                entity.type === 'Exchange' ? 'bg-solana-blue/10 text-solana-blue' :
                                entity.type === 'Mixing Service' ? 'bg-red-500/10 text-red-500' :
                                entity.type === 'Cluster' ? 'bg-amber-500/10 text-amber-500' :
                                entity.type === 'Large Holder' ? 'bg-solana-green/10 text-solana-green' :
                                'bg-muted-foreground/10 text-muted-foreground'
                              }`}>
                                {entity.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {i === 0 ? '1' : i === 1 ? '5' : i === 2 ? '12' : i === 3 ? '8' : '2'} addresses
                            </td>
                            <td className="px-4 py-3 text-sm">{entity.role}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs ${
                                entity.risk === 'Low' ? 'bg-green-500/10 text-green-500' :
                                entity.risk === 'Medium' ? 'bg-amber-500/10 text-amber-500' :
                                entity.risk === 'High' ? 'bg-orange-500/10 text-orange-500' :
                                'bg-red-500/10 text-red-500'
                              }`}>
                                {entity.risk}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button size="sm" variant="outline">View Details</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="rounded-md border border-[#333] p-4 mt-6">
                    <h4 className="font-medium mb-4">Entity Connections</h4>
                    <div className="h-64 bg-muted/20 rounded flex items-center justify-center mb-4">
                      [Entity Connection Diagram]
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-sm font-medium mb-3">Connection Summary</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between p-2 bg-muted/20 rounded">
                            <span className="text-muted-foreground">Total Connections:</span>
                            <span>8 direct links</span>
                          </div>
                          <div className="flex justify-between p-2 bg-muted/20 rounded">
                            <span className="text-muted-foreground">Known Relationships:</span>
                            <span>3 verified</span>
                          </div>
                          <div className="flex justify-between p-2 bg-muted/20 rounded">
                            <span className="text-muted-foreground">Common Patterns:</span>
                            <span>Exchange deposit flow</span>
                          </div>
                          <div className="flex justify-between p-2 bg-muted/20 rounded">
                            <span className="text-muted-foreground">Risk Assessment:</span>
                            <span className="text-amber-500">Medium</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="text-sm font-medium mb-3">Recommended Actions</h5>
                        <div className="space-y-3">
                          <Button variant="outline" size="sm" className="w-full justify-between">
                            <span>Report Suspicious Activity</span>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="w-full justify-between">
                            <span>Add Custom Labels</span>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="w-full justify-between">
                            <span>Save to Watchlist</span>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="w-full justify-between">
                            <span>Generate Full Report</span>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
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