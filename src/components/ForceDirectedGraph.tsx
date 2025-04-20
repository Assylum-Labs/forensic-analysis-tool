"use client"

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

// Sample data - this will be replaced with real data from API
const data = {
  nodes: [
    { id: "center", group: 1 },
    ...Array.from({ length: 50 }, (_, i) => ({ 
      id: `node${i}`, 
      group: Math.floor(Math.random() * 4) + 1 
    }))
  ],
  links: [
    ...Array.from({ length: 80 }, () => ({
      source: `node${Math.floor(Math.random() * 50)}`,
      target: "center",
      value: 1
    })),
    ...Array.from({ length: 40 }, () => ({
      source: `node${Math.floor(Math.random() * 50)}`,
      target: `node${Math.floor(Math.random() * 50)}`,
      value: 1
    }))
  ]
};

interface ForceDirectedGraphProps {
  className?: string;
  graphData?: any;
}

const ForceDirectedGraph = ({ 
  className = "",
  graphData = data
}: ForceDirectedGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

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

    // Define arrow markers
    svg.append("defs").selectAll("marker")
      .data(["end"])
      .join("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 4)
      .attr("markerHeight", 4)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#666")
      .attr("d", "M0,-5L10,0L0,5");

    // Create the path group
    const pathGroup = g.append("g").attr("class", "paths");

    // Create links with path
    const link = pathGroup.selectAll("path")
      .data(graphData.links)
      .join("path")
      .attr("stroke", "#444")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1)
      .attr("fill", "none")
      .attr("marker-end", "url(#arrow)")
      // Initialize paths with straight lines
      .attr("d", d => `M${d.source.x || 0},${d.source.y || 0}L${d.target.x || 0},${d.target.y || 0}`);

    // Create nodes
    const node = g.append("g")
      .selectAll("circle")
      .data(graphData.nodes)
      .join("circle")
      .attr("r", d => d.id === "center" ? 15 : 5)
      .attr("fill", d => {
        if (d.id === "center") return "#fff";
        return ["#8ff", "#f8f", "#ff8", "#8f8"][d.group - 1];
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 1);

    // Create flowing dots group
    const dotsGroup = g.append("g").attr("class", "dots");
    
    // Add flowing dots along the paths
    const flowingDot = dotsGroup.selectAll("circle")
      .data(graphData.links)
      .join("circle")
      .attr("r", 2)
      .attr("fill", "#fff")
      .attr("opacity", 0.6);

    // Create force simulation
    const simulation = d3.forceSimulation(graphData.nodes)
      .force("link", d3.forceLink(graphData.links)
        .id(d => (d as any).id)
        .distance(50))
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter())
      .force("collision", d3.forceCollide().radius(10));

    // Add drag behavior
    node.call(d3.drag<any, any>()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));

    // Animation function for flowing dots
    function startAnimation() {
      flowingDot.each(function(d: any) {
        const dot = d3.select(this);
        const path = pathGroup.selectAll("path")
          .filter(p => p === d)
          .node();
          
        if (!path) return;

        function repeat() {
          const pathLength = (path as any).getTotalLength();
          if (pathLength === 0) return; // Skip if path length is 0

          dot
            .attr("opacity", 1)
            .attr("transform", function() {
              const point = (path as any).getPointAtLength(0);
              return `translate(${point.x},${point.y})`;
            })
            .transition()
            .duration(2000)
            .ease(d3.easeLinear)
            .attrTween("transform", () => (t: number) => {
              const point = (path as any).getPointAtLength(t * pathLength);
              return `translate(${point.x},${point.y})`;
            })
            .on("end", repeat);
        }

        repeat();
      });
    }

    // Update positions on each tick
    simulation.on("tick", () => {
      // Update path positions
      link.attr("d", d => {
        const dx = (d.target as any).x - (d.source as any).x;
        const dy = (d.target as any).y - (d.source as any).y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        return `M${(d.source as any).x},${(d.source as any).y}A${dr},${dr} 0 0,1 ${(d.target as any).x},${(d.target as any).y}`;
      });

      // Update node positions
      node
        .attr("cx", d => (d as any).x)
        .attr("cy", d => (d as any).y);
    });

    // Start animations after initial layout
    simulation.on("end", startAnimation);

    // Drag functions
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

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [graphData]);

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