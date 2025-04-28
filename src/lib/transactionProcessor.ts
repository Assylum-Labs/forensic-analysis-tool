import { PublicKey } from '@solana/web3.js';
// import { entities as entityList } from '@/lib/data';
import { entityCache } from '@/lib/EntityCacheService';
import { Entity } from '@/types';

// Known program IDs for better identification
const KNOWN_PROGRAMS = {
  SYSTEM_PROGRAM: '11111111111111111111111111111111',
  TOKEN_PROGRAM: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  ASSOCIATED_TOKEN_PROGRAM: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  JUPITER_PROGRAM: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
  ORCA_WHIRLPOOL: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  RAYDIUM_SWAP: 'SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8',
  MARINADE_FINANCE: 'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD',
  SERUM_MARKET: 'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX',
};

// Transaction types we can identify
const TRANSACTION_TYPES = {
  UNKNOWN: 'Unknown',
  TRANSFER: 'Transfer',
  SWAP: 'Swap',
  STAKE: 'Stake',
  UNSTAKE: 'Unstake',
  LIQUIDITY_PROVISION: 'Liquidity Provision',
  TOKEN_CREATE: 'Token Creation',
  TOKEN_MINT: 'Token Mint',
  NFT_MINT: 'NFT Mint',
  NFT_PURCHASE: 'NFT Purchase',
};

export const createEntityLookupMap = (entities: Entity[]): Map<string, Entity> => {
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

    return entityMap
}

/**
 * Process transaction data to map the flow of funds
 */
