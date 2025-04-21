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
}

interface Link {
  source: string;
  target: string;
  value: number;
  type?: 'deposit' | 'withdrawal' | 'swap' | 'transfer';
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
        console.log('event', event);
        
        const nodeType = d.type || 'unknown';
        const htmlContent = `
          <div class="font-medium">${d.label || formatAddress(d.id, 8)}</div>
          <div class="text-xs text-muted-foreground mt-1">Type: ${nodeType.toUpperCase()}</div>
          ${d.volume ? `<div class="text-xs mt-1">Volume: ${d.volume} transactions</div>` : ''}
          ${d.verified ? '<div class="text-xs text-solana-green mt-1">Verified Entity</div>' : ''}
          <div class="text-xs mt-1">${formatAddress(d.id, 12)}</div>
        `;
        
        setTooltip({
          visible: true,
          content: htmlContent,
          x: event.layerX,
          y: event.layerY
          // x: event.layerX,
          // y: event.layerY
          // x: event.pageX,
          // y: event.pageY
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
        const transactionValue = d.value || 1;
        
        const htmlContent = `
          <div class="font-medium text-xs">${transactionType.toUpperCase()} Transaction</div>
          <div class="mt-1">
            <div class="text-xs">From: <span class="font-medium">${sourceName}</span></div>
            <div class="text-xs">To: <span class="font-medium">${targetName}</span></div>
          </div>
          <div class="text-xs mt-1">Activity: ${transactionValue} transaction${transactionValue > 1 ? 's' : ''}</div>
        `;
        
        setTooltip({
          visible: true,
          content: htmlContent,
          x: event.layerX,
          y: event.layerY
          // x: event.pageX,
          // y: event.pageY
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
            // transform: 'translateX(-50%)',
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
    </div>
  );
};

export default ForceDirectedGraph;