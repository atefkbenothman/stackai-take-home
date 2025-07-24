"use client"

import { useState, useCallback } from "react"
import { ArrowUpDown, Check, Search, X, ListFilter } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { SortOption } from "@/lib/utils"

interface SearchSectionProps {
  searchQuery: string
  onSearchChange: (query: string) => void
}

function SearchSection({ searchQuery, onSearchChange }: SearchSectionProps) {
  const handleClearSearch = useCallback(() => {
    onSearchChange("")
  }, [onSearchChange])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value)
    },
    [onSearchChange],
  )

  return (
    <div className="relative w-48">
      <Search
        size={14}
        className="absolute top-1/2 left-2 -translate-y-1/2 transform text-gray-400"
      />
      <Input
        value={searchQuery}
        onChange={handleInputChange}
        placeholder="Search files..."
        className="h-7 rounded-xs border-gray-300 bg-white pr-8 pl-7 text-xs focus-visible:border-gray-400 focus-visible:ring-gray-400/20"
      />
      {searchQuery && (
        <Button
          onClick={handleClearSearch}
          variant="ghost"
          size="sm"
          className="absolute top-1/2 right-1 h-5 w-5 -translate-y-1/2 transform p-0 hover:bg-gray-200"
        >
          <X size={10} className="text-gray-400" />
        </Button>
      )}
    </div>
  )
}

interface FilterSectionProps {
  filterExtension: string
  onFilterChange: (extension: string) => void
}

function FilterSection({
  filterExtension,
  onFilterChange,
}: FilterSectionProps) {
  const [filterInputValue, setFilterInputValue] = useState(
    filterExtension === "all" ? "" : filterExtension,
  )

  const handleFilterInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/^\./, "") // Remove leading dot if user types it
      setFilterInputValue(value)
      onFilterChange(value.trim() || "all")
    },
    [onFilterChange],
  )

  const handleClearFilter = useCallback(() => {
    setFilterInputValue("")
    onFilterChange("all")
  }, [onFilterChange])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="flex h-7 w-8 items-center justify-center rounded-xs text-xs text-gray-700 hover:cursor-pointer hover:bg-gray-300"
        >
          <ListFilter size={14} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-3" align="end">
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Filter by Extension</h4>
          <div className="relative">
            <Input
              value={filterInputValue}
              onChange={handleFilterInputChange}
              placeholder="Enter extension"
              className="h-8 pr-8 text-xs"
            />
            {filterInputValue && (
              <Button
                onClick={handleClearFilter}
                variant="ghost"
                size="sm"
                className="absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2 transform p-0 hover:bg-gray-200"
              >
                <X size={10} className="text-gray-400" />
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface SortSectionProps {
  sortBy: SortOption
  onSortChange: (sortBy: SortOption) => void
}

function SortSection({ sortBy, onSortChange }: SortSectionProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="flex h-7 w-8 items-center justify-center rounded-xs text-xs text-gray-700 hover:cursor-pointer hover:bg-gray-300"
        >
          <ArrowUpDown size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => onSortChange("name")}
        >
          Name
          {sortBy === "name" && <Check size={14} className="ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => onSortChange("date")}
        >
          Date
          {sortBy === "date" && <Check size={14} className="ml-auto" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface FileTreeHeaderProps {
  sortBy: SortOption
  searchQuery: string
  filterExtension: string
  onSearchChange: (query: string) => void
  onSortChange: (sortBy: SortOption) => void
  onFilterChange: (extension: string) => void
}

export function FileTreeHeader({
  sortBy,
  onSortChange,
  searchQuery,
  onSearchChange,
  filterExtension,
  onFilterChange,
}: FileTreeHeaderProps) {
  return (
    <div className="flex h-10 items-center justify-between border-b bg-gray-200 p-2">
      <p className="text-md font-semibold text-gray-700">File Picker</p>
      <div className="flex items-center gap-2">
        <SortSection sortBy={sortBy} onSortChange={onSortChange} />
        <FilterSection
          filterExtension={filterExtension}
          onFilterChange={onFilterChange}
        />
        <SearchSection
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />
      </div>
    </div>
  )
}
