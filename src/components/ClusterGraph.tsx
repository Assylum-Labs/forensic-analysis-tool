"use client"

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { formatAddress } from '@/lib/utils';
import { TransactionCluster } from '@/lib/transactionClustering';

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

  // Known program mappings for better labeling
  const KNOWN_PROGRAMS: Record<string, string> = {
    "11111111111111111111111111111111": "System Program",
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA": "Token Program",
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL": "Assoc. Token Program",
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4": "Jupiter DEX",
    // Add more known programs as needed
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
    
    // Create nodes for all accounts in the cluster
    cluster.accounts.forEach(account => {
      const isProgram = cluster.programs.includes(account);
      const depth = nodeDepths[account] !== undefined ? nodeDepths[account] : 999;
      const isOrigin = account === originAddress || (originAddress && account.startsWith(originAddress.substring(0, 8)));
      
      // Determine label
      let label = '';
      if (isProgram) {
        // Try to identify known programs
        for (const [id, name] of Object.entries(KNOWN_PROGRAMS)) {
          if (account.startsWith(id.substring(0, 8))) {
            label = name;
            break;
          }
        }
        if (!label) label = 'Program';
      }
      
      nodes.push({
        id: account,
        label: label || (isOrigin ? 'Origin' : ''),
        isProgram,
        depth,
        isOrigin,
        // Random value for simulation purposes - in a real app, this would be based on transaction count
        volume: isOrigin ? 3 : isProgram ? 2 : 1,
        // Simulated risk score - in a real app, this would be based on actual risk assessment
        risk: Math.random() > 0.8 ? Math.floor(Math.random() * 100) : 0
      });
    });
    
    // Create links between nodes based on transaction patterns
    // In a real implementation, this would analyze actual transaction data
    // For demo purposes, we'll create simulated connections
    
    // Create connections based on cluster type and depth
    const createConnections = () => {
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
        
        if (currentAccounts && nextAccounts) {
          currentAccounts.forEach(source => {
            // Connect to a random subset of accounts at the next depth
            const numConnections = Math.min(
              nextAccounts.length,
              Math.floor(Math.random() * 3) + 1
            );
            
            const targets = nextAccounts
              .sort(() => 0.5 - Math.random())
              .slice(0, numConnections);
            
            targets.forEach(target => {
              links.push({
                source,
                target,
                value: 1 + Math.random(),
                isSuspicious: Math.random() > 0.85
              });
            });
          });
        }
      }
      
      // Add some connections between nodes at the same depth for more realistic networks
      availableDepths.forEach(depth => {
        const accountsAtDepth = accountsByDepth[depth];
        if (accountsAtDepth && accountsAtDepth.length > 1) {
          const numIntraConnections = Math.min(
            accountsAtDepth.length,
            Math.floor(accountsAtDepth.length * 0.3)
          );
          
          for (let i = 0; i < numIntraConnections; i++) {
            const sourceIdx = Math.floor(Math.random() * accountsAtDepth.length);
            let targetIdx;
            do {
              targetIdx = Math.floor(Math.random() * accountsAtDepth.length);
            } while (targetIdx === sourceIdx);
            
            links.push({
              source: accountsAtDepth[sourceIdx],
              target: accountsAtDepth[targetIdx],
              value: 0.8 + Math.random() * 0.5,
              isSuspicious: Math.random() > 0.9
            });
          }
        }
      });
      
      // Ensure programs are connected to accounts
      const programs = nodes.filter(n => n.isProgram).map(n => n.id);
      programs.forEach(program => {
        // Connect program to a few random accounts
        const nonProgramAccounts = nodes
          .filter(n => !n.isProgram && n.id !== program)
          .map(n => n.id);
        
        const numAccountsToConnect = Math.min(
          nonProgramAccounts.length,
          Math.floor(Math.random() * 5) + 1
        );
        
        const accountsToConnect = nonProgramAccounts
          .sort(() => 0.5 - Math.random())
          .slice(0, numAccountsToConnect);
        
        accountsToConnect.forEach(account => {
          links.push({
            source: program,
            target: account,
            value: 1.2,
            isProgram: true,
            isSuspicious: false
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

    // Tooltip event handlers
    function handleNodeMouseOver(event: any, d: any) {
      // Build rich HTML tooltip content
      const depthLabel = d.isOrigin ? "Origin" : `Depth ${d.depth}`;
      const riskHtml = d.risk > 60 
        ? '<div class="text-red-500 font-medium mt-1">High Risk Account</div>' 
        : '';
      
      const htmlContent = `
        <div class="font-bold text-sm">${d.isProgram ? 'PROGRAM' : 'ACCOUNT'}</div>
        <div class="mt-1">
          <div class="font-medium">${d.label || formatAddress(d.id, 8)}</div>
          <div class="text-xs text-muted-foreground">${depthLabel}</div>
          ${riskHtml}
        </div>
        <div class="mt-2 text-xs text-muted-foreground">
          ${d.depth > selectedDepth ? `<div class="text-amber-500">Beyond selected depth (${selectedDepth})</div>` : ''}
          ${formatAddress(d.id, 12)}
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

      const timestamp = d.timestamp ? 
        `<div class="text-xs">Time: ${new Date(d.timestamp).toLocaleString()}</div>` : '';
      
      // Build tooltip content
      const htmlContent = `
        <div class="font-bold text-sm">
          ${d.isSuspicious ? '⚠️ SUSPICIOUS FLOW' : 'TRANSACTION FLOW'}
        </div>
        <div class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div>From:</div>
          <div class="font-medium">${sourceName}</div>
          <div>Depth:</div>
          <div class="font-medium">${sourceNode.depth}</div>
          <div>To:</div>
          <div class="font-medium">${targetName}</div>
          <div>Depth:</div>
          <div class="font-medium">${targetNode.depth}</div>
           <div>Token:</div>
          <div class="font-medium">${d.tokenType || 'Unknown'}</div>
          <div>Amount:</div>
          <div class="font-medium">${d.amount?.toFixed(4) || '?'} ${d.tokenType || ''}</div>
          ${d.isCpi ? '<div>Type:</div><div class="text-amber-400">Cross-Program Invocation</div>' : ''}
        </div>
        <div class="mt-2 text-xs text-muted-foreground">
          ${timestamp}
          ${d.programId ? `<div>Program: ${formatAddress(d.programId, 8)}</div>` : ''}
          ${d.isFlagged ? '<div class="text-red-400 mt-1">⚠️ This transaction exhibits suspicious patterns</div>' : ''}
        </div>
        ${d.isSuspicious 
          ? '<div class="text-xs text-red-500 mt-2">⚠️ This flow shows suspicious pattern</div>' 
          : ''}
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
  }, [cluster, showLabels, highlightSuspicious, nodeDepths, originAddress, selectedDepth]);

  return (
    <div className={`${className} relative`}>
      <svg ref={svgRef} className="w-full h-full" />
      
      {tooltip.visible && (
        <div 
          className="absolute z-50 p-3 bg-card border border-border rounded-md shadow-lg text-sm"
          style={{
            left: `${tooltip.x + 15}px`,
            top: `${tooltip.y}px`,
            maxWidth: '280px',
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