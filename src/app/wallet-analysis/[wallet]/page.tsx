// "use client"

// import { useState } from 'react'
// import { DashboardLayout } from '@/components/layouts/DashboardLayout'
// import { Button } from '@/components/ui/button'
// import { Input } from '@/components/ui/input'
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// import { useToast } from '@/components/ui/use-toast'
// import { formatAddress, formatAmount } from '@/lib/utils'
// import { 
//   Download,
//   ExternalLink,
//   Filter,
//   HelpCircle,
//   Search,
//   Star,
//   Clock,
//   DollarSign,
//   Building,
//   Wallet,
//   ArrowLeftRight
// } from 'lucide-react'

// export default function WalletAnalysisPage() {
//   const [walletAddress, setWalletAddress] = useState('')
//   const [isLoading, setIsLoading] = useState(false)
//   const { toast } = useToast()

//   const handleAnalyze = () => {
//     if (!walletAddress) {
//       toast({
//         title: "Error",
//         description: "Please enter a wallet address",
//         variant: "destructive"
//       })
//       return
//     }

//     setIsLoading(true)
//     // Simulate API call
//     setTimeout(() => {
//       toast({
//         title: "Analysis Complete",
//         description: `Wallet analysis for ${formatAddress(walletAddress)} is ready`
//       })
//       setIsLoading(false)
//     }, 1500)
//   }

//   return (
//     <DashboardLayout>
//       <div className="h-full flex flex-col">
//         <div className="border-b border-border p-4">
//           <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
//             <div className="space-y-1">
//               <h1 className="text-2xl font-bold">Wallet Analysis</h1>
//               <p className="text-sm text-muted-foreground">
//                 Track funding sources and analyze complete history of wallets
//               </p>
//             </div>
//             <div className="flex items-center gap-2">
//               <Button variant="outline" size="sm">
//                 <HelpCircle className="mr-2 h-4 w-4" />
//                 Help
//               </Button>
//               <Button variant="outline" size="sm">
//                 <Filter className="mr-2 h-4 w-4" />
//                 Filters
//               </Button>
//               <Button variant="outline" size="sm">
//                 <Download className="mr-2 h-4 w-4" />
//                 Export
//               </Button>
//             </div>
//           </div>
          
//           <div className="mt-4 flex gap-2">
//             <Input
//               placeholder="Enter wallet address"
//               value={walletAddress}
//               onChange={(e) => setWalletAddress(e.target.value)}
//               className="flex-1"
//             />
//             <Button onClick={handleAnalyze} disabled={isLoading}>
//               {isLoading ? "Analyzing..." : "Analyze"}
//             </Button>
//           </div>
//         </div>

//         {/* Wallet Overview Card */}
//         <div className="p-4 border-b border-border">
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//             <div className="bg-card rounded-md p-4 border border-border">
//               <div className="flex justify-between">
//                 <h3 className="text-sm font-medium text-muted-foreground">Total Balance</h3>
//                 <DollarSign className="h-4 w-4 text-solana-green" />
//               </div>
//               <div className="mt-2 flex items-baseline">
//                 <span className="text-2xl font-bold">2,453.21</span>
//                 <span className="ml-1 text-sm text-muted-foreground">SOL</span>
//               </div>
//               <div className="mt-1 text-xs text-green-500">+12.5% (24h)</div>
//             </div>
            
//             <div className="bg-card rounded-md p-4 border border-border">
//               <div className="flex justify-between">
//                 <h3 className="text-sm font-medium text-muted-foreground">Transactions</h3>
//                 <ArrowLeftRight className="h-4 w-4 text-solana-blue" />
//               </div>
//               <div className="mt-2 flex items-baseline">
//                 <span className="text-2xl font-bold">428</span>
//                 <span className="ml-1 text-sm text-muted-foreground">total</span>
//               </div>
//               <div className="mt-1 text-xs">Last: 2 hours ago</div>
//             </div>
            
//             <div className="bg-card rounded-md p-4 border border-border">
//               <div className="flex justify-between">
//                 <h3 className="text-sm font-medium text-muted-foreground">First Activity</h3>
//                 <Clock className="h-4 w-4 text-solana-purple" />
//               </div>
//               <div className="mt-2">
//                 <span className="text-lg font-bold">Jan 12, 2024</span>
//               </div>
//               <div className="mt-1 text-xs">Active for 98 days</div>
//             </div>
            
