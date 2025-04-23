// src/components/ForceDirectedGraph.tsx
"use client"

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Node {
  id: string;
  group: number;
  type?: 'cex' | 'dex' | 'user' | 'contract' | 'unknown';
  confidence?: number;
  volume?: number;
  label?: string;
  verified?: boolean;
  inVolume?: number;
  outVolume?: number;
  netVolume?: number;
  totalVolume?: number;
  txCount?: number;
  entityType?: string;
  description?: string;
  website?: string;
}

interface Link {
  source: string | Node;
  target: string | Node;
  value: number;
  type?: 'deposit' | 'withdrawal' | 'swap' | 'transfer';
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

interface ForceDirectedGraphProps {
  className?: string;
  graphData: GraphData;
  onNodeClick?: (node: Node) => void;
  highlightedNode?: string | null;
}

interface TooltipState {
  visible: boolean;
  content: string;
  x: number;
  y: number;
}

const ForceDirectedGraph = ({ 
  className = "",
  graphData,
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

    // Define arrow markers with different colors
    svg.append("defs").selectAll("marker")
      .data(['deposit', 'withdrawal', 'swap', 'transfer'])
      .join("marker")
      .attr("id", d => `arrow-${d}`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20) // Increased for longer links
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", d => {
        switch(d) {
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
      if (!node.type || node.type === 'unknown') return '#ffffff';
      
      const baseColors = {
        cex: '#9945FF', // Purple for exchanges
        dex: '#14F195', // Green for DEX
        contract: '#00C2FF', // Blue for contracts
        user: '#EF4444'  // Red for users
      };

      return baseColors[node.type] || '#ffffff';
    };

    // Create links with curved paths
    const link = linkGroup.selectAll("path")
      .data(processedLinks)
      .join("path")
      .attr("stroke", d => {
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
        // Base size on volume or importance
        if (d.volume) {
          return Math.max(4, Math.min(12, d.volume * 1.5));
        }
        return d.group === 1 ? 10 : 6; // Central node is bigger
      })
      .attr("fill", getNodeColor)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", d => 
        highlightedNode === d.id ? 2 : 1
      )
      .attr("stroke-opacity", d => 
        highlightedNode ? 
          (highlightedNode === d.id ? 1 : 0.3) 
          : 1
      );

    // Add a subtle glow effect to important nodes
    node.filter(d => d.verified || d.group === 1)
      .insert("circle", "circle")
      .attr("r", d => {
        const baseSize = d.volume ? 
          Math.max(4, Math.min(12, d.volume * 1.5)) : 
          (d.group === 1 ? 10 : 6);
        return baseSize + 3;
      })
      .attr("fill", "none")
      .attr("stroke", d => getNodeColor(d))
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.3);

    // Add labels only for important nodes
    node
      .filter(d => d.label || d.group === 1 || d.verified)
      .append("text")
      .attr("dx", d => {
        const radius = d.volume ? 
          Math.max(4, Math.min(12, d.volume * 1.5)) : 
          (d.group === 1 ? 10 : 6);
        return radius + 4;
      })
      .attr("dy", ".35em")
      .text(d => d.label || formatAddress(d.id))
      .attr("font-size", "10px")
      .attr("fill", "#ffffff")
      .style("pointer-events", "none")
      .style("text-shadow", "1px 1px 1px rgba(0,0,0,0.5)");

    // Node hover handling for tooltip
    node
      .on("mouseover", (event, d) => {
        let headerType = 'WALLET';
        if (d.type === 'dex') headerType = 'DAPP';
        else if (d.type === 'cex') headerType = 'EXCHANGE';
        else if (d.type === 'contract') headerType = 'CONTRACT';
        
        // Format different tooltips based on node type and available data
        let htmlContent = '';
        
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
        
        const sourceName = sourceNode?.label || formatAddress(source, 6);
        const targetName = targetNode?.label || formatAddress(target, 6);
        
        const transactionType = d.type || 'transfer';
        const transactionValue = d.usdValue ? formatCurrency(d.usdValue) : '$0';
        const transactionCount = d.count || 1;
        
        // Transaction tooltip showing transfer details
        const htmlContent = `
          <div class="font-bold text-sm">TRANSFER</div>
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
                <div class="text-xs font-medium">${d.amount.toFixed(6)} ${d.tokenSymbol}</div>
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

    // Create force simulation
    const simulation = d3.forceSimulation(graphData.nodes)
      .force("link", d3.forceLink(processedLinks)
        .id(d => (d as any).id)
        .distance(200)) // Increased from 80 to 200 (2.5x)
      .force("charge", d3.forceManyBody().strength(-200)) // Increased strength to balance longer links
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(d => {
        const volume = (d as any).volume || 1;
        return Math.max(15, Math.min(30, volume * 2));
      }));

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
  }, [graphData, highlightedNode, onNodeClick]);

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