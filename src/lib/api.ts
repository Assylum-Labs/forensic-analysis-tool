import { Transaction, VersionedTransactionResponse } from "@solana/web3.js";

// Base API configuration
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

// Entity data fetching
export const fetchEntityData = async () => {
  const response = await fetch(`${API_BASE}/entities`);
  if (!response.ok) throw new Error('Failed to fetch entity data');
  return response.json();
};

// Transaction processing utilities
export const processTransactionData = async (
  transactions: VersionedTransactionResponse[],
  centralAddress: string,
  entities: Map<string, any>
) => {
  // Initialize data structures
  const nodes = new Map();
  const links = new Map();
  const addressTypes = new Map();

  // Add central wallet node
  nodes.set(centralAddress, {
    id: centralAddress,
    group: 1,
    type: entities.has(centralAddress) ? 
      entities.get(centralAddress).type : 
      'user',
    volume: transactions.length
  });

  // Process each transaction
  for (const tx of transactions) {
    if (!tx?.meta) continue;

    console.log('tx', tx);
    

    // const accountKeys = tx.transaction.message.staticAccountKeys;
    // const programId = tx.transaction.message.programId?.toBase58();
    const message = tx.transaction.message;
    const accountKeys = message.staticAccountKeys;
  
    // Get the programId from the first instruction (if it exists)
    let programId: string | undefined = '';
    if (message.compiledInstructions.length > 0) {
      programId = accountKeys[message.compiledInstructions[0].programIdIndex]?.toBase58();
    }

    // Track account interactions
    accountKeys.forEach((account: any, index: number) => {
      const address = account.toBase58();
      if (address === centralAddress) return;

      // Create or update node
      if (!nodes.has(address)) {
        const entityInfo = entities.get(address);
        nodes.set(address, {
          id: address,
          group: 2,
          type: entityInfo?.type || detectAddressType(address, tx),
          volume: 1,
          label: entityInfo?.name || '',
          verified: entityInfo?.verified || false
        });
      } else {
        nodes.get(address).volume++;
      }

      // Create or update link
      const linkKey = `${centralAddress}-${address}`;
      if (!links.has(linkKey)) {
        links.set(linkKey, {
          source: centralAddress,
          target: address,
          value: 1,
          type: determineTransactionType(tx, index, programId)
        });
      } else {
        links.get(linkKey).value++;
      }
    });
  }

  // Process patterns and enrich data
  const enrichedData = await enrichGraphData(
    Array.from(nodes.values()),
    Array.from(links.values()),
    transactions
  );

  return {
    graphData: enrichedData,
    stats: generateTransactionStats(transactions, nodes, links)
  };
};

// Helper functions
const detectAddressType = (address: string, tx: any): string => {
  // Check if address is a program
  if (tx.transaction.message.staticAccountKeys.some(
    (key: any) => key.toBase58() === address && key.signer
  )) {
    return 'contract';
  }
  return 'unknown';
};

const determineTransactionType = (
  tx: any,
  accountIndex: number,
  programId: string
): string => {
  // Known program IDs for common protocols
  const DEX_PROGRAMS = [
    'JUP4', // Jupiter
    'ORCA', // Orca
    'RAY',  // Raydium
  ];

  if (DEX_PROGRAMS.some(id => programId?.includes(id))) {
    return 'swap';
  }

  // Check balance changes
  const preBalance = tx.meta.preBalances[accountIndex];
  const postBalance = tx.meta.postBalances[accountIndex];

  if (postBalance > preBalance) return 'deposit';
  if (preBalance > postBalance) return 'withdrawal';
  return 'transfer';
};

const enrichGraphData = async (
  nodes: any[],
  links: any[],
  transactions: any[]
) => {
  // Group transactions by address
  const txsByAddress = new Map();
  transactions.forEach(tx => {
    tx.transaction.message.staticAccountKeys.forEach((key: any) => {
      const address = key.toBase58();
      if (!txsByAddress.has(address)) {
        txsByAddress.set(address, []);
      }
      txsByAddress.get(address).push(tx);
    });
  });

  // Enhance nodes with pattern detection
  const enhancedNodes = nodes.map(node => {
    const addressTxs = txsByAddress.get(node.id) || [];
    const patterns = detectPatterns(addressTxs);
    return {
      ...node,
      patterns,
      confidence: calculateConfidence(patterns)
    };
  });

  return {
    nodes: enhancedNodes,
    links
  };
};

const detectPatterns = (transactions: any[]) => {
  const patterns = [];

  // Check transaction frequency
  const timeIntervals = transactions
    .slice(1)
    .map((tx, i) => tx.blockTime - transactions[i].blockTime);
  
  const avgInterval = timeIntervals.reduce((a, b) => a + b, 0) / timeIntervals.length;
  const isRegular = timeIntervals.every(interval => 
    Math.abs(interval - avgInterval) < avgInterval * 0.2
  );

  if (isRegular) {
    patterns.push({
      type: 'regular_activity',
      confidence: 0.8
    });
  }

  // Check for program interactions
  const programInteractions = new Map();
  transactions.forEach(tx => {
    const programId = tx.transaction.message.programId?.toBase58();
    if (programId) {
      programInteractions.set(programId, (programInteractions.get(programId) || 0) + 1);
    }
  });

  if (programInteractions.size > 0) {
    patterns.push({
      type: 'program_interaction',
      confidence: 0.9,
      programs: Array.from(programInteractions.entries())
    });
  }

  return patterns;
};

const calculateConfidence = (patterns: any[]) => {
  if (patterns.length === 0) return 0;
  return patterns.reduce((acc, p) => acc + p.confidence, 0) / patterns.length;
};

const generateTransactionStats = (
  transactions: any[],
  nodes: Map<string, any>,
  links: Map<string, any>
) => {
  return {
    totalTransactions: transactions.length,
    uniqueAddresses: nodes.size,
    totalInteractions: links.size,
    timespan: {
      start: transactions[transactions.length - 1]?.blockTime,
      end: transactions[0]?.blockTime
    }
  };
};