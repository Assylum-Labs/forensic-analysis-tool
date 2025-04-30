"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  BarChart, 
  Network, 
  Search, 
  Wallet, 
  Building, 
  Settings,
  Fingerprint,
  LineChart,
  Home,
  ArrowLeftRight
} from 'lucide-react'

interface SidebarProps {
  mobile?: boolean;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Transaction Analysis', href: '/transaction-analysis', icon: ArrowLeftRight },
  { name: 'Wallet Analysis', href: '/wallet-analysis', icon: Wallet },
  { name: 'Transaction Clustering', href: '/transaction-clustering', icon: BarChart },
  { name: 'Entity Labeling', href: '/entity-labeling', icon: Building },
]

export function Sidebar({ mobile }: SidebarProps = {}) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-card border-r border-[#333]">
      <div className="flex flex-col gap-y-5 overflow-y-auto p-4 md:px-6">
        <div className="flex h-14 md:h-16 shrink-0 items-center">
          <div className="flex items-center gap-2">
            <Network className="h-8 w-8 text-primary" />
            <span className="text-lg font-bold bg-gradient-to-r from-solana-purple to-solana-blue bg-clip-text text-transparent">
              Solana Forensics
            </span>
          </div>
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <div className="text-xs font-semibold text-muted-foreground">Main</div>
              <ul role="list" className="mt-2 space-y-1">
                {navigation.map((item) => (
                  <li key={item.name}>
                    <Link
                      prefetch={true}
                      href={item.href}
                      className={cn(
                        pathname === item.href
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6'
                      )}
                      onClick={mobile ? () => document.body.classList.remove('sidebar-open') : undefined}
                    >
                      <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  )
}