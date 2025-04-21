import { Transaction, VersionedTransactionResponse } from "@solana/web3.js";

// Base API configuration
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

// Entity data fetching
export const fetchEntityData = async () => {
  try {
    const response = await fetch(`${API_BASE}/entities`);
    if (!response.ok) throw new Error('Failed to fetch entity data');
    return response.json();
  } catch (error) {
    console.error('Error fetching entity data:', error);
    return { entities: [] };
  }
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
  const addressVolumes = new Map();

  // Sanitize input - filter null transactions
  const validTransactions = transactions.filter(tx => tx && tx.meta);
  
  if (validTransactions.length === 0) {
    return {
      graphData: { nodes: [], links: [] },
      stats: { totalTransactions: 0, uniqueAddresses: 0, totalInteractions: 0, timespan: { start: null, end: null } }
    };
  }

  // Add central wallet node
  const centralNodeType = entities.has(centralAddress) ? 
    mapEntityTypeToNodeType(entities.get(centralAddress).type) : 'user';
  
  nodes.set(centralAddress, {
    id: centralAddress,
    group: 1,
    type: centralNodeType,
    volume: 0,
    label: entities.has(centralAddress) ? entities.get(centralAddress).name : '',
    verified: entities.has(centralAddress)
  });

  // First pass: collect all addresses and their volumes
  for (const tx of validTransactions) {
    if (!tx?.meta || !tx.transaction) continue;

    const message = tx.transaction.message;
    const accountKeys = message.accountKeys || message.staticAccountKeys || [];
    
    // Track transaction volumes
    accountKeys.forEach((account, index) => {
      const address = account?.toBase58 ? account.toBase58() : account?.toString();
      if (!address) return;
      
      addressVolumes.set(address, (addressVolumes.get(address) || 0) + 1);
      
      // For central address, update volume
      if (address === centralAddress) {
        nodes.get(centralAddress).volume++;
      }
    });
  }

  // Find top N addresses by volume (excluding the central address)
  const MAX_NODES = 8; // Limit the number of nodes for a cleaner visualization
  const sortedAddresses = [...addressVolumes.entries()]
    .filter(([address]) => address !== centralAddress)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_NODES)
    .map(([address]) => address);

  // Second pass: create actual graph with filtered nodes
  for (const tx of validTransactions) {
    if (!tx?.meta || !tx.transaction) continue;

    const message = tx.transaction.message;
    const accountKeys = message.accountKeys || message.staticAccountKeys || [];
    
    // Get the programId from instructions if possible
    let programId = '';
    if (message.instructions && message.instructions.length > 0) {
      const programIndex = message.instructions[0].programIdIndex;
      programId = accountKeys[programIndex]?.toBase58 ? 
        accountKeys[programIndex].toBase58() : 
        accountKeys[programIndex]?.toString() || '';
    } else if (message.compiledInstructions && message.compiledInstructions.length > 0) {
      const programIndex = message.compiledInstructions[0].programIdIndex;
      programId = accountKeys[programIndex]?.toBase58 ? 
        accountKeys[programIndex].toBase58() : 
        accountKeys[programIndex]?.toString() || '';
    }

    // Determine transaction signers and account changes
    const signers = new Set();
    if (tx.transaction.signatures) {
      tx.transaction.signatures.forEach(sig => {
        const signer = extractAddressFromSignature(sig);
        if (signer) signers.add(signer);
      });
    }

    // Track account balance changes
    const preBalances = tx.meta.preBalances || [];
    const postBalances = tx.meta.postBalances || [];

    // Process account interactions
    accountKeys.forEach((account, index) => {
      const address = account?.toBase58 ? account.toBase58() : account?.toString();
      if (!address || address === centralAddress || !sortedAddresses.includes(address)) return;

      // Determine transaction type
      const isSigner = signers.has(address);
      const preBalance = preBalances[index] || 0;
      const postBalance = postBalances[index] || 0;
      let txType = 'transfer';
      
      if (postBalance > preBalance) {
        txType = 'deposit';
      } else if (preBalance > postBalance) {
        txType = 'withdrawal';
      } else if (isDexProgram(programId)) {
        txType = 'swap';
      }

      // Create or update node
      if (!nodes.has(address)) {
        const entityInfo = entities.get(address);
        nodes.set(address, {
          id: address,
          group: 2,
          type: entityInfo?.type ? mapEntityTypeToNodeType(entityInfo.type) : detectAddressType(address, programId),
          volume: addressVolumes.get(address) || 1,
          label: entityInfo?.name || '',
          verified: entityInfo?.verified || false
        });
      }

      // Create or update link (direction based on transaction type)
      let source, target;
      if (txType === 'deposit') {
        source = centralAddress;
        target = address;
      } else if (txType === 'withdrawal') {
        source = address;
        target = centralAddress;
      } else {
        // For transfers and swaps, use the signer as source
        source = isSigner ? address : centralAddress;
        target = isSigner ? centralAddress : address;
      }

      const linkKey = `${source}-${target}-${txType}`;
      if (!links.has(linkKey)) {
        links.set(linkKey, {
          source,
          target,
          value: 1,
          type: txType
        });
      } else {
        links.get(linkKey).value++;
      }
    });
  }

  // Enhance nodes with visual information
  const enhancedNodes = Array.from(nodes.values()).map(node => {
    return {
      ...node,
      // Scale node size based on volume
      volume: Math.max(1, Math.min(10, node.volume)),
      // For central node, use larger volume
      ...(node.id === centralAddress ? { volume: Math.max(5, node.volume) } : {})
    };
  });

  // Enhance links with visual information
  const enhancedLinks = Array.from(links.values()).map(link => {
    return {
      ...link,
      // Normalize link strength
      value: Math.max(1, Math.min(5, link.value))
    };
  });

  // Generate statistics
  const stats = {
    totalTransactions: validTransactions.length,
    uniqueAddresses: nodes.size,
    totalInteractions: links.size,
    timespan: {
      start: validTransactions[validTransactions.length - 1]?.blockTime || null,
      end: validTransactions[0]?.blockTime || null
    }
  };

  return {
    graphData: {
      nodes: enhancedNodes,
      links: enhancedLinks
    },
    stats
  };
};

// Helper function to extract address from signature
function extractAddressFromSignature(signature) {
  if (typeof signature === 'string') {
    return signature.split(':')[0];
  }
  return null;
}

// Helper function to detect if a program is a DEX
function isDexProgram(programId: string): boolean {
  const DEX_PROGRAMS = [
    'JUP', // Jupiter
    'ORCA', // Orca
    'RAY',  // Raydium
    'OPENBOOK',
    'SERUM'
  ];
  
  return programId && DEX_PROGRAMS.some(id => programId.includes(id));
}

// Helper function to detect address type based on program interactions
function detectAddressType(address: string, programId: string): string {
  // Known program IDs for categorization
  if (isDexProgram(programId)) {
    return 'dex';
  }
  
  // Check if address starts with known prefixes
  if (address.startsWith('11111111')) {
    return 'contract';
  }
  
  return 'unknown';
}

// Map entity types to node types
function mapEntityTypeToNodeType(entityType: string): string {
  const typeMap = {
    'exchange': 'cex',
    'nft_marketplace': 'dex',
    'defi_protocol': 'dex',
    'token': 'contract',
    'project': 'contract',
    'foundation': 'cex'
  };
  
  return typeMap[entityType] || 'user';
}