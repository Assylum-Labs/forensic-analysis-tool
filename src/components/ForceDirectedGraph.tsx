// src/components/ForceDirectedGraph.tsx
"use client"

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Node {
  id: string;
  group: number;
  type?: 'cex' | 'dex' | 'user' | 'contract' | 'unknown';
  confidence?: number;
  volume?: number;
  label?: string;
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
  highlightedNode?: string;
}

const ForceDirectedGraph = ({ 
  className = "",
  graphData,
  onNodeClick,
  highlightedNode
}: ForceDirectedGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !graphData) return;

    // Clear any existing SVG content
    d3.select(svgRef.current).selectAll("*").remove();

    const width = 800;
    const height = 600;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("viewBox", [-width / 2, -height / 2, width, height])
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
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 4)
      .attr("markerHeight", 4)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", d => {
        switch(d) {
          case 'deposit': return '#14F195';
          case 'withdrawal': return '#9945FF';
          case 'swap': return '#00C2FF';
          default: return '#666';
        }
      })
      .attr("d", "M0,-5L10,0L0,5");

    // Create the path group
    const pathGroup = g.append("g").attr("class", "paths");

    // Create links with paths
    const link = pathGroup.selectAll("path")
      .data(graphData.links)
      .join("path")
      .attr("stroke", d => {
        switch(d.type) {
          case 'deposit': return '#14F195';
          case 'withdrawal': return '#9945FF';
          case 'swap': return '#00C2FF';
          default: return '#444';
        }
      })
      .attr("stroke-opacity", d => 
        highlightedNode ? 
          (d.source === highlightedNode || d.target === highlightedNode ? 0.8 : 0.2) 
          : 0.6
      )
      .attr("stroke-width", d => Math.sqrt(d.value))
      .attr("fill", "none")
      .attr("marker-end", d => `url(#arrow-${d.type || 'transfer'})`);

    // Node color based on type and confidence
    const getNodeColor = (node: Node) => {
      if (!node.type || node.type === 'unknown') return '#fff';
      
      const baseColors = {
        cex: '#9945FF',
        dex: '#14F195',
        contract: '#00C2FF',
        user: '#666'
      };

      const baseColor = baseColors[node.type] || '#fff';
      
      // Adjust opacity based on confidence if available
      return node.confidence ? 
        d3.color(baseColor)?.copy({opacity: 0.3 + (node.confidence * 0.7)}) 
        : baseColor;
    };

    // Create nodes with type-specific styling
    const node = g.append("g")
      .selectAll("g")
      .data(graphData.nodes)
      .join("g")
      .attr("class", "node")
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Node circles
    node.append("circle")
      .attr("r", d => {
        // Base size on volume if available, otherwise use default sizes
        if (d.volume) {
          return Math.max(5, Math.min(15, Math.sqrt(d.volume) / 10));
        }
        return d.type === 'cex' || d.type === 'dex' ? 12 : 6;
      })
      .attr("fill", getNodeColor)
      .attr("stroke", "#fff")
      .attr("stroke-width", d => 
        highlightedNode === d.id ? 2 : 1
      )
      .attr("stroke-opacity", d => 
        highlightedNode ? 
          (highlightedNode === d.id ? 1 : 0.3) 
          : 1
      );

    // Add labels for significant nodes
    node.append("text")
      .attr("dx", 12)
      .attr("dy", ".35em")
      .text(d => d.label || '')
      .attr("font-size", "10px")
      .attr("fill", "#fff")
      .style("pointer-events", "none");

    // Add click handling
    node.on("click", (event, d) => {
      if (onNodeClick) {
        onNodeClick(d);
      }
    });

    // Create force simulation
    const simulation = d3.forceSimulation(graphData.nodes)
      .force("link", d3.forceLink(graphData.links)
        .id(d => (d as any).id)
        .distance(50))
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter())
      .force("collision", d3.forceCollide().radius(20));

    // Update positions on each tick
    simulation.on("tick", () => {
      link.attr("d", d => {
        const dx = (d.target as any).x - (d.source as any).x;
        const dy = (d.target as any).y - (d.source as any).y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        return `M${(d.source as any).x},${(d.source as any).y}A${dr},${dr} 0 0,1 ${(d.target as any).x},${(d.target as any).y}`;
      });

      node.attr("transform", d => `translate(${(d as any).x},${(d as any).y})`);
    });

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
    <div className={`w-full h-full bg-solana-dark ${className}`}>
      <svg
        ref={svgRef}
        className="w-full h-full"
      />
    </div>
  );
};

export default ForceDirectedGraph;