"use client"

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { formatAddress } from '@/lib/utils';

interface Node {
  id: string;
  label?: string;
  type?: string;
  volume?: number;
  amount?: number;
  verified?: boolean;
}

interface Link {
  source: string | Node;
  target: string | Node;
  value: number;
  amount?: number;
  tokenSymbol?: string;
  label?: string;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
  programs?: any[];
  accounts?: any[];
}

interface TooltipState {
  visible: boolean;
  content: string;
  x: number;
  y: number;
}

interface TransactionFlowGraphProps {
  className?: string;
  graphData: GraphData;
  criticalPath?: Node[];
}

const TransactionFlowGraph = ({ 
  className = "",
  graphData,
  criticalPath = []
}: TransactionFlowGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    content: '',
    x: 0,
    y: 0
  });

  // Get critical path node IDs for highlighting
  const criticalPathIds = criticalPath.map(node => node.id);

  useEffect(() => {
    if (!svgRef.current || !graphData || !graphData.nodes || !graphData.links) return;

    // Clear any existing SVG content
    d3.select(svgRef.current).selectAll("*").remove();

    const width = svgRef.current.clientWidth || 800;
    const height = 600;

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

    // Define defs for markers and animations
    const defs = svg.append("defs");
    
    // Arrow marker definition - default
    defs.append("marker")
      .attr("id", "arrow-default")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#666666") // Light gray
      .attr("d", "M0,-5L10,0L0,5");

    // Arrow marker definition - critical path
    defs.append("marker")
      .attr("id", "arrow-critical")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#EF4444") // Red
      .attr("d", "M0,-5L10,0L0,5");
      
    // Triangle for animation
    defs.append("path")
      .attr("id", "triangle-marker")
      .attr("d", "M0,-4L6,0L0,4Z")
      .attr("fill", "#FFFFFF")
      .attr("opacity", "0.8");

    // Create the flow graph
    const nodeMap = new Map(graphData.nodes.map(node => [node.id, node]));
    const processedLinks = graphData.links.map(link => ({
      ...link,
      source: typeof link.source === 'string' ? link.source : link.source.id,
      target: typeof link.target === 'string' ? link.target : link.target.id
    })).filter(link => 
      nodeMap.has(link.source as string) && 
      nodeMap.has(link.target as string)
    );

    // Create the link group
    const linkGroup = g.append("g").attr("class", "links");
    
    // Create links with curved paths and determine if part of critical path
    const link = linkGroup.selectAll("path")
      .data(processedLinks)
      .join("path")
      .attr("id", (d, i) => `link-path-${i}`)
      .attr("stroke", d => {
        const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
        const targetId = typeof d.target === 'string' ? d.target : d.target.id;
        
        // Check if both source and target are in the critical path
        if (criticalPathIds.includes(sourceId) && criticalPathIds.includes(targetId)) {
          // Check if they are adjacent in the critical path or have a direct link
          const sourceIndex = criticalPathIds.indexOf(sourceId);
          const targetIndex = criticalPathIds.indexOf(targetId);
          
          if (Math.abs(sourceIndex - targetIndex) === 1) {
            return "#EF4444"; // Red for direct critical path connections
          } else if (sourceIndex !== -1 && targetIndex !== -1) {
            return "#FCA5A5"; // Light red for non-adjacent critical path connections
          }
        }
        
        return "#666666"; // Default grey
      })
      .attr("stroke-opacity", d => {
        const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
        const targetId = typeof d.target === 'string' ? d.target : d.target.id;
        
        // Higher opacity for critical path
        if (criticalPathIds.includes(sourceId) && criticalPathIds.includes(targetId)) {
          const sourceIndex = criticalPathIds.indexOf(sourceId);
          const targetIndex = criticalPathIds.indexOf(targetId);
          
          if (Math.abs(sourceIndex - targetIndex) === 1) {
            return 0.9; // Highest opacity for direct critical path connections
          } else if (sourceIndex !== -1 && targetIndex !== -1) {
            return 0.7; // Medium opacity for non-adjacent critical path connections
          }
        }
        
        return 0.6; // Default opacity
      })
      .attr("stroke-width", d => {
        const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
        const targetId = typeof d.target === 'string' ? d.target : d.target.id;
        
        // Make critical path links thicker
        if (criticalPathIds.includes(sourceId) && criticalPathIds.includes(targetId)) {
          const sourceIndex = criticalPathIds.indexOf(sourceId);
          const targetIndex = criticalPathIds.indexOf(targetId);
          
          if (Math.abs(sourceIndex - targetIndex) === 1) {
            return Math.sqrt(d.value || 1) * 2.5; // Thicker for direct connections
          } else if (sourceIndex !== -1 && targetIndex !== -1) {
            return Math.sqrt(d.value || 1) * 2.0; // Medium thickness for non-adjacent 
          }
        }
        
        return Math.sqrt(d.value || 1) * 1.5; // Default thickness
      })
      .attr("fill", "none")
      .attr("marker-end", d => {
        const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
        const targetId = typeof d.target === 'string' ? d.target : d.target.id;
        
        // Special marker for critical path connections
        if (criticalPathIds.includes(sourceId) && criticalPathIds.includes(targetId)) {
          const sourceIndex = criticalPathIds.indexOf(sourceId);
          const targetIndex = criticalPathIds.indexOf(targetId);
          
          if (Math.abs(sourceIndex - targetIndex) === 1) {
            return "url(#arrow-critical)"; // Critical path marker
          }
        }
        
        return "url(#arrow-default)"; // Default marker
      });

    // Add animated triangles along the paths
    const animations = linkGroup.selectAll(".triangle-animation")
      .data(processedLinks)
      .join("g")
      .attr("class", "triangle-animation");
      
    animations.each(function(d, i) {
      const animationGroup = d3.select(this);
      const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
      const targetId = typeof d.target === 'string' ? d.target : d.target.id;
      
      // Determine if this is a critical path link
      const isCriticalPath = 
        criticalPathIds.includes(sourceId) && 
        criticalPathIds.includes(targetId);
      
      // Only add animations to significant links or critical path
      if (isCriticalPath || d.value > 1) {
        // Add single triangle with fluid animation
        animationGroup.append("use")
          .attr("href", "#triangle-marker")
          .attr("fill", isCriticalPath ? "#EF4444" : "#FFFFFF") // Red for critical path
          .attr("opacity", isCriticalPath ? 0.9 : 0.7)
          .append("animateMotion")
          .attr("begin", "0s") 
          .attr("dur", isCriticalPath ? "1.5s" : "2.5s") // Faster animation for critical path
          .attr("repeatCount", "indefinite") // Repeat forever
          .attr("path", function() {
            // Get the path element
            const pathElement = document.getElementById(`link-path-${i}`);
            if (pathElement) {
              return pathElement.getAttribute("d") || "";
            }
            return "";
          })
          .attr("rotate", "auto"); // Auto-rotate triangle to follow path
      }
    });

    // Create nodes group
    const nodeGroup = g.append("g").attr("class", "nodes");
    
    // Node color based on type
    const getNodeColor = (node: Node) => {
      // Critical path nodes are red
      if (criticalPathIds.includes(node.id)) {
        return '#EF4444'; // Red
      }
      
      if (!node.type || node.type === 'unknown') return '#ffffff'; // White for unknown
      
      const baseColors = {
        program: '#00C2FF', // Blue
        token: '#9945FF',   // Purple
        system: '#14F195',  // Green
        signer: '#FFD700',  // Gold
        account: '#ffffff', // White
        cex: '#9945FF',     // Purple
        dex: '#14F195',     // Green
      };
      
      return baseColors[node.type.toLowerCase()] || '#ffffff';
    };
    
    // Create nodes with enter/update/exit pattern for smooth transitions
    const node = nodeGroup.selectAll("g.node")
      .data(graphData.nodes)
      .join(
        enter => enter.append("g")
          .attr("class", "node")
          .style("cursor", "pointer")
          .call(d3.drag<any, any>()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
          )
          .call(g => {
            // Add node circles with enter animation
            g.append("circle")
              .attr("r", 0) // Start small
              .attr("fill", getNodeColor)
              .attr("stroke", d => criticalPathIds.includes(d.id) ? '#EF4444' : '#ffffff')
              .attr("stroke-width", d => criticalPathIds.includes(d.id) ? 2 : 1)
              .attr("stroke-opacity", 1)
            //   .transition()
            //   .duration(500)
              .attr("r", d => {
                // Dynamic size based on node importance
                if (criticalPathIds.includes(d.id)) {
                  return 10; // Larger for critical path
                }
                
                if (d.volume) {
                  return Math.max(5, Math.min(8, d.volume));
                }
                return 6;
              });
            
            // Add glow effect for important nodes
            g.filter(d => criticalPathIds.includes(d.id))
              .insert("circle", "circle")
              .attr("r", 0) // Start small
              .attr("fill", "none")
              .attr("stroke", '#EF4444')
              .attr("stroke-width", 1)
              .attr("stroke-opacity", 0.5)
              .transition()
              .duration(500)
              .delay(200)
              .attr("r", d => {
                const baseSize = criticalPathIds.includes(d.id) ? 10 : 6;
                return baseSize + 3;
              });
          }),
        update => update
          .call(g => {
            // Update circles with transition
            g.select("circle")
              .transition()
              .duration(300)
              .attr("fill", getNodeColor)
              .attr("stroke", d => criticalPathIds.includes(d.id) ? '#EF4444' : '#ffffff')
              .attr("stroke-width", d => criticalPathIds.includes(d.id) ? 2 : 1)
              .attr("r", d => {
                if (criticalPathIds.includes(d.id)) {
                  return 10;
                }
                
                if (d.volume) {
                  return Math.max(5, Math.min(8, d.volume));
                }
                return 6;
              });
            
            // Update glow effects
            g.select("circle:first-child") // Select glow circle if it exists
            //   .transition()
            //   .duration(300)
              .attr("stroke", d => criticalPathIds.includes(d.id) ? '#EF4444' : 'none')
              .attr("r", d => {
                if (criticalPathIds.includes(d.id)) {
                  const baseSize = 10;
                  return baseSize + 3;
                }
                return 0;
              });
          }),
        exit => exit
          .transition()
          .duration(300)
          .style("opacity", 0)
          .remove()
      );

    // Node hover handling for tooltip
    node
      .on("mouseover", (event, d) => {
        // Add hover effect
        // d3.select(event.currentTarget)
        //   .select("circle")
        //   .transition()
        //   .duration(150)
        //   .attr("stroke-width", d => criticalPathIds.includes(d.id) ? 3 : 2);
        
        // Construct tooltip content
        const htmlContent = `
          <div class="font-bold text-sm">${d.type?.toUpperCase() || 'ACCOUNT'}</div>
          <div class="mt-1">
            ${d.label ? `<div class="font-medium">${d.label}</div>` : ''}
            <div class="text-sm">${formatAddress(d.id, 12)}</div>
            ${d.amount ? `<div class="text-xs mt-1">${formatAmount(d.amount, d.type)}</div>` : ''}
          </div>
          ${criticalPathIds.includes(d.id) ? 
            '<div class="mt-2 text-xs text-red-500">Part of critical path</div>' : ''}
        `;
        
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
      .on("mouseout", (event) => {
        // Remove hover effect
        // d3.select(event.currentTarget)
        //   .select("circle")
        //   .transition()
        //   .duration(150)
        //   .attr("stroke-width", d => criticalPathIds.includes(d.id) ? 2 : 1);
          
        setTooltip(prev => ({ ...prev, visible: false }));
      });

    // Link hover handling for tooltip
    // Link hover handling for tooltip
    link
        .on("mouseover", (event, d) => {
        const source = typeof d.source === 'string' ? d.source : d.source.id;
        const target = typeof d.target === 'string' ? d.target : d.target.id;
        
        const sourceNode = nodeMap.get(source);
        const targetNode = nodeMap.get(target);
        
        const sourceName = sourceNode?.label || formatAddress(source, 6);
        const targetName = targetNode?.label || formatAddress(target, 6);

        // Highlight this link is part of critical path
        const isCriticalPath = 
            criticalPathIds.includes(source) && 
            criticalPathIds.includes(target);
        
        // Tooltip content
        const htmlContent = `
            <div class="font-bold text-sm">TRANSFER</div>
            <div class="mt-2 grid grid-cols-2 gap-x-2">
            <div class="text-xs text-muted-foreground">From:</div>
            <div class="text-xs font-medium">${sourceName}</div>
            <div class="text-xs text-muted-foreground">To:</div>
            <div class="text-xs font-medium">${targetName}</div>
            ${d.amount !== undefined ? `
                <div class="text-xs text-muted-foreground">Amount:</div>
                <div class="text-xs font-medium">${formatAmount(d.amount, d.tokenSymbol)}</div>
            ` : ''}
            ${isCriticalPath ? `
                <div class="text-xs text-muted-foreground">Path:</div>
                <div class="text-xs font-medium text-red-500">Critical path</div>
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
            .transition()
            .duration(150)
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
        
        // Reset the connection style with smooth transition
        const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
        const targetId = typeof d.target === 'string' ? d.target : d.target.id;
        
        // Check if this link is part of the critical path
        const isCriticalPath = 
          criticalPathIds.includes(sourceId) && 
          criticalPathIds.includes(targetId);
        
        d3.select(event.currentTarget)
          .transition()
          .duration(150)
          .attr("stroke-width", d => {
            if (isCriticalPath) {
              const sourceIndex = criticalPathIds.indexOf(sourceId);
              const targetIndex = criticalPathIds.indexOf(targetId);
              
              if (Math.abs(sourceIndex - targetIndex) === 1) {
                return Math.sqrt(d.value || 1) * 2.5; // Thicker for direct connections
              } else {
                return Math.sqrt(d.value || 1) * 2.0; // Medium thickness for non-adjacent
              }
            }
            return Math.sqrt(d.value || 1) * 1.5; // Default thickness
          })
          .attr("stroke-opacity", isCriticalPath ? 
            (Math.abs(criticalPathIds.indexOf(sourceId) - criticalPathIds.indexOf(targetId)) === 1 ? 0.9 : 0.7) : 
            0.6
          );
      });

    // Create force simulation with improved parameters for smoother movement
    const simulation = d3.forceSimulation(graphData.nodes)
      .alpha(0.5) // Higher alpha for more movement
      .alphaDecay(0.02) // Slower decay for smoother movement
      .velocityDecay(0.3) // Lower velocity decay for more fluid motion
      .force("link", d3.forceLink(processedLinks)
        .id(d => (d as any).id)
        .distance(120)
        .strength(0.7)) // Stronger link force
      .force("charge", d3.forceManyBody()
        .strength(-500)
        .distanceMax(500)) // Limit long-range repulsion
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX().strength(0.07)) // Weaker x force
      .force("y", d3.forceY().strength(0.07)) // Weaker y force
      .force("collision", d3.forceCollide()
        .radius(d => criticalPathIds.includes((d as any).id) ? 35 : 25)
        .strength(0.8)
        .iterations(3)) // More iterations for better collision detection
      .on("tick", () => {
        // Smooth node position transitions
        node
        // .transition()
        //   .duration(50) // Short duration for responsiveness
        //   .ease(d3.easeLinear) // Linear easing for smooth movement
          .attr("transform", d => `translate(${(d as any).x},${(d as any).y})`);
        
        // Update link paths with curved paths
        link.attr("d", d => {
          const sourceX = (d.source as any).x;
          const sourceY = (d.source as any).y;
          const targetX = (d.target as any).x;
          const targetY = (d.target as any).y;
          
          // Calculate distance between nodes
          const dx = targetX - sourceX;
          const dy = targetY - sourceY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Create a curved path with dynamic curvature
          const curvature = Math.min(1.5, distance / 100);
          return `M${sourceX},${sourceY}A${distance * curvature},${distance * curvature} 0 0,1 ${targetX},${targetY}`;
        });
        
        // Update triangle animations to match updated paths
        animations.each(function(d, i) {
          const animationGroup = d3.select(this);
          const updatedPath = document.getElementById(`link-path-${i}`)?.getAttribute("d") || "";
          
          animationGroup.selectAll("animateMotion").attr("path", updatedPath);
        });
      });

    // Add special forces for critical path nodes to align them
    if (criticalPathIds.length > 0) {
      const pathLength = criticalPathIds.length;
      
      // Create a force to arrange critical path nodes in a line or arc
      simulation.force("x", d3.forceX().x(d => {
        const idx = criticalPathIds.indexOf(d.id);
        if (idx >= 0) {
          // Position critical path nodes from left to right in an arc
          const angle = (idx / (pathLength - 1) - 0.5) * Math.PI * 0.8;
          return width/2 + Math.cos(angle) * width * 0.3;
        }
        return width / 2;
      }).strength(d => criticalPathIds.includes(d.id) ? 0.3 : 0.05));
      
      simulation.force("y", d3.forceY().y(d => {
        const idx = criticalPathIds.indexOf(d.id);
        if (idx >= 0) {
          // Position critical path nodes in an arc
          const angle = (idx / (pathLength - 1) - 0.5) * Math.PI * 0.8;
          return height/2 + Math.sin(angle) * height * 0.15;
        }
        return height / 2;
      }).strength(d => criticalPathIds.includes(d.id) ? 0.3 : 0.05));
    }

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
      // Release node gradually
      setTimeout(() => {
        event.subject.fx = null;
        event.subject.fy = null;
      }, 300);
    }

    return () => {
      simulation.stop();
    };
  }, [graphData, criticalPathIds]);

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

// Helper function to format amounts with token symbol
function formatAmount(amount: number, symbol?: string): string {
    if (amount === undefined || amount === null) return '0';
    
    // If it's SOL (native token)
    if (symbol === 'system' || symbol === 'SOL') {
      // Check if amount looks like lamports (very large number)
      // This is a safeguard in case amounts weren't properly converted
      const sol = amount > 100000 ? amount / 1e9 : amount;
      return `${sol.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 9 
      })} SOL`;
    }
    
    // For other tokens/amounts, use appropriate formatting based on size
    const formattedAmount = amount.toLocaleString(undefined, { 
      minimumFractionDigits: amount < 0.01 ? 6 : 2, 
      maximumFractionDigits: amount < 0.01 ? 9 : 6 
    });
    
    return `${formattedAmount} ${symbol || ''}`.trim();
  }

export default TransactionFlowGraph;