//             <div className="bg-card rounded-md p-4 border border-border">
//               <div className="flex justify-between">
//                 <h3 className="text-sm font-medium text-muted-foreground">Known Entity</h3>
//                 <Building className="h-4 w-4 text-accent" />
//               </div>
//               <div className="mt-2">
//                 <span className="text-lg font-bold">Unknown</span>
//               </div>
//               <div className="mt-1 text-xs flex items-center">
//                 <Button variant="ghost" size="sm" className="h-5 px-2 text-xs">
//                   <Star className="h-3 w-3 mr-1" /> Add Label
//                 </Button>
//               </div>
//             </div>
//           </div>
//         </div>

//         <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
//           <Tabs defaultValue="activity" className="w-full h-full flex flex-col">
//             <TabsList>
//               <TabsTrigger value="activity">Activity History</TabsTrigger>
//               <TabsTrigger value="sources">Funding Sources</TabsTrigger>
//               <TabsTrigger value="connections">Wallet Connections</TabsTrigger>
//               <TabsTrigger value="tokens">Token Holdings</TabsTrigger>
//             </TabsList>
            
//             <TabsContent value="activity" className="flex-1 overflow-auto">
//               <div className="rounded-md border border-border">
//                 <div className="p-4 border-b border-border flex items-center justify-between">
//                   <h3 className="font-medium">Transaction History</h3>
//                   <div className="relative w-64">
//                     <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
//                       <Search className="h-4 w-4 text-muted-foreground" />
//                     </div>
//                     <Input className="pl-10" placeholder="Search transactions" />
//                   </div>
//                 </div>
//                 <div className="overflow-x-auto">
//                   <table className="w-full">
//                     <thead>
//                       <tr className="border-b border-border bg-muted/50">
//                         <th className="px-4 py-3 text-left text-sm font-medium">Transaction ID</th>
//                         <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
//                         <th className="px-4 py-3 text-left text-sm font-medium">From/To</th>
//                         <th className="px-4 py-3 text-left text-sm font-medium">Amount</th>
//                         <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
//                         <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-border">
//                       {Array.from({ length: 10 }).map((_, i) => (
//                         <tr key={i} className="hover:bg-muted/50">
//                           <td className="px-4 py-3 text-sm">{formatAddress(`tx${i}abcdef1234567890`, 8)}</td>
//                           <td className="px-4 py-3 text-sm">
//                             <span className={`px-2 py-1 rounded text-xs ${i % 2 === 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
//                               {i % 2 === 0 ? 'Received' : 'Sent'}
//                             </span>
//                           </td>
//                           <td className="px-4 py-3 text-sm">{formatAddress(`wallet${i}abcdef`)}</td>
//                           <td className="px-4 py-3 text-sm">{formatAmount(Math.random() * 100)} SOL</td>
//                           <td className="px-4 py-3 text-sm">{new Date().toLocaleDateString()}</td>
//                           <td className="px-4 py-3 text-sm text-right">
//                             <Button size="sm" variant="ghost">
//                               <ExternalLink className="h-4 w-4" />
//                             </Button>
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>
//             </TabsContent>
            
//             <TabsContent value="sources" className="flex-1 overflow-auto">
//               <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
//                 <div className="rounded-md border border-border p-4">
//                   <h3 className="font-medium mb-4">Funding Sources</h3>
//                   <div className="h-64 flex items-center justify-center bg-muted/20 rounded mb-4">
//                     [Funding Sources Chart Placeholder]
//                   </div>
//                   <div>
//                     <h4 className="text-sm font-medium mb-2">Top Sources</h4>
//                     <ul className="space-y-2">
//                       {Array.from({ length: 5 }).map((_, i) => (
//                         <li key={i} className="flex justify-between items-center p-2 rounded hover:bg-muted/50">
//                           <div className="flex items-center">
//                             <div className="h-8 w-8 rounded-full bg-gradient-to-br from-solana-purple to-solana-blue flex items-center justify-center text-white font-medium mr-3">
//                               {i + 1}
//                             </div>
//                             <div>
//                               <div className="font-medium">{formatAddress(`wallet${i}source`, 6)}</div>
//                               <div className="text-xs text-muted-foreground">
//                                 {i === 0 ? 'Exchange' : i === 1 ? 'DEX' : 'Unknown'}
//                               </div>
//                             </div>
//                           </div>
//                           <div className="text-right">
//                             <div className="font-medium">{formatAmount((10 - i) * 200)} SOL</div>
//                             <div className="text-xs text-muted-foreground">{5 - i} transactions</div>
//                           </div>
//                         </li>
//                       ))}
//                     </ul>
//                   </div>
//                 </div>
                
