"use client"

import { useState } from 'react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { 
  Download,
  Upload,
  HelpCircle,
  Search,
  Plus,
  Building
} from 'lucide-react'
import EntityList from '@/components/entity/EntityList'
import EntityForm from '@/components/entity/EntityForm'
import ExchangeDetectionPanel from '@/components/entity/ExchangeDetectionPanel'
import PatternDetectionPanel from '@/components/entity/PatternDetectionPanel'
import CustomLabelsPanel from '@/components/entity/CustomLabelsPanel'

export default function EntityLabelingPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showAddEntityForm, setShowAddEntityForm] = useState(false)
  const { toast } = useToast()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery) {
      toast({
        title: "Error",
        description: "Please enter a search query",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Search Complete",
        description: `Results for "${searchQuery}"`
      })
      setIsLoading(false)
    }, 1000)
  }

  const handleAddEntity = () => {
    setShowAddEntityForm(true);
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">Entity and Exchange Labeling</h1>
              <p className="text-sm text-muted-foreground">
                Identify and label exchanges, projects, and entities in the Solana ecosystem
              </p>
            </div>
            {/* <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <HelpCircle className="mr-2 h-4 w-4" />
                Help
              </Button>
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div> */}
          </div>
          
          {/* <form onSubmit={handleSearch} className="mt-4 flex gap-2">
            <Input
              placeholder="Search entity, wallet address or label"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Searching..." : "Search"}
            </Button>
          </form> */}
        </div>

        <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
          <Tabs defaultValue="entities" className="w-full h-full flex flex-col">
            <TabsList>
              <TabsTrigger value="entities">Known Entities</TabsTrigger>
              <TabsTrigger value="exchanges">Exchanges</TabsTrigger>
              {/* <TabsTrigger value="labels">Custom Labels</TabsTrigger>
              <TabsTrigger value="detection">Pattern Detection</TabsTrigger> */}
            </TabsList>
            
            <TabsContent value="entities" className="flex-1 overflow-auto">
              <EntityList onAddEntity={handleAddEntity} className="h-auto" />
            </TabsContent>
            
            <TabsContent value="exchanges" className="flex-1 overflow-auto">
              <ExchangeDetectionPanel />
            </TabsContent>
            
            {/* <TabsContent value="labels" className="flex-1 overflow-auto">
              <CustomLabelsPanel />
            </TabsContent>
            
            <TabsContent value="detection" className="flex-1 overflow-auto">
              <PatternDetectionPanel />
            </TabsContent> */}
          </Tabs>
        </div>
      </div>

      {showAddEntityForm && (
        <EntityForm 
          open={showAddEntityForm} 
          onOpenChange={setShowAddEntityForm} 
          mode="create" 
        />
      )}
    </DashboardLayout>
  )
}