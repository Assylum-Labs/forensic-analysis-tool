"use client"

import React, { useState, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePathname } from 'next/navigation'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  
  // Close sidebar when pathname changes (i.e., when navigating to a new page)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Mobile sidebar overlay */}
      <div 
        className={`fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-opacity duration-300 ease-in-out ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } md:hidden`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-all duration-300 ease-in-out md:hidden ${
          sidebarOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full'
        }`}
      >
        <div className={`absolute right-0 top-0 -mr-10 pt-4 transition-opacity duration-300 ease-in-out ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <button
            className="ml-1 flex h-10 w-10 items-center justify-center rounded-full bg-card text-foreground focus:outline-none shadow-md"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-6 w-6" />
            <span className="sr-only">Close sidebar</span>
          </button>
        </div>
        <Sidebar mobile={true} />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:block md:w-64">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header>
          <Button
            variant="ghost"
            size="icon"
            className="mr-4 md:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </Header>
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}