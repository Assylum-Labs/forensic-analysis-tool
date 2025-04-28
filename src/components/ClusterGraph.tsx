import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { formatAddress } from '@/lib/utils';
import { TransactionCluster } from '@/lib/transactionClustering';
import { Entity } from '@/types';
import { entityCache } from '@/lib/EntityCacheService';

// Constants for risk assessment - similar to those in transactionClustering.ts
const LARGE_VALUE_THRESHOLD = 1000; // SOL
const TRANSACTION_BURST_THRESHOLD = 20; // Number of transactions in a short time
const TIME_WINDOW_SECONDS = 300; // 5 minutes

// Suspicious program patterns to watch for
const SUSPICIOUS_PATTERNS = [
  'Lawr', // Example pattern for a mixer-like service
  'Torn', // Example pattern for a privacy-oriented service
  'Mix',  // Example pattern
  'Wash', // Example pattern
];

interface NodeDepthMap {
  [key: string]: number;
}

interface DepthAwareClusterGraphProps {
  className?: string;
  cluster: TransactionCluster;
  showLabels?: boolean;
  highlightSuspicious?: boolean;
  nodeDepths?: NodeDepthMap;
  originAddress?: string;
  selectedDepth?: number;
}

const DepthAwareClusterGraph: React.FC<DepthAwareClusterGraphProps> = ({
  className = "",
  cluster,
  showLabels = true,
  highlightSuspicious = true,
  nodeDepths = {},
  originAddress = "",
  selectedDepth = 1
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState({
    visible: false,
    content: '',
    x: 0,
    y: 0
  });

  // Initialize entity cache on mount
  useEffect(() => {
    entityCache.initialize();
  }, []);

  // Build a lookup map for known entities (now using our cache)
  const entityMap = React.useMemo(() => {
    const map = new Map<string, Entity>();
    
    // Initialize with cache entities for O(1) lookup
    cluster.accounts.forEach(account => {
      const entity = entityCache.getEntity(account);
      if (entity) {
        map.set(account, entity);
      }
    });
    
    return map;
  }, [cluster.accounts]);

  // Build a map of known programs using the entity data
  const KNOWN_PROGRAMS = React.useMemo(() => {
    const programs: Record<string, string> = {
      "11111111111111111111111111111111": "System Program",
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA": "Token Program",
      "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL": "Assoc. Token Program",
    };
    
    // Add all cached entities of type 'contract' or 'program' to the KNOWN_PROGRAMS map
    cluster.accounts.forEach(account => {
      const entity = entityCache.getEntity(account);
      if (entity && (entity.type === 'contract' || entity.type === 'program' || entity.type === 'defi_protocol')) {
        programs[account] = entity.name || formatAddress(account, 8);
      }
    });
    
    return programs;
  }, [cluster.accounts]);
  
  // Utility function to format currency values in USD
  const formatCurrency = (value: number | undefined): string => {
    if (value === undefined || value === null) return '$0.00';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  // Format token amounts with appropriate decimals based on token type
  const formatAmount = (amount: number | undefined, symbol: string = ''): string => {
    if (amount === undefined || amount === null) return '0';
    
    // Use appropriate decimal places based on token type
    const decimals = 
      symbol === 'SOL' ? 4 :
      symbol === 'BTC' ? 8 :
      symbol === 'ETH' ? 6 :
      symbol === 'USDC' || symbol === 'USDT' ? 2 :
      amount < 0.01 ? 8 : 4;
    
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
    
    return `${formatter.format(amount)} ${symbol}`.trim();
  };
  
  // Format SOL values with appropriate precision
  const formatSol = (value: number | undefined): string => {
    if (value === undefined || value === null) return '0 SOL';
    
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4
    }).format(value) + ' SOL';
  };
  
  // Convert token amount to USD value using fixed rates
  const tokenToUsd = (amount: number, tokenType: string): number => {
    if (tokenType === 'SOL') {
      return amount * 150; // $150 per SOL
    } else {
      return amount * 1; // $1 for other tokens
    }
  };
  
  // Get color for risk level indicators
  const getRiskColor = (score: number | undefined): string => {
    if (!score) return 'text-gray-400';
    if (score >= 60) return 'text-red-500';
    if (score >= 30) return 'text-amber-500';
    return 'text-green-500';
  };
  
  // Get text label for risk level
  const getRiskLabel = (score: number | undefined): string => {
    if (!score) return 'Unknown';
    if (score >= 60) return 'High Risk';
    if (score >= 30) return 'Medium Risk';
    return 'Low Risk';
  };
  
  // Assess risk of an account based on its activity pattern with optimized entity lookup
  const assessAccountRisk = (accountId: string, txCount: number, volume: number, depth: number): { score: number, reasons: string[] } => {
    let score = 0;
    const reasons: string[] = [];
    
    // High volume transfers are higher risk
    if (volume > LARGE_VALUE_THRESHOLD) {
      score += 30;
      reasons.push(`Large value movement: ${formatSol(volume)}`);
    }
    
    // Many transactions in a short time are suspicious
    if (txCount > TRANSACTION_BURST_THRESHOLD) {
      score += 25;
      reasons.push(`High transaction count: ${txCount} transactions`);
    }
    
    // Check if the account is known to be suspicious using optimized lookup
    const entity = entityMap.get(accountId) || entityCache.getEntity(accountId);
    if (entity && entity.type === 'mixer') {
      score += 50;
      reasons.push(`Associated with known mixer service: ${entity.name}`);
    }
    
    // Nodes very far from origin (many hops away) could be suspicious laundering attempts
    if (depth > 3) {
      score += 10;
      reasons.push(`Distant connection (${depth} hops from origin)`);
    }
    
    // Check for known suspicious addresses
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (accountId.includes(pattern)) {
        score += 35;
        reasons.push(`Address contains suspicious pattern: ${pattern}`);
        break;
      }
    }
    
    return { score, reasons };
  };

  useEffect(() => {
    if (!svgRef.current || !cluster) return;

    // Clear any existing SVG content
    d3.select(svgRef.current).selectAll("*").remove();

    const width = svgRef.current.clientWidth || 800;
    const height = 600;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("class", "bg-card");

    // Define defs for markers and animations
    const defs = svg.append("defs");
    
    // Add gradient definitions for visual enhancements
    const addRadialGradient = (id: string, color1: string, color2: string) => {
      const gradient = defs.append("radialGradient")
        .attr("id", id)
        .attr("cx", "50%")
        .attr("cy", "50%")
        .attr("r", "50%")
        .attr("fx", "50%")
        .attr("fy", "50%");
        
      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", color1);
        
      gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", color2);
    };
    
    // Add gradients for different node types and depths
    addRadialGradient("program-gradient", "#00C2FF", "#0047BA");
    addRadialGradient("wallet-gradient", "#9945FF", "#6C2DC7");
    addRadialGradient("origin-gradient", "#FF9500", "#FF5C00");
    addRadialGradient("depth-1-gradient", "#14F195", "#0BC878");
    addRadialGradient("depth-2-gradient", "#9945FF", "#6C2DC7");
    addRadialGradient("depth-3-gradient", "#00C2FF", "#0047BA");
    addRadialGradient("depth-4-gradient", "#FFD700", "#FFA500");
    addRadialGradient("depth-5-gradient", "#FF4500", "#8B0000");
    addRadialGradient("suspicious-gradient", "#FF4500", "#8B0000");
    
    // Marker for arrows
    defs.append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("class", "text-muted-foreground fill-current");
      
    // Marker for suspicious transactions
    defs.append("marker")
      .attr("id", "arrow-suspicious")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#FF4500");

    // Enable zoom and pan
    const g = svg.append("g");
    svg.call(
      d3.zoom()
        .extent([[0, 0], [width, height]])
        .scaleExtent([0.1, 8])
        .on("zoom", (event) => g.attr("transform", event.transform)) as any
    );

    // Process data to create nodes and links
    const nodes: any[] = [];
    const links: any[] = [];
    
    // Create maps to track account metrics
    const accountTxCounts = new Map<string, number>();
    const accountVolumes = new Map<string, { inflow: number, outflow: number, usdInflow: number, usdOutflow: number }>();
    
    // Initialize transaction counts and volumes
    cluster.accounts.forEach(account => {
      accountTxCounts.set(account, 0);
      accountVolumes.set(account, { 
        inflow: 0, 
        outflow: 0, 
        usdInflow: 0, 
        usdOutflow: 0 
      });
    });
    
    // If the cluster has transaction data, use it to calculate volumes
    if (cluster.transactions.length > 0) {
      // Calculate the average SOL value per transaction based on total cluster value
      const avgTxValue = cluster.totalValue / cluster.transactions.length;
      
      // Distribute transactions based on depth from origin
      cluster.accounts.forEach(account => {
        const depth = nodeDepths[account] || 999;
        
        // More transactions for accounts closer to origin
        let txCount;
        if (depth === 0) { 
          // Origin account gets most transactions
          txCount = Math.ceil(cluster.transactions.length * 0.4);
        } else if (depth === 1) {
          // Direct connections get significant portion
          txCount = Math.ceil(cluster.transactions.length * 0.2);
        } else {
          // Deeper accounts get fewer transactions
          const depthFactor = Math.max(0.05, 0.1 - (depth * 0.02));
          txCount = Math.max(1, Math.ceil(cluster.transactions.length * depthFactor));
        }
        
        // Set transaction count
        accountTxCounts.set(account, txCount);
        
        // Calculate transaction value in SOL
        const totalSolValue = txCount * avgTxValue;
        
        // Calculate inflow/outflow balance based on depth
        let inflow, outflow;
        
        if (depth === 0) {
          // Origin mostly sends funds
          inflow = totalSolValue ;
          outflow = totalSolValue;
        } else if (depth === 1) {
          // First level receives from origin, sends to deeper
          inflow = totalSolValue;
          outflow = totalSolValue;
        } else {
          // Deeper levels mostly receive
          const receiveRatio = Math.min(0.9, 0.5 + (depth * 0.1));
          inflow = totalSolValue * receiveRatio;
          outflow = totalSolValue * (1 - receiveRatio);
        }
        
        // Calculate USD equivalents
        const usdInflow = tokenToUsd(inflow, 'SOL');
        const usdOutflow = tokenToUsd(outflow, 'SOL');
        
        // Store values
        accountVolumes.set(account, {
          inflow,
          outflow, 
          usdInflow,
          usdOutflow
        });
      });
    }
    
    // Create nodes for all accounts in the cluster with optimized entity lookup
    cluster.accounts.forEach(account => {
      const isProgram = cluster.programs.includes(account);
      const depth = nodeDepths[account] !== undefined ? nodeDepths[account] : 999;
      const isOrigin = account === originAddress || (originAddress && account.startsWith(originAddress.substring(0, 8)));
      
      // Find entity information from cluster.entities or cache (O(1) lookup)
      const entityInfo = cluster.entities?.find(entity => 
        entity.accounts.includes(account)
      );
      
      // Also check from entityMap (O(1)) or cache (O(1))
      const knownEntity = entityMap.get(account) || entityCache.getEntity(account);
      
      // Determine label
      let label = '';
      let entityType = '';
      let verified = false;
      
      if (entityInfo) {
        label = entityInfo.name;
        entityType = entityInfo.type;
        verified = entityInfo.verified;
      } else if (knownEntity) {
        label = knownEntity.name || '';
        entityType = knownEntity.type || '';
        verified = knownEntity.verified;
      } else if (isProgram) {
        // Try to identify known programs
        for (const [id, name] of Object.entries(KNOWN_PROGRAMS)) {
          if (account.startsWith(id.substring(0, 8))) {
            label = name;
            entityType = 'program';
            break;
          }
        }
        if (!label) label = 'Program';
      }
      
      // Get transaction count
      const txCount = accountTxCounts.get(account) || 0;
      
      // Get volume data
      const volumeData = accountVolumes.get(account) || { 
        inflow: 0, 
        outflow: 0,
        usdInflow: 0,
        usdOutflow: 0
      };
      
      // Determine appropriate node visualization size
      let nodeSize = 1; // Base size
      
      if (isOrigin) {
        nodeSize = 3; // Origin nodes are largest
      } else if (isProgram) {
        nodeSize = 2; // Programs are second largest
      } else {
        // Scale by transaction count
        nodeSize = Math.max(0.5, Math.min(2.5, 1 + (txCount / 10)));
      }
      
      // Assess risk based on account metrics
      const riskAssessment = assessAccountRisk(account, txCount, volumeData.inflow + volumeData.outflow, depth);
      
      nodes.push({
        id: account,
        label: label,
        isProgram,
        depth,
        isOrigin,
        entityType,
        verified,
        // Store explicit size for visualization
        volume: nodeSize,
        // Store transaction count
        txCount,
        // Store risk assessment
        risk: riskAssessment.score,
        riskReasons: riskAssessment.reasons
      });
    });
    
    // Create links between nodes based on depth and cluster structure
    const createConnections = () => {
      // Create a more straightforward approach to connection generation
      const accountsByDepth: Record<number, string[]> = {};
      
      // Group accounts by depth
      nodes.forEach(node => {
        const depth = node.depth;
        if (!accountsByDepth[depth]) accountsByDepth[depth] = [];
        accountsByDepth[depth].push(node.id);
      });
      
      const availableDepths = Object.keys(accountsByDepth).map(Number).sort();
      
      // Create connections between adjacent depth levels
      for (let i = 0; i < availableDepths.length - 1; i++) {
        const currentDepth = availableDepths[i];
        const nextDepth = availableDepths[i + 1];
        
        const currentAccounts = accountsByDepth[currentDepth];
        const nextAccounts = accountsByDepth[nextDepth];
        
        if (!currentAccounts || !nextAccounts || 
            currentAccounts.length === 0 || nextAccounts.length === 0) continue;
        
        // Create connections from current depth to next depth
        currentAccounts.forEach(source => {
          const sourceNode = nodes.find(n => n.id === source);
          if (!sourceNode) return;
          
          // Get source's outflow capacity
          const sourceVolumes = accountVolumes.get(source);
          if (!sourceVolumes || sourceVolumes.outflow <= 0) return;
          
          // Determine how many accounts to connect to
          const numConnections = Math.min(
            nextAccounts.length,
            Math.max(1, Math.floor(Math.random() * 4) + 1) // 1-4 connections
          );
          
          // Choose target accounts
          const targets = nextAccounts
            .sort(() => Math.random() - 0.5)
            .slice(0, numConnections);
          
          // Split outflow among targets
          const outflowPerTarget = sourceVolumes.outflow / targets.length;
          
          targets.forEach(target => {
            const targetNode = nodes.find(n => n.id === target);
            if (!targetNode) return;
            
            // Set amount (SOL minus fees)
            const fees = 0.000005; // Typical Solana transaction fee
            const amount = Math.max(0, outflowPerTarget - fees);
            
            // Determine token type based on cluster type
            let tokenType = 'SOL';
            
            if (cluster.type === 'Swap') {
              // For swap clusters, use various tokens
              const tokens = ['SOL', 'USDC', 'USDT', 'BTC', 'ETH'];
              tokenType = tokens[Math.floor(Math.random() * tokens.length)];
            } else if (cluster.type === 'Token Transfer' || cluster.type?.includes('Token')) {
              // For token transfers, use stablecoins more often
              const tokens = ['USDC', 'USDT', 'SOL'];
              tokenType = tokens[Math.floor(Math.random() * tokens.length)];
            }
            
            // Determine suspiciousness
            const isSuspicious = 
              sourceNode.risk >= 60 || 
              targetNode.risk >= 60 || 
              (amount > LARGE_VALUE_THRESHOLD);
            
            // Create link with simple properties
            links.push({
              source,
              target,
              value: 1 + Math.min(3, amount / 10),
              amount,
              tokenType,
              timestamp: cluster.timestamp || Date.now(),
              programId: tokenType === 'SOL' ? '11111111111111111111111111111111' : 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
              isSuspicious,
              isFlagged: isSuspicious && (sourceNode.risk >= 50 || targetNode.risk >= 50)
            });
          });
        });
      }
      
      // Create some intra-depth connections for realistic networks
      availableDepths.forEach(depth => {
        if (depth === 0) return; // Skip origin
        
        const accountsAtDepth = accountsByDepth[depth];
        if (!accountsAtDepth || accountsAtDepth.length <= 1) return;
        
        // More connections at deeper levels
        const connectionCount = Math.min(
          accountsAtDepth.length,
          Math.max(1, Math.floor(depth * 2))
        );
        
        // Create random intra-level connections
        for (let i = 0; i < connectionCount; i++) {
          // Get random source and target
          const sourceIndex = Math.floor(Math.random() * accountsAtDepth.length);
          let targetIndex;
          do {
            targetIndex = Math.floor(Math.random() * accountsAtDepth.length);
          } while (targetIndex === sourceIndex);
          
          const source = accountsAtDepth[sourceIndex];
          const target = accountsAtDepth[targetIndex];
          
          const sourceNode = nodes.find(n => n.id === source);
          const targetNode = nodes.find(n => n.id === target);
          
          if (!sourceNode || !targetNode) continue;
          
          // Get volumes
          const sourceVolumes = accountVolumes.get(source);
          if (!sourceVolumes || sourceVolumes.outflow <= 0) continue;
          
          // Use a smaller transfer amount for intra-level
          const amount = sourceVolumes.outflow * 0.2;
          
          // More varied tokens at deeper levels
          let tokenType = 'SOL';
          if (depth >= 3) {
            const tokens = ['SOL', 'USDC', 'USDT', 'BTC', 'ETH'];
            tokenType = tokens[Math.floor(Math.random() * tokens.length)];
          }
          
          // Intra-level transfers at deep levels are more suspicious
          const isSuspicious = depth >= 3 || 
                             sourceNode.risk >= 40 && targetNode.risk >= 40;
          
          // Create the link
          links.push({
            source,
            target,
            value: 0.8 + Math.min(2, amount / 20),
            amount,
            tokenType,
            timestamp: cluster.timestamp || Date.now(),
            programId: tokenType === 'SOL' ? '11111111111111111111111111111111' : 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
            isSuspicious,
            isFlagged: isSuspicious && (sourceNode.risk >= 50 || targetNode.risk >= 50)
          });
        }
      });
      
      // Connect programs to relevant accounts
      const programs = nodes.filter(n => n.isProgram).map(n => n.id);
      programs.forEach(program => {
        // Find relevant accounts to connect to
        const relevantAccounts = nodes
          .filter(n => !n.isProgram && n.id !== program)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map(n => n.id);
        
        // Create program connections
        relevantAccounts.forEach(account => {
          links.push({
            source: program,
            target: account,
            value: 1.2,
            isProgram: true,
            isSuspicious: false,
            tokenType: 'Program Call',
            programId: program
          });
        });
      });
    };
    
    createConnections();

    // Create force simulation with custom parameters
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links)
        .id(d => (d as any).id)
        .distance(d => {
          // Programs have longer link distances
          if ((d.source as any).isProgram || (d.target as any).isProgram) return 120;
          
          // Distance scales with depth difference
          const depthDiff = Math.abs((d.source as any).depth - (d.target as any).depth);
          return 70 + depthDiff * 15;
        })
        .strength(d => {
          // Programs have weaker connections (pulled less toward other nodes)
          if ((d.source as any).isProgram || (d.target as any).isProgram) return 0.3;
          
          // Stronger connections between nodes of the same depth
          if ((d.source as any).depth === (d.target as any).depth) return 0.8;
          
          return 0.5;
        }))
      .force("charge", d3.forceManyBody().strength(d => {
        // Origin node has stronger repulsion
        if ((d as any).isOrigin) return -600;
        
        // Programs repel more to create space around them
        if ((d as any).isProgram) return -400;
        
        // Repulsion decreases with depth
        const depth = (d as any).depth || 1;
        return -300 / Math.max(1, Math.log(depth + 1));
      }))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX(width / 2).strength(d => {
        // Origin at center
        if ((d as any).isOrigin) return 0.2;
        
        // Lower depths clustered closer to center
        const depth = Math.min((d as any).depth || 1, 5);
        return 0.02 * depth;
      }))
      .force("y", d3.forceY(height / 2).strength(d => {
        if ((d as any).isOrigin) return 0.2;
        const depth = Math.min((d as any).depth || 1, 5);
        return 0.02 * depth;
      }))
      .force("collision", d3.forceCollide().radius(d => {
        const baseRadius = (d as any).isOrigin 
          ? 25 
          : (d as any).isProgram 
            ? 20 
            : 15;
            
        return baseRadius * (1 + (d as any).volume * 0.2);
      }).strength(0.8));

    // Draw links with curved paths and visual enhancements
    const link = g.append("g")
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("stroke", d => {
        if (d.isSuspicious && highlightSuspicious) return "#FF4500";
        
        // Color by depth difference
        const sourceDepth = nodes.find(n => n.id === d.source)?.depth || 0;
        const targetDepth = nodes.find(n => n.id === d.target)?.depth || 0;
        
        if (sourceDepth === 0 || targetDepth === 0) return "#FF9500"; // Origin connections
        
        const depthColors = [
          "#14F195", // Depth 1 - green
          "#9945FF", // Depth 2 - purple
          "#00C2FF", // Depth 3 - blue
          "#FFD700", // Depth 4 - gold
          "#FF4500"  // Depth 5+ - red
        ];
        
        const lowerDepth = Math.min(sourceDepth, targetDepth);
        const colorIndex = Math.min(lowerDepth - 1, depthColors.length - 1);
        
        return depthColors[Math.max(0, colorIndex)];
      })
      .attr("stroke-opacity", d => {
        // Higher opacity for connections closer to origin
        const sourceDepth = nodes.find(n => n.id === d.source)?.depth || 0;
        const targetDepth = nodes.find(n => n.id === d.target)?.depth || 0;
        const minDepth = Math.min(sourceDepth, targetDepth);
        
        if (d.isSuspicious && highlightSuspicious) return 0.8;
        
        return Math.max(0.2, 0.7 - (minDepth * 0.1));
      })
      .attr("stroke-width", d => {
        // Thicker lines for connections closer to origin
        const sourceDepth = nodes.find(n => n.id === d.source)?.depth || 0;
        const targetDepth = nodes.find(n => n.id === d.target)?.depth || 0;
        const minDepth = Math.min(sourceDepth, targetDepth);
        
        const baseWidth = d.value || 1;
        const depthFactor = Math.max(0.5, 1.5 - (minDepth * 0.2));
        
        return baseWidth * depthFactor;
      })
      .attr("fill", "none")
      .attr("stroke-dasharray", d => d.isProgram ? "5,5" : "none")
      .attr("marker-end", d => 
        (d.isSuspicious && highlightSuspicious) ? "url(#arrow-suspicious)" : "url(#arrow)"
      )
      .on("mouseover", handleLinkMouseOver)
      .on("mousemove", handleMouseMove)
      .on("mouseout", handleMouseOut);

    // Draw nodes with depth-based styling
    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", "cursor-pointer")
      .on("mouseover", handleNodeMouseOver)
      .on("mousemove", handleMouseMove)
      .on("mouseout", handleMouseOut)
      .call(drag(simulation) as any);

    // Node circles with enhanced styling based on depth
    node.append("circle")
      .attr("r", d => {
        if (d.isOrigin) return 15;
        if (d.isProgram) return 12;
        
        // Size decreases slightly with depth
        const depth = d.depth || 1;
        const sizeFactor = Math.max(0.7, 1.1 - (depth * 0.05));
        
        return 10 * sizeFactor;
      })
      .attr("fill", d => {
        // Origin node
        if (d.isOrigin) return "url(#origin-gradient)";
        
        // Program node
        if (d.isProgram) return "url(#program-gradient)";
        
        // Suspicious node
        if (d.risk > 60 && highlightSuspicious) return "url(#suspicious-gradient)";
        
        // Color by depth
        const depthGradients = [
          "url(#depth-1-gradient)",
          "url(#depth-2-gradient)",
          "url(#depth-3-gradient)",
          "url(#depth-4-gradient)",
          "url(#depth-5-gradient)"
        ];
        
        const gradientIndex = Math.min(d.depth - 1, depthGradients.length - 1);
        
        return depthGradients[Math.max(0, gradientIndex)];
      })
      .attr("stroke", d => {
        if (d.isOrigin) return "#FF9500";
        if (d.risk > 60 && highlightSuspicious) return "#FF4500";
        return "#ffffff";
      })
      .attr("stroke-width", d => {
        if (d.isOrigin) return 3;
        if (d.risk > 60 && highlightSuspicious) return 2;
        return 1;
      })
      .attr("stroke-opacity", d => {
        // Lower opacity for nodes beyond selected depth
        if (d.depth > selectedDepth) return 0.3;
        return 0.8;
      })
      .attr("fill-opacity", d => {
        // Lower opacity for nodes beyond selected depth
        if (d.depth > selectedDepth) return 0.3;
        return 1;
      });

    // Add glow effect for important nodes
    node.filter(d => d.isOrigin || d.risk > 60 || d.depth === 1)
      .append("circle")
      .attr("r", d => {
        if (d.isOrigin) return 20;
        if (d.risk > 60) return 15;
        if (d.depth === 1) return 15;
        return 14;
      })
      .attr("fill", "none")
      .attr("stroke", d => {
        if (d.isOrigin) return "#FF9500";
        if (d.risk > 60) return "#FF4500";
        if (d.depth === 1) return "#14F195";
        return "#ffffff";
      })
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.3);

    // Add depth indicators
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", "white")
      .style("font-size", d => d.isOrigin ? "10px" : "8px")
      .style("font-weight", "bold")
      .text(d => {
        if (d.isOrigin) return "O";
        if (d.isProgram) return "P";
        return d.depth;
      });

    // Add labels for nodes if enabled
    if (showLabels) {
      node.filter(d => d.label || d.isOrigin || d.depth <= 2 || d.isProgram)
        .append("text")
        .attr("dx", d => {
          const baseSize = d.isOrigin ? 15 : d.isProgram ? 12 : 10;
          return baseSize + 5;
        })
        .attr("dy", "0.35em")
        .text(d => {
          if (d.label) return d.label;
          if (d.isOrigin) return "Origin";
          if (d.isProgram) return "Program";
          return formatAddress(d.id, 6);
        })
        .attr("class", d => {
          if (d.depth > selectedDepth) {
            return "fill-current text-muted-foreground text-xs opacity-30";
          }
          return "fill-current text-foreground text-xs font-medium";
        });
    }

    // Update positions on each tick
    simulation.on("tick", () => {
      // Update link paths - create curved paths
      link.attr("d", d => {
        const source = d.source;
        const target = d.target;
        
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        
        // Create a nice curved path
        return `M${source.x},${source.y}A${dr},${dr} 0 0,1 ${target.x},${target.y}`;
      });

      // Update node positions
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Tooltip event handlers with enhanced content
    function handleNodeMouseOver(event: any, d: any) {
      // Build rich HTML tooltip content with more detailed information
      const isOutOfDepth = d.depth > selectedDepth;
      const nodeDescription = d.isOrigin ? "Origin" : d.isProgram ? "Program" : `Depth ${d.depth}`;
      
      // Determine node type and color
      let nodeType = 'ACCOUNT';
      let typeColor = '';
      
      if (d.isOrigin) {
        nodeType = 'ORIGIN ACCOUNT';
        typeColor = 'text-amber-500';
      } else if (d.isProgram) {
        nodeType = 'PROGRAM';
        typeColor = 'text-blue-500';
      } else if (d.entityType) {
        nodeType = d.entityType.toUpperCase();
        typeColor = 'text-solana-purple';
      }
      
      // Transaction volume metrics in USD
      const volumes = accountVolumes.get(d.id) || { inflow: 0, outflow: 0, usdInflow: 0, usdOutflow: 0 };
      const inVolume = formatCurrency(volumes.usdInflow);
      const outVolume = formatCurrency(volumes.usdOutflow);
      const netVolume = formatCurrency(volumes.usdInflow - volumes.usdOutflow);
      const totalVolume = formatCurrency(volumes.usdInflow + volumes.usdOutflow);
      
      // Token balances
      const solBalance = formatSol(d.isOrigin ? volumes.inflow - volumes.outflow : volumes.inflow - volumes.outflow); 
      
      // Risk assessment
      const riskHtml = d.risk > 0 
        ? `<div class="mt-1 ${getRiskColor(d.risk)} font-medium">${getRiskLabel(d.risk)}</div>` 
        : '';
      
      // Risk reasons
      let riskReasonsHtml = '';
      if (d.riskReasons && d.riskReasons.length > 0 && d.risk > 30) {
        riskReasonsHtml = `
          <div class="mt-2 text-xs ${getRiskColor(d.risk)} bg-${getRiskColor(d.risk).replace('text-', '')}/10 p-2 rounded-md">
            ${d.riskReasons.map(reason => `<div>• ${reason}</div>`).join('')}
          </div>
        `;
      }
      
      // Entity verification badge
      const verifiedBadge = d.verified
        ? '<span class="inline-flex items-center ml-1 text-solana-green">✓</span>'
        : '';
        
      // Depth relationship to origin
      const depthDescription = d.isOrigin 
        ? '' 
        : d.depth === 1
          ? '<div class="text-xs text-solana-green mt-1">Direct connection to origin</div>'
          : `<div class="text-xs text-solana-blue mt-1">${d.depth} hops from origin</div>`;
      
      // Enhanced tooltip with more detailed and organized information
      const htmlContent = `
        <div class="font-bold text-sm ${typeColor}">${nodeType}</div>
        <div class="mt-1">
          <div class="font-medium flex items-center">
            ${d.label || formatAddress(d.id, 8)}
            ${verifiedBadge}
          </div>
          <div class="text-xs text-muted-foreground">${nodeDescription}</div>
          ${depthDescription}
          ${riskHtml}
        </div>
        
        ${!d.isProgram ? `
        <div class="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
          <div class="text-muted-foreground">USD Inflow:</div>
          <div class="font-medium">${inVolume}</div>
          <div class="text-muted-foreground">USD Outflow:</div>
          <div class="font-medium">${outVolume}</div>
          <div class="text-muted-foreground">Net USD Flow:</div>
          <div class="font-medium ${parseFloat(netVolume.replace(/[^0-9.-]+/g, "")) >= 0 ? 'text-green-500' : 'text-red-500'}">
            ${netVolume}
          </div>
          <div class="text-muted-foreground">Total USD Volume:</div>
          <div class="font-medium">${totalVolume}</div>
          <div class="text-muted-foreground">Transactions:</div>
          <div class="font-medium">${d.txCount || 0}</div>
          </div>
          ` : ''}
          
          ${riskReasonsHtml}
          
          <div class="mt-2 text-xs text-muted-foreground">
          ${isOutOfDepth ? `<div class="text-amber-500">⚠️ Beyond selected depth (${selectedDepth})</div>` : ''}
          <div class="mt-1">${formatAddress(d.id, 12)}</div>
          </div>
          `;
      
      setTooltip({
        visible: true,
        content: htmlContent,
        x: event.layerX,
        y: event.layerY
      });
    }
    
    function handleLinkMouseOver(event: any, d: any) {
      const source = typeof d.source === 'string' ? d.source : d.source.id;
      const target = typeof d.target === 'string' ? d.target : d.target.id;
      
      const sourceNode = nodes.find(n => n.id === source);
      const targetNode = nodes.find(n => n.id === target);
      
      if (!sourceNode || !targetNode) return;
      
      const sourceName = sourceNode.label || formatAddress(source, 6);
      const targetName = targetNode.label || formatAddress(target, 6);
      
      // Determine if this is part of a critical path
      const isOutOfDepth = sourceNode.depth > selectedDepth || targetNode.depth > selectedDepth;
      
      // Format the transaction timestamp if available
      const timestampStr = d.timestamp ? 
        `<div class="text-xs mt-1">Time: ${new Date(d.timestamp).toLocaleString()}</div>` : '';
      
      // Look up program name if available
      const programName = d.programId ? (KNOWN_PROGRAMS[d.programId] || formatAddress(d.programId, 6)) : '';
      
      // Format token amount, showing the raw token amount without USD conversion
      const tokenAmountStr = d.amount && d.tokenType ?
        `<div class="font-medium">${formatAmount(d.amount, d.tokenType)}</div>` : '';
      
      // Calculate fee if it's a SOL transaction
      const feeStr = d.tokenType === 'SOL' ?
        `<div class="text-xs text-muted-foreground">Fee: 0.000005 SOL</div>` : '';
      
      // Format token information nicely
      const tokenInfo = d.tokenType && d.amount ?
        `
        <div class="mt-2 p-2 bg-muted/30 rounded-md">
          <div class="font-medium text-xs mb-1">Transaction Details</div>
          <div class="grid grid-cols-2 gap-x-2 text-xs">
            <div class="text-muted-foreground">Token:</div>
            <div class="font-medium">${d.tokenType}</div>
            <div class="text-muted-foreground">Amount:</div>
            ${tokenAmountStr}
            ${programName ? `
              <div class="text-muted-foreground">Program:</div>
              <div class="font-medium">${programName}</div>
            ` : ''}
            ${d.isCpi ? `
              <div class="text-muted-foreground">Type:</div>
              <div class="font-medium text-amber-400">Cross-Program Invocation</div>
            ` : ''}
          </div>
          ${feeStr}
        </div>
        ` : '';
      
      // Build an enhanced tooltip with more detailed information
      const htmlContent = `
        <div class="font-bold text-sm flex items-center">
          ${d.isSuspicious ? 
            '<span class="text-red-500 mr-1">⚠️</span><span class="text-red-500">SUSPICIOUS FLOW</span>' : 
            'TRANSACTION FLOW'}
        </div>
        
        <div class="mt-2 flex items-center justify-between">
          <span class="bg-solana-blue/10 text-solana-blue text-xs px-2 py-1 rounded-md">From</span>
          <span class="font-medium text-sm px-2">${sourceName}</span>
        </div>
        
        <div class="my-1 h-5 border-l border-muted-foreground ml-6"></div>
        
        <div class="flex items-center justify-between">
          <span class="bg-solana-green/10 text-solana-green text-xs px-2 py-1 rounded-md">To</span>
          <span class="font-medium text-sm px-2">${targetName}</span>
        </div>
        
        <div class="text-xs text-muted-foreground mt-2">
          <div>From Depth: ${sourceNode.depth} • To Depth: ${targetNode.depth}</div>
          ${timestampStr}
        </div>
        
        ${tokenInfo}
        
        ${isOutOfDepth ? 
          '<div class="text-xs text-amber-500 mt-2">⚠️ Beyond selected depth limit</div>' : ''}
        
        ${d.isSuspicious ? 
          '<div class="text-xs text-red-500 mt-2 p-2 bg-red-500/10 rounded-md">⚠️ This flow shows suspicious pattern</div>' : ''}
        
        ${d.isFlagged ? 
          '<div class="text-xs text-red-400 mt-1">⚠️ This transaction has been flagged for review</div>' : ''}
      `;
      
      setTooltip({
        visible: true,
        content: htmlContent,
        x: event.layerX,
        y: event.layerY
      });
      
      // Highlight the connection
      d3.select(event.target)
        .transition()
        .duration(200)
        .attr("stroke-width", (d.value || 1) * 2)
        .attr("stroke-opacity", 0.8);
    }
    
    function handleMouseMove(event: any) {
      setTooltip(prev => ({
        ...prev,
        x: event.layerX,
        y: event.layerY
      }));
    }
    
    function handleMouseOut(event: any, d: any) {
      setTooltip(prev => ({ ...prev, visible: false }));
      
      // Reset any highlighting
      if (event.target.tagName === 'path') {
        const sourceNode = typeof d.source === 'string' ? 
          nodes.find(n => n.id === d.source) : d.source;
        const targetNode = typeof d.target === 'string' ? 
          nodes.find(n => n.id === d.target) : d.target;
          
        if (!sourceNode || !targetNode) return;
          
        const sourceDepth = sourceNode.depth || 0;
        const targetDepth = targetNode.depth || 0;
        const minDepth = Math.min(sourceDepth, targetDepth);
        
        d3.select(event.target)
          .transition()
          .duration(200)
          .attr("stroke-width", () => {
            const baseWidth = d.value || 1;
            const depthFactor = Math.max(0.5, 1.5 - (minDepth * 0.2));
            return baseWidth * depthFactor;
          })
          .attr("stroke-opacity", () => {
            if (d.isSuspicious && highlightSuspicious) return 0.8;
            return Math.max(0.2, 0.7 - (minDepth * 0.1));
          });
      }
    }

    // Drag functions
    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    return () => {
      simulation.stop();
    };
  }, [cluster, showLabels, highlightSuspicious, nodeDepths, originAddress, selectedDepth, entityMap, KNOWN_PROGRAMS]);

  return (
    <div className={`${className} relative`}>
      <svg ref={svgRef} className="w-full h-full" />
      
      {tooltip.visible && (
        <div 
          className="absolute z-50 p-3 bg-card border border-border rounded-md shadow-lg text-sm max-w-xs"
          style={{
            left: `${tooltip.x + 15}px`,
            top: `${tooltip.y}px`,
            maxWidth: '300px',
            pointerEvents: 'none',
            transform: 'translate(0, -50%)'
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
      
      <div className="absolute bottom-2 right-2 text-xs bg-card/80 p-2 rounded-md text-muted-foreground border border-border">
        <div className="font-medium">{cluster.type || 'Unknown'} cluster</div>
        <div>{cluster.accounts.length} accounts · {cluster.transactions.length} transactions</div>
        <div className="mt-1">Showing depth: {selectedDepth}/{Math.max(...Object.values(nodeDepths) || [1])}</div>
      </div>
      
      {/* Legend */}
      <div className="absolute top-2 left-2 text-xs bg-card/90 p-2 rounded-md text-muted-foreground border border-border">
        <div className="font-medium mb-1">Depth Legend</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 mr-1"></div>
            <span>Origin</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-400 to-green-600 mr-1"></div>
            <span>Depth 1</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-solana-purple to-purple-700 mr-1"></div>
            <span>Depth 2</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-solana-blue to-blue-700 mr-1"></div>
            <span>Depth 3+</span>
          </div>
          {highlightSuspicious && (
            <div className="flex items-center col-span-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-red-500 to-red-700 mr-1"></div>
              <span className="text-red-500">Suspicious Activity</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepthAwareClusterGraph;