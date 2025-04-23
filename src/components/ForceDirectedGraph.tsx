"use client"

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Node {
  id: string;
  group: number;
  type?: 'cex' | 'dex' | 'user' | 'contract' | 'unknown';
  tokenType?: 'wallet' | 'mint';
  tokenMint?: string;
  tokenSymbol?: string;
  volume?: number;
  label?: string;
  verified?: boolean;
  inVolume?: number;
  outVolume?: number;
  netVolume?: number;
  totalVolume?: number;
  txCount?: number;
}

interface Link {
  source: string | Node;
  target: string | Node;
  value: number;
  type?: 'deposit' | 'withdrawal' | 'swap' | 'transfer' | 'token';
  tokenMint?: string;
  tokenSymbol?: string;
  amount?: number;
  usdValue?: number;
  count?: number;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

interface TooltipState {
  visible: boolean;
  content: string;
  x: number;
  y: number;
}

interface ForceDirectedGraphProps {
  className?: string;
  graphData: GraphData;
  viewMode?: 'wallet' | 'token';
  tokenData?: any;
  onNodeClick?: (node: Node) => void;
  highlightedNode?: string | null;
}

const ForceDirectedGraph = ({ 
  className = "",
  graphData,
  viewMode = 'wallet',
  tokenData,
  onNodeClick,
  highlightedNode
}: ForceDirectedGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    content: '',
    x: 0,
    y: 0
  });

  // Format address for labels
  const formatAddress = (address: string, length = 4) => {
    if (!address) return '';
    return `${address.slice(0, length)}...${address.slice(-length)}`;
  };

  // Format currency for display
  const formatCurrency = (amount: number): string => {
    if (amount === undefined || amount === null) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Format token amount
  const formatTokenAmount = (amount: number, symbol: string): string => {
    if (amount === undefined || amount === null) return '0';
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 6
    }).format(amount) + ' ' + symbol;
  };

  useEffect(() => {
    if (!svgRef.current || !graphData || !graphData.nodes || !graphData.links) return;

    // Clear any existing SVG content
    d3.select(svgRef.current).selectAll("*").remove();

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 600;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("class", "bg-solana-dark");

    // Add zoom functionality
    const g = svg.append("g");
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom as any);

    // Define arrow markers
    svg.append("defs").selectAll("marker")
      .data(['token', 'transfer', 'deposit', 'withdrawal', 'swap'])
      .join("marker")
      .attr("id", d => `arrow-${d}`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", d => {
        switch(d) {
          case 'token': return '#FFD700'; // Gold color for token flows
          case 'deposit': return '#14F195'; // Green
          case 'withdrawal': return '#9945FF'; // Purple
          case 'swap': return '#00C2FF'; // Blue
          default: return '#666666'; // Gray
        }
      })
      .attr("d", "M0,-5L10,0L0,5");

    // Create the path group
    const linkGroup = g.append("g").attr("class", "links");

    // Process the data to ensure proper references
    const nodeMap = new Map(graphData.nodes.map(node => [node.id, node]));
    const processedLinks = graphData.links.map(link => ({
      ...link,
      source: typeof link.source === 'string' ? link.source : link.source.id,
      target: typeof link.target === 'string' ? link.target : link.target.id
    })).filter(link => 
      nodeMap.has(link.source as string) && 
      nodeMap.has(link.target as string)
    );

    // Node color based on type
    const getNodeColor = (node: Node) => {
      if (viewMode === 'token') {
        // Token view colors
        if (node.tokenType === 'mint') return '#FFD700'; // Gold for token mints
        
        if (!node.type || node.type === 'unknown') return '#ffffff'; // White for unknown
        
        const baseColors = {
          cex: '#9945FF', // Purple for exchanges
          dex: '#14F195', // Green for DEX
          contract: '#00C2FF', // Blue for contracts
          user: '#EF4444'  // Red for users
        };
        return baseColors[node.type] || '#ffffff';
      } else {
        // Wallet view colors
        if (!node.type || node.type === 'unknown') return '#ffffff';
        
        const baseColors = {
          cex: '#9945FF', // Purple for exchanges
          dex: '#14F195', // Green for DEX
          contract: '#00C2FF', // Blue for contracts
          user: '#EF4444'  // Red for users
        };
        return baseColors[node.type] || '#ffffff';
      }
    };

    // Create links with curved paths
    const link = linkGroup.selectAll("path")
      .data(processedLinks)
      .join("path")
      .attr("stroke", d => {
        if (viewMode === 'token' && d.type === 'token') {
          return '#FFD700'; // Gold color for token flows
        }
        
        switch(d.type) {
          case 'deposit': return '#14F195'; // Green
          case 'withdrawal': return '#9945FF'; // Purple
          case 'swap': return '#00C2FF'; // Blue
          default: return '#666666'; // Gray
        }
      })
      .attr("stroke-opacity", d => {
        if (!highlightedNode) return 0.6;
        return (d.source === highlightedNode || d.target === highlightedNode) ? 0.8 : 0.1;
      })
      .attr("stroke-width", d => Math.sqrt(d.value || 1) * 1.5)
      .attr("fill", "none")
      .attr("marker-end", d => `url(#arrow-${d.type || 'transfer'})`);

    // Create nodes group
    const nodeGroup = g.append("g").attr("class", "nodes");
    
    // Create nodes
    const node = nodeGroup.selectAll("g")
      .data(graphData.nodes)
      .join("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Node circles
    node.append("circle")
      .attr("r", d => {
        if (viewMode === 'token' && d.tokenType === 'mint') {
          return 12; // Larger size for token mints in token view
        }
        if (d.volume) {
          return Math.max(5, Math.min(10, d.volume * 1.2));
        }
        return d.group === 1 ? 10 : 6; // Central node is bigger
      })
      .attr("fill", getNodeColor)
      .attr("stroke", d => {
        if (viewMode === 'token' && d.tokenType === 'mint') {
          return '#FFF5CC'; // Light gold outline for token mints
        }
        return "#ffffff";
      })
      .attr("stroke-width", d => 
        highlightedNode === d.id ? 2 : 1
      )
      .attr("stroke-opacity", d => 
        highlightedNode ? 
          (highlightedNode === d.id ? 1 : 0.3) 
          : 1
      );

    // Add a subtle glow effect to important nodes
    node.filter(d => {
      if (viewMode === 'token') {
        return d.tokenType === 'mint' || d.verified || d.group === 1;
      }
      return d.verified || d.group === 1;
    })
      .insert("circle", "circle")
      .attr("r", d => {
        let baseSize;
        if (viewMode === 'token' && d.tokenType === 'mint') {
          baseSize = 12;
        } else if (d.volume) {
          baseSize = Math.max(5, Math.min(10, d.volume * 1.2));
        } else {
          baseSize = d.group === 1 ? 10 : 6;
        }
        return baseSize + 3;
      })
      .attr("fill", "none")
      .attr("stroke", d => getNodeColor(d))
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.3);

    // Add labels to all nodes in token view, or to important nodes in wallet view
    node
      .filter(d => {
        if (viewMode === 'token') {
          return true; // Label all nodes in token view
        }
        return d.label || d.group === 1 || d.verified;
      })
      .append("text")
      .attr("dx", d => {
        let radius;
        if (viewMode === 'token' && d.tokenType === 'mint') {
          radius = 12;
        } else if (d.volume) {
          radius = Math.max(5, Math.min(10, d.volume * 1.2));
        } else {
          radius = d.group === 1 ? 10 : 6;
        }
        return radius + 4;
      })
      .attr("dy", ".35em")
      .text(d => {
        if (viewMode === 'token' && d.tokenType === 'mint') {
          return d.tokenSymbol || d.label || formatAddress(d.id);
        }
        return d.label || formatAddress(d.id);
      })
      .attr("font-size", d => viewMode === 'token' && d.tokenType === 'mint' ? "12px" : "10px")
      .attr("font-weight", d => viewMode === 'token' && d.tokenType === 'mint' ? "bold" : "normal")
      .attr("fill", "#ffffff")
      .style("pointer-events", "none")
      .style("text-shadow", "1px 1px 1px rgba(0,0,0,0.5)");

    // Node hover handling for tooltip
    node
      .on("mouseover", (event, d) => {
        let htmlContent = '';
        
        if (viewMode === 'token') {
          if (d.tokenType === 'mint') {
            // Token mint tooltip
            htmlContent = `
              <div class="font-bold text-sm">TOKEN</div>
              <div class="mt-1">
                <div class="font-medium">${d.tokenSymbol || d.label || formatAddress(d.id)}</div>
                ${d.verified ? '<div class="text-xs text-solana-green">✓ Verified Token</div>' : ''}
              </div>
              <div class="mt-2">
                <div class="text-sm">Total Volume: ${formatCurrency(d.totalVolume || 0)}</div>
                <div class="text-sm">Transactions: ${d.txCount || 0}</div>
              </div>
              <div class="text-xs mt-2 text-muted-foreground">${formatAddress(d.id, 12)}</div>
            `;
          } else {
            // Wallet tooltip in token view
            htmlContent = `
              <div class="font-bold text-sm">WALLET</div>
              <div class="mt-1">
                ${d.label ? `<div class="font-medium">Name: ${d.label}</div>` : `<div class="font-medium">Address: ${formatAddress(d.id, 8)}</div>`}
                ${d.entityType ? `<div class="text-xs text-muted-foreground">Type: ${d.entityType.toUpperCase()}</div>` : ''}
                ${d.verified ? '<div class="text-xs text-solana-green">✓ Verified Entity</div>' : ''}
              </div>
              <div class="mt-2">
                <div class="text-sm">In: ${formatCurrency(d.inVolume || 0)}</div>
                <div class="text-sm">Out: ${formatCurrency(d.outVolume || 0)}</div>
                <div class="text-sm">Net: ${formatCurrency(d.netVolume || 0)}</div>
                <div class="text-sm">Total: ${formatCurrency(d.totalVolume || 0)}</div>
              </div>
              <div class="text-xs mt-2 text-muted-foreground">${formatAddress(d.id, 12)}</div>
            `;
          }
        } else {
          // Standard wallet view tooltip
          let headerType = 'WALLET';
          if (d.type === 'dex') headerType = 'DAPP';
          else if (d.type === 'cex') headerType = 'EXCHANGE';
          else if (d.type === 'contract') headerType = 'CONTRACT';
          
          if (d.label) {
            // Entity tooltip with name and volume info
            htmlContent = `
              <div class="font-bold text-sm">${headerType}</div>
              <div class="mt-1">
                <div class="font-medium">Name: ${d.label}</div>
                ${d.entityType ? `<div class="text-xs text-muted-foreground">Type: ${d.entityType.toUpperCase()}</div>` : ''}
                ${d.verified ? '<div class="text-xs text-solana-green">✓ Verified Entity</div>' : ''}
              </div>
              <div class="mt-2">
                <div class="text-sm">In Vol: ${formatCurrency(d.inVolume || 0)}</div>
                <div class="text-sm">Out Vol: ${formatCurrency(d.outVolume || 0)}</div>
                <div class="text-sm">Net Vol: ${formatCurrency(d.netVolume || 0)}</div>
                <div class="text-sm">Total Vol: ${formatCurrency(d.totalVolume || 0)}</div>
              </div>
              <div class="text-xs mt-2 text-muted-foreground">${formatAddress(d.id, 12)}</div>
            `;
          } else {
            // Regular wallet tooltip
            htmlContent = `
              <div class="font-bold text-sm">${headerType}</div>
              <div class="mt-1">
                <div class="font-medium">Address: ${formatAddress(d.id, 8)}</div>
                ${d.type ? `<div class="text-xs text-muted-foreground">Type: ${d.type.toUpperCase()}</div>` : ''}
              </div>
              <div class="mt-2">
                <div class="text-sm">In Vol: ${formatCurrency(d.inVolume || 0)}</div>
                <div class="text-sm">Out Vol: ${formatCurrency(d.outVolume || 0)}</div>
                <div class="text-sm">Net Vol: ${formatCurrency(d.netVolume || 0)}</div>
                <div class="text-sm">Total Vol: ${formatCurrency(d.totalVolume || 0)}</div>
              </div>
            `;
          }
        }
        
        setTooltip({
          visible: true,
          content: htmlContent,
          x: event.layerX,
          y: event.layerY
        });
      })
      .on("mousemove", (event) => {
        setTooltip(prev => ({
          ...prev,
          x: event.layerX,
          y: event.layerY
        }));
      })
      .on("mouseout", () => {
        setTooltip(prev => ({ ...prev, visible: false }));
      });

    // Link hover handling for tooltip
    link
      .on("mouseover", (event, d) => {
        const source = typeof d.source === 'string' ? d.source : d.source.id;
        const target = typeof d.target === 'string' ? d.target : d.target.id;
        
        const sourceNode = nodeMap.get(source);
        const targetNode = nodeMap.get(target);
        
        let sourceName = sourceNode?.label || formatAddress(source, 6);
        let targetName = targetNode?.label || formatAddress(target, 6);

        // In token view, use token symbols for token mint nodes
        if (viewMode === 'token') {
          if (sourceNode?.tokenType === 'mint') {
            sourceName = sourceNode.tokenSymbol || sourceName;
          }
          if (targetNode?.tokenType === 'mint') {
            targetName = targetNode.tokenSymbol || targetName;
          }
        }
        
        const transactionType = d.type === 'token' ? 'TOKEN TRANSFER' : 'TRANSFER';
        const transactionValue = d.usdValue ? formatCurrency(d.usdValue) : '$0';
        const transactionCount = d.count || 1;
        
        // Transaction tooltip
        const htmlContent = `
          <div class="font-bold text-sm">${transactionType}</div>
          <div class="mt-2">
            <div class="text-sm">Volume: ${transactionValue}</div>
            <div class="text-sm">Count: ${transactionCount}</div>
          </div>
          <div class="mt-2 grid grid-cols-2 gap-x-2">
            <div class="text-xs text-muted-foreground">From:</div>
            <div class="text-xs font-medium">${sourceName}</div>
            <div class="text-xs text-muted-foreground">To:</div>
            <div class="text-xs font-medium">${targetName}</div>
            ${d.tokenSymbol ? `
              <div class="text-xs text-muted-foreground">Token:</div>
              <div class="text-xs font-medium">${d.tokenSymbol}</div>
              ${d.amount ? `
                <div class="text-xs text-muted-foreground">Amount:</div>
                <div class="text-xs font-medium">${formatTokenAmount(d.amount, d.tokenSymbol)}</div>
              ` : ''}
            ` : ''}
          </div>
        `;
        
        setTooltip({
          visible: true,
          content: htmlContent,
          x: event.layerX,
          y: event.layerY
        });
        
        // Highlight the connection
        d3.select(event.currentTarget)
          .attr("stroke-width", Math.sqrt(d.value || 1) * 2.5)
          .attr("stroke-opacity", 1);
      })
      .on("mousemove", (event) => {
        setTooltip(prev => ({
          ...prev,
          x: event.layerX,
          y: event.layerY
        }));
      })
      .on("mouseout", (event, d) => {
        setTooltip(prev => ({ ...prev, visible: false }));
        
        // Reset the connection style
        d3.select(event.currentTarget)
          .attr("stroke-width", Math.sqrt(d.value || 1) * 1.5)
          .attr("stroke-opacity", d => {
            if (!highlightedNode) return 0.6;
            return (d.source === highlightedNode || d.target === highlightedNode) ? 0.8 : 0.1;
          });
      });

    // Add click handling
    node.on("click", (event, d) => {
      if (onNodeClick) {
        event.stopPropagation();
        onNodeClick(d);
      }
    });

    // Allow clicking background to deselect
    svg.on("click", () => {
      if (onNodeClick && highlightedNode) {
        onNodeClick(null);
      }
    });

    // Create force simulation with different parameters based on view mode
    const simulation = d3.forceSimulation(graphData.nodes)
      .force("link", d3.forceLink(processedLinks)
        .id(d => (d as any).id)
        .distance(d => {
          // In token view, make links to/from token mints shorter
          if (viewMode === 'token') {
            const source = typeof (d as any).source === 'string' ? (d as any).source : (d as any).source.id;
            const target = typeof (d as any).target === 'string' ? (d as any).target : (d as any).target.id;
            
            const sourceNode = nodeMap.get(source);
            const targetNode = nodeMap.get(target);
            
            if (sourceNode?.tokenType === 'mint' || targetNode?.tokenType === 'mint') {
              return 120; // Shorter distance for token mint connections
            }
          }
          return 180; // Default distance
        }))
      .force("charge", d3.forceManyBody().strength(d => {
        // In token view, make token mints more strongly repulsive
        if (viewMode === 'token' && (d as any).tokenType === 'mint') {
          return -300;
        }
        return -150;
      }))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(d => {
        if (viewMode === 'token' && (d as any).tokenType === 'mint') {
          return 40; // Larger collision radius for token mints
        }
        const volume = (d as any).volume || 1;
        return Math.max(15, Math.min(30, volume * 2));
      }));

    // For token view, add additional forces to organize by token type
    if (viewMode === 'token') {
      // Position token mints in a circle around the center
      const numTokenMints = graphData.nodes.filter(n => n.tokenType === 'mint').length;
      if (numTokenMints > 0) {
        let mintIndex = 0;
        const radius = Math.min(width, height) * 0.35; // Circle radius
        
        simulation.force("x", d3.forceX().x(d => {
          if ((d as any).tokenType === 'mint') {
            // Arrange mints in a circle
            const angle = (mintIndex++ * 2 * Math.PI / numTokenMints);
            return width/2 + radius * Math.cos(angle);
          }
          return width / 2;
        }).strength(d => (d as any).tokenType === 'mint' ? 0.5 : 0.1));
        
        simulation.force("y", d3.forceY().y(d => {
          if ((d as any).tokenType === 'mint') {
            // We already incremented mintIndex above, so use mintIndex-1
            const angle = ((mintIndex-1) * 2 * Math.PI / numTokenMints);
            return height/2 + radius * Math.sin(angle);
          }
          return height / 2;
        }).strength(d => (d as any).tokenType === 'mint' ? 0.5 : 0.1));
      }
    }

    // Update positions on each tick
    simulation.on("tick", () => {
      // Update link paths - use curved paths for better visualization
      link.attr("d", d => {
        const sourceX = (d.source as any).x;
        const sourceY = (d.source as any).y;
        const targetX = (d.target as any).x;
        const targetY = (d.target as any).y;
        
        // Calculate the midpoint with a curve factor
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const dr = Math.sqrt(dx * dx + dy * dy) * 2;
        
        // Create a curved path
        return `M${sourceX},${sourceY}A${dr},${dr} 0 0,1 ${targetX},${targetY}`;
      });

      // Update node positions
      node.attr("transform", d => `translate(${(d as any).x},${(d as any).y})`);
    });

    // Dragging functions
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [graphData, highlightedNode, onNodeClick, viewMode]);

  return (
    <div className={`w-full h-full bg-solana-dark ${className} relative`}>
      <svg
        ref={svgRef}
        className="w-full h-full"
      />
      {tooltip.visible && (
        <div 
          className="absolute p-3 bg-card border border-border rounded-md shadow-lg text-sm z-50"
          style={{
            left: tooltip.x + 'px',
            top: (tooltip.y + 25) + 'px',
            maxWidth: '250px',
            pointerEvents: 'none',
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
    </div>
  );
};

export default ForceDirectedGraph;