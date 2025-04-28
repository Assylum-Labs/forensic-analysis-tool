import { Entity } from "@/types";
import { Transaction, VersionedTransactionResponse } from "@solana/web3.js";
import { entityCache } from "./EntityCacheService";

// Base API configuration
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

// Entity data fetching - but now we use cache first if available
export const fetchEntityData = async () => {
  try {
    // If we have a populated cache and it doesn't need refresh, use it
    if (entityCache.size() > 0 && !entityCache.needsRefresh()) {
      return { entities: entityCache.getAllEntities() };
    }
    
    // Otherwise fetch from API
    const response = await fetch(`${API_BASE}/entities?limit=1500`);
    if (!response.ok) throw new Error('Failed to fetch entity data');
    
    const data = await response.json();
    
    // Update the cache with fetched entities
    entityCache.updateCache(data.entities);
    
    return data;
  } catch (error) {
    console.error('Error fetching entity data:', error);
    
    // If we have any cached entities, return those as fallback
    if (entityCache.size() > 0) {
      return { entities: entityCache.getAllEntities() };
    }
    
    return { entities: [] };
  }
};

// Token price mapping (simplified for demonstration)
// In a real application, you would fetch these prices from an API
const TOKEN_PRICES = {
  'SOL': 120.00, // Example price in USD
  // Add other token prices as needed
};

// Get token price by mint or symbol
const getTokenPrice = (mint: string, symbol: string) => {
  // First try to get by symbol
  if (symbol && TOKEN_PRICES[symbol]) {
    return TOKEN_PRICES[symbol];
  }
  
  // Hardcoded prices for common tokens by mint
  const MINT_TO_PRICE = {
    'So11111111111111111111111111111111111111112': 120.00, // SOL
    '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': 1.00,  // USDC on Solana
    'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 125.00, // mSOL
  };
  
  if (mint && MINT_TO_PRICE[mint]) {
    return MINT_TO_PRICE[mint];
  }
  
  // Default price fallback
  return 1.00; // Default to 1 USD if token price is unknown
};

// Transaction processing utilities with optimized entity lookup
export const processTransactionData = async (
  transactions: VersionedTransactionResponse[],
  centralAddress: string,
  entities: Entity[],
  viewMode: 'wallet' | 'token' = 'wallet'
) => {
  // Initialize data structures
  const nodes = new Map();
  const links = new Map();
  const addressVolumes = new Map();
  const tokenAccountOwners = new Map(); // Track token account -> owner relationships
  const tokenAccountMints = new Map(); // Track token account -> mint
  const mintToSymbol = new Map(); // Track mint address -> token symbol
  const tokenMints = new Set(); // Track all token mints
  const mintVolumes = new Map(); // Track volume per token mint

  // Create an entity lookup map for O(1) lookup if not already using cache
  let entityMap = new Map<string, Entity>();
  if (!Array.isArray(entities)) {
    // We're already using cached entities
    entities = entityCache.getAllEntities();
  }
  
  // Build entity map for quick lookup if needed (when entities is an array)
  entities.forEach(entity => {
    entityMap.set(entity.address, entity);
    
    // Also map related addresses for quick lookup
    if (entity.relatedAddresses && entity.relatedAddresses.length > 0) {
      entity.relatedAddresses.forEach(relAddr => {
        if (!entityMap.has(relAddr)) {
          entityMap.set(relAddr, {
            ...entity,
            address: relAddr, // Override address with the related address
            isRelatedAddress: true // Mark as related address
          });
        }
      });
    }
  });

  // Initialize volume tracking for central address
  addressVolumes.set(centralAddress, {
    inVolume: 0,    // USD value of incoming transactions
    outVolume: 0,   // USD value of outgoing transactions
    totalVolume: 0, // Total USD value of all transactions
    txCount: 0      // Number of transactions
  });

  // Sanitize input - filter null transactions
  const validTransactions = transactions.filter(tx => tx && tx.meta);
  
  if (validTransactions.length === 0) {
    return {
      graphData: { nodes: [], links: [] },
      tokenData: {
        tokenMints: [],
        tokenSymbols: {},
        ataToOwner: {},
        ataToMint: {}
      },
      stats: { 
        totalTransactions: 0, 
        uniqueAddresses: 0, 
        totalInteractions: 0, 
        timespan: { start: null, end: null } 
      }
    };
  }

  // STEP 1: Identify all token accounts, owners, and mints
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
      // Safely map token accounts to owners and mints
      if (balance && balance.accountIndex !== undefined && 
          balance.accountIndex < accountAddresses.length) {
        const tokenAccount = accountAddresses[balance.accountIndex];
        if (tokenAccount) {
          if (balance.owner) {
            tokenAccountOwners.set(tokenAccount, balance.owner);
          }
          if (balance.mint) {
            tokenAccountMints.set(tokenAccount, balance.mint);
            
            // Track token mints
            tokenMints.add(balance.mint);
            
            // Store token symbol if available
            if (balance.uiTokenAmount && 
                balance.uiTokenAmount.uiAmountString) {
              const symbol = balance.uiTokenAmount.uiAmountString.replace(/[0-9.]/g, '').trim();
              if (symbol) {
                mintToSymbol.set(balance.mint, symbol);
              }
            }
          }
        }
      }
    }
  }
  
  // Add central wallet node for both views
  nodes.set(centralAddress, {
    id: centralAddress,
    group: 1, // Primary wallet
    type: 'user',
    tokenType: viewMode === 'token' ? 'wallet' : undefined,
    volume: 0,
    label: '',
    verified: false,
    inVolume: 0,
    outVolume: 0,
    netVolume: 0,
    totalVolume: 0,
    txCount: 0
  });

  // For token view, add nodes for token mints
  if (viewMode === 'token') {
    // Add nodes for all token mints
    for (const mint of tokenMints) {
      nodes.set(mint, {
        id: mint,
        group: 2, // Token mint group
        tokenType: 'mint',
        tokenMint: mint,
        tokenSymbol: mintToSymbol.get(mint) || 'Unknown',
        volume: 5, // Make mint nodes visually prominent
        label: mintToSymbol.get(mint) || 'Token',
        verified: false,
        inVolume: 0,
        outVolume: 0,
        netVolume: 0,
        totalVolume: 0
      });
      
      // Initialize volume tracking for token mints
      mintVolumes.set(mint, {
        totalVolume: 0,
        txCount: 0
      });
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

  // STEP 2: Process each transaction
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
    
    // Process Token Transfers
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
        // Calculate USD value of sent tokens
        const tokenPrice = getTokenPrice(data.mint, data.symbol);
        const usdValue = Math.abs(diff) * tokenPrice;
        
        senders.push({
          tokenAccount,
          owner: data.owner,
          mint: data.mint,
          symbol: data.symbol,
          amount: Math.abs(diff),
          usdValue: usdValue
        });
      } else if (diff > 0) {
        // Calculate USD value of received tokens
        const tokenPrice = getTokenPrice(data.mint, data.symbol);
        const usdValue = diff * tokenPrice;
        
        receivers.push({
          tokenAccount,
          owner: data.owner,
          mint: data.mint,
          symbol: data.symbol,
          amount: diff,
          usdValue: usdValue
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
              
              // Use the smaller value between sender and receiver for safety
              const transferAmount = Math.min(sender.amount, receiver.amount);
              const transferUsdValue = Math.min(sender.usdValue, receiver.usdValue);
              
              if (viewMode === 'token') {
                // TOKEN VIEW: Sender -> Token Mint -> Receiver
                processTokenTransferThroughMint(
                  centralAddress,
                  receiver.owner,
                  sender.mint,
                  sender.symbol,
                  transferAmount,
                  transferUsdValue,
                  nodes,
                  links,
                  addressVolumes,
                  mintVolumes,
                  entityMap // Pass entity map for O(1) lookup
                );
              } else {
                // WALLET VIEW
                // Add receiver node
                if (!nodes.has(receiver.owner)) {
                  nodes.set(receiver.owner, {
                    id: receiver.owner,
                    group: 2,
                    type: 'user',
                    volume: 0,
                    label: '',
                    verified: false,
                    inVolume: 0,
                    outVolume: 0,
                    netVolume: 0,
                    totalVolume: 0,
                    txCount: 0
                  });
                  
                  // Initialize volume tracking for this address
                  addressVolumes.set(receiver.owner, {
                    inVolume: 0,
                    outVolume: 0,
                    totalVolume: 0,
                    txCount: 0
                  });
                }
                
                // Update volume stats for receiver
                const receiverVolume = addressVolumes.get(receiver.owner);
                receiverVolume.inVolume += transferUsdValue;
                receiverVolume.totalVolume += transferUsdValue;
                receiverVolume.txCount += 1;
                
                // Update volume stats for sender
                const centralVolume = addressVolumes.get(centralAddress);
                centralVolume.outVolume += transferUsdValue;
                centralVolume.totalVolume += transferUsdValue;
                centralVolume.txCount += 1;
                
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
                    amount: transferAmount,
                    usdValue: transferUsdValue,
                    count: 1 // Initialize count
                  });
                } else {
                  const link = links.get(linkKey);
                  link.value++;
                  link.amount += transferAmount;
                  link.usdValue += transferUsdValue;
                  link.count += 1;
                }
              }
            });
          } else {
            // Primary wallet is receiving from others
            matchingReceivers.filter(r => isPrimaryWalletOrATA(r.tokenAccount) || r.owner === centralAddress)
              .forEach(receiver => {
                // Skip if sender is also primary wallet (already handled above)
                if (sender.owner === centralAddress) return;
                
                // Use the smaller value between sender and receiver for safety
                const transferAmount = Math.min(sender.amount, receiver.amount);
                const transferUsdValue = Math.min(sender.usdValue, receiver.usdValue);
                
                if (viewMode === 'token') {
                  // TOKEN VIEW: Sender -> Token Mint -> Receiver (central wallet)
                  processTokenTransferThroughMint(
                    sender.owner,
                    centralAddress,
                    sender.mint,
                    sender.symbol,
                    transferAmount,
                    transferUsdValue,
                    nodes,
                    links,
                    addressVolumes,
                    mintVolumes,
                    entityMap // Pass entity map for O(1) lookup
                  );
                } else {
                  // WALLET VIEW
                  // Add sender node
                  if (!nodes.has(sender.owner)) {
                    nodes.set(sender.owner, {
                      id: sender.owner,
                      group: 2,
                      type: 'user',
                      volume: 0,
                      label: '',
                      verified: false,
                      inVolume: 0,
                      outVolume: 0,
                      netVolume: 0,
                      totalVolume: 0,
                      txCount: 0
                    });
                    
                    // Initialize volume tracking for this address
                    addressVolumes.set(sender.owner, {
                      inVolume: 0,
                      outVolume: 0,
                      totalVolume: 0,
                      txCount: 0
                    });
                  }
                  
                  // Update volume stats for sender
                  const senderVolume = addressVolumes.get(sender.owner);
                  senderVolume.outVolume += transferUsdValue;
                  senderVolume.totalVolume += transferUsdValue;
                  senderVolume.txCount += 1;
                  
                  // Update volume stats for central address
                  const centralVolume = addressVolumes.get(centralAddress);
                  centralVolume.inVolume += transferUsdValue;
                  centralVolume.totalVolume += transferUsdValue;
                  centralVolume.txCount += 1;
                  
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
                      amount: transferAmount,
                      usdValue: transferUsdValue,
                      count: 1 // Initialize count
                    });
                  } else {
                    const link = links.get(linkKey);
                    link.value++;
                    link.amount += transferAmount;
                    link.usdValue += transferUsdValue;
                    link.count += 1;
                  }
                }
              });
          }
        }
      }
    });
    
    // Process native SOL transfers - handle differently based on view mode
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
            
            // Calculate USD value
            const solPrice = getTokenPrice('So11111111111111111111111111111111111111112', 'SOL');
            const transferUsdValue = receiverGain * solPrice;
            
            if (viewMode === 'token') {
              // TOKEN VIEW: For SOL, use SOL mint node
              const solMint = 'So11111111111111111111111111111111111111112';
              processTokenTransferThroughMint(
                centralAddress,
                receiverAddress,
                solMint,
                'SOL',
                receiverGain,
                transferUsdValue,
                nodes,
                links,
                addressVolumes,
                mintVolumes,
                entityMap // Pass entity map for O(1) lookup
              );
              
              // Ensure SOL mint node exists
              if (!nodes.has(solMint)) {
                nodes.set(solMint, {
                  id: solMint,
                  group: 2,
                  tokenType: 'mint',
                  tokenMint: solMint,
                  tokenSymbol: 'SOL',
                  volume: 5,
                  label: 'SOL',
                  verified: true,
                  inVolume: 0,
                  outVolume: 0,
                  netVolume: 0,
                  totalVolume: 0
                });
                
                // Initialize volume tracking for SOL mint
                mintVolumes.set(solMint, {
                  totalVolume: 0,
                  txCount: 0
                });
              }
            } else {
              // WALLET VIEW
              // Add receiver node
              if (!nodes.has(receiverAddress)) {
                nodes.set(receiverAddress, {
                  id: receiverAddress,
                  group: 2,
                  type: 'user',
                  volume: 0,
                  label: '',
                  verified: false,
                  inVolume: 0,
                  outVolume: 0,
                  netVolume: 0,
                  totalVolume: 0,
                  txCount: 0
                });
                
                // Initialize volume tracking for this address
                addressVolumes.set(receiverAddress, {
                  inVolume: 0,
                  outVolume: 0,
                  totalVolume: 0,
                  txCount: 0
                });
              }
              
              // Update volume metrics
              const receiverVolume = addressVolumes.get(receiverAddress);
              receiverVolume.inVolume += transferUsdValue;
              receiverVolume.totalVolume += transferUsdValue;
              receiverVolume.txCount += 1;
              
              const centralVolume = addressVolumes.get(centralAddress);
              centralVolume.outVolume += transferUsdValue;
              centralVolume.totalVolume += transferUsdValue;
              centralVolume.txCount += 1;
              
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
                  amount: receiverGain,
                  usdValue: transferUsdValue,
                  count: 1 // Initialize count
                });
              } else {
                const link = links.get(linkKey);
                link.value++;
                link.amount += receiverGain;
                link.usdValue += transferUsdValue;
                link.count += 1;
              }
            }
          }
        }
      }
      // If a non-primary account lost SOL and primary wallet gained SOL
      else if (!isPrimaryAccount && adjustedDiff < 0) {
        // Check if primary wallet gained SOL
        for (let j = 0; j < accountAddresses.length; j++) {
          const potentialReceiver = accountAddresses[j];
          if (isPrimaryWalletOrATA(potentialReceiver)) {
            const receiverPreBal = preBalances[j] || 0;
            const receiverPostBal = postBalances[j] || 0;
            const receiverGain = (receiverPostBal - receiverPreBal) / 1e9;
            
            if (receiverGain > 0) {
              // Calculate USD value
              const solPrice = getTokenPrice('So11111111111111111111111111111111111111112', 'SOL');
              const transferAmount = Math.min(Math.abs(adjustedDiff), receiverGain);
              const transferUsdValue = transferAmount * solPrice;
              
              if (viewMode === 'token') {
                // TOKEN VIEW: For SOL, use SOL mint node
                const solMint = 'So11111111111111111111111111111111111111112';
                processTokenTransferThroughMint(
                  address,
                  centralAddress,
                  solMint,
                  'SOL',
                  transferAmount,
                  transferUsdValue,
                  nodes,
                  links,
                  addressVolumes,
                  mintVolumes,
                  entityMap // Pass entity map for O(1) lookup
                );
                
                // Ensure SOL mint node exists
                if (!nodes.has(solMint)) {
                  nodes.set(solMint, {
                    id: solMint,
                    group: 2,
                    tokenType: 'mint',
                    tokenMint: solMint,
                    tokenSymbol: 'SOL',
                    volume: 5,
                    label: 'SOL',
                    verified: true,
                    inVolume: 0,
                    outVolume: 0,
                    netVolume: 0,
                    totalVolume: 0
                  });
                  
                  // Initialize volume tracking for SOL mint
                  mintVolumes.set(solMint, {
                    totalVolume: 0,
                    txCount: 0
                  });
                }
              } else {
                // WALLET VIEW
                // Add sender node
                if (!nodes.has(address)) {
                  nodes.set(address, {
                    id: address,
                    group: 2,
                    type: 'user',
                    volume: 0,
                    label: '',
                    verified: false,
                    inVolume: 0,
                    outVolume: 0,
                    netVolume: 0,
                    totalVolume: 0,
                    txCount: 0
                  });
                  
                  // Initialize volume tracking for this address
                  addressVolumes.set(address, {
                    inVolume: 0,
                    outVolume: 0,
                    totalVolume: 0,
                    txCount: 0
                  });
                }
                
                // Update volume metrics
                const senderVolume = addressVolumes.get(address);
                senderVolume.outVolume += transferUsdValue;
                senderVolume.totalVolume += transferUsdValue;
                senderVolume.txCount += 1;
                
                const centralVolume = addressVolumes.get(centralAddress);
                centralVolume.inVolume += transferUsdValue;
                centralVolume.totalVolume += transferUsdValue;
                centralVolume.txCount += 1;
                
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
                    amount: transferAmount,
                    usdValue: transferUsdValue,
                    count: 1 // Initialize count
                  });
                } else {
                  const link = links.get(linkKey);
                  link.value++;
                  link.amount += transferAmount;
                  link.usdValue += transferUsdValue;
                  link.count += 1;
                }
              }
              
              break; // Found primary wallet receiving SOL
            }
          }
        }
      }
    }
  }

  // Calculate net volume for all addresses and update nodes
  for (const [address, volumeData] of addressVolumes.entries()) {
    if (nodes.has(address)) {
      const node = nodes.get(address);
      node.inVolume = volumeData.inVolume;
      node.outVolume = volumeData.outVolume;
      node.netVolume = volumeData.inVolume - volumeData.outVolume;
      node.totalVolume = volumeData.totalVolume;
      node.txCount = volumeData.txCount;
    }
  }

  // Update token mint volumes
  for (const [mint, volumeData] of mintVolumes.entries()) {
    if (nodes.has(mint)) {
      const node = nodes.get(mint);
      node.totalVolume = volumeData.totalVolume;
      node.txCount = volumeData.txCount;
    }
  }

  // Check for known entities and enrich node data - now using O(1) lookup with entityMap
  for (const [address, node] of nodes.entries()) {
    // Fast O(1) lookup from entity map
    const entity = entityMap.get(address) || entityCache.getEntity(address);
    if (entity) {
      node.icon = entity.icon;
      node.label = entity.name;
      node.tokenSymbol = entity.name;
      node.type = mapEntityTypeToNodeType(entity.type);
      node.entityType = entity.type;
      node.verified = entity.verified;
      node.description = entity.description;
      node.website = entity.website;
    }
  }

  // Enhance nodes with visual information
  const enhancedNodes = Array.from(nodes.values()).map(node => {
    // Base volume calculation
    let volume = Math.max(1, Math.min(10, node.volume || 1));
    
    // Special handling for token view mode
    if (viewMode === 'token' && node.tokenType === 'mint') {
      // Make mint nodes larger in token view
      volume = Math.max(8, volume);
    } else if (node.id === centralAddress) {
      // Make central node larger
      volume = Math.max(5, volume);
    }
    
    return {
      ...node,
      volume
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
    uniqueAddresses: viewMode === 'wallet' ? nodes.size : 
      new Set([...nodes.values()].filter(n => !n.tokenType || n.tokenType === 'wallet').map(n => n.id)).size,
    totalInteractions: links.size,
    timespan: {
      start: validTransactions[validTransactions.length - 1]?.blockTime || null,
      end: validTransactions[0]?.blockTime || null
    }
  };

  // Prepare token data for the token view
  const tokenData = {
    tokenMints: Array.from(tokenMints),
    tokenSymbols: Object.fromEntries(mintToSymbol.entries()),
    ataToOwner: Object.fromEntries(tokenAccountOwners.entries()),
    ataToMint: Object.fromEntries(tokenAccountMints.entries())
  };

  return {
    graphData: {
      nodes: enhancedNodes,
      links: enhancedLinks
    },
    tokenData,
    stats
  };
};

// Helper function for processing token transfers through mint nodes - updated for O(1) entity lookup
function processTokenTransferThroughMint(
  senderAddress,
  receiverAddress,
  tokenMint,
  tokenSymbol,
  transferAmount,
  transferUsdValue,
  nodes,
  links,
  addressVolumes,
  mintVolumes,
  entityMap // New parameter to receive entity map
) {
  // Ensure sender node exists
  if (!nodes.has(senderAddress)) {
    // Fast entity lookup using provided entityMap or cache
    const entity = entityMap ? entityMap.get(senderAddress) : entityCache.getEntity(senderAddress);
    
    nodes.set(senderAddress, {
      id: senderAddress,
      group: 2,
      type: entity ? mapEntityTypeToNodeType(entity.type) : 'user',
      tokenType: 'wallet',
      volume: 0,
      label: entity ? entity.name : '',
      verified: entity ? entity.verified : false,
      inVolume: 0,
      outVolume: 0,
      netVolume: 0,
      totalVolume: 0,
      txCount: 0
    });
    
    // Initialize volume tracking for this address
    addressVolumes.set(senderAddress, {
      inVolume: 0,
      outVolume: 0,
      totalVolume: 0,
      txCount: 0
    });
  }
  
  // Ensure receiver node exists
  if (!nodes.has(receiverAddress)) {
    // Fast entity lookup using provided entityMap or cache
    const entity = entityMap ? entityMap.get(receiverAddress) : entityCache.getEntity(receiverAddress);
    
    nodes.set(receiverAddress, {
      id: receiverAddress,
      group: 2,
      type: entity ? mapEntityTypeToNodeType(entity.type) : 'user',
      tokenType: 'wallet',
      volume: 0,
      label: entity ? entity.name : '',
      verified: entity ? entity.verified : false,
      inVolume: 0,
      outVolume: 0,
      netVolume: 0,
      totalVolume: 0,
      txCount: 0
    });
    
    // Initialize volume tracking for this address
    addressVolumes.set(receiverAddress, {
      inVolume: 0,
      outVolume: 0,
      totalVolume: 0,
      txCount: 0
    });
  }
  
  // Update volume metrics for sender and receiver
  const senderVolume = addressVolumes.get(senderAddress);
  senderVolume.outVolume += transferUsdValue;
  senderVolume.totalVolume += transferUsdValue;
  senderVolume.txCount += 1;
  
  const receiverVolume = addressVolumes.get(receiverAddress);
  receiverVolume.inVolume += transferUsdValue;
  receiverVolume.totalVolume += transferUsdValue;
  receiverVolume.txCount += 1;
  
  // Update mint volume
  if (mintVolumes.has(tokenMint)) {
    const mintVolume = mintVolumes.get(tokenMint);
    mintVolume.totalVolume += transferUsdValue;
    mintVolume.txCount += 1;
  }
  
  // Increase node volumes
  nodes.get(senderAddress).volume = (nodes.get(senderAddress).volume || 0) + 1;
  nodes.get(receiverAddress).volume = (nodes.get(receiverAddress).volume || 0) + 1;
  
  // 1. Create link from sender to token mint
  const linkFromSender = `${senderAddress}-${tokenMint}-${tokenSymbol}`;
  if (!links.has(linkFromSender)) {
    links.set(linkFromSender, {
      source: senderAddress,
      target: tokenMint,
      value: 1,
      type: 'token',
      tokenMint: tokenMint,
      tokenSymbol: tokenSymbol,
      amount: transferAmount,
      usdValue: transferUsdValue,
      count: 1
    });
  } else {
    const link = links.get(linkFromSender);
    link.value++;
    link.amount += transferAmount;
    link.usdValue += transferUsdValue;
    link.count += 1;
  }
  
  // 2. Create link from token mint to receiver
  const linkToReceiver = `${tokenMint}-${receiverAddress}-${tokenSymbol}`;
  if (!links.has(linkToReceiver)) {
    links.set(linkToReceiver, {
      source: tokenMint,
      target: receiverAddress,
      value: 1,
      type: 'token',
      tokenMint: tokenMint,
      tokenSymbol: tokenSymbol,
      amount: transferAmount,
      usdValue: transferUsdValue,
      count: 1
    });
  } else {
    const link = links.get(linkToReceiver);
    link.value++;
    link.amount += transferAmount;
    link.usdValue += transferUsdValue;
    link.count += 1;
  }
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