export async function processTransactionFlow(transaction: any) {
  // Extract key information from transaction
  const { meta, transaction: txData } = transaction;
  if (!meta || !txData) {
    throw new Error("Invalid transaction data");
  }

  entityCache.initialize();
  const cachedEntities = entityCache.getAllEntities();
  const mappedEntities = createEntityLookupMap(cachedEntities)

  const instructions = txData.message.instructions || txData.message.compiledInstructions;
  const accountKeys =  txData.message.accountKeys ||  txData.message.staticAccountKeys

  // Get all account keys involved in the transaction
  const allAccounts = accountKeys.map(key => key.toString());
  
  // Get pre/post balances
  const preBalances = meta.preBalances || [];
  const postBalances = meta.postBalances || [];
  const preTokenBalances = meta.preTokenBalances || [];
  const postTokenBalances = meta.postTokenBalances || [];
  const logMessages = meta.logMessages || [];
  
  // Create nodes for each account
  const nodes = [];
  const links = [];
  const accountsInfo = [];
  const programsUsed = [];
  
  // Map account indices to their addresses
  const accountMap = new Map();
  allAccounts.forEach((address, index) => {
    accountMap.set(index, address);
  });
  
  // Function to create a node if it doesn't exist
  const ensureNodeExists = (address, type = 'account', label = null, volume = 1) => {
    if (!nodes.some(n => n.id === address)) {
      // Check if this is a known entity
      let entityInfo = null;
      if (mappedEntities) {
        entityInfo = mappedEntities.get(address)
        // entityInfo = entityList.find((entity: Entity) => entity.address === address);
      }
      
      nodes.push({
        id: address,
        type,
        label: entityInfo?.name || label,
        verified: entityInfo?.verified || false,
        volume,
        ...entityInfo
      });
    }
  };
  
  // Add accounts and their balances
  allAccounts.forEach((address, index) => {
    const preBal = preBalances[index] || 0;
    const postBal = postBalances[index] || 0;
    const change = postBal - preBal;
    
    // Determine account type
    let accountType = 'account';
    
    // Check for system program and other known programs
    if (address === KNOWN_PROGRAMS.SYSTEM_PROGRAM) {
      accountType = 'system';
    } else if (address === KNOWN_PROGRAMS.TOKEN_PROGRAM) {
      accountType = 'token program';
    } else if (Object.values(KNOWN_PROGRAMS).includes(address)) {
      accountType = 'program';
      
      // Track programs used
      const programEntity = mappedEntities.get(address)
    //   const programName = Object.keys(KNOWN_PROGRAMS).find(
    //     key => KNOWN_PROGRAMS[key] === address
    //   );
      
      programsUsed.push({
        id: address,
        name: programEntity?.name || null,
        type: 'program'
      });
    }
    
    // Check if this account is the fee payer (first account in the transaction)
    if (index === 0) {
      accountType = 'signer';
    }
    
    // Check if this account is mentioned in instructions as a program
    const isProgram = txData.message.compiledInstructions.some(
      ix => ix.programIdIndex === index
    );
    
    if (isProgram) {
      accountType = 'program';
      
      if (!programsUsed.some(p => p.id === address)) {
        let entity = mappedEntities.get(address)
        programsUsed.push({
          id: address,
          name: entity?.name || null,
          type: 'program'
        });
      }
    }
    
    // Check if this account is a token account from token balances
    const isTokenAccount = [...preTokenBalances, ...postTokenBalances].some(
      balance => accountMap.get(balance.accountIndex) === address
    );
    
    if (isTokenAccount) {
      accountType = 'token';
    }
    
    // Create node for this account
    ensureNodeExists(address, accountType);
    
    // Track account information
    accountsInfo.push({
      id: address,
      type: accountType,
      preBal,
      postBal,
      change,
      owner: null, // Will populate for token accounts
      label: null  // Will update if known entity
    });
  });
  
  // Process native SOL transfers
  for (let i = 0; i < allAccounts.length; i++) {
    const address = allAccounts[i];
    const preBal = preBalances[i] || 0;
    const postBal = postBalances[i] || 0;
    const isPayer = i === 0; // First account pays transaction fee
    const fee = meta.fee || 0;
    
    // Adjust balance change for fee payer
    const adjustedDiff = isPayer ? (postBal - preBal + fee) : (postBal - preBal);
    
    // If this account lost SOL (not including fee)
    if (adjustedDiff < 0) {
      // Find accounts that gained SOL
      for (let j = 0; j < allAccounts.length; j++) {
        if (i === j) continue; // Skip self
        
        const receiverAddress = allAccounts[j];
        const receiverPreBal = preBalances[j] || 0;
        const receiverPostBal = postBalances[j] || 0;
        const receiverGain = receiverPostBal - receiverPreBal;
        
        // If this account gained SOL
        if (receiverGain > 0) {
          // Create link for SOL transfer
          links.push({
            source: address,
            target: receiverAddress,
            value: 2, // Stronger visual weight for SOL transfers
            amount: Math.abs(adjustedDiff) / 1e9, // Convert lamports to SOL
            tokenSymbol: 'SOL',
            type: 'transfer'
          });
          
          // Update node volumes
          nodes.find(n => n.id === address).volume = (nodes.find(n => n.id === address).volume || 1) + 1;
          nodes.find(n => n.id === receiverAddress).volume = (nodes.find(n => n.id === receiverAddress).volume || 1) + 1;
        }
      }
    }
  }
  
  // Process token transfers
  const tokenAccountMap = new Map();
  
  // Process pre token balances
  preTokenBalances.forEach(balance => {
    const tokenAccount = accountMap.get(balance.accountIndex);
    if (!tokenAccount) return;
    
    if (!tokenAccountMap.has(tokenAccount)) {
      tokenAccountMap.set(tokenAccount, {
        owner: balance.owner,
        mint: balance.mint,
        preBal: parseFloat(balance.uiTokenAmount.uiAmountString) || 0,
        postBal: 0,
        symbol: balance.uiTokenAmount.uiAmountString
          .replace(/[0-9.]/g, '')
          .trim() || 'Unknown'
      });
      
      // Update account info with owner
      const accountInfo = accountsInfo.find(a => a.id === tokenAccount);
      if (accountInfo) {
        accountInfo.owner = balance.owner;
      }
      
      // Create node for token mint if it doesn't exist
      ensureNodeExists(balance.mint, 'token', balance.uiTokenAmount.uiAmountString
        .replace(/[0-9.]/g, '')
        .trim() || 'Token');
    }
  });
  
  // Process post token balances
  postTokenBalances.forEach(balance => {
    const tokenAccount = accountMap.get(balance.accountIndex);
    if (!tokenAccount) return;
    
    if (!tokenAccountMap.has(tokenAccount)) {
      tokenAccountMap.set(tokenAccount, {
        owner: balance.owner,
        mint: balance.mint,
        preBal: 0,
        postBal: parseFloat(balance.uiTokenAmount.uiAmountString) || 0,
        symbol: balance.uiTokenAmount.uiAmountString
          .replace(/[0-9.]/g, '')
          .trim() || 'Unknown'
      });
      
      // Update account info with owner
      const accountInfo = accountsInfo.find(a => a.id === tokenAccount);
      if (accountInfo) {
        accountInfo.owner = balance.owner;
      }
      
      // Create node for token mint if it doesn't exist
      ensureNodeExists(balance.mint, 'token', balance.uiTokenAmount.uiAmountString
        .replace(/[0-9.]/g, '')
        .trim() || 'Token');
    } else {
      // Update post balance
      tokenAccountMap.get(tokenAccount).postBal = parseFloat(balance.uiTokenAmount.uiAmountString) || 0;
    }
  });
  
  // Find token transfers
  const senders = [];
  const receivers = [];
  
  for (const [tokenAccount, data] of tokenAccountMap.entries()) {
    const diff = data.postBal - data.preBal;
    
    if (diff < 0) {
      // This account sent tokens
      senders.push({
        tokenAccount,
        owner: data.owner,
        mint: data.mint,
        symbol: data.symbol,
        amount: Math.abs(diff)
      });
    } else if (diff > 0) {
      // This account received tokens
      receivers.push({
        tokenAccount,
        owner: data.owner,
        mint: data.mint,
        symbol: data.symbol,
        amount: diff
      });
    }
  }
  
  // Match token senders with receivers
  senders.forEach(sender => {
    // Find matching receivers with the same mint
    const matchingReceivers = receivers.filter(r => r.mint === sender.mint);
    
    if (matchingReceivers.length > 0) {
      // Create links from sender to receiver
      matchingReceivers.forEach(receiver => {
        // Skip self-transfers (same owner)
        if (sender.owner === receiver.owner) return;
        
        // Use the smaller value between sender and receiver for safety
        const transferAmount = Math.min(sender.amount, receiver.amount);
        
        // Create link for token transfer
        links.push({
          source: sender.owner,
          target: receiver.owner,
          value: 1.5,
          amount: transferAmount,
          tokenSymbol: sender.symbol,
          type: 'transfer'
        });
        
        // Update node volumes
        nodes.find(n => n.id === sender.owner).volume = (nodes.find(n => n.id === sender.owner).volume || 1) + 1;
        nodes.find(n => n.id === receiver.owner).volume = (nodes.find(n => n.id === receiver.owner).volume || 1) + 1;
      });
    }
  });
  
  // Determine transaction type based on programs and activities
  let transactionType = TRANSACTION_TYPES.UNKNOWN;
  
  // Parse log messages to help determine transaction type
  const logString = logMessages ? logMessages.join(' ').toLowerCase() : '';
  
  // Check for simple SOL transfer
  if (
    programsUsed.length === 1 && 
    programsUsed[0].id === KNOWN_PROGRAMS.SYSTEM_PROGRAM &&
    links.some(l => l.tokenSymbol === 'SOL')
  ) {
    transactionType = TRANSACTION_TYPES.TRANSFER;
  }
  
  // Check for token transfer
  else if (
    programsUsed.some(p => p.id === KNOWN_PROGRAMS.TOKEN_PROGRAM) &&
    !programsUsed.some(p => 
      p.id === KNOWN_PROGRAMS.JUPITER_PROGRAM || 
      p.id === KNOWN_PROGRAMS.ORCA_WHIRLPOOL ||
      p.id === KNOWN_PROGRAMS.RAYDIUM_SWAP
    ) 
    &&
    links.some(l => l.tokenSymbol !== 'SOL') &&
    logString.includes('transfer')
  ) {
    transactionType = TRANSACTION_TYPES.TRANSFER;
  }
  
  // Check for token swap
  else if (
    // Check for known DEX programs
    programsUsed.some(p => 
      p.id === KNOWN_PROGRAMS.JUPITER_PROGRAM || 
      p.id === KNOWN_PROGRAMS.ORCA_WHIRLPOOL ||
      p.id === KNOWN_PROGRAMS.RAYDIUM_SWAP ||
      p.id === KNOWN_PROGRAMS.SERUM_MARKET
    ) || 
    // Or check log messages for swap-related terms
    logString.includes('swap') || 
    logString.includes('exchange') ||
    // Check for multiple token balance changes indicating a swap
    (preTokenBalances && postTokenBalances && 
     new Set(preTokenBalances.map(b => b.mint)).size >= 2 &&
     new Set(postTokenBalances.map(b => b.mint)).size >= 2)
  ) {
    transactionType = TRANSACTION_TYPES.SWAP;
  }
  
  // Check for staking operations
  else if (
    programsUsed.some(p => p.id === KNOWN_PROGRAMS.MARINADE_FINANCE) ||
    logString.includes('stake') || 
    logString.includes('delegate') ||
    // Check for the stake program
    instructions.some(ix => 
      accountKeys[ix.programIdIndex] === 'Stake11111111111111111111111111111111111111'
    )
  ) {
    if (logString.includes('unstake') || logString.includes('withdraw')) {
      transactionType = TRANSACTION_TYPES.UNSTAKE;
    } else {
      transactionType = TRANSACTION_TYPES.STAKE;
    }
  }
  
  // NFT operations
  else if (
    logString.includes('nft') || 
    logString.includes('metadata') ||
    logString.includes('token-metadata') ||
    // Check for metadata program
    instructions.some(ix => 
      accountKeys[ix.programIdIndex] === 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
    )
  ) {
    if (logString.includes('mint') || logString.includes('create')) {
      transactionType = TRANSACTION_TYPES.NFT_MINT;
    } else if (logString.includes('buy') || logString.includes('sale') || logString.includes('purchase')) {
      transactionType = TRANSACTION_TYPES.NFT_PURCHASE;
    } else {
      transactionType = 'NFT Transaction';
    }
  }
  
  // Liquidity provision
  else if (
    logString.includes('liquidity') ||
    logString.includes('pool') ||
    logString.includes('deposit')
  ) {
    transactionType = TRANSACTION_TYPES.LIQUIDITY_PROVISION;
  }
  
  // Token creation
  else if (
    logString.includes('create mint') ||
    logString.includes('token creation') ||
    logString.includes('initialize mint')
  ) {
    transactionType = TRANSACTION_TYPES.TOKEN_CREATE;
  }
  
  // Token mint
  else if (
    logString.includes('mint to') ||
    logString.includes('mint token')
  ) {
    transactionType = TRANSACTION_TYPES.TOKEN_MINT;
  }
  
  // If still unknown but we have token transfers
  else if (links.some(l => l.tokenSymbol)) {
    transactionType = TRANSACTION_TYPES.TRANSFER;
  }
  
  // Identify critical path based on transaction type and instruction flow
  const criticalPath = findCriticalPath(nodes, links, transaction, transactionType, mappedEntities);
  
  // Return the processed data
  return {
    graphData: {
      nodes,
      links,
      programs: programsUsed,
      accounts: accountsInfo.map(a => {
        // Get entity information if available
        const entityInfo = mappedEntities.get(a.id);
        // const entityInfo = entityList?.find((entity: Entity) => entity.address === a.id);
        return {
          ...a,
          label: entityInfo?.name || a.label,
          ...entityInfo
        };
      })
    },
    type: transactionType,
    critical: criticalPath
  };
}

