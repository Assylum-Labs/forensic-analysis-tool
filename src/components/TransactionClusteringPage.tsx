"use client"

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { formatAddress } from '@/lib/utils'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { 
  Download,
  Filter,
  HelpCircle,
  Search,
  Upload,
  Layers,
  AlertTriangle,
  Flag,
  Loader2,
  Users,
  Network,
  CheckCircle2,
  Clock,
  DollarSign,
  BarChart,
  X,
  Calendar,
  Sliders
} from 'lucide-react'
import ClusterGraph from '@/components/ClusterGraph'
import { fetchAndClusterTransactions, getClusteringStats } from '@/lib/clusteringService'
import { TransactionCluster } from '@/lib/transactionClustering'
import DepthControl from '@/components/DepthControl' // Import the new depth control component
// import ClusterGraph from '@/components/ClusterGraph' // Import the depth-aware graph

// New interface to track network depth for nodes
interface NodeDepthMap {
  [key: string]: number;
}


export default function TransactionClusteringPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'all' | 'custom'>('week')
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7) // Default to a week ago
    return date
  })
  const [endDate, setEndDate] = useState(new Date())
  const [activeTab, setActiveTab] = useState('clusters')
  const [selectedCluster, setSelectedCluster] = useState<TransactionCluster | null>(null)
  const [clusteringResults, setClusteringResults] = useState<{
    clusters: TransactionCluster[],
    flaggedClusters: TransactionCluster[],
    walletGroups: {
      groups: string[][],
      strength: ('High' | 'Medium' | 'Low')[]
    },
    ringClusters: TransactionCluster[]
  } | null>(null)
  const [clusterStats, setClusterStats] = useState<any>(null)
  const [filterType, setFilterType] = useState<string>('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [highlightSuspicious, setHighlightSuspicious] = useState(true)
  // const [maxDepth, setMaxDepth] = useState<number>(2) // Default to 2 hops
  const { toast } = useToast()


  const [networkDepth, setNetworkDepth] = useState(1)
  const [maxDepth, setMaxDepth] = useState(5)
  const [nodeDepths, setNodeDepths] = useState<NodeDepthMap>({})
  const [filteredCluster, setFilteredCluster] = useState<TransactionCluster | null>(null)

  // Update start date when timeframe changes
  useEffect(() => {
    const now = new Date()
    
    if (timeframe === 'custom') {
      setShowDatePicker(true)
      return
    }
    
    setShowDatePicker(false)
    
    if (timeframe === 'day') {
      const oneDayAgo = new Date(now)
      oneDayAgo.setDate(now.getDate() - 1)
      setStartDate(oneDayAgo)
    } else if (timeframe === 'week') {
      const oneWeekAgo = new Date(now)
      oneWeekAgo.setDate(now.getDate() - 7)
      setStartDate(oneWeekAgo)
    } else if (timeframe === 'month') {
      const oneMonthAgo = new Date(now)
      oneMonthAgo.setDate(now.getDate() - 30)
      setStartDate(oneMonthAgo)
    } else if (timeframe === 'all') {
      // Set to Solana launch date (approximate)
      setStartDate(new Date(2020, 2, 16))
    }
    
    setEndDate(now)
  }, [timeframe])

  // Function to run the clustering analysis
  const handleClusterAnalysis = async (e: React.FormEvent) => {
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
    setClusteringResults(null)
    setSelectedCluster(null)
    setFilteredCluster(null)
    setNodeDepths({})
    
    try {
      // Fetch and analyze clusters with date range and max depth
      const results = await fetchAndClusterTransactions(searchQuery, {
        timeframe,
        startDate,
        endDate,
        filterType: filterType || undefined,
        batchSize: timeframe === 'month' || timeframe === 'all' ? 50 : 100, // Smaller batch size for longer periods
        maxDepth // Include the maxDepth parameter
      })
      
      // Update state with results
      setClusteringResults(results)
      
      // Calculate statistics
      const stats = getClusteringStats(results.clusters)
      setClusterStats(stats)
      
      // Select the first cluster if available
      if (results.clusters.length > 0) {
        // setSelectedCluster(results.clusters[0])
        const firstCluster = results.clusters[0]
        setSelectedCluster(firstCluster)
        
        // Calculate node depths from the origin address
        const depths = calculateNodeDepths(firstCluster, searchQuery)
        setNodeDepths(depths)
        
        // Set maximum possible depth for this cluster
        const max = Math.max(...Object.values(depths))
        setMaxDepth(max > 0 ? max : 3) // Default to 3 if no depths calculated
        
        // Create filtered cluster based on current depth setting
        setFilteredCluster(filterClusterByDepth(firstCluster, depths, networkDepth))
      }
      
      // Show success message
      toast({
        title: "Clustering Complete",
        description: `Identified ${results.clusters.length} transaction clusters with max depth of ${maxDepth === Infinity ? "all" : maxDepth} hops`
      })
    } catch (error: any) {
      console.error("Clustering error:", error)
      toast({
        title: "Clustering Failed",
        description: error.message || "An error occurred during cluster analysis",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }


  // Handle depth change
  const handleDepthChange = (depth: number) => {
    setNetworkDepth(depth)
    
    // Only update filtered cluster if we have a selected cluster
    if (selectedCluster) {
      setFilteredCluster(filterClusterByDepth(selectedCluster, nodeDepths, depth))
    }
  }

  // Calculate node depths from the origin address using BFS
  const calculateNodeDepths = (cluster: TransactionCluster, originAddress: string): NodeDepthMap => {
    const depths: NodeDepthMap = {}
    const visited = new Set<string>()
    const queue: [string, number][] = []
    
    // Build adjacency list
    const adjacencyList: { [key: string]: string[] } = {}
    cluster.accounts.forEach(account => {
      adjacencyList[account] = []
    })
    
    // Create a simplified connection graph from transactions
    // Ideally, this would analyze actual transactions to build precise connections
    // For demo purposes, we'll use a simplified approach
    const txMap = new Map<string, Set<string>>()
    
    cluster.transactions.forEach(txId => {
      // In a real implementation, we would analyze transaction data
      // to determine which accounts interacted
      // For now, we'll create random connections between accounts
      const involvedAccounts = cluster.accounts
        .filter(() => Math.random() > 0.5) // Randomly select accounts
        .slice(0, Math.floor(Math.random() * 3) + 2) // 2-4 accounts per transaction
      
      txMap.set(txId, new Set(involvedAccounts))
      
      // Add bidirectional connections between involved accounts
      for (let i = 0; i < involvedAccounts.length; i++) {
        for (let j = i + 1; j < involvedAccounts.length; j++) {
          const a = involvedAccounts[i]
          const b = involvedAccounts[j]
          
          if (!adjacencyList[a]) adjacencyList[a] = []
          if (!adjacencyList[b]) adjacencyList[b] = []
          
          adjacencyList[a].push(b)
          adjacencyList[b].push(a)
        }
      }
    })
    
    // Try to find the origin address in the cluster
    let startNode = originAddress
    if (!cluster.accounts.includes(startNode)) {
      // If the exact origin address isn't in the cluster, find a similar one
      // This might happen if the search used a partial match
      const closestMatch = cluster.accounts.find(a => 
        a.startsWith(originAddress.substring(0, 8))
      )
      
      if (closestMatch) {
        startNode = closestMatch
      } else {
        // Fallback: use the first account
        startNode = cluster.accounts[0]
      }
    }
    
    // BFS to find distances from origin
    queue.push([startNode, 0])
    visited.add(startNode)
    depths[startNode] = 0
    
    while (queue.length > 0) {
      const [current, depth] = queue.shift()!
      
      // Process neighbors
      const neighbors = adjacencyList[current] || []
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          depths[neighbor] = depth + 1
          queue.push([neighbor, depth + 1])
        }
      }
    }
    
    // Ensure all nodes have a depth
    cluster.accounts.forEach(account => {
      if (depths[account] === undefined) {
        // If a node isn't connected, assign maximum depth + 1
        depths[account] = Math.max(...Object.values(depths), 0) + 1
      }
    })
    
    return depths
  }

  // Filter cluster data based on depth
  const filterClusterByDepth = (
    cluster: TransactionCluster, 
    depthMap: NodeDepthMap, 
    maxDepth: number
  ): TransactionCluster => {
    // Filter accounts to only include those within the depth limit
    const filteredAccounts = cluster.accounts.filter(account => 
      (depthMap[account] !== undefined && depthMap[account] <= maxDepth)
    )
    
    // Filter programs to only include those used by accounts within depth
    const filteredPrograms = cluster.programs.filter(program => 
      filteredAccounts.includes(program)
    )
    
    // Filter transactions to only include those involving filtered accounts
    // In a real implementation, we would analyze the actual transaction data
    // For now, we'll just include a proportional subset
    const filteredTransactions = cluster.transactions.slice(
      0, 
      Math.floor(cluster.transactions.length * (filteredAccounts.length / cluster.accounts.length))
    )
    
    // Create filtered cluster
    return {
      ...cluster,
      accounts: filteredAccounts,
      programs: filteredPrograms,
      transactions: filteredTransactions,
    }
  }


  // Handle timeframe change
  const handleTimeframeChange = (value: 'day' | 'week' | 'month' | 'all' | 'custom') => {
    setTimeframe(value)
  }

  // Handle filter change
  const handleFilterChange = (type: string) => {
    setFilterType(type === filterType ? '' : type)
  }

  // Handle cluster selection
  const handleClusterSelect = (cluster: TransactionCluster) => {
    setSelectedCluster(cluster)

    const depths = calculateNodeDepths(cluster, searchQuery)
    setNodeDepths(depths)
    
    // Update max depth
    const max = Math.max(...Object.values(depths))
    setMaxDepth(max > 0 ? max : 3)
    
    // Filter cluster based on current depth setting
    setFilteredCluster(filterClusterByDepth(cluster, depths, networkDepth))
  }

  // Format SOL value
  const formatSol = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  // Format date
  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Unknown'
    return new Date(timestamp).toLocaleString()
  }

  // Get color class for risk level
  const getRiskColorClass = (score?: number) => {
    if (!score) return 'bg-gray-500/10 text-gray-500'
    if (score >= 60) return 'bg-red-500/10 text-red-500'
    if (score >= 30) return 'bg-amber-500/10 text-amber-500'
    return 'bg-green-500/10 text-green-500'
  }

  // Get risk level text
  const getRiskLevelText = (score?: number) => {
    if (!score) return 'Unknown'
    if (score >= 60) return 'High'
    if (score >= 30) return 'Medium'
    return 'Low'
  }

  const getNodesAtDepthCounts = () => {
    const counts: Record<number, number> = {}
    
    Object.values(nodeDepths).forEach(depth => {
      counts[depth] = (counts[depth] || 0) + 1
    })
    
    return counts
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">Transaction Clustering</h1>
              <p className="text-sm text-muted-foreground">
                Advanced analysis to identify related transactions and visualize fund flows
              </p>
            </div>
          </div>
          
          <form onSubmit={handleClusterAnalysis} className="mt-4 flex flex-col md:flex-row gap-2">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Enter wallet address or token"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Cluster"
                )}
              </Button>
            </div>
            <div className="flex gap-2">
              <select 
                value={timeframe}
                onChange={(e) => handleTimeframeChange(e.target.value as any)}
                className="bg-muted border border-border rounded-md text-sm p-2"
              >
                <option value="day">Last 24 Hours</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="all">All Time</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
          </form>

          {/* Custom date range picker */}
          {showDatePicker && (
            <div className="mt-4 flex flex-col sm:flex-row gap-4 items-end bg-muted/20 p-3 rounded-md border border-border">
              <div className="flex-1 space-y-1">
                <label className="text-sm text-muted-foreground">From</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <DatePicker
                    selected={startDate}
                    onChange={(date) => setStartDate(date as Date)}
                    selectsStart
                    startDate={startDate}
                    endDate={endDate}
                    maxDate={endDate}
                    className="w-full pl-10 bg-transparent border border-input h-10 rounded-md px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-sm text-muted-foreground">To</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <DatePicker
                    selected={endDate}
                    onChange={(date) => setEndDate(date as Date)}
                    selectsEnd
                    startDate={startDate}
                    endDate={endDate}
                    minDate={startDate}
                    maxDate={new Date()}
                    className="w-full pl-10 bg-transparent border border-input h-10 rounded-md px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex-none">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setTimeframe('week');
                    setShowDatePicker(false);
                  }}
                  className="h-10"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Connection depth slider */}
          {/* <div className="mt-4 flex flex-col sm:flex-row gap-4 items-center bg-muted/20 p-3 rounded-md border border-border">
            <div className="text-sm text-muted-foreground flex-shrink-0">
              Max Connection Depth:
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex justify-between text-xs text-muted-foreground px-2">
                <span>1 Hop</span>
                <span>2 Hops</span>
                <span>3 Hops</span>
                <span>All</span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                step="1"
                value={maxDepth === Infinity ? 4 : maxDepth}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setMaxDepth(value === 4 ? Infinity : value);
                }}
                className="w-full"
              />
            </div>
            <div className="px-3 py-1 rounded-full bg-solana-purple/10 text-solana-purple text-sm flex-shrink-0">
              {maxDepth === Infinity ? "All Connections" : `${maxDepth} Hop${maxDepth !== 1 ? 's' : ''}`}
            </div>
          </div> */}

          {/* Show analysis progress when loading */}
          {isLoading && (
            <div className="mt-4 p-4 border border-border rounded-md bg-muted/30">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="font-medium">Analyzing transactions...</span>
                </div>
              </div>
              <div className="w-full bg-muted/40 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all animate-pulse"
                  style={{ width: '60%' }}
                ></div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                This may take a few moments depending on the number of transactions
              </div>
            </div>
          )}

          {/* Show stats cards when results are available */}
          {clusterStats && !isLoading && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card rounded-md p-4 border border-border">
                <div className="flex justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">Clusters</h3>
                  <BarChart className="h-4 w-4 text-solana-purple" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{clusterStats.totalClusters}</span>
                  <span className="ml-1 text-sm text-muted-foreground">identified</span>
                </div>
              </div>
              
              <div className="bg-card rounded-md p-4 border border-border">
                <div className="flex justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">Accounts</h3>
                  <Users className="h-4 w-4 text-solana-blue" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{clusterStats.totalAccounts}</span>
                  <span className="ml-1 text-sm text-muted-foreground">involved</span>
                </div>
              </div>
              
              <div className="bg-card rounded-md p-4 border border-border">
                <div className="flex justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">Transactions</h3>
                  <Network className="h-4 w-4 text-solana-green" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{clusterStats.totalTransactions}</span>
                  <span className="ml-1 text-sm text-muted-foreground">processed</span>
                </div>
              </div>
              
              <div className="bg-card rounded-md p-4 border border-border">
                <div className="flex justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">Value</h3>
                  <DollarSign className="h-4 w-4 text-amber-500" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{formatSol(clusterStats.totalValue)}</span>
                  <span className="ml-1 text-sm text-muted-foreground">SOL</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 p-4 flex flex-col gap-4">
          {clusteringResults ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
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
                    
                    {/* Filter chips */}
                    <div className="px-4 py-2 border-b border-border flex gap-2 flex-wrap">
                      {Object.keys(clusterStats?.clustersByType || {}).map(type => (
                        <Button 
                          key={type}
                          size="sm"
                          variant={filterType === type ? "default" : "outline"}
                          className="h-7 text-xs"
                          onClick={() => handleFilterChange(type)}
                        >
                          {type}
                          {filterType === type && (
                            <X className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      ))}
                    </div>
                    
                    <div className="divide-y divide-border">
                      {clusteringResults.clusters.length > 0 ? (
                        clusteringResults.clusters.map((cluster, i) => (
                          <div 
                            key={cluster.id} 
                            className={`p-4 hover:bg-muted/50 cursor-pointer ${selectedCluster?.id === cluster.id ? 'bg-muted' : ''}`}
                            onClick={() => handleClusterSelect(cluster)}
                          >
                            <div className="flex justify-between items-center">
                              <div className="font-medium">Cluster #{i+1}</div>
                              <div className={`px-2 py-1 rounded text-xs ${
                                cluster.risk?.score && cluster.risk.score > 30 
                                  ? 'bg-red-500/10 text-red-500' 
                                  : 'bg-muted-foreground/10 text-muted-foreground'
                              }`}>
                                {cluster.risk?.score && cluster.risk.score > 30 
                                  ? 'Suspicious' 
                                  : `${cluster.transactions.length} transactions`}
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {cluster.type || 'Unknown pattern'}
                            </div>
                            <div className="mt-2 flex gap-2">
                              <div className="text-xs px-2 py-0.5 rounded-full bg-solana-purple/10 text-solana-purple">
                                {cluster.accounts.length} accounts
                              </div>
                              <div className="text-xs px-2 py-0.5 rounded-full bg-solana-blue/10 text-solana-blue">
                                {formatSol(cluster.totalValue)} SOL
                              </div>
                              <div className="text-xs px-2 py-0.5 rounded-full bg-solana-green/10 text-solana-green">
                                {formatDate(cluster.timestamp).split(',')[0]}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-muted-foreground">
                          No clusters found. Try a different search query or timeframe.
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="col-span-2 rounded-md border border-border flex flex-col">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Cluster Visualization</h3>
                        {selectedCluster && filteredCluster && (
                          <p className="text-sm text-muted-foreground">
                            selectedCluster.type} · {filteredCluster.accounts.length}/{selectedCluster.accounts.length} accounts visible · Depth {networkDepth}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <div className="flex gap-1 border border-border rounded-md overflow-hidden">
                          <button 
                            className={`px-2 py-1 text-sm ${showLabels ? 'bg-muted' : ''}`}
                            onClick={() => setShowLabels(!showLabels)}
                          >
                            Labels
                          </button>
                          <button 
                            className={`px-2 py-1 text-sm ${highlightSuspicious ? 'bg-muted' : ''}`}
                            onClick={() => setHighlightSuspicious(!highlightSuspicious)}
                          >
                            Highlight
                          </button>
                        </div>
                        
                        <Button variant="outline" size="sm">
                          <Sliders className="h-4 w-4 mr-2" />
                          Options
                        </Button>
                      </div>
                    </div>

                     {/* Depth control bar */}
                    {selectedCluster && (
                      <div className="px-4 py-2 border-b border-border">
                        <DepthControl 
                          depth={networkDepth}
                          maxDepth={maxDepth}
                          onChange={handleDepthChange}
                        />
                        
                      </div>
                    )}   

                    <div className="flex-1 overflow-hidden">
                      {filteredCluster ? (
                        <ClusterGraph 
                          cluster={filteredCluster} 
                          className="h-full w-full"
                          showLabels={showLabels}
                          highlightSuspicious={highlightSuspicious}
                          nodeDepths={nodeDepths}
                          originAddress={searchQuery}
                          selectedDepth={networkDepth}
                        />
                      ) : selectedCluster ? (
                        <ClusterGraph 
                          cluster={selectedCluster} 
                          className="h-full w-full"
                          showLabels={showLabels}
                          highlightSuspicious={highlightSuspicious}
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          Select a cluster to visualize
                        </div>
                      )}
                    </div>
                    
                    {/* Cluster details panel */}
                    {selectedCluster && filteredCluster && (
                      <div className="p-4 border-t border-border bg-muted/20">
                        <h4 className="font-medium mb-2">Cluster Details</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-xs text-muted-foreground">Pattern Type</div>
                            <div className="font-medium">{selectedCluster.type || 'Unknown'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Total Value</div>
                            <div className="font-medium">{formatSol(selectedCluster.totalValue)} SOL</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Time</div>
                            <div className="font-medium">{formatDate(selectedCluster.timestamp)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Risk Level</div>
                            <div className={`font-medium ${getRiskColorClass(selectedCluster.risk?.score)}`}>
                              {getRiskLevelText(selectedCluster.risk?.score)}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-muted-foreground">Visible Accounts</div>
                            <div className="font-medium">
                              {filteredCluster.accounts.length}/{selectedCluster.accounts.length}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Network Depth</div>
                            <div className={`font-medium ${networkDepth > 1 ? 'text-solana-purple' : ''}`}>
                              {networkDepth === 1 ? 'Direct only' : `${networkDepth} hops`}
                            </div>
                          </div>
                        </div>
                        
                        {/* Risk reasons if any */}
                        {selectedCluster.risk?.reasons && selectedCluster.risk.reasons.length > 0 && (
                          <div className="mt-3">
                            <div className="text-xs text-muted-foreground mb-1">Risk Factors</div>
                            <div className="space-y-1">
                              {selectedCluster.risk.reasons.map((reason, idx) => (
                                <div key={idx} className="text-xs p-1 rounded bg-red-500/5 text-red-500">
                                  • {reason}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="patterns" className="flex-1 overflow-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {['Sequential Transfers', 'Circular Flow', 'Hub and Spoke', 'Fan-out', 'Fan-in', 'Mixed Activity'].map((pattern, i) => {
                    // Count clusters of this type
                    const patternClusters = clusteringResults.clusters.filter(
                      c => c.type === pattern
                    );
                    const hasData = patternClusters.length > 0;
                    
                    return (
                      <div key={i} className="rounded-md border border-border overflow-hidden">
                        <div className="p-4 border-b border-border">
                          <h3 className="font-medium">{pattern}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {i === 0 ? 'Sequential transfers between wallets' : 
                             i === 1 ? 'Circular flow returning to origin' : 
                             i === 2 ? 'Central hub with multiple spokes' :
                             i === 3 ? 'Funds distributed from one to many' :
                             i === 4 ? 'Funds collected from many to one' :
                             'Mixed activity patterns'}
                          </p>
                        </div>
                        <div className="h-40 bg-muted/20 flex items-center justify-center">
                          {hasData ? (
                            <div className="text-center">
                              <div className="text-2xl font-bold">{patternClusters.length}</div>
                              <div className="text-sm text-muted-foreground">clusters detected</div>
                            </div>
                          ) : (
                            <div className="text-muted-foreground">No clusters of this type</div>
                          )}
                        </div>
                        <div className="p-4">
                          {hasData ? (
                            <>
                              <div className="flex justify-between items-center">
                                <div className="text-sm">Detection count:</div>
                                <div className="font-medium">{patternClusters.length}</div>
                              </div>
                              <div className="flex justify-between items-center mt-1">
                                <div className="text-sm">Average value:</div>
                                <div className="font-medium">
                                  {formatSol(patternClusters.reduce((sum, c) => sum + c.totalValue, 0) / patternClusters.length)} SOL
                                </div>
                              </div>
                              <Button 
                                className="w-full mt-3" 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setFilterType(pattern);
                                  setActiveTab('clusters');
                                }}
                              >
                                View Clusters
                              </Button>
                            </>
                          ) : (
                            <Button 
                              className="w-full mt-3" 
                              variant="outline" 
                              size="sm"
                              disabled
                            >
                              No Examples
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                    {clusteringResults.flaggedClusters.length > 0 ? (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="px-4 py-3 text-left text-sm font-medium">Anomaly Type</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Severity</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Detected</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Accounts</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {clusteringResults.flaggedClusters.map((cluster, i) => (
                            <tr key={cluster.id} className="hover:bg-muted/50">
                              <td className="px-4 py-3">
                                <div className="flex items-center">
                                  <AlertTriangle className={`h-4 w-4 mr-2 ${
                                    cluster.risk?.score && cluster.risk.score >= 60 ? 'text-red-500' : 
                                    cluster.risk?.score && cluster.risk.score >= 30 ? 'text-amber-500' : 
                                    'text-blue-500'
                                  }`} />
                                  <span>{cluster.type || 'Unusual activity'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {cluster.risk?.reasons?.[0] || 'Suspicious transaction pattern'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs ${getRiskColorClass(cluster.risk?.score)}`}>
                                  {getRiskLevelText(cluster.risk?.score)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {formatDate(cluster.timestamp)}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {cluster.accounts.length} involved
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button size="sm" variant="outline" onClick={() => {
                                  setSelectedCluster(cluster);
                                  setActiveTab('clusters');
                                }}>
                                  Investigate
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-8 text-center text-muted-foreground">
                        No anomalies detected in the analyzed transactions.
                      </div>
                    )}
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
                  
                  {clusteringResults.walletGroups.groups.length > 0 ? (
                    <div className="p-4">
                      <h4 className="font-medium mb-3">Wallet Groups</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {clusteringResults.walletGroups.groups.map((group, i) => (
                          <div key={i} className="border border-border rounded-md p-4">
                            <div className="flex justify-between items-start">
                              <div className="font-medium">Wallet Group #{i+1}</div>
                              <div className={`px-2 py-1 rounded-full text-xs ${
                                clusteringResults.walletGroups.strength[i] === 'High' 
                                  ? 'bg-red-500/10 text-red-500' 
                                  : clusteringResults.walletGroups.strength[i] === 'Medium'
                                    ? 'bg-amber-500/10 text-amber-500'
                                    : 'bg-blue-500/10 text-blue-500'
                              }`}>
                                {clusteringResults.walletGroups.strength[i]} Confidence
                              </div>
                            </div>
                            
                            <div className="mt-3 text-sm">
                              <div className="text-muted-foreground mb-1">Associated Wallets</div>
                              <div className="grid grid-cols-1 gap-1">
                                {group.slice(0, 3).map((wallet, j) => (
                                  <div key={j} className="flex items-center p-2 bg-muted/20 rounded">
                                    <div className="flex-1 font-mono text-xs">{formatAddress(wallet, 10)}</div>
                                  </div>
                                ))}
                                {group.length > 3 && (
                                  <div className="text-center text-xs text-muted-foreground mt-1">
                                    +{group.length - 3} more wallets
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="mt-3 flex gap-2">
                              <Button size="sm" variant="outline" className="flex-1">
                                Analyze Group
                              </Button>
                              <Button size="sm" variant="outline" className="flex-1">
                                <Flag className="h-4 w-4 mr-1" />
                                Flag
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
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
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                              No related wallets detected or not enough data to determine relationships.
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            // Show empty state when no results
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <BarChart className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No Clusters Analyzed</h3>
                <p className="mt-2 text-muted-foreground max-w-md">
                  Enter a wallet address or transaction pattern and click "Cluster" to begin analysis.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}