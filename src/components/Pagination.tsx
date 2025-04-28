"use client"

import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isLoading?: boolean;
  showFirstLast?: boolean;
  showPageSizeSelector?: boolean;
  pageSizeOptions?: number[];
  className?: string;
}

// Using React.memo to prevent unnecessary re-renders
const Pagination = memo<PaginationProps>(({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  showFirstLast = true,
  showPageSizeSelector = true,
  pageSizeOptions = [10, 20, 50, 100],
  className = ''
}) => {
  // Calculate the start and end item numbers for the current page
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && !isLoading && newPage !== currentPage) {
      onPageChange(newPage);
    }
  };

  // Handle page size change
  const handlePageSizeChange = (newSize: string) => {
    if (!isLoading && parseInt(newSize) !== pageSize) {
      onPageSizeChange(parseInt(newSize));
    }
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {showPageSizeSelector && (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            Rows per page:
          </span>
          <Select 
            value={pageSize.toString()} 
            onValueChange={handlePageSizeChange}
            disabled={isLoading}
          >
            <SelectTrigger className="h-8 w-20">
              <SelectValue placeholder={pageSize.toString()} />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map(size => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          {totalItems > 0 ? (
            <>
              {startItem}-{endItem} of {totalItems}
            </>
          ) : (
            '0 of 0'
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {showFirstLast && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1 || isLoading || totalPages === 0}
              className="px-2"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              First
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || isLoading || totalPages === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="text-sm mx-2">
            Page {totalPages === 0 ? 0 : currentPage} of {totalPages || 1}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isLoading || totalPages === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          {showFirstLast && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage >= totalPages || isLoading || totalPages === 0}
              className="px-2"
            >
              Last
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

Pagination.displayName = 'Pagination';

export default Pagination;