//                 <div className="rounded-md border border-border p-4">
//                   <h3 className="font-medium mb-4">Funding Flow</h3>
//                   <div className="h-80 flex items-center justify-center bg-muted/20 rounded">
//                     [Funding Flow Chart Placeholder]
//                   </div>
//                   <div className="mt-4">
//                     <div className="flex justify-between items-center mb-2">
//                       <h4 className="text-sm font-medium">Origin of Funds</h4>
//                       <Button variant="outline" size="sm">View Full Chain</Button>
//                     </div>
//                     <div className="p-3 rounded bg-muted/20 text-sm">
//                       <p>Funds originated from multiple sources:</p>
//                       <ul className="mt-2 space-y-1 list-disc list-inside">
//                         <li>45% from known exchanges</li>
//                         <li>30% from DEX protocols</li>
//                         <li>25% from unknown sources</li>
//                       </ul>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </TabsContent>
            
//             <TabsContent value="connections" className="flex-1 overflow-auto">
//               <div className="rounded-md border border-border overflow-hidden">
//                 <div className="p-4 border-b border-border">
//                   <h3 className="font-medium">Connected Wallets Network</h3>
//                   <p className="text-sm text-muted-foreground mt-1">
//                     Explore wallets connected through direct transactions
//                   </p>
//                 </div>
//                 <div className="h-96 p-4">
//                   <div className="h-full border border-border rounded-md overflow-hidden">
//                     <div className="h-full">
//                       {/* We'll use the Force Directed Graph component here */}
//                       <div className="h-full flex items-center justify-center bg-solana-dark">
//                         [Wallet Connections Graph Placeholder]
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//                 <div className="p-4 border-t border-border">
//                   <h4 className="text-sm font-medium mb-2">Top Connected Wallets</h4>
//                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                     {Array.from({ length: 6 }).map((_, i) => (
//                       <div key={i} className="flex items-center p-3 rounded-md border border-border">
//                         <Wallet className="h-8 w-8 mr-3 text-solana-blue" />
//                         <div>
//                           <div className="font-medium">{formatAddress(`wallet${i}connected`, 6)}</div>
//                           <div className="text-xs text-muted-foreground">
//                             {10 - i} transactions • {formatAmount((10 - i) * 50)} SOL
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               </div>
//             </TabsContent>
            
//             <TabsContent value="tokens" className="flex-1 overflow-auto">
//               <div className="rounded-md border border-border">
//                 <div className="p-4 border-b border-border">
//                   <h3 className="font-medium">Token Holdings</h3>
//                   <p className="text-sm text-muted-foreground mt-1">
//                     Current tokens and NFTs held by this wallet
//                   </p>
//                 </div>
//                 <div className="overflow-x-auto">
//                   <table className="w-full">
//                     <thead>
//                       <tr className="border-b border-border bg-muted/50">
//                         <th className="px-4 py-3 text-left text-sm font-medium">Token</th>
//                         <th className="px-4 py-3 text-left text-sm font-medium">Balance</th>
//                         <th className="px-4 py-3 text-left text-sm font-medium">Value (USD)</th>
//                         <th className="px-4 py-3 text-left text-sm font-medium">Last Activity</th>
//                         <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-border">
//                       {['SOL', 'USDC', 'RAY', 'BONK', 'SAMO', 'mSOL'].map((token, i) => (
//                         <tr key={i} className="hover:bg-muted/50">
//                           <td className="px-4 py-3">
//                             <div className="flex items-center">
//                               <div className="h-8 w-8 rounded-full bg-gradient-to-br from-solana-purple to-solana-blue mr-3"></div>
//                               <div>
//                                 <div className="font-medium">{token}</div>
//                                 <div className="text-xs text-muted-foreground">
//                                   {token === 'SOL' ? 'Solana' : token === 'USDC' ? 'USD Coin' : 'Token'}
//                                 </div>
//                               </div>
//                             </div>
//                           </td>
//                           <td className="px-4 py-3">
//                             {token === 'SOL' 
//                               ? formatAmount(Math.random() * 100)
//                               : token === 'USDC' 
//                                 ? formatAmount(Math.random() * 10000)
//                                 : formatAmount(Math.random() * 1000000)}
//                           </td>
//                           <td className="px-4 py-3">
//                             ${formatAmount(Math.random() * 5000)}
//                           </td>
//                           <td className="px-4 py-3 text-sm">
//                             {new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
//                           </td>
//                           <td className="px-4 py-3 text-sm text-right">
//                             <Button size="sm" variant="outline">History</Button>
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>
//             </TabsContent>
//           </Tabs>
//         </div>
//       </div>
//     </DashboardLayout>
//   )
// }


