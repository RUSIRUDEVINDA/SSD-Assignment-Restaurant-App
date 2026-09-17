import React, { useState, useEffect, useMemo } from "react";
import { Search, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Restaurant } from "@/types";

interface FilterOptions {
  name: string;
  category: string;
  terminal: string;
}

interface RestaurantFilterProps {
  onFilterChange: (filters: FilterOptions) => void;
  restaurants: Restaurant[];
}

const RestaurantFilter: React.FC<RestaurantFilterProps> = ({
  onFilterChange,
  restaurants,
}) => {
  const [filters, setFilters] = useState<FilterOptions>({
    name: "",
    category: "all",
    terminal: "all",
  });

  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // Extract unique categories and terminals for filter options
  const categories = useMemo(
    () => Array.from(new Set(restaurants.map((r) => r.category))),
    [restaurants]
  );
  const terminals = useMemo(
    () => Array.from(new Set(restaurants.map((r) => r.terminal))),
    [restaurants]
  );

  // Update parent component when filters change
  useEffect(() => {
    const normalizedFilters = {
      name: filters.name,
      category: filters.category === "all" ? "" : filters.category,
      terminal: filters.terminal === "all" ? "" : filters.terminal,
    };
    onFilterChange(normalizedFilters);
  }, [filters, onFilterChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof FilterOptions, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFilters({ name: "", category: "all", terminal: "all" });
  };

  const hasFilters = filters.name || filters.category !== "all" || filters.terminal !== "all";

  return (
    <div className="backdrop-blur-sm py-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Restaurant Name Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-aerox-blue/60" />
          </div>
          <Input
            type="text"
            name="name"
            placeholder="Search restaurants..."
            value={filters.name}
            onChange={handleInputChange}
            className="pl-10 w-full border-aerox-blue/20 focus:border-aerox-blue focus:ring-1 focus:ring-aerox-blue/30"
          />
          {filters.name && (
            <button
              onClick={() => setFilters(prev => ({...prev, name: ""}))}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-aerox-blue"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2">
          {/* Filter Toggle for Mobile */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className="md:hidden flex items-center gap-2 border-aerox-blue/30 text-aerox-blue"
          >
            <Filter className="h-4 w-4" />
            <span>{isFilterExpanded ? "Hide" : "Filters"}</span>
          </Button>

          {/* Desktop Filters */}
          <div className="hidden md:flex items-center gap-3">
            <div className="w-[180px]">
              <Select
                value={filters.category}
                onValueChange={(value) => handleSelectChange("category", value)}
              >
                <SelectTrigger className="border-aerox-blue/20 focus:ring-1 focus:ring-aerox-blue/30">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[180px]">
              <Select
                value={filters.terminal}
                onValueChange={(value) => handleSelectChange("terminal", value)}
              >
                <SelectTrigger className="border-aerox-blue/20 focus:ring-1 focus:ring-aerox-blue/30">
                  <SelectValue placeholder="All Terminals" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Terminals</SelectItem>
                  {terminals.map((terminal) => (
                    <SelectItem key={terminal} value={terminal}>
                      {terminal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasFilters && (
              <Button
                variant="ghost"
                onClick={handleReset}
                className="text-aerox-blue hover:text-aerox-blue/80 hover:bg-aerox-blue/5"
              >
                Clear all
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Expanded Filters */}
      {isFilterExpanded && (
        <div className="md:hidden mt-4 space-y-3">
          <div>
            <Label className="text-sm font-medium text-aerox-blue">Category</Label>
            <Select
              value={filters.category}
              onValueChange={(value) => handleSelectChange("category", value)}
            >
              <SelectTrigger className="mt-1 border-aerox-blue/20 focus:ring-1 focus:ring-aerox-blue/30">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium text-aerox-blue">Terminal</Label>
            <Select
              value={filters.terminal}
              onValueChange={(value) => handleSelectChange("terminal", value)}
            >
              <SelectTrigger className="mt-1 border-aerox-blue/20 focus:ring-1 focus:ring-aerox-blue/30">
                <SelectValue placeholder="All Terminals" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terminals</SelectItem>
                {terminals.map((terminal) => (
                  <SelectItem key={terminal} value={terminal}>
                    {terminal}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="w-full text-aerox-blue border-aerox-blue/30 hover:bg-aerox-blue/5"
              >
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RestaurantFilter;