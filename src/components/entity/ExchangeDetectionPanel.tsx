"use client"

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useEntities } from '@/contexts/EntityContext';
import { Button } from '@/components/ui/button';
import { formatAddress } from '@/lib/utils';
import { Search, CheckCircle2, ExternalLink, Plus, Filter, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Entity } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Exchange detection functions with different confidence levels
const detectExchangesWithPatterns = (entities: Entity[]) => {
  // Define regex patterns for different confidence levels
  const patterns = {
    high: /\b(exchange|exc)\b/i,
    medium: /\b(exchange|cex|dex)\b/i,
    low: /\b(exchange|cex|dex|swap|finance)\b/i
  };

  // Filter out already labeled exchanges
  const nonExchangeEntities = entities.filter(entity => entity.type !== 'exchange');
  
  // Detect exchanges with different confidence levels
  const results = nonExchangeEntities.map(entity => {
    const name = entity.name || '';
    
    let confidence: 'high' | 'medium' | 'low' | null = null;
    let matchedPattern = '';
    
    // Check for high confidence match
    if (patterns.high.test(name)) {
      confidence = 'high';
      matchedPattern = 'High confidence name match';
    }
    // Check for medium confidence match if not already matched
    else if (patterns.medium.test(name)) {
      confidence = 'medium';
      matchedPattern = 'Medium confidence name match';
    }
    // Check for low confidence match if not already matched
    else if (patterns.low.test(name)) {
      confidence = 'low';
      matchedPattern = 'Low confidence name match';
    }
    
    // Return the entity with confidence level if it matches any pattern
    return confidence ? {
      entity,
      confidence,
      pattern: matchedPattern,
      depositAddresses: entity.relatedAddresses.length // Use related addresses count
    } : null;
  });
  
  // Filter out null values
  const filtered = results.filter((item): item is {
    entity: Entity;
    confidence: 'high' | 'medium' | 'low';
    pattern: string;
    depositAddresses: number;
  } => item !== null);
  
  // Sort by confidence level: high -> medium -> low
  return filtered.sort((a, b) => {
    const confidenceOrder = { high: 1, medium: 2, low: 3 };
    return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
  });
};