// --------------------------------------------------

// "use client"

// import { useState } from 'react';
// import { DashboardLayout } from '@/components/layouts/DashboardLayout';
// import WalletAnalyzer from '@/components/WalletAnalyzer';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { useToast } from '@/components/ui/use-toast';
// import { formatAddress, formatAmount } from '@/lib/utils';
// import { 
//   Network,
//   Clock, 
//   DollarSign,
//   Building,
//   Wallet as WalletIcon,
//   ArrowLeftRight
// } from 'lucide-react';

// export default function WalletAnalysisPage() {
//   const [walletAddress, setWalletAddress] = useState('');
//   const [analysisData, setAnalysisData] = useState(null);
//   const [isValidAddress, setIsValidAddress] = useState(false);
//   const { toast } = useToast();

//   const handleAddressInput = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const address = e.target.value;
//     setWalletAddress(address);
//     try {
//       // Basic Solana address validation
//       setIsValidAddress(address.length === 44 || address.length === 32);
//     } catch {
//       setIsValidAddress(false);
//     }
//   };

//   const handleAnalysisComplete = (data: any) => {
//     setAnalysisData(data);
    
//     // Show success toast with summary
//     toast({
//       title: "Analysis Complete",
//       description: `Found ${data.stats.uniqueAddresses} connected addresses with ${data.stats.totalTransactions} transactions`
//     });
//   };

//   return (
//     <DashboardLayout>
//       <div className="h-full flex flex-col">
//         {/* Header Section */}
//         <div className="border-b border-border p-4">
//           <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
//             <div className="space-y-1">
//               <h1 className="text-2xl font-bold">Wallet Analysis</h1>
//               <p className="text-sm text-muted-foreground">
//                 Analyze wallet interactions and identify connected entities
//               </p>
//             </div>
//           </div>
          
//           <div className="mt-4 flex gap-2">
//             <Input
//               placeholder="Enter Solana wallet address"
//               value={walletAddress}
//               onChange={handleAddressInput}
//               className={`flex-1 ${
//                 walletAddress && !isValidAddress ? 'border-red-500' : ''
//               }`}
//             />
//           </div>
//         </div>

//         {/* Stats Cards */}
//         {analysisData && (
//           <div className="p-4 border-b border-border">
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//               <StatCard
//                 title="Network Activity"
//                 value={analysisData.stats.totalTransactions}
//                 label="transactions"
//                 icon={<Network className="text-solana-purple" />}
//               />
//               <StatCard
//                 title="Connected Addresses"
//                 value={analysisData.stats.uniqueAddresses}
//                 label="unique addresses"
//                 icon={<WalletIcon className="text-solana-blue" />}
//               />
//               <StatCard
//                 title="Known Entities"
//                 value={analysisData.graphData.nodes.filter(n => n.verified).length}
//                 label="verified entities"
//                 icon={<Building className="text-solana-green" />}
//               />
//               <StatCard
//                 title="Active Since"
//                 value={new Date(analysisData.stats.timespan.start * 1000)
//                   .toLocaleDateString()}
//                 label="first transaction"
//                 icon={<Clock className="text-accent" />}
//               />
//             </div>
//           </div>
//         )}

//         {/* Main Content */}
//         <div className="flex-1 p-4">
//           {isValidAddress ? (
//             <div className="h-full border border-border rounded-lg overflow-hidden">
//               <WalletAnalyzer 
//                 address={walletAddress}
//                 onDataProcessed={handleAnalysisComplete}
//               />
//             </div>
//           ) : (
//             <div className="h-full flex items-center justify-center border border-border rounded-lg">
//               <div className="text-center text-muted-foreground">
//                 <Network className="h-12 w-12 mx-auto mb-4" />
//                 <p>Enter a valid Solana wallet address to start analysis</p>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </DashboardLayout>
//   );
// }

// const StatCard = ({ title, value, label, icon }) => (
//   <div className="bg-card rounded-md p-4 border border-border">
//     <div className="flex justify-between">
//       <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
//       <div className="h-4 w-4">
//         {icon}
//       </div>
//     </div>
//     <div className="mt-2 flex items-baseline">
//       <span className="text-2xl font-bold">{value}</span>
//       <span className="ml-1 text-sm text-muted-foreground">{label}</span>
//     </div>
//   </div>
// );


// -------------------------------------------------------------------------

"use client"

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import WalletAnalyzer from '@/components/WalletAnalyzer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { formatAddress } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Network,
  Clock, 
  DollarSign,
  Building,
  Wallet as WalletIcon,
  ArrowLeftRight,
  Coins
} from 'lucide-react';
import { useParams } from 'next/navigation';

export default function WalletAnalysisPage() {
  const { wallet } = useParams<{wallet: string}>()
  const [walletAddress, setWalletAddress] = useState('');
  const [analysisData, setAnalysisData] = useState(null);
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [viewMode, setViewMode] = useState('wallet'); // 'wallet' or 'token'
  const { toast } = useToast();

  useEffect(() => {
    console.log(wallet);
    
    if(wallet){
      validateAddress(wallet)
      setWalletAddress(wallet)
    }
  },[wallet])

  const handleAddressInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value;
    setWalletAddress(address);
    validateAddress()
  };

  const validateAddress = (address: string) => {
    if (!address) return setIsValidAddress(false)

    if(address.length === 44 || address.length === 32){
      setIsValidAddress(true)
    } else {
      setIsValidAddress(false)
    }
  }

  const handleAnalysisComplete = (data: any) => {
    setAnalysisData(data);

    console.log('data', data);
    
    
    // Show success toast with summary
    toast({
      title: "Analysis Complete",
      description: `Found ${data.stats.uniqueAddresses} connected addresses with ${data.stats.totalTransactions} transactions`
    });
  };

  const handleViewModeChange = (value: string) => {
    setViewMode(value);
  };

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        {/* Header Section */}
        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">Wallet Analysis</h1>
              <p className="text-sm text-muted-foreground">
                Analyze wallet interactions and identify connected entities
              </p>
            </div>
          </div>
          
          <div className="mt-4 flex gap-2">
            <Input
              placeholder="Enter Solana wallet address"
              value={walletAddress}
              onChange={handleAddressInput}
              className={`flex-1 ${
                walletAddress && !isValidAddress ? 'border-red-500' : ''
              }`}
            />
          </div>
        </div>

        {/* Stats Cards */}
        {analysisData && (
          <div className="p-4 border-b border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Network Activity"
                value={analysisData.stats.totalTransactions}
                label="transactions"
                icon={<Network className="text-solana-purple" />}
              />
              <StatCard
                title="Connected Addresses"
                value={analysisData.stats.uniqueAddresses}
                label="unique addresses"
                icon={<WalletIcon className="text-solana-blue" />}
              />
              <StatCard
                title="Known Entities"
                value={analysisData.graphData.nodes.filter(n => n.verified).length}
                label="verified entities"
                icon={<Building className="text-solana-green" />}
              />
              <StatCard
                title="Active Since"
                value={new Date(analysisData.stats.timespan.start * 1000)
                  .toLocaleDateString()}
                label="first transaction"
                icon={<Clock className="text-accent" />}
              />
            </div>
          </div>
        )}

        {/* View Mode Selector */}
        {isValidAddress && (
          <div className="px-4 pt-4">
            <Tabs 
              value={viewMode} 
              onValueChange={handleViewModeChange}
              className="w-full mb-4"
            >
              <TabsList>
                <TabsTrigger value="wallet">
                  <WalletIcon className="h-4 w-4 mr-2" />
                  Wallet View
                </TabsTrigger>
                <TabsTrigger value="token">
                  <Coins className="h-4 w-4 mr-2" />
                  Token View
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 px-4 pb-4">
          {isValidAddress ? (
            <div className="h-full border border-border rounded-lg overflow-hidden">
              <WalletAnalyzer 
                address={walletAddress}
                viewMode={viewMode}
                onDataProcessed={handleAnalysisComplete}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center border border-border rounded-lg">
              <div className="text-center text-muted-foreground">
                <Network className="h-12 w-12 mx-auto mb-4" />
                <p>Enter a valid Solana wallet address to start analysis</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

const StatCard = ({ title, value, label, icon }) => (
  <div className="bg-card rounded-md p-4 border border-border">
    <div className="flex justify-between">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="h-4 w-4">
        {icon}
      </div>
    </div>
    <div className="mt-2 flex items-baseline">
      <span className="text-2xl font-bold">{value}</span>
      <span className="ml-1 text-sm text-muted-foreground">{label}</span>
    </div>
  </div>
);