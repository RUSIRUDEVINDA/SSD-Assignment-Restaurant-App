
import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MenuItem } from "@/types";

interface MenuFilterProps {
  items: MenuItem[];
  onFilterChange: (filtered: MenuItem[]) => void;
}

const MenuFilter: React.FC<MenuFilterProps> = ({ items, onFilterChange }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showSpecials, setShowSpecials] = useState(false);
  const [showSeasonal, setShowSeasonal] = useState(false);

  // Extract unique categories for the filter
  const categories = Array.from(new Set(items.map(item => item.category)));

  // Apply filters whenever search criteria change
  useEffect(() => {
    const filteredItems = items.filter(item => {
      // Name filter
      const nameMatch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       item.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Category filter
      const categoryMatch = selectedCategory === "" || item.category === selectedCategory;
      
      // Special and seasonal filters
      const specialMatch = !showSpecials || item.isSpecial;
      const seasonalMatch = !showSeasonal || item.isSeasonal;
      
      return nameMatch && categoryMatch && specialMatch && seasonalMatch;
    });
    
    onFilterChange(filteredItems);
  }, [searchTerm, selectedCategory, showSpecials, showSeasonal, items, onFilterChange]);

  const handleReset = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setShowSpecials(false);
    setShowSeasonal(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex flex-col space-y-4">
        {/* Search input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 filter-input w-full"
          />
        </div>
        
        {/* Filter options */}
        <div className="flex flex-wrap gap-2">
          {/* Category dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-aerox-teal focus:border-aerox-teal flex-grow"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          
          {/* Special toggle */}
          <Button
            type="button"
            variant={showSpecials ? "default" : "outline"}
            className={`${showSpecials ? "bg-aerox-gold text-black" : ""}`}
            onClick={() => setShowSpecials(!showSpecials)}
          >
            Specials
          </Button>
          
          {/* Seasonal toggle */}
          <Button
            type="button"
            variant={showSeasonal ? "default" : "outline"}
            className={`${showSeasonal ? "bg-aerox-teal text-white" : ""}`}
            onClick={() => setShowSeasonal(!showSeasonal)}
          >
            Seasonal
          </Button>
          
          {/* Reset button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MenuFilter;
