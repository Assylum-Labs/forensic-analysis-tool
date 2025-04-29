"use client"

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import WalletAnalyzer from '@/components/WalletAnalyzer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { formatAddress } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { 
  Network,
  Clock, 
  DollarSign,
  Building,
  Wallet as WalletIcon,
  ArrowLeftRight,
  Coins,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

// Define interfaces for type safety
interface AnalysisData {
  stats: {
    totalTransactions: number;
    uniqueAddresses: number;
  };
  graphData: {
    nodes: Array<{
      id: string;
      verified: boolean;
    }>;
  };
}

interface StatCardProps {
  title: string;
  value: string | number;
  label: string;
  icon: React.ReactNode;
}

export default function WalletAnalysisPage() {
  const { wallet } = useParams<{wallet: string}>();
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState('');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [viewMode, setViewMode] = useState<'wallet' | 'token'>('wallet');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  });
  const [endDate, setEndDate] = useState(new Date());
  const [dateRangeApplied, setDateRangeApplied] = useState(false);

  useEffect(() => {
    if (wallet) {
      validateAddress(wallet);
      setWalletAddress(wallet);
    }
  }, [wallet]);

  const handleAddressInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value;
    setWalletAddress(address);
    validateAddress(address);
  };

  const handleSubmitAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidAddress && walletAddress) {
      router.push(`/wallet-analysis/${walletAddress}`);
    } else {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid Solana wallet address",
        variant: "destructive"
      });
    }
  };

  const validateAddress = (address: string) => {
    if (!address) return setIsValidAddress(false);

    if (address.length === 44 || address.length === 32) {
      setIsValidAddress(true);
    } else {
      setIsValidAddress(false);
    }
  };

  const handleAnalysisComplete = (data: any) => {
    setAnalysisData(data);
    setIsLoading(false);
    
    toast({
      title: "Analysis Complete",
      description: `Found ${data.stats.uniqueAddresses} connected addresses with ${data.stats.totalTransactions} transactions`
    });
  };

  const handleViewModeChange = (value: string) => {
    setViewMode(value as 'wallet' | 'token');
  };

  const handleApplyDateRange = () => {
    setDateRangeApplied(true);
    setAnalysisData(null);
    setIsLoading(true);
    
    // Track that we're applying a new date range
    toast({
      title: "Updating Analysis",
      description: `Analyzing transactions from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
    });
  };

  const handleResetDateRange = () => {
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    
    setStartDate(oneMonthAgo);
    setEndDate(now);
    setDateRangeApplied(true);
    setAnalysisData(null);
    setIsLoading(true);
    
    toast({
      title: "Reset Date Range",
      description: "Analyzing transactions from the last month"
    });
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
          
          <form onSubmit={handleSubmitAddress} className="mt-4 flex gap-2">
            <Input
              placeholder="Enter Solana wallet address"
              value={walletAddress}
              onChange={handleAddressInput}
              className={`flex-1 ${
                walletAddress && !isValidAddress ? 'border-red-500' : ''
              }`}
            />
            <Button type="submit" disabled={!isValidAddress || !walletAddress}>
              Analyze
            </Button>
          </form>

          {/* Date Range Filter */}
          {isValidAddress && (
            <div className="mt-4 flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-sm text-muted-foreground">Date Range</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <DatePicker
                      selected={startDate}
                      onChange={(date: Date | null) => date && setStartDate(date)}
                      selectsStart
                      startDate={startDate}
                      endDate={endDate}
                      maxDate={endDate}
                      className="w-full pl-10 bg-transparent border border-input h-10 rounded-md px-3 py-2"
                    />
                  </div>
                  <span className="flex items-center text-muted-foreground">to</span>
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <DatePicker
                      selected={endDate}
                      onChange={(date: Date | null) => date && setEndDate(date)}
                      selectsEnd
                      startDate={startDate}
                      endDate={endDate}
                      minDate={startDate}
                      maxDate={new Date()}
                      className="w-full pl-10 bg-transparent border border-input h-10 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  onClick={handleApplyDateRange}
                  variant="outline"
                >
                  Apply Range
                </Button>
                <Button 
                  type="button" 
                  onClick={handleResetDateRange}
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset to 1 Month
                </Button>
              </div>
            </div>
          )}
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
                title="Date Range"
                value={`${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`}
                label="period analyzed"
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
                startDate={startDate}
                endDate={endDate}
                forceRefresh={dateRangeApplied}
                onDataProcessed={handleAnalysisComplete}
                setIsLoading={setIsLoading}
                isLoading={isLoading}
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

const StatCard = ({ title, value, label, icon }: StatCardProps) => (
  <div className="bg-card rounded-md p-4 border border-border">
    <div className="flex justify-between">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="h-4 w-4">
        {icon}
      </div>
    </div>
    <div className="mt-2">
      <div className={`${title === "Date Range" ? "text-lg" : "text-2xl"} font-bold whitespace-normal break-words`}>{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  </div>
);