/**
 * Find the critical path based on transaction type and instruction flow
 */
function findCriticalPath(nodes, links, transactionData, transactionType, mappedEntities: Map<string, Entity>) {
  // Get transaction details for analysis
  const { transaction, meta } = transactionData;
  if (!transaction || !meta) return [];
  
  // Extract basic transaction information
  const instructions = transaction.message.instructions || transaction.message.compiledInstructions;
  const accountKeys = transaction.message.accountKeys.map(key => key.toString());
  const innerInstructions = meta.innerInstructions || [];
  const logs = meta.logMessages || [];
  
  // Build a map of accounts for quick lookup
  const accountMap = new Map();
  nodes.forEach(node => {
    accountMap.set(node.id, node);
  });
  
  // Start with an empty critical path
  let criticalPath = [];
  
  // Define a helper function to add account to critical path if it exists
  const addToCriticalPath = (accountId) => {
    if (accountMap.has(accountId) && !criticalPath.some(node => node.id === accountId)) {
      criticalPath.push(accountMap.get(accountId));
    }
  };
  
  // Helper function to extract accounts from an instruction
  const getInstructionAccounts = (instruction) => {
    const programId = accountKeys[instruction.programIdIndex];
    const accounts = instruction.accounts.map(idx => accountKeys[idx]);
    return { programId, accounts };
  };
  
  // Based on transaction type, determine critical path
  switch (transactionType) {
    case 'Transfer': {
      // For simple transfers, the critical path is just sender -> recipient
      // Find the main transfer by looking at SOL or token balances
      
      // Check for SOL transfers first
      for (let i = 0; i < accountKeys.length; i++) {
        const preBal = meta.preBalances[i] || 0;
        const postBal = meta.postBalances[i] || 0;
        const diff = postBal - preBal;
        
        // If this account sent SOL (excluding fee payer)
        if (diff < 0 && i !== 0) {
          addToCriticalPath(accountKeys[i]); // Sender
          
          // Find recipient(s)
          for (let j = 0; j < accountKeys.length; j++) {
            if (i === j) continue;
            
            const receiverDiff = (meta.postBalances[j] || 0) - (meta.preBalances[j] || 0);
            if (receiverDiff > 0) {
              addToCriticalPath(accountKeys[j]); // Recipient
            }
          }
        }
      }
      
      // If no SOL transfers found, check token transfers
      if (criticalPath.length === 0 && meta.preTokenBalances && meta.postTokenBalances) {
        const tokenAccountMap = new Map();
        
        // Map token accounts to pre/post balances
        meta.preTokenBalances.forEach(balance => {
          const tokenAccount = accountKeys[balance.accountIndex];
          tokenAccountMap.set(tokenAccount, {
            owner: balance.owner,
            mint: balance.mint,
            preBal: parseFloat(balance.uiTokenAmount.uiAmountString) || 0,
            postBal: 0
          });
        });
        
        meta.postTokenBalances.forEach(balance => {
          const tokenAccount = accountKeys[balance.accountIndex];
          if (tokenAccountMap.has(tokenAccount)) {
            tokenAccountMap.get(tokenAccount).postBal = parseFloat(balance.uiTokenAmount.uiAmountString) || 0;
          } else {
            tokenAccountMap.set(tokenAccount, {
              owner: balance.owner,
              mint: balance.mint,
              preBal: 0,
              postBal: parseFloat(balance.uiTokenAmount.uiAmountString) || 0
            });
          }
        });
        
        // Find token sender and receiver
        let senderFound = false;
        for (const [tokenAccount, data] of tokenAccountMap.entries()) {
          const diff = data.postBal - data.preBal;
          
          if (diff < 0) {
            // This account sent tokens
            addToCriticalPath(data.owner); // Add token owner (sender)
            senderFound = true;
          } else if (diff > 0 && senderFound) {
            // This account received tokens
            addToCriticalPath(data.owner); // Add token owner (receiver)
          }
        }
      }
      
      // If still empty, fallback to simple fee payer -> first destination
      if (criticalPath.length === 0 && accountKeys.length >= 2) {
        addToCriticalPath(accountKeys[0]); // Fee payer
        addToCriticalPath(accountKeys[1]); // First destination
      }
      
      break;
    }
    
    case 'Swap': {
      // For swaps, critical path: User -> Token Program -> DEX Program -> Token Program -> User
      const userAccount = accountKeys[0]; // Fee payer is typically the user
      
      // Find DEX program in instructions
      let allAMMs: string[] = []
      mappedEntities.forEach((entity: Entity) => {
        if(
            entity.subtype === 'aggregator' ||
            entity.subtype === 'amm' ||
            entity.name?.includes('Swap') ||
            entity.name?.includes('swap')
        ){
            allAMMs.push(entity.address)
        }
      })
      const dexPrograms = [
        KNOWN_PROGRAMS.JUPITER_PROGRAM,
        KNOWN_PROGRAMS.ORCA_WHIRLPOOL,
        KNOWN_PROGRAMS.RAYDIUM_SWAP,,
        ...allAMMs
      ];
      
      // Add user to critical path
      addToCriticalPath(userAccount);
      
      // Add token program
      addToCriticalPath(KNOWN_PROGRAMS.TOKEN_PROGRAM);
      
      // Find and add DEX program
      for (const instruction of instructions) {
        const programId = accountKeys[instruction.programIdIndex];
        if (dexPrograms.includes(programId)) {
          addToCriticalPath(programId);
          break;
        }
      }
      
      // Find accounts that received tokens (destination accounts)
      if (meta.preTokenBalances && meta.postTokenBalances) {
        const tokenAccountMap = new Map();
        
        // Track token balances
        meta.postTokenBalances.forEach(balance => {
          const tokenAccount = accountKeys[balance.accountIndex];
          const preBalanceEntry = meta.preTokenBalances.find(pre => pre.accountIndex === balance.accountIndex);
          const preBal = preBalanceEntry ? parseFloat(preBalanceEntry.uiTokenAmount.uiAmountString) || 0 : 0;
          const postBal = parseFloat(balance.uiTokenAmount.uiAmountString) || 0;
          
          if (postBal > preBal && balance.owner === userAccount) {
            // If user's token balance increased, this is the destination token
            addToCriticalPath(balance.mint); // Add token mint to critical path
          }
        });
      }
      
      // Add user again to complete the path
      if (!criticalPath.includes(userAccount)) {
        addToCriticalPath(userAccount);
      }
      
      break;
    }
    
    case 'Stake':
    case 'Unstake': {
      // For staking operations: User -> System Program -> Stake Program -> Validator
      const userAccount = accountKeys[0]; // Fee payer
      
      // Add user to critical path
      addToCriticalPath(userAccount);
      
      // Add system program
      addToCriticalPath(KNOWN_PROGRAMS.SYSTEM_PROGRAM);
      
      // Look for stake program and validator
      for (const instruction of instructions) {
        const programId = accountKeys[instruction.programIdIndex];
        const accounts = instruction.accounts.map(idx => accountKeys[idx]);
        
        // Add stake program to critical path
        if (programId === 'Stake11111111111111111111111111111111111111') {
          addToCriticalPath(programId);
          
          // Look for validator account (typically one of the last accounts in stake instruction)
          if (accounts.length > 2) {
            const potentialValidator = accounts[accounts.length - 1];
            if (!criticalPath.some(node => node.id === potentialValidator)) {
              addToCriticalPath(potentialValidator);
            }
          }
        }
      }
      
      break;
    }
    
    case 'NFT Mint':
    case 'NFT Purchase': {
      // For NFT operations: User -> Token Program -> Mint -> Metadata Program
      const userAccount = accountKeys[0]; // Fee payer
      
      // Add user to critical path
      addToCriticalPath(userAccount);
      
      // Add token program
      addToCriticalPath(KNOWN_PROGRAMS.TOKEN_PROGRAM);
      
      // Look for mint account and metadata program
      for (const instruction of instructions) {
        const programId = accountKeys[instruction.programIdIndex];
        const accounts = instruction.accounts.map(idx => accountKeys[idx]);
        
        // If token program instruction, find mint account
        if (programId === KNOWN_PROGRAMS.TOKEN_PROGRAM) {
          // Mint account is typically the first or second account in mint instruction
          if (accounts.length > 1) {
            addToCriticalPath(accounts[1]); // Likely mint account
          }
        }
        
        // Add metadata program if present
        if (programId === 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s') {
          addToCriticalPath(programId);
        }
      }
      
      break;
    }
    
    default: {
      // For unknown transaction types, use a heuristic approach
      // 1. Start with fee payer
      const feePayer = accountKeys[0];
      addToCriticalPath(feePayer);
      
      // 2. Add main program(s) involved
      const programIds = new Set();
      instructions.forEach(instruction => {
        programIds.add(accountKeys[instruction.programIdIndex]);
      });
      
      // Filter out common utility programs that are less likely to be the "main" program
      const utilityPrograms = [
        KNOWN_PROGRAMS.SYSTEM_PROGRAM,
        KNOWN_PROGRAMS.ASSOCIATED_TOKEN_PROGRAM
      ];
      
      const mainPrograms = Array.from(programIds)
        .filter(id => !utilityPrograms.includes(id))
        .slice(0, 2); // Limit to 2 main programs to avoid cluttering
      
      mainPrograms.forEach(programId => {
        addToCriticalPath(programId);
      });
      
      // 3. Add accounts with significant balance changes
      const accountBalanceChanges = [];
      
      for (let i = 0; i < accountKeys.length; i++) {
        const preBal = meta.preBalances[i] || 0;
        const postBal = meta.postBalances[i] || 0;
        const change = Math.abs(postBal - preBal);
        
        if (change > 0) {
          accountBalanceChanges.push({
            account: accountKeys[i],
            change
          });
        }
      }
      
      // Sort by largest changes and add top accounts
      accountBalanceChanges
        .sort((a, b) => b.change - a.change)
        .slice(0, 3) // Limit to top 3 accounts by balance change
        .forEach(item => {
          addToCriticalPath(item.account);
        });
    }
  }
  
  // If critical path is too short, add important accounts from transaction
  if (criticalPath.length < 2) {
    // Add the fee payer if not already in the path
    if (!criticalPath.some(node => node.id === accountKeys[0])) {
      addToCriticalPath(accountKeys[0]);
    }
    
    // Add the main program if not already in the path
    if (instructions.length > 0) {
      const mainProgramId = accountKeys[instructions[0].programIdIndex];
      if (!criticalPath.some(node => node.id === mainProgramId)) {
        addToCriticalPath(mainProgramId);
      }
    }
  }
  
  return criticalPath;
}

/**
 * Helper to find entity information
 */
function findEntityInfo(address) {
  if (!entityList) return null;
  return entityList.find((entity: Entity) => entity.address === address);
}