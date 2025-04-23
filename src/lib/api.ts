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

// // Transaction processing utilities
export const processTransactionData = async (
  transactions: VersionedTransactionResponse[],
  centralAddress: string,
  entities: Map<string, any>
) => {
  // Initialize data structures
  const nodes = new Map();
  const links = new Map();
  const addressVolumes = new Map();
  const tokenAccountOwners = new Map(); // Track token account -> owner relationships

  // Sanitize input - filter null transactions
  const validTransactions = transactions.filter(tx => tx && tx.meta);
  
  if (validTransactions.length === 0) {
    return {
      graphData: { nodes: [], links: [] },
      stats: { totalTransactions: 0, uniqueAddresses: 0, totalInteractions: 0, timespan: { start: null, end: null } }
    };
  }

  // Add central wallet node
  nodes.set(centralAddress, {
    id: centralAddress,
    group: 1, // Primary wallet
    type: 'user',
    volume: 0,
    label: '',
    verified: false
  });

  // First, identify all token accounts and their owners
  for (const tx of validTransactions) {
    if (!tx?.meta || !tx.transaction) continue;
    
    const preTokenBalances = tx.meta.preTokenBalances || [];
    const postTokenBalances = tx.meta.postTokenBalances || [];
    
    // Get the account keys
    const accountKeys = tx.transaction.message.accountKeys || 
                        tx.transaction.message.staticAccountKeys || [];
    const accountAddresses = accountKeys.map(account => 
      account?.toBase58 ? account.toBase58() : account?.toString()
    ).filter(address => !!address);
    
    // Combine pre and post balances to capture all token accounts
    const allTokenBalances = [...preTokenBalances, ...postTokenBalances];
    
    for (const balance of allTokenBalances) {
      // Safely map token accounts to owners
      if (balance && balance.owner && balance.accountIndex !== undefined && 
          balance.accountIndex < accountAddresses.length) {
        const tokenAccount = accountAddresses[balance.accountIndex];
        if (tokenAccount) {
          tokenAccountOwners.set(tokenAccount, balance.owner);
        }
      }
    }
  }
  
  // Check if an address is the primary wallet or one of its ATAs/PDAs
  const isPrimaryWalletOrATA = (address) => {
    // Direct match with primary address
    if (address === centralAddress) return true;
    
    // Check if it's a token account owned by the primary wallet
    const owner = tokenAccountOwners.get(address);
    return owner === centralAddress;
  };

  // Process each transaction
  for (const tx of validTransactions) {
    if (!tx?.meta || !tx.transaction) continue;

    const txId = tx.transaction.signatures[0]; // Use first signature as transaction ID
    const message = tx.transaction.message;
    const accountKeys = message.accountKeys || message.staticAccountKeys || [];
    
    // Map account keys to strings
    const accountAddresses = accountKeys.map(account => 
      account?.toBase58 ? account.toBase58() : account?.toString()
    ).filter(address => !!address);
    
    // Check if primary wallet or any of its ATAs are involved
    const primaryInvolved = accountAddresses.some(addr => isPrimaryWalletOrATA(addr));
    
    if (!primaryInvolved) continue; // Skip transactions not involving primary wallet or its ATAs
    
    // Get pre and post balances
    const preBalances = tx.meta.preBalances || [];
    const postBalances = tx.meta.postBalances || [];
    const preTokenBalances = tx.meta.preTokenBalances || [];
    const postTokenBalances = tx.meta.postTokenBalances || [];
    const fee = tx.meta.fee || 0;
    
    // 1. Process Token Transfers
    // Map token accounts to their pre/post balances for easy lookup
    const tokenAccountMap = new Map();
    
    // Process pre-balances
    preTokenBalances.forEach(balance => {
      if (balance && balance.accountIndex !== undefined && 
          balance.accountIndex < accountAddresses.length) {
        const tokenAccount = accountAddresses[balance.accountIndex];
        if (!tokenAccountMap.has(tokenAccount)) {
          tokenAccountMap.set(tokenAccount, {
            owner: balance.owner,
            mint: balance.mint,
            symbol: balance.uiTokenAmount.uiAmountString.replace(/[0-9.]/g, '').trim() || 'Unknown',
            preBal: parseFloat(balance.uiTokenAmount.uiAmountString) || 0,
            postBal: 0 // Will update if found in post-balances
          });
        } else {
          // Update existing entry
          const entry = tokenAccountMap.get(tokenAccount);
          entry.preBal = parseFloat(balance.uiTokenAmount.uiAmountString) || 0;
        }
      }
    });
    
    // Process post-balances
    postTokenBalances.forEach(balance => {
      if (balance && balance.accountIndex !== undefined && 
          balance.accountIndex < accountAddresses.length) {
        const tokenAccount = accountAddresses[balance.accountIndex];
        if (!tokenAccountMap.has(tokenAccount)) {
          tokenAccountMap.set(tokenAccount, {
            owner: balance.owner,
            mint: balance.mint,
            symbol: balance.uiTokenAmount.uiAmountString.replace(/[0-9.]/g, '').trim() || 'Unknown',
            preBal: 0, // Was not in pre-balances
            postBal: parseFloat(balance.uiTokenAmount.uiAmountString) || 0
          });
        } else {
          // Update existing entry
          const entry = tokenAccountMap.get(tokenAccount);
          entry.postBal = parseFloat(balance.uiTokenAmount.uiAmountString) || 0;
        }
      }
    });
    
    // Find decreased token balances (sending accounts)
    const senders = [];
    // Find increased token balances (receiving accounts)
    const receivers = [];
    
    for (const [tokenAccount, data] of tokenAccountMap.entries()) {
      const diff = data.postBal - data.preBal;
      
      if (diff < 0) {
        senders.push({
          tokenAccount,
          owner: data.owner,
          mint: data.mint,
          symbol: data.symbol,
          amount: Math.abs(diff)
        });
      } else if (diff > 0) {
        receivers.push({
          tokenAccount,
          owner: data.owner,
          mint: data.mint,
          symbol: data.symbol,
          amount: diff
        });
      }
    }
    
    // Match token senders with receivers to create transfer links
    senders.forEach(sender => {
      // Find matching receiver for this token mint
      const matchingReceivers = receivers.filter(r => r.mint === sender.mint);
      
      if (matchingReceivers.length > 0) {
        // Check if primary wallet or its ATA is involved
        const isPrimaryWalletSending = isPrimaryWalletOrATA(sender.tokenAccount) || sender.owner === centralAddress;
        const anyPrimaryWalletReceiving = matchingReceivers.some(r => 
          isPrimaryWalletOrATA(r.tokenAccount) || r.owner === centralAddress
        );
        
        if (isPrimaryWalletSending || anyPrimaryWalletReceiving) {
          // This is a transfer involving the primary wallet
          if (isPrimaryWalletSending) {
            // Primary wallet is sending to others
            matchingReceivers.forEach(receiver => {
              // Skip self-transfers within primary wallet's accounts
              if (receiver.owner === centralAddress) return;
              
              // Add receiver node
              if (!nodes.has(receiver.owner)) {
                nodes.set(receiver.owner, {
                  id: receiver.owner,
                  group: 2,
                  type: 'user',
                  volume: 0,
                  label: '',
                  verified: false
                });
              }
              
              nodes.get(receiver.owner).volume++;
              nodes.get(centralAddress).volume++;
              
              // Create link
              const linkKey = `${centralAddress}-${receiver.owner}-${sender.mint}`;
              if (!links.has(linkKey)) {
                links.set(linkKey, {
                  source: centralAddress,
                  target: receiver.owner,
                  value: 1,
                  type: 'transfer',
                  tokenMint: sender.mint,
                  tokenSymbol: sender.symbol,
                  amount: Math.min(sender.amount, receiver.amount) // Use smaller amount to be safe
                });
              } else {
                links.get(linkKey).value++;
                links.get(linkKey).amount += Math.min(sender.amount, receiver.amount);
              }
            });
          } else {
            // Primary wallet is receiving from others
            matchingReceivers.filter(r => isPrimaryWalletOrATA(r.tokenAccount) || r.owner === centralAddress)
              .forEach(receiver => {
                // Skip if sender is also primary wallet (already handled above)
                if (sender.owner === centralAddress) return;
                
                // Add sender node
                if (!nodes.has(sender.owner)) {
                  nodes.set(sender.owner, {
                    id: sender.owner,
                    group: 2,
                    type: 'user',
                    volume: 0,
                    label: '',
                    verified: false
                  });
                }
                
                nodes.get(sender.owner).volume++;
                nodes.get(centralAddress).volume++;
                
                // Create link
                const linkKey = `${sender.owner}-${centralAddress}-${sender.mint}`;
                if (!links.has(linkKey)) {
                  links.set(linkKey, {
                    source: sender.owner,
                    target: centralAddress,
                    value: 1,
                    type: 'transfer',
                    tokenMint: sender.mint,
                    tokenSymbol: sender.symbol,
                    amount: Math.min(sender.amount, receiver.amount) // Use smaller amount to be safe
                  });
                } else {
                  links.get(linkKey).value++;
                  links.get(linkKey).amount += Math.min(sender.amount, receiver.amount);
                }
              });
          }
        }
      }
    });
    
    // 2. Process native SOL transfers and rent payments
    for (let i = 0; i < accountAddresses.length; i++) {
      const address = accountAddresses[i];
      const preBal = preBalances[i] || 0;
      const postBal = postBalances[i] || 0;
      const isPayer = i === 0; // Is this account paying the transaction fee?
      const feeAdjustment = isPayer ? fee : 0;
      const adjustedDiff = (postBal - preBal + feeAdjustment) / 1e9; // in SOL
      
      // Skip if no significant change
      if (Math.abs(adjustedDiff) < 0.000001) continue;
      
      // Check if this account is primary wallet or its ATA
      const isPrimaryAccount = isPrimaryWalletOrATA(address);
      
      // If primary wallet (or ATA) lost SOL
      if (isPrimaryAccount && adjustedDiff < 0) {
        // Find which addresses gained SOL in this transaction
        for (let j = 0; j < accountAddresses.length; j++) {
          if (j === i) continue; // Skip same account
          
          const receiverAddress = accountAddresses[j];
          const receiverPreBal = preBalances[j] || 0;
          const receiverPostBal = postBalances[j] || 0;
          const receiverGain = (receiverPostBal - receiverPreBal) / 1e9;
          
          if (receiverGain > 0) {
            // Found a receiver - skip if it's another primary wallet account
            if (isPrimaryWalletOrATA(receiverAddress)) continue;
            
            // Add receiver node
            if (!nodes.has(receiverAddress)) {
              nodes.set(receiverAddress, {
                id: receiverAddress,
                group: 2,
                type: 'user',
                volume: 0,
                label: '',
                verified: false
              });
            }
            
            nodes.get(receiverAddress).volume++;
            nodes.get(centralAddress).volume++;
            
            // Create link from primary to receiver
            const linkKey = `${centralAddress}-${receiverAddress}-SOL`;
            if (!links.has(linkKey)) {
              links.set(linkKey, {
                source: centralAddress,
                target: receiverAddress,
                value: 1,
                type: 'transfer',
                tokenMint: 'SOL',
                tokenSymbol: 'SOL',
                amount: receiverGain
              });
            } else {
              links.get(linkKey).value++;
              links.get(linkKey).amount += receiverGain;
            }
          }
        }
        
      }
      // If a non-primary account lost SOL and primary wallet gained SOL
      else if (!isPrimaryAccount && adjustedDiff < 0) {
        // Check if primary wallet gained SOL
        let primaryGained = false;
        
        for (let j = 0; j < accountAddresses.length; j++) {
          const potentialReceiver = accountAddresses[j];
          if (isPrimaryWalletOrATA(potentialReceiver)) {
            const receiverPreBal = preBalances[j] || 0;
            const receiverPostBal = postBalances[j] || 0;
            const receiverGain = (receiverPostBal - receiverPreBal) / 1e9;
            
            if (receiverGain > 0) {
              primaryGained = true;
              
              // Add sender node
              if (!nodes.has(address)) {
                nodes.set(address, {
                  id: address,
                  group: 2,
                  type: 'user',
                  volume: 0,
                  label: '',
                  verified: false
                });
              }
              
              nodes.get(address).volume++;
              nodes.get(centralAddress).volume++;
              
              // Create link from sender to primary
              const linkKey = `${address}-${centralAddress}-SOL`;
              if (!links.has(linkKey)) {
                links.set(linkKey, {
                  source: address,
                  target: centralAddress,
                  value: 1,
                  type: 'transfer',
                  tokenMint: 'SOL',
                  tokenSymbol: 'SOL',
                  amount: Math.min(Math.abs(adjustedDiff), receiverGain)
                });
              } else {
                links.get(linkKey).value++;
                links.get(linkKey).amount += Math.min(Math.abs(adjustedDiff), receiverGain);
              }
              
              break; // Found primary wallet receiving SOL
            }
          }
        }
      }
    }
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