const ExchangeDetectionPanel = () => {
  const { updateEntity, getCachedEntities, forceRefreshCache } = useEntities();
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cachedEntities, setCachedEntities] = useState<Entity[]>([]);
  const [filters, setFilters] = useState({
    type: 'all', // 'all', 'cex', 'dex'
    status: 'all', // 'all', 'verified', 'unverified'
  });
  const [scanStats, setScanStats] = useState<{
    totalScanned: number;
    detectedCount: number;
    lastScanTime: Date | null;
  }>({
    totalScanned: 0,
    detectedCount: 0,
    lastScanTime: null
  });
  const [detectedExchanges, setDetectedExchanges] = useState<{
    entity: Entity;
    confidence: 'high' | 'medium' | 'low';
    depositAddresses: number;
    pattern: string;
  }[]>([]);

  // Function to fetch entities from cache
  const fetchCachedEntities = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get all entities from cache
      const allEntities = getCachedEntities();
      setCachedEntities(allEntities);
    } catch (error) {
      console.error('Error fetching cached entities:', error);
      toast({
        title: 'Error',
        description: 'Failed to load entities from cache',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [getCachedEntities, toast]);
  
  // Function to refresh the cache and reload entities
  const handleRefreshCache = async () => {
    setIsRefreshing(true);
    try {
      await forceRefreshCache();
      await fetchCachedEntities();
      toast({
        title: 'Cache Refreshed',
        description: 'Entity cache has been refreshed with latest data'
      });
    } catch (error) {
      console.error('Error refreshing cache:', error);
      toast({
        title: 'Refresh Error',
        description: 'Failed to refresh entity cache',
        variant: 'destructive'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load cached entities on component mount
  useEffect(() => {
    fetchCachedEntities();
  }, [fetchCachedEntities]);

  // Filter exchanges from cached entities
  const exchangeEntities = useMemo(() => {
    // Start with all exchange entities
    let filtered = cachedEntities.filter(entity => entity.type === 'exchange');
    
    // Apply type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(entity => entity.subtype?.toLowerCase() === filters.type);
    }
    
    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(entity => 
        filters.status === 'verified' ? entity.verified : !entity.verified
      );
    }
    
    // Sort: first by verification status (verified first), then by name
    return filtered.sort((a, b) => {
      if (a.verified && !b.verified) return -1;
      if (!a.verified && b.verified) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [cachedEntities, filters]);

  // Count verified and unverified exchanges
  const exchangeStats = useMemo(() => {
    const allExchanges = cachedEntities.filter(entity => entity.type === 'exchange');
    const verified = allExchanges.filter(entity => entity.verified).length;
    const unverified = allExchanges.length - verified;
    return { 
      verified, 
      unverified, 
      total: allExchanges.length,
      filtered: exchangeEntities.length
    };
  }, [cachedEntities, exchangeEntities]);

  const handleScanForExchanges = () => {
    setIsScanning(true);
    
    // Run the detection algorithm
    try {
      // Get all non-exchange entities that will be scanned
      const nonExchangeEntities = cachedEntities.filter(entity => entity.type !== 'exchange');
      const detected = detectExchangesWithPatterns(cachedEntities);
      
      // Update detected exchanges and scan stats
      setDetectedExchanges(detected);
      setScanStats({
        totalScanned: nonExchangeEntities.length,
        detectedCount: detected.length,
        lastScanTime: new Date()
      });
      
      toast({
        title: 'Scan Complete',
        description: `Found ${detected.length} potential exchanges out of ${nonExchangeEntities.length} entities`
      });
    } catch (error) {
      console.error('Error scanning for exchanges:', error);
      toast({
        title: 'Scan Error',
        description: 'Failed to complete exchange detection',
        variant: 'destructive'
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleViewExchangeDetails = (address: string) => {
    window.open(`https://solscan.io/account/${address}`, '_blank');
  };

  const handleVerifyExchange = async (detectedExchange: {
    entity: Entity;
    confidence: 'high' | 'medium' | 'low';
    pattern: string;
  }) => {
    try {
      // Update the entity type to exchange
      const updatedEntity = await updateEntity(detectedExchange.entity.address, {
        type: 'exchange',
        subtype: detectedExchange.confidence === 'high' ? 'cex' : 'dex', // Default subtype based on confidence
        verified: true, // Set as verified
        description: detectedExchange.entity.description || 
          `Automatically detected exchange with ${detectedExchange.pattern}`,
      });
      
      // Remove from detected list
      setDetectedExchanges(prev => prev.filter(ex => 
        ex.entity.address !== detectedExchange.entity.address
      ));
      
      // Update our local cached entities
      setCachedEntities(prev => 
        prev.map(entity => 
          entity.address === updatedEntity.address ? updatedEntity : entity
        )
      );
      
      toast({
        title: 'Exchange Verified',
        description: `${updatedEntity.name || updatedEntity.address} has been classified as an exchange`
      });
    } catch (error) {
      console.error('Error verifying exchange:', error);
      toast({
        title: 'Verification Error',
        description: 'Failed to verify the exchange',
        variant: 'destructive'
      });
    }
  };

  // Toggle verification status of an exchange
  const handleToggleVerification = async (entity: Entity) => {
    try {
      const newStatus = !entity.verified;
      const updatedEntity = await updateEntity(entity.address, {
        verified: newStatus
      });
      
      // Update our local cached entities
      setCachedEntities(prev => 
        prev.map(entity => 
          entity.address === updatedEntity.address ? updatedEntity : entity
        )
      );
      
      toast({
        title: newStatus ? 'Exchange Verified' : 'Exchange Unverified',
        description: `${updatedEntity.name || updatedEntity.address} has been ${newStatus ? 'verified' : 'unverified'}`
      });
    } catch (error) {
      console.error('Error updating verification status:', error);
      toast({
        title: 'Update Error',
        description: 'Failed to update verification status',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="col-span-1 lg:col-span-2 rounded-md border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-medium">Exchange Address Database</h3>
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground mt-1">
              Known centralized and decentralized exchanges on Solana
            </p>
            <div className="flex gap-2 items-center">
              <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-500">
                {exchangeStats.verified} Verified
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-500">
                {exchangeStats.unverified} Unverified
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-500">
                {exchangeStats.total} Total
              </span>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleRefreshCache}
                disabled={isRefreshing}
                className="ml-2"
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Filter controls */}
        <div className="p-4 border-b border-border bg-muted/10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground">Type:</span>
              <Select
                value={filters.type}
                onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="h-8 w-28">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="cex">CEX</SelectItem>
                  <SelectItem value="dex">DEX</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="h-8 w-28">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="ml-auto text-sm text-muted-foreground">
              Showing {exchangeStats.filtered} of {exchangeStats.total} exchanges
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Exchange</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Address</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Related</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                      <span className="text-sm text-muted-foreground">Loading entities...</span>
                    </div>
                  </td>
                </tr>
              ) : exchangeEntities.length > 0 ? (
                exchangeEntities.map((exchange, i) => (
                  <tr key={exchange.address} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        {exchange.icon ? (
                          <img 
                            src={exchange.icon} 
                            alt={exchange.name || 'Exchange'} 
                            className="h-8 w-8 rounded-full mr-3 object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-solana-purple to-solana-blue mr-3 flex items-center justify-center text-white font-medium">
                            <p className="text-sm">
                                {exchange.name?.charAt(0) || 'E'}
                            </p>
                          </div>
                        )}
                        <div className="font-medium flex items-center">
                          {exchange.name}
                          {exchange.verified && (
                            <CheckCircle2 className="h-4 w-4 text-green-500 ml-1" />
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${exchange.subtype === 'cex' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'}`}>
                        {exchange.subtype === 'cex' ? 'CEX' : 'DEX'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${exchange.verified ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        {exchange.verified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {formatAddress(exchange.address, 4)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {exchange.relatedAddresses.length} addresses
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className={`${exchange.verified ? 'border-amber-500 text-amber-500 hover:bg-amber-500/10' : 'border-green-500 text-green-500 hover:bg-green-500/10'}`}
                          onClick={() => handleToggleVerification(exchange)}
                        >
                          {exchange.verified ? 'Unverify' : 'Verify'}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleViewExchangeDetails(exchange.address)}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Details
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    {exchangeStats.total > 0 ? (
                      <>
                        <p>No exchanges match the current filters</p>
                        <Button 
                          variant="link" 
                          className="mt-2 text-sm" 
                          onClick={() => setFilters({ type: 'all', status: 'all' })}
                        >
                          Clear filters
                        </Button>
                      </>
                    ) : (
                      'No exchanges found in the database'
                    )}
                  </td>
                </tr>
              )}
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
              <div className="flex items-center justify-between bg-muted/20 p-2 rounded">
                <span>High Confidence: Contains "exchange" or "exc"</span>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex items-center justify-between bg-muted/20 p-2 rounded">
                <span>Medium Confidence: Contains "exchange", "cex" or "dex"</span>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex items-center justify-between bg-muted/20 p-2 rounded">
                <span>Low Confidence: Contains "exchange", "cex", "dex", "swap" or "finance"</span>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Detected Exchanges</h4>
            <div className="space-y-2">
              {isScanning ? (
                <div className="p-4 flex flex-col items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <span className="text-sm text-muted-foreground">Scanning for exchanges...</span>
                </div>
              ) : detectedExchanges.length > 0 ? (
                detectedExchanges.map((exchange, i) => (
                  <div key={i} className="p-2 border border-border rounded">
                    <div className="font-medium text-sm overflow-hidden text-ellipsis">
                      {exchange.entity.name || formatAddress(exchange.entity.address, 8)}
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        exchange.confidence === 'high' 
                          ? 'bg-green-500/10 text-green-500' 
                          : exchange.confidence === 'medium'
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        {exchange.confidence.charAt(0).toUpperCase() + exchange.confidence.slice(1)} confidence
                      </span>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-6 text-xs"
                        onClick={() => handleVerifyExchange(exchange)}
                      >
                        Verify
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {exchange.depositAddresses} related addresses • {exchange.pattern}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-2">
                  No new exchanges detected
                </div>
              )}
            </div>
          </div>
          
          {scanStats.lastScanTime && (
            <div className="mb-4 p-3 bg-muted/20 rounded-md">
              <h4 className="text-sm font-medium mb-1">Scan Statistics</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">Entities Scanned:</div>
                  <div className="font-medium">{scanStats.totalScanned}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Exchanges Found:</div>
                  <div className="font-medium">{scanStats.detectedCount}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground">Last Scan:</div>
                  <div className="font-medium">
                    {scanStats.lastScanTime?.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <Button 
            className="w-full" 
            onClick={handleScanForExchanges}
            disabled={isScanning || isLoading || cachedEntities.length === 0}
          >
            {isScanning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Scan For New Exchanges
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExchangeDetectionPanel;