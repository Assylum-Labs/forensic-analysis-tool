// src/components/ClusterGraph.tsx
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { formatAddress } from '@/lib/utils';
import { TransactionCluster } from '@/lib/transactionClustering';

interface Node {
  id: string;
  group: number;
  type?: string;
  label?: string;
  volume?: number;
  isProgram?: boolean;
}

interface Link {
  source: string | Node;
  target: string | Node;
  value: number;
  type?: string;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

interface ClusterGraphProps {
  cluster: TransactionCluster;
  className?: string;
}

// Known program mappings for better labeling
const PROGRAM_LABELS: Record<string, string> = {
  "11111111111111111111111111111111": "System Program",
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA": "Token Program",
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL": "Assoc. Token Program",
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4": "Jupiter",
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc": "Orca",
  "SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8": "Raydium",
  "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD": "Marinade",
  "srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX": "Serum",
  "M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K": "Magic Eden",
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s": "Metadata Program",
};

const ClusterGraph: React.FC<ClusterGraphProps> = ({ cluster, className = "" }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [tooltip, setTooltip] = useState({
    visible: false,
    content: '',
    x: 0,
    y: 0
  });

  // Convert cluster data to graph data format
  useEffect(() => {
    if (!cluster) return;

    const nodes: Node[] = [];
    const links: Link[] = [];
    const nodeMap = new Map<string, Node>();
    
    // Helper to get a color for the node group
    const getGroupForAccount = (account: string, isProgram: boolean) => {
      if (isProgram) return 3; // Programs
      
      // Use a deterministic but varied approach for regular accounts
      const sum = account.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      return (sum % 3) + 1; // Groups 1-3 for accounts
    };

    // Add nodes for all accounts in the cluster
    cluster.accounts.forEach((account: string) => {
      // Check if it's a program
      const isProgram = cluster.programs.includes(account);
      
      const node = {
        id: account,
        group: getGroupForAccount(account, isProgram),
        type: isProgram ? 'program' : 'account',
        label: isProgram ? getProgramLabel(account) : '',
        volume: isProgram ? 3 : 1,
        isProgram
      };
      nodes.push(node);
      nodeMap.set(account, node);
    });

    // Make sure all programs are included too
    cluster.programs.forEach((program: string) => {
      if (!nodeMap.has(program)) {
        const node = {
          id: program,
          group: 3,
          type: 'program',
          label: getProgramLabel(program),
          volume: 2,
          isProgram: true
        };
        nodes.push(node);
        nodeMap.set(program, node);
      }
    });

    // Create links between accounts to build the full graph structure
    // For each account, connect to other accounts it frequently interacts with
    const accountConnections = buildAccountConnections(cluster);
    
    // Add the links
    for (const [source, targets] of accountConnections) {
      for (const [target, strength] of targets) {
        // Ensure both nodes exist
        if (!nodeMap.has(source) || !nodeMap.has(target)) continue;
        
        links.push({
          source,
          target,
          value: strength,
          type: nodeMap.get(target)?.isProgram ? 'program' : 'transfer'
        });
      }
    }

    setGraphData({ nodes, links });
  }, [cluster]);

  // Helper to build connections between accounts based on cluster data
  const buildAccountConnections = (cluster: TransactionCluster) => {
    const connections = new Map<string, Map<string, number>>();
    
    // Initialize for all accounts
    cluster.accounts.forEach(account => {
      connections.set(account, new Map());
    });
    
    // Connect accounts that interact with the same programs
    cluster.programs.forEach(program => {
      // We'll assume all accounts in the cluster interact with all programs
      // In a real implementation, you'd analyze the actual transaction data
      
      cluster.accounts.forEach(account => {
        // Skip if the account is the program itself
        if (account === program) return;
        
        // Connect account to program
        const accountMap = connections.get(account)!;
        accountMap.set(program, (accountMap.get(program) || 0) + 1);
        
        // For programs, connect back to the account more weakly
        const programMap = connections.get(program) || new Map();
        programMap.set(account, (programMap.get(account) || 0) + 0.5);
        connections.set(program, programMap);
      });
    });
    
    // Connect accounts with other accounts (simplified approach)
    // In a real implementation, you'd analyze actual transaction flows
    const regularAccounts = cluster.accounts.filter(a => !cluster.programs.includes(a));
    
    // Create connections based on cluster type
    if (cluster.type === 'Sequential Transfers') {
      // Create a chain of connections
      for (let i = 0; i < regularAccounts.length - 1; i++) {
        const source = regularAccounts[i];
        const target = regularAccounts[i + 1];
        
        const sourceMap = connections.get(source)!;
        sourceMap.set(target, (sourceMap.get(target) || 0) + 2);
        
        const targetMap = connections.get(target)!;
        targetMap.set(source, (targetMap.get(source) || 0) + 0.5);
      }
    } else if (cluster.type === 'Fan-out') {
      // One account connects to many
      if (regularAccounts.length > 0) {
        const source = regularAccounts[0];
        const sourceMap = connections.get(source)!;
        
        for (let i = 1; i < regularAccounts.length; i++) {
          const target = regularAccounts[i];
          sourceMap.set(target, (sourceMap.get(target) || 0) + 1.5);
          
          const targetMap = connections.get(target)!;
          targetMap.set(source, (targetMap.get(source) || 0) + 0.5);
        }
      }
    } else if (cluster.type === 'Fan-in') {
      // Many accounts connect to one
      if (regularAccounts.length > 0) {
        const target = regularAccounts[0];
        const targetMap = connections.get(target)!;
        
        for (let i = 1; i < regularAccounts.length; i++) {
          const source = regularAccounts[i];
          const sourceMap = connections.get(source)!;
          
          sourceMap.set(target, (sourceMap.get(target) || 0) + 1.5);
          targetMap.set(source, (targetMap.get(source) || 0) + 0.5);
        }
      }
    } else {
      // Default - connect accounts in a more mesh-like pattern
      for (let i = 0; i < regularAccounts.length; i++) {
        const source = regularAccounts[i];
        const sourceMap = connections.get(source)!;
        
        for (let j = i + 1; j < regularAccounts.length; j++) {
          // Only connect some accounts randomly
          if (Math.random() > 0.7) continue;
          
          const target = regularAccounts[j];
          sourceMap.set(target, (sourceMap.get(target) || 0) + 1);
          
          const targetMap = connections.get(target)!;
          targetMap.set(source, (targetMap.get(source) || 0) + 1);
        }
      }
    }
    
    return connections;
  };

  // Get label for known programs
  function getProgramLabel(programId: string): string {
    // Check for exact matches
    if (PROGRAM_LABELS[programId]) {
      return PROGRAM_LABELS[programId];
    }

    // Check for partial matches
    for (const [key, value] of Object.entries(PROGRAM_LABELS)) {
      if (programId.startsWith(key.substring(0, 8))) {
        return value;
      }
    }

    return formatAddress(programId, 4);
  }

  // D3 visualization
  useEffect(() => {
    if (!svgRef.current || !graphData) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();

    const width = svgRef.current.clientWidth || 600;
    const height = 400;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("class", "bg-card");

    // Add a border to the SVG
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("stroke", "none")
      .attr("fill", "none");

    // Enable zoom and pan
    const g = svg.append("g");
    svg.call(
      d3.zoom()
        .extent([[0, 0], [width, height]])
        .scaleExtent([0.1, 8])
        .on("zoom", (event) => g.attr("transform", event.transform))
    );

    // Define marker for arrows
    svg.append("defs").append("marker")
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

    // Create a force simulation with custom forces for different node types
    const simulation = d3.forceSimulation(graphData.nodes)
      .force("link", d3.forceLink(graphData.links)
        .id(d => (d as any).id)
        .distance(d => {
          // Program links should be shorter
          if ((d as any).type === 'program') return 80;
          return 150;
        })
        .strength(d => {
          // Program links should be stronger
          if ((d as any).type === 'program') return 0.8;
          return 0.3;
        }))
      .force("charge", d3.forceManyBody()
        .strength(d => {
          // Programs repel more strongly
          if ((d as any).isProgram) return -400;
          return -200;
        }))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX()
        .strength(d => (d as any).isProgram ? 0.1 : 0.05))
      .force("y", d3.forceY()
        .strength(d => (d as any).isProgram ? 0.1 : 0.05))
      .force("collision", d3.forceCollide()
        .radius(d => ((d as any).isProgram ? 40 : 20))
        .strength(0.7));

    // Draw links
    const link = g.append("g")
      .selectAll("path")
      .data(graphData.links)
      .join("path")
      .attr("class", d => `stroke-current ${
        d.type === 'program' ? 'text-amber-500 opacity-40' : 'text-muted-foreground opacity-60'
      }`)
      .attr("stroke-width", d => Math.sqrt(d.value) * 1.5)
      .attr("marker-end", d => d.type !== 'program' ? "url(#arrow)" : null);

    // Draw nodes
    const node = g.append("g")
      .selectAll("g")
      .data(graphData.nodes)
      .join("g")
      .call(drag(simulation))
      .on("mouseover", handleNodeMouseover)
      .on("mousemove", handleNodeMousemove)
      .on("mouseout", handleNodeMouseout);

    // Node circles with different styling based on type
    node.append("circle")
      .attr("r", d => (d as any).isProgram ? 15 : 8)
      .attr("class", d => {
        if ((d as any).isProgram) {
          return "fill-amber-500 stroke-amber-300 stroke-2";
        }
        
        // Different colors for regular accounts based on group
        switch ((d as any).group) {
          case 1: return "fill-solana-purple stroke-white stroke-1";
          case 2: return "fill-solana-blue stroke-white stroke-1";
          case 3: return "fill-solana-green stroke-white stroke-1";
          default: return "fill-muted-foreground stroke-white stroke-1";
        }
      });

    // Add icons or symbols inside circles
    node.filter(d => (d as any).isProgram)
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", "white")
      .style("font-size", "10px")
      .text("P");

    // Add labels for program nodes
    node.filter(d => (d as any).isProgram)
      .append("text")
      .attr("dx", 20)
      .attr("dy", "0.35em")
      .text(d => (d as any).label)
      .attr("class", "fill-current text-foreground text-xs font-medium");

    // Mouse event handlers for tooltip
    function handleNodeMouseover(event: any, d: any) {
      const content = d.isProgram
        ? `<div class="font-medium">${d.label}</div><div class="text-xs text-muted-foreground">Program</div>`
        : `<div class="font-medium">${formatAddress(d.id, 8)}</div><div class="text-xs text-muted-foreground">Wallet</div>`;
        
      setTooltip({
        visible: true,
        content,
        x: event.layerX,
        y: event.layerY
      });
    }
    
    function handleNodeMousemove(event: any) {
      setTooltip(prev => ({
        ...prev,
        x: event.layerX,
        y: event.layerY
      }));
    }
    
    function handleNodeMouseout() {
      setTooltip(prev => ({
        ...prev,
        visible: false
      }));
    }

    // Update the positions each tick
    simulation.on("tick", () => {
      // Update links - create curved paths
      link.attr("d", d => {
        const dx = (d.target as any).x - (d.source as any).x;
        const dy = (d.target as any).y - (d.source as any).y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        
        // Make program links straight, others curved
        if (d.type === 'program') {
          return `M${(d.source as any).x},${(d.source as any).y}L${(d.target as any).x},${(d.target as any).y}`;
        } else {
          return `M${(d.source as any).x},${(d.source as any).y}A${dr},${dr} 0 0,1 ${(d.target as any).x},${(d.target as any).y}`;
        }
      });

      // Update node positions
      node.attr("transform", d => `translate(${(d as any).x},${(d as any).y})`);
    });

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
  }, [graphData]);

  if (!cluster) {
    return (
      <div className={`${className} flex items-center justify-center bg-card`}>
        <span className="text-muted-foreground">Select a cluster to visualize</span>
      </div>
    );
  }

  return (
    <div className={`${className} relative`}>
      <svg ref={svgRef} className="w-full h-full" />
      
      {tooltip.visible && (
        <div 
          className="absolute p-2 bg-black/80 text-white rounded-md shadow-lg text-sm z-50"
          style={{
            left: `${tooltip.x + 10}px`,
            top: `${tooltip.y + 10}px`,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none'
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
      
      <div className="absolute bottom-2 right-2 text-xs bg-card/80 p-2 rounded-md text-muted-foreground">
        {cluster.type} cluster · {cluster.accounts.length} accounts · {cluster.transactions.length} transactions
      </div>
    </div>
  );
};

export default ClusterGraph;