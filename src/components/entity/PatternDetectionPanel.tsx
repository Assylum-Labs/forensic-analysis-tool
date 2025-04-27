"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useEntities } from '@/contexts/EntityContext';
import { formatAddress } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { 
  Plus, 
  Trash2, 
  Search, 
  RefreshCcw,
  Edit,
  AlarmClock,
  CheckCircle2 
} from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DetectionRule {
  id: string;
  name: string;
  description: string;
  type: 'exchange' | 'nft' | 'defi' | 'bot' | 'staking';
  criteria: string[];
  enabled: boolean;
  createdAt: string;
}

interface DetectionMatch {
  id: string;
  address: string;
  patternType: string;
  confidence: 'High' | 'Medium' | 'Low';
  detectedAt: string;
  details: string;
}

const PatternDetectionPanel = () => {
  const { entities, addEntity } = useEntities();
  const { toast } = useToast();
  
  // State for detection rules
  const [detectionRules, setDetectionRules] = useState<DetectionRule[]>([
    {
      id: 'rule-1',
      name: 'Exchange deposit/withdrawal patterns',
      description: 'Identify wallets exhibiting exchange-like deposit and withdrawal behaviors',
      type: 'exchange',
      criteria: [
        'High transaction volume',
        'Many unique counterparties',
        'Consistent fee structures',
        'Regular timing patterns'
      ],
      enabled: true,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'rule-2',
      name: 'NFT marketplace trading activity',
      description: 'Detect wallets operating as NFT marketplaces or trading bots',
      type: 'nft',
      criteria: [
        'Metadata program interactions',
        'NFT token standard usage',
        'Escrow pattern trading',
        'Fee collection on trades'
      ],
      enabled: true,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'rule-3',
      name: 'DeFi protocol interaction',
      description: 'Identify wallets that function as DeFi protocols or gateways',
      type: 'defi',
      criteria: [
        'Liquidity pool creation',
        'Interest rate mechanics',
        'Token swapping functionality',
        'Flash loan patterns'
      ],
      enabled: true,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'rule-4',
      name: 'Bot-like transaction behavior',
      description: 'Detect automated bot wallets from transaction patterns',
      type: 'bot',
      criteria: [
        'High frequency trading',
        'Precise timing intervals',
        'Programmatic transaction sizing',
        'MEV-like behavior'
      ],
      enabled: false,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'rule-5',
      name: 'Staking contract patterns',
      description: 'Identify staking contracts and delegation patterns',
      type: 'staking',
      criteria: [
        'Stake program interactions',
        'Regular reward distribution',
        'Delegation mechanics',
        'Lockup periods'
      ],
      enabled: true,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]);
  
  // State for detected patterns
  const [detectedPatterns, setDetectedPatterns] = useState<DetectionMatch[]>([
    {
      id: 'match-1',
      address: 'wallet0pattern123456789abcdef',
      patternType: 'Exchange Pattern',
      confidence: 'High',
      detectedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      details: 'Exhibits deposit clustering and consistent withdrawal timing'
    },
    {
      id: 'match-2',
      address: 'wallet1pattern123456789abcdef',
      patternType: 'NFT Trading',
      confidence: 'Medium',
      detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      details: 'Frequent metadata program interactions with escrow-like behavior'
    },
    {
      id: 'match-3',
      address: 'wallet2pattern123456789abcdef',
      patternType: 'DeFi Interaction',
      confidence: 'Low',
      detectedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      details: 'Possible liquidity provision behavior but limited history'
    },
    {
      id: 'match-4',
      address: 'wallet3pattern123456789abcdef',
      patternType: 'Bot Activity',
      confidence: 'High',
      detectedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      details: 'Precise timing with adaptive transaction sizing'
    },
    {
      id: 'match-5',
      address: 'wallet4pattern123456789abcdef',
      patternType: 'Staking Operation',
      confidence: 'Medium',
      detectedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      details: 'Regular stake reward distribution with delegation support'
    }
  ]);
  
  // State for rule dialog
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<DetectionRule | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [ruleType, setRuleType] = useState<'exchange' | 'nft' | 'defi' | 'bot' | 'staking'>('exchange');
  const [ruleCriteria, setRuleCriteria] = useState('');
  
  // State for scanning
  const [isScanning, setIsScanning] = useState(false);
  const [autoLabelingEnabled, setAutoLabelingEnabled] = useState(false);
  
  const handleAddRule = () => {
    setEditingRule(null);
    setRuleName('');
    setRuleDescription('');
    setRuleType('exchange');
    setRuleCriteria('');
    setShowRuleDialog(true);
  };
  
  const handleEditRule = (rule: DetectionRule) => {
    setEditingRule(rule);
    setRuleName(rule.name);
    setRuleDescription(rule.description);
    setRuleType(rule.type);
    setRuleCriteria(rule.criteria.join('\n'));
    setShowRuleDialog(true);
  };
  
  const handleDeleteRule = (id: string) => {
    if (confirm('Are you sure you want to delete this detection rule?')) {
      setDetectionRules(prev => prev.filter(rule => rule.id !== id));
      toast({
        title: 'Rule Deleted',
        description: 'The detection rule has been removed'
      });
    }
  };
  
  const toggleRuleStatus = (id: string) => {
    setDetectionRules(prev => prev.map(rule => 
      rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
    ));
    
    const rule = detectionRules.find(r => r.id === id);
    toast({
      title: rule?.enabled ? 'Rule Disabled' : 'Rule Enabled',
      description: `The rule "${rule?.name}" has been ${rule?.enabled ? 'disabled' : 'enabled'}`
    });
  };
  
  const handleSaveRule = () => {
    if (!ruleName) {
      toast({
        title: 'Error',
        description: 'Rule name is required',
        variant: 'destructive'
      });
      return;
    }
    
    const criteriaList = ruleCriteria
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (criteriaList.length === 0) {
      toast({
        title: 'Error',
        description: 'At least one criterion is required',
        variant: 'destructive'
      });
      return;
    }
    
    if (editingRule) {
      // Update existing rule
      setDetectionRules(prev => prev.map(rule => 
        rule.id === editingRule.id 
          ? {
              ...rule,
              name: ruleName,
              description: ruleDescription,
              type: ruleType,
              criteria: criteriaList
            }
          : rule
      ));
      
      toast({
        title: 'Rule Updated',
        description: 'The detection rule has been updated successfully'
      });
    } else {
      // Create new rule
      const newRule: DetectionRule = {
        id: `rule-${Date.now()}`,
        name: ruleName,
        description: ruleDescription,
        type: ruleType,
        criteria: criteriaList,
        enabled: true,
        createdAt: new Date().toISOString()
      };
      
      setDetectionRules(prev => [...prev, newRule]);
      
      toast({
        title: 'Rule Created',
        description: 'The new detection rule has been created successfully'
      });
    }
    
    setShowRuleDialog(false);
  };
  
  const handleRefreshDetections = () => {
    setIsScanning(true);
    
    // Simulate scanning process
    setTimeout(() => {
      // Add a new detected pattern
      const newPattern: DetectionMatch = {
        id: `match-${Date.now()}`,
        address: `wallet${Math.floor(Math.random() * 1000)}pattern${Math.floor(Math.random() * 1000000)}`,
        patternType: ['Exchange Pattern', 'NFT Trading', 'DeFi Interaction', 'Bot Activity', 'Staking Operation'][
          Math.floor(Math.random() * 5)
        ],
        confidence: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)] as 'High' | 'Medium' | 'Low',
        detectedAt: new Date().toISOString(),
        details: 'Newly detected pattern based on recent blockchain activity'
      };
      
      setDetectedPatterns(prev => [newPattern, ...prev]);
      setIsScanning(false);
      
      toast({
        title: 'Detection Complete',
        description: 'Found 1 new pattern match'
      });
      
      // Automatically add to entities if auto-labeling is enabled
      if (autoLabelingEnabled) {
        addEntityFromPattern(newPattern);
      }
    }, 2000);
  };
  
  const addEntityFromPattern = (pattern: DetectionMatch) => {
    const patternToEntityType = {
      'Exchange Pattern': 'exchange',
      'NFT Trading': 'nft_marketplace',
      'DeFi Interaction': 'defi_protocol',
      'Bot Activity': 'contract',
      'Staking Operation': 'defi_protocol'
    };
    
    const patternToSubtype = {
      'Exchange Pattern': 'dex',
      'NFT Trading': 'marketplace',
      'DeFi Interaction': 'liquidity_provider',
      'Bot Activity': 'bot',
      'Staking Operation': 'staking'
    };
    
    // Add the entity
    addEntity({
      address: pattern.address,
      name: `Detected ${pattern.patternType}`,
      type: patternToEntityType[pattern.patternType] || 'contract',
      subtype: patternToSubtype[pattern.patternType] || 'unknown',
      verified: pattern.confidence === 'High',
      website: null,
      description: `Automatically detected ${pattern.patternType.toLowerCase()}. ${pattern.details}`,
      relatedAddresses: [],
      icon: null
    })
    .then(() => {
      toast({
        title: 'Entity Added',
        description: `The detected ${pattern.patternType.toLowerCase()} has been added to the entity database`
      });
    })
    .catch(error => {
      console.error('Error adding entity from pattern:', error);
    });
  };
  
  const getTypeColorClass = (type: string) => {
    switch (type) {
      case 'exchange':
        return 'bg-solana-purple/10 text-solana-purple';
      case 'nft':
        return 'bg-solana-blue/10 text-solana-blue';
      case 'defi':
        return 'bg-solana-green/10 text-solana-green';
      case 'bot':
        return 'bg-amber-500/10 text-amber-500';
      case 'staking':
        return 'bg-indigo-500/10 text-indigo-500';
      default:
        return 'bg-muted-foreground/10 text-muted-foreground';
    }
  };
  
  const getConfidenceColorClass = (confidence: string) => {
    switch (confidence) {
      case 'High':
        return 'bg-solana-blue/10 text-solana-blue';
      case 'Medium':
        return 'bg-solana-purple/10 text-solana-purple';
      case 'Low':
        return 'bg-solana-green/10 text-solana-green';
      default:
        return 'bg-muted-foreground/10 text-muted-foreground';
    }
  };
  
  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 1000 / 60);
    if (minutes < 60) return `${minutes} min${minutes !== 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };

  return (
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
            {detectionRules.map((rule, i) => (
              <div key={rule.id} className="flex items-center justify-between p-3 border border-border rounded-md">
                <div className="flex items-center">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${getTypeColorClass(rule.type)}`}>
                    {i + 1}
                  </div>
                  <div className="ml-3">
                    <div className="font-medium">{rule.name}</div>
                    <div className="text-xs text-muted-foreground">{rule.description}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant={rule.enabled ? "default" : "outline"}
                    onClick={() => toggleRuleStatus(rule.id)}
                    className="flex items-center"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleEditRule(rule)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0"
                    onClick={() => handleDeleteRule(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            <Button className="w-full" onClick={handleAddRule}>
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
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleRefreshDetections}
                  disabled={isScanning}
                >
                  {isScanning ? (
                    <>
                      <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Refresh
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="max-h-[600px] overflow-y-auto divide-y divide-border">
              {detectedPatterns.length > 0 ? (
                detectedPatterns.map((pattern, i) => (
                  <div key={pattern.id} className="p-3 hover:bg-muted/20">
                    <div className="flex justify-between">
                      <div>
                        <div className="font-medium">
                          {pattern.patternType}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatAddress(pattern.address, 8)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground flex items-center">
                          <AlarmClock className="h-3 w-3 mr-1" />
                          {formatTimeAgo(pattern.detectedAt)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs text-muted-foreground">
                      {pattern.details}
                    </div>
                    
                    <div className="mt-2 flex justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getConfidenceColorClass(pattern.confidence)}`}>
                        {pattern.confidence} confidence
                      </span>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-6 text-xs"
                        onClick={() => addEntityFromPattern(pattern)}
                      >
                        Apply Label
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  No pattern matches detected yet
                </div>
              )}
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
              <Button 
                variant={autoLabelingEnabled ? "default" : "outline"} 
                size="sm"
                onClick={() => {
                  setAutoLabelingEnabled(!autoLabelingEnabled);
                  toast({
                    title: autoLabelingEnabled ? 'Auto-Labeling Disabled' : 'Auto-Labeling Enabled',
                    description: autoLabelingEnabled 
                      ? 'Detected patterns will no longer be automatically labeled' 
                      : 'Detected patterns will now be automatically added to the entity database'
                  });
                }}
              >
                {autoLabelingEnabled ? 'Disable' : 'Enable'} Auto-Labeling
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Rule Dialog */}
      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'Edit Detection Rule' : 'Create Detection Rule'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rule-name">Rule Name</Label>
                <Input
                  id="rule-name"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="E.g., Exchange deposit/withdrawal patterns"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rule-description">Description</Label>
                <Textarea
                  id="rule-description"
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  placeholder="Describe what this rule detects"
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rule-type">Rule Type</Label>
                <Select
                  value={ruleType}
                  onValueChange={(value) => setRuleType(value as any)}
                >
                  <SelectTrigger id="rule-type">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exchange">Exchange</SelectItem>
                    <SelectItem value="nft">NFT Marketplace</SelectItem>
                    <SelectItem value="defi">DeFi Protocol</SelectItem>
                    <SelectItem value="bot">Bot Activity</SelectItem>
                    <SelectItem value="staking">Staking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rule-criteria">Detection Criteria (one per line)</Label>
                <Textarea
                  id="rule-criteria"
                  value={ruleCriteria}
                  onChange={(e) => setRuleCriteria(e.target.value)}
                  placeholder="E.g., High transaction volume
Many unique counterparties
Consistent fee structures"
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  Enter each criterion on a new line. These will be used to match patterns.
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRule}>
              {editingRule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatternDetectionPanel;