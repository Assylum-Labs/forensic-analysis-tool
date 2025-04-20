import Link from 'next/link'
import { ArrowRightIcon, BarChart, Network, Search, Wallet } from 'lucide-react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="grid gap-6">
          <h1 className="text-3xl font-bold">Solana Forensics Dashboard</h1>
          
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <DashboardCard
              title="Transaction Flow"
              description="Visualize fund movements between wallets with interactive flow charts"
              icon={<Network className="h-10 w-10" />}
              href="/transaction-flow"
              color="bg-gradient-to-br from-solana-purple to-solana-blue"
            />
            
            <DashboardCard
              title="Wallet Analysis"
              description="Track funding sources and analyze complete history of wallets"
              icon={<Wallet className="h-10 w-10" />}
              href="/wallet-analysis"
              color="bg-gradient-to-br from-solana-blue to-solana-green"
            />
            
            <DashboardCard
              title="Transaction Clustering"
              description="Group related transactions and identify associated wallets"
              icon={<BarChart className="h-10 w-10" />}
              href="/transaction-clustering"
              color="bg-gradient-to-br from-solana-green to-solana-deepBlue"
            />
            
            <DashboardCard
              title="Search Tools"
              description="Find and explore transactions, wallets, and tokens"
              icon={<Search className="h-10 w-10" />}
              href="/search"
              color="bg-gradient-to-br from-solana-deepBlue to-solana-purple"
            />
          </div>
          
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-xl font-semibold mb-3">Recent Activity</h2>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between items-center border-b border-border pb-3">
                    <div>
                      <div className="text-sm font-medium">Transaction #{i}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date().toLocaleDateString()} • {new Date().toLocaleTimeString()}
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      View
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Link 
                  href="/transactions"
                  className="text-sm text-primary flex items-center gap-1 hover:underline"
                >
                  View all transactions <ArrowRightIcon className="h-3 w-3" />
                </Link>
              </div>
            </div>
            
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-xl font-semibold mb-3">Saved Reports</h2>
              <div className="space-y-4">
                {['Whale Activity Report', 'Exchange Flows', 'Unusual Transactions'].map((report, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-border pb-3">
                    <div>
                      <div className="text-sm font-medium">{report}</div>
                      <div className="text-xs text-muted-foreground">
                        Last updated: {new Date().toLocaleDateString()}
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Open
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Link 
                  href="/reports"
                  className="text-sm text-primary flex items-center gap-1 hover:underline"
                >
                  View all reports <ArrowRightIcon className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

interface DashboardCardProps {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  color: string
}

function DashboardCard({ title, description, icon, href, color }: DashboardCardProps) {
  return (
    <Link href={href}>
      <div className="group relative overflow-hidden rounded-lg border border-border bg-card p-6 hover:border-primary/50 transition-colors">
        <div className="flex flex-col gap-3">
          <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full ${color} opacity-20 group-hover:opacity-30 transition-opacity`} />
          <div className={`relative rounded-full p-2 w-fit ${color} text-white`}>
            {icon}
          </div>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="mt-1 flex items-center gap-1 text-sm text-primary">
            <span>Explore</span>
            <ArrowRightIcon className="h-3 w-3" />
          </div>
        </div>
      </div>
    </Link>
  )
}