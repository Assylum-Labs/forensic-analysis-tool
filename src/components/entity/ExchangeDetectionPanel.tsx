"use client"

import React, { useState } from 'react';
import { useEntities } from '@/contexts/EntityContext';
import { Button } from '@/components/ui/button';
import { formatAddress } from '@/lib/utils';
import { Search, CheckCircle2, ExternalLink, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const ExchangeDetectionPanel = () => {
  const { entities, addEntity } = useEntities();
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [detectedExchanges, setDetectedExchanges] = useState<{
    address: string;
    type: string;
    depositAddresses: number;
    pattern: string;
    confidence: 'high' | 'medium' | 'low';
  }[]>([
    // Sample detected exchanges for UI demonstration
    {
      address: 'newexchange1abcdef1234567890',
      type: 'cex',
      depositAddresses: 25,
      pattern: 'Batched withdrawals',
      confidence: 'high'
    },
    {
      address: 'newexchange2abcdef1234567890',
      type: 'dex',
      depositAddresses: 12,
      pattern: 'Direct payments',
      confidence: 'medium'
    },
    {
      address: 'newexchange3abcdef1234567890',
      type: 'cex',
      depositAddresses: 8,
      pattern: 'Mixed pattern',
      confidence: 'low'
    }
  ]);

  // Filter exchanges from entities
  const exchangeEntities = entities.filter(entity => 
    entity.type === 'exchange'
  ).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const handleScanForExchanges = () => {
    setIsScanning(true);
    // Simulate scanning process
    setTimeout(() => {
      setIsScanning(false);
      toast({
        title: 'Scan Complete',
        description: 'Found 3 potential new exchanges'
      });
    }, 2000);
  };

  const handleViewExchangeDetails = (address: string) => {
    window.open(`https://solscan.io/account/${address}`, '_blank');
  };

  const handleVerifyExchange = (address: string) => {
    // Get the detected exchange
    const exchange = detectedExchanges.find(ex => ex.address === address);
    if (!exchange) return;

    // Add as a verified entity
    addEntity({
      address: exchange.address,
      name: `Detected Exchange ${exchange.address.substring(0, 4)}`,
      type: 'exchange',
      subtype: exchange.type,
      verified: true,
      website: null,
      description: `Automatically detected exchange with ${exchange.pattern}`,
      relatedAddresses: [],
      icon: null
    })
    .then(() => {
      // Remove from detected list
      setDetectedExchanges(prev => prev.filter(ex => ex.address !== address));
      
      toast({
        title: 'Exchange Verified',
        description: 'The exchange has been added to your entity database'
      });
    })
    .catch(error => {
      console.error('Error verifying exchange:', error);
    });
  };

  return (
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
                <th className="px-4 py-3 text-left text-sm font-medium">Address</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Related</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {exchangeEntities.length > 0 ? (
                exchangeEntities.map((exchange, i) => (
                  <tr key={exchange.address} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-solana-purple to-solana-blue mr-3 flex items-center justify-center text-white font-medium">
                          {exchange.name?.charAt(0) || 'E'}
                        </div>
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
                    <td className="px-4 py-3 text-sm">
                      {formatAddress(exchange.address, 8)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {exchange.relatedAddresses.length} addresses
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => handleViewExchangeDetails(exchange.address)}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    No exchanges found in the database
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
              {detectedExchanges.map((exchange, i) => (
                <div key={i} className="p-2 border border-border rounded">
                  <div className="font-medium text-sm">{formatAddress(exchange.address, 8)}</div>
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
                      onClick={() => handleVerifyExchange(exchange.address)}
                    >
                      Verify
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {exchange.depositAddresses} deposit addresses • {exchange.pattern}
                  </div>
                </div>
              ))}
              
              {detectedExchanges.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-2">
                  No new exchanges detected
                </div>
              )}
            </div>
          </div>
          
          <Button 
            className="w-full" 
            onClick={handleScanForExchanges}
            disabled={isScanning}
          >
            <Search className="h-4 w-4 mr-2" />
            {isScanning ? 'Scanning...' : 'Scan For New Exchanges'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExchangeDetectionPanel;