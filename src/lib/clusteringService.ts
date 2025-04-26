// src/lib/clusteringService.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { clusterTransactions, TransactionCluster, findRelatedWallets, identifyWalletRings } from './transactionClustering';
import { formatAddress } from './utils';
import { Entity } from '@/types';

// In-memory cache for clustering results
const clusteringCache = new Map<string, {
  result: {
    clusters: TransactionCluster[],
    flaggedClusters: TransactionCluster[],
    walletGroups: {
      groups: string[][],
      strength: ('High' | 'Medium' | 'Low')[]
    },
    ringClusters: TransactionCluster[]
  },
  timestamp: number,
  searchParams: string
}>();

// Cache expiration time (30 minutes)
const CACHE_EXPIRATION = 30 * 60 * 1000;

// Function to fetch transactions and perform clustering
export async function fetchAndClusterTransactions(
  searchQuery: string,
  options: {
    timeframe?: 'day' | 'week' | 'month' | 'all' | 'custom',
    startDate?: Date,
    endDate?: Date,
    limit?: number,
    batchSize?: number,
    filterType?: string,
    enrichWithEntities?: boolean,
    entities?: Entity[],
    maxDepth?: number // New parameter for depth control
  } = {}
) {
  const {
    timeframe = 'week',
    startDate,
    endDate = new Date(),
    limit = 500,
    batchSize = 100,
    filterType,
    enrichWithEntities = true,
    entities = [],
    maxDepth = Infinity // Default to unlimited depth
  } = options;

  // Calculate actual start date based on timeframe if not explicitly provided
  let effectiveStartDate = startDate;
  
  if (!effectiveStartDate) {
    const now = new Date();
    
    switch (timeframe) {
      case 'day':
        effectiveStartDate = new Date(now);
        effectiveStartDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        effectiveStartDate = new Date(now);
        effectiveStartDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        effectiveStartDate = new Date(now);
        effectiveStartDate.setDate(now.getDate() - 30);
        break;
      case 'all':
        effectiveStartDate = new Date(2020, 2, 16); // Approximate Solana launch date
        break;
      default:
        effectiveStartDate = new Date(now);
        effectiveStartDate.setDate(now.getDate() - 7); // Default to 1 week
    }
  }
  
  // Format dates for cache key
  const startDateStr = effectiveStartDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  const depthStr = maxDepth === Infinity ? 'all' : maxDepth.toString();

  // Create cache key from query and options including depth
  const cacheKey = `${searchQuery}-${startDateStr}-${endDateStr}-${limit}-${filterType || 'all'}-${depthStr}`;
  
  // Check if we have cached results that are still valid
  const cachedResult = clusteringCache.get(cacheKey);
  if (cachedResult && (Date.now() - cachedResult.timestamp < CACHE_EXPIRATION)) {
    return cachedResult.result;
  }

  try {

    // Real implementation would use actual blockchain data:
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com'
    );

    // Determine if the query is a wallet address or a pattern
    let transactions = [];
    let isWallet = false;

    try {
      // Try to parse as a wallet address
      const publicKey = new PublicKey(searchQuery);
      isWallet = true;
      
      // Fetch signatures for the wallet with date range
      const signatures = await fetchSignaturesForDateRange(
        connection, 
        publicKey, 
        effectiveStartDate, 
        endDate, 
        limit,
        batchSize
      );
      
      // Fetch transaction details
      transactions = await fetchTransactionsFromSignatures(connection, signatures, batchSize);
    } catch (error) {
      console.log("Not a valid address, treating as a pattern:", error);
      
      // This would be a more complex API query in a real implementation
      // For now, we'll just return an empty result
      transactions = [];
    }

    // If no transactions found, return empty result
    if (transactions.length === 0) {
      const emptyResult = {
        clusters: [],
        flaggedClusters: [],
        walletGroups: { groups: [], strength: [] },
        ringClusters: []
      };
      
      // Cache the empty result
      clusteringCache.set(cacheKey, {
        result: emptyResult,
        timestamp: Date.now(),
        searchParams: cacheKey
      });
      
      return emptyResult;
    }

    // Perform transaction clustering with depth limit
    const { clusters, flaggedClusters } = await clusterTransactions(transactions, maxDepth);
    
    // Apply any type filters
    let filteredClusters = clusters;
    if (filterType) {
      filteredClusters = clusters.filter(cluster => 
        cluster.type?.toLowerCase() === filterType.toLowerCase()
      );
    }
    
    // Enrich clusters with entity information
    if (enrichWithEntities && entities.length > 0) {
      enrichClustersWithEntities(filteredClusters, entities);
      enrichClustersWithEntities(flaggedClusters, entities);
    }
    
    // Find related wallet groups
    const walletGroups = findRelatedWallets(filteredClusters);
    
    // Identify wallet rings (circular patterns)
    const ringClusters = identifyWalletRings(filteredClusters);

    // Prepare result
    const result = {
      clusters: filteredClusters,
      flaggedClusters,
      walletGroups,
      ringClusters
    };
    
    // Cache the result
    clusteringCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      searchParams: cacheKey
    });
    
    return result;
  } catch (error) {
    console.error("Error in clustering service:", error);
    throw new Error(`Transaction clustering failed: ${error.message}`);
  }
}

// Helper function to fetch signatures for a given date range with improved batching
async function fetchSignaturesForDateRange(
  connection: Connection,
  publicKey: PublicKey,
  startDate: Date,
  endDate: Date,
  maxSignatures: number = 500,
  batchSize: number = 100
): Promise<string[]> {
  // Convert to Unix timestamp
  const startTimeUnix = Math.floor(startDate.getTime() / 1000);
  const endTimeUnix = Math.floor(endDate.getTime() / 1000);
  
  try {
    const signatures: string[] = [];
    let lastSignature: string | undefined = undefined;
    let hasMore = true;
    let consecutiveEmptyResponses = 0;
    const MAX_EMPTY_RESPONSES = 3; // Safety mechanism to avoid infinite loops
    
    console.log(`Fetching signatures from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
    
    // Fetch signatures in batches until we have enough or no more are available
    while (signatures.length < maxSignatures && hasMore && consecutiveEmptyResponses < MAX_EMPTY_RESPONSES) {
      // Calculate optimal batch size based on remaining signatures needed
      const currentBatchSize = Math.min(batchSize, maxSignatures - signatures.length);
      
      try {
        // Add a small delay between requests to avoid rate limits
        if (signatures.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const signatureBatch = await connection.getSignaturesForAddress(
          publicKey,
          { 
            before: lastSignature,
            limit: currentBatchSize,
            // Solana API doesn't support filtering by time directly in the request,
            // so we'll filter the results manually
          }
        );
        
        if (signatureBatch.length === 0) {
          consecutiveEmptyResponses++;
          hasMore = false;
          continue;
        } else {
          consecutiveEmptyResponses = 0;
        }
        
        // Filter by time and add to results
        let addedAny = false;
        for (const sig of signatureBatch) {
          // Update last signature for pagination
          if (!lastSignature) {
            lastSignature = sig.signature;
          }
          
          if (sig.blockTime) {
            // Only include signatures within the date range
            if (sig.blockTime >= startTimeUnix && sig.blockTime <= endTimeUnix) {
              signatures.push(sig.signature);
              addedAny = true;
            } else if (sig.blockTime < startTimeUnix) {
              // We've gone past our time window, stop fetching more
              hasMore = false;
              break;
            }
          }
        }
        
        // If we didn't add any signatures from this batch, we might be approaching
        // the end of the available signatures
        if (!addedAny) {
          consecutiveEmptyResponses++;
        }
        
        // Update last signature for pagination
        if (signatureBatch.length > 0) {
          lastSignature = signatureBatch[signatureBatch.length - 1].signature;
        }
        
        // If we got fewer than requested, we've reached the end
        if (signatureBatch.length < currentBatchSize) {
          hasMore = false;
        }
      } catch (error) {
        console.error("Error fetching signature batch:", error);
        // Introduce backoff on error
        await new Promise(resolve => setTimeout(resolve, 1000));
        consecutiveEmptyResponses++;
      }
    }
    
    console.log(`Found ${signatures.length} signatures in the date range`);
    return signatures;
  } catch (error) {
    console.error("Error fetching signatures:", error);
    return [];
  }
}

// Fetch transaction details from signatures with improved batching
async function fetchTransactionsFromSignatures(
  connection: Connection,
  signatures: string[],
  batchSize: number = 100
) {
  if (signatures.length === 0) return [];
  
  try {
    // Fetch transactions in batches to avoid rate limits
    const transactions = [];
    
    for (let i = 0; i < signatures.length; i += batchSize) {
      try {
        const batch = signatures.slice(i, Math.min(i + batchSize, signatures.length));
        console.log(`Fetching transactions batch ${i/batchSize + 1}/${Math.ceil(signatures.length/batchSize)}, size: ${batch.length}`);
        
        // Add a small delay between batches to avoid rate limits
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        const txBatch = await connection.getTransactions(batch, {
          maxSupportedTransactionVersion: 0
        });
        
        transactions.push(...txBatch.filter(Boolean));
      } catch (error) {
        console.error(`Error fetching transaction batch at offset ${i}:`, error);
        // Continue with next batch on error
      }
    }
    
    console.log(`Successfully fetched ${transactions.length} of ${signatures.length} transactions`);
    return transactions;
  } catch (error) {
    console.error("Error fetching transaction details:", error);
    return [];
  }
}

// Enrich clusters with entity information
function enrichClustersWithEntities(
  clusters: TransactionCluster[],
  entities: Entity[]
) {
  // Build a lookup map for quick entity reference
  const entityMap = new Map<string, Entity>();
  entities.forEach(entity => {
    entityMap.set(entity.address, entity);
    
    // Also map related addresses
    if (entity.relatedAddresses) {
      entity.relatedAddresses.forEach(addr => {
        if (!entityMap.has(addr)) {
          entityMap.set(addr, entity);
        }
      });
    }
  });
  
  // Enrich each cluster
  clusters.forEach(cluster => {
    // Add entity information for each account
    const knownEntities = new Map<string, {
      name: string,
      type: string,
      verified: boolean,
      accounts: Set<string>
    }>();
    
    cluster.accounts.forEach(account => {
      const entity = entityMap.get(account);
      if (entity) {
        // Track entity information
        if (!knownEntities.has(entity.name)) {
          knownEntities.set(entity.name, {
            name: entity.name,
            type: entity.type,
            verified: entity.verified,
            accounts: new Set([account])
          });
        } else {
          knownEntities.get(entity.name).accounts.add(account);
        }
      }
    });
    
    // Add known entities to the cluster
    if (knownEntities.size > 0) {
      cluster.entities = Array.from(knownEntities.values()).map(e => ({
        name: e.name,
        type: e.type,
        verified: e.verified,
        accounts: Array.from(e.accounts)
      }));
    }
  });
  
  return clusters;
}

// Get cluster stats for dashboard display
export function getClusteringStats(clusters: TransactionCluster[]) {
  // Initialize stats
  const stats = {
    totalClusters: clusters.length,
    totalAccounts: new Set<string>(),
    totalTransactions: 0,
    clustersByType: {} as Record<string, number>,
    totalValue: 0,
    largestCluster: {
      id: '',
      accounts: 0,
      transactions: 0
    }
  };
  
  // Process each cluster
  clusters.forEach(cluster => {
    // Track unique accounts
    cluster.accounts.forEach(account => stats.totalAccounts.add(account));
    
    // Track transaction count
    stats.totalTransactions += cluster.transactions.length;
    
    // Track total value
    stats.totalValue += cluster.totalValue;
    
    // Track cluster types
    const type = cluster.type || 'Unknown';
    stats.clustersByType[type] = (stats.clustersByType[type] || 0) + 1;
    
    // Track largest cluster
    if (cluster.accounts.length > stats.largestCluster.accounts) {
      stats.largestCluster.id = cluster.id;
      stats.largestCluster.accounts = cluster.accounts.length;
      stats.largestCluster.transactions = cluster.transactions.length;
    }
  });
  
  return {
    ...stats,
    totalAccounts: stats.totalAccounts.size
  };
}

// Generate sample clusters for demo mode
// function generateSampleClusters(searchQuery: string, maxDepth: number = Infinity) {
//   // Use the search query as a seed for pseudo-random generation
//   const seed = searchQuery.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
//   // Create a simple random function with the seed
//   const random = () => {
//     const x = Math.sin(seed++) * 10000;
//     return x - Math.floor(x);
//   };
  
//   // Generate accounts with depth information
//   const generateAccounts = (count: number) => {
//     // Start with the search query as the central account if it looks like an address
//     const centralAccount = searchQuery.length >= 32 ? searchQuery : `wallet${Math.floor(random() * 1000000)}`;
    
//     const accounts = [centralAccount];
//     const depthMap = { [centralAccount]: 0 }; // Central account has depth 0
    
//     // Generate additional accounts with increasing depth
//     let currentDepth = 1;
//     let accountsAtCurrentDepth = 1;
    
//     for (let i = 1; i < count; i++) {
//       // If we've reached max depth, stop adding new depths
//       if (currentDepth > maxDepth) {
//         break;
//       }
      
//       const account = `wallet${Math.floor(random() * 1000000)}`;
//       accounts.push(account);
//       depthMap[account] = currentDepth;
      
//       // Every N accounts, increase the depth level
//       accountsAtCurrentDepth--;
//       if (accountsAtCurrentDepth <= 0) {
//         currentDepth++;
//         // Each depth level has more accounts than the previous one
//         accountsAtCurrentDepth = Math.min(count - i, Math.floor(3 * Math.pow(2, currentDepth - 1)));
//       }
//     }
    
//     return { accounts, depthMap };
//   };
  
//   // Generate sample clusters
//   const clusterCount = 3 + Math.floor(random() * 5);
//   const clusters = [];
//   const programs = [
//     "11111111111111111111111111111111", // System Program
//     "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", // Token Program
//     "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", // Jupiter
//     "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc", // Orca
//   ];
  
//   const clusterTypes = ["Sequential Transfers", "Fan-out", "Fan-in", "Swap", "Mixed Activity"];
  
//   for (let i = 0; i < clusterCount; i++) {
//     const accountCount = 5 + Math.floor(random() * 20);
//     const { accounts, depthMap } = generateAccounts(accountCount);
    
//     const transactionCount = 3 + Math.floor(random() * 10);
//     const transactions = Array.from({ length: transactionCount }, (_, j) => `tx${j}${Math.floor(random() * 1000000)}`);
    
//     // Select a subset of programs for this cluster
//     const clusterPrograms = programs.filter(() => random() > 0.5);
//     if (clusterPrograms.length === 0) {
//       clusterPrograms.push(programs[0]); // Always include at least one program
//     }
    
//     const clusterType = clusterTypes[Math.floor(random() * clusterTypes.length)];
//     const timestamp = Date.now() - Math.floor(random() * 30 * 24 * 60 * 60 * 1000); // Random time in the last 30 days
    
//     // Determine if this should be a suspicious cluster
//     const isSuspicious = random() < 0.3;
    
//     const cluster: TransactionCluster = {
//       id: `cluster-${i + 1}-${timestamp}`,
//       accounts: accounts.slice(0, (maxDepth === Infinity) ? accounts.length : Math.min(accounts.length, 5 + maxDepth * 3)),
//       transactions,
//       programs: clusterPrograms,
//       totalValue: Math.floor(random() * 1000) / 10,
//       timestamp,
//       type: clusterType,
//       depthMap
//     };
    
//     // Add risk factors for suspicious clusters
//     if (isSuspicious) {
//       cluster.risk = {
//         score: 30 + Math.floor(random() * 50),
//         reasons: [
//           "Suspicious transaction pattern detected",
//           random() < 0.5 ? "Large value movement in short time" : "Multiple intermediary accounts used",
//           random() < 0.5 ? "Known high-risk program interaction" : "Circular fund flow detected"
//         ]
//       };
//     }
    
//     clusters.push(cluster);
//   }
  
//   // Flag suspicious clusters
//   const flaggedClusters = clusters.filter(cluster => cluster.risk && cluster.risk.score >= 30);
  
//   // Generate wallet groups
//   const walletGroups = {
//     groups: Array.from({ length: 2 + Math.floor(random() * 3) }, (_, i) => {
//       // Randomly select a subset of accounts from different clusters
//       return Array.from({ length: 3 + Math.floor(random() * 5) }, () => {
//         const randomCluster = clusters[Math.floor(random() * clusters.length)];
//         const randomAccountIndex = Math.floor(random() * randomCluster.accounts.length);
//         return randomCluster.accounts[randomAccountIndex];
//       });
//     }),
//     strength: Array.from({ length: 2 + Math.floor(random() * 3) }, () => {
//       const r = random();
//       if (r < 0.3) return 'High';
//       if (r < 0.7) return 'Medium';
//       return 'Low';
//     }) as ('High' | 'Medium' | 'Low')[]
//   };
  
//   return {
//     clusters,
//     flaggedClusters,
//     walletGroups,
//     ringClusters: flaggedClusters.filter(() => random() > 0.7)
//   };
// }