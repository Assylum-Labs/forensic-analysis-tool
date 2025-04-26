"use client"

import { useState, useEffect } from 'react'
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
  Flag,
  Loader2,
  Users,
  Network,
  CheckCircle2,
  Clock,
  DollarSign,
  BarChart,
  X
} from 'lucide-react'
import ClusterGraph from '@/components/ClusterGraph'
import { fetchAndClusterTransactions, getClusteringStats } from '@/lib/clusteringService'
import { TransactionCluster } from '@/lib/transactionClustering'

export default function TransactionClusteringPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'all'>('week')
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
  const { toast } = useToast()

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
    
    try {
      // Fetch and analyze clusters
      const results = await fetchAndClusterTransactions(searchQuery, {
        timeframe,
        filterType: filterType || undefined
      })
      
      // Update state with results
      setClusteringResults(results)
      
      // Calculate statistics
      const stats = getClusteringStats(results.clusters)
      setClusterStats(stats)
      
      // Select the first cluster if available
      if (results.clusters.length > 0) {
        setSelectedCluster(results.clusters[0])
      }
      
      // Show success message
      toast({
        title: "Clustering Complete",
        description: `Identified ${results.clusters.length} transaction clusters and ${results.flaggedClusters.length} suspicious patterns`
      })
    } catch (error) {
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

  // Handle timeframe change
  const handleTimeframeChange = (value: 'day' | 'week' | 'month' | 'all') => {
    setTimeframe(value)
  }

  // Handle filter change
  const handleFilterChange = (type: string) => {
    setFilterType(type === filterType ? '' : type)
  }

  // Handle cluster selection
  const handleClusterSelect = (cluster: TransactionCluster) => {
    setSelectedCluster(cluster)
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
          
          <form onSubmit={handleClusterAnalysis} className="mt-4 flex flex-col md:flex-row gap-2">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Enter wallet address, token, or transaction pattern"
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
              </select>
            </div>
          </form>

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

        <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidde">
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
                        {selectedCluster && (
                          <p className="text-sm text-muted-foreground">
                            {selectedCluster.type} · {selectedCluster.accounts.length} accounts · {selectedCluster.transactions.length} transactions
                          </p>
                        )}
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
                      {selectedCluster ? (
                        <ClusterGraph 
                          cluster={selectedCluster} 
                          className="h-full w-full"
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          Select a cluster to visualize
                        </div>
                      )}
                    </div>
                    
                    {/* Cluster details panel */}
                    {selectedCluster && (
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