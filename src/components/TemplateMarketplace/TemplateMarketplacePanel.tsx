"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Filter,
  X,
  Star,
  Download,
  Heart,
  HeartOff,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Check,
  Shield,
  TrendingUp,
  Clock,
  Tag,
  Cloud,
  Zap,
  BookOpen,
  Grid,
  List,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  TemplateMarketplaceService,
} from "@/lib/templateMarketplace/service";
import {
  Template,
  TemplateCategory,
  CloudProvider,
  TemplateSearchFilters,
} from "@/lib/templateMarketplace/types";
import { toast } from "sonner";

interface TemplateMarketplacePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTemplate?: (template: Template) => void;
}

const CATEGORIES: { value: TemplateCategory; label: string; icon: string }[] = [
  { value: "web-application", label: "Web Applications", icon: "🌐" },
  { value: "microservices", label: "Microservices", icon: "🔧" },
  { value: "data-platform", label: "Data Platforms", icon: "📊" },
  { value: "serverless", label: "Serverless", icon: "⚡" },
  { value: "kubernetes", label: "Kubernetes", icon: "☸️" },
  { value: "ml-ai", label: "ML/AI", icon: "🤖" },
  { value: "security", label: "Security", icon: "🔒" },
  { value: "networking", label: "Networking", icon: "🌐" },
  { value: "storage", label: "Storage", icon: "💾" },
  { value: "monitoring", label: "Monitoring", icon: "📈" },
  { value: "ci-cd", label: "CI/CD", icon: "🔄" },
  { value: "database", label: "Databases", icon: "🗄️" },
];

const PROVIDERS: { value: CloudProvider; label: string; icon: string }[] = [
  { value: "aws", label: "AWS", icon: "☁️" },
  { value: "azure", label: "Azure", icon: "☁️" },
  { value: "gcp", label: "GCP", icon: "☁️" },
  { value: "multi-cloud", label: "Multi-Cloud", icon: "☁️☁️" },
];

const SORT_OPTIONS = [
  { value: "popular", label: "Most Popular" },
  { value: "recent", label: "Recently Updated" },
  { value: "rating", label: "Highest Rated" },
  { value: "downloads", label: "Most Downloaded" },
];

// Helper functions
const getComplexityColor = (complexity: string) => {
  switch (complexity) {
    case "beginner": return "bg-green-500/20 text-green-400 border-green-500/30";
    case "intermediate": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "advanced": return "bg-red-500/20 text-red-400 border-red-500/30";
    default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
};

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export function TemplateMarketplacePanel({
  isOpen,
  onClose,
  onImportTemplate,
}: TemplateMarketplacePanelProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState<"browse" | "trending" | "official" | "saved">("browse");

  // Filters
  const [filters, setFilters] = useState<TemplateSearchFilters>({
    query: "",
    sortBy: "popular",
    sortOrder: "desc",
  });
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const dialogRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Load templates on mount and filter change
  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const searchFilters = { ...filters };

      // Apply tab-specific filters
      if (activeTab === "official") {
        searchFilters.isOfficial = true;
      } else if (activeTab === "trending") {
        searchFilters.sortBy = "popular";
      }

      const result = await TemplateMarketplaceService.searchTemplates(searchFilters);
      setTemplates(result.templates);
      setTotal(result.total);
    } catch (error) {
      console.error("Failed to load templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  }, [filters, activeTab]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates, currentPage]);

  const handleFilterChange = (key: keyof TemplateSearchFilters, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      query: "",
      sortBy: "popular",
      sortOrder: "desc",
    });
    setCurrentPage(1);
  };

  const hasActiveFilters = Object.entries(filters).some(
    ([key, value]) => key !== "sortBy" && key !== "sortOrder" && value !== undefined && value !== ""
  );

  const handleTemplateClick = (template: Template) => {
    setSelectedTemplate(template);
  };

  const handleImport = async (template: Template) => {
    try {
      const downloaded = await TemplateMarketplaceService.downloadTemplate(template.id, "current-user");
      if (downloaded && onImportTemplate) {
        onImportTemplate(downloaded);
        toast.success(`Imported "${template.name}"`);
        onClose();
      }
    } catch (error) {
      console.error("Import failed:", error);
      toast.error("Failed to import template");
    }
  };

  const handleSave = async (template: Template) => {
    try {
      await TemplateMarketplaceService.addToCollection("current-user", template.id);
      toast.success(`Saved "${template.name}" to your collection`);
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Failed to save template");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-7xl max-h-[90vh] bg-[#1a1a22] border border-[#374151] rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200 flex flex-col"
      >
        {/* Header */}
        <div className="flex flex-row items-center justify-between p-4 border-b border-[#374151] bg-[#131316]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Grid className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">Template Marketplace</h2>
              <p className="text-gray-400 text-sm">Discover and import community-contributed architecture templates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-[#374151] bg-[#131316]">
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Search templates..."
                  value={filters.query || ""}
                  onChange={(e) => handleFilterChange("query", e.target.value)}
                  className="pl-10 bg-[#1a1a22] border-[#374151] text-white placeholder-gray-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={showFilters ? "secondary" : "outline"}
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-10"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {Object.entries(filters).filter(([k, v]) => k !== "sortBy" && k !== "sortOrder" && v).length}
                    </Badge>
                  )}
                </Button>
                {hasActiveFilters && (
                  <Button variant="ghost" size="icon" onClick={clearFilters} className="h-10">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="flex flex-wrap gap-4 pt-2 border-t border-[#374151]">
                {/* Category Filter */}
                <Select
                  value={filters.category || ""}
                  onValueChange={(value) => handleFilterChange("category", value || undefined)}
                >
                  <SelectTrigger className="w-[200px] bg-[#1a1a22] border-[#374151] text-white">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Provider Filter */}
                <Select
                  value={filters.cloudProviders?.[0] || ""}
                  onValueChange={(value) => handleFilterChange("cloudProviders", value ? [value as CloudProvider] : undefined)}
                >
                  <SelectTrigger className="w-[160px] bg-[#1a1a22] border-[#374151] text-white">
                    <SelectValue placeholder="All Providers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Providers</SelectItem>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.icon} {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Complexity Filter */}
                <Select
                  value={filters.complexity?.[0] || ""}
                  onValueChange={(value) => handleFilterChange("complexity", value ? [value as "beginner" | "intermediate" | "advanced"] : undefined)}
                >
                  <SelectTrigger className="w-[160px] bg-[#1a1a22] border-[#374151] text-white">
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Levels</SelectItem>
                    <SelectItem value="beginner">🟢 Beginner</SelectItem>
                    <SelectItem value="intermediate">🟡 Intermediate</SelectItem>
                    <SelectItem value="advanced">🔴 Advanced</SelectItem>
                  </SelectContent>
                </Select>

                {/* Official Only */}
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.isOfficial || false}
                    onChange={(e) => handleFilterChange("isOfficial", e.target.checked)}
                    className="w-4 h-4 rounded border-[#374151] bg-[#1a1a22] text-purple-500 focus:ring-purple-500"
                  />
                  Official Only
                </label>

                {/* Verified Only */}
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.isVerified || false}
                    onChange={(e) => handleFilterChange("isVerified", e.target.checked)}
                    className="w-4 h-4 rounded border-[#374151] bg-[#1a1a22] text-purple-500 focus:ring-purple-500"
                  />
                  Verified Only
                </label>

                {/* Sort */}
                <Select
                  value={filters.sortBy || "popular"}
                  onValueChange={(value) => handleFilterChange("sortBy", value as "popular" | "recent" | "rating" | "downloads")}
                >
                  <SelectTrigger className="w-[180px] bg-[#1a1a22] border-[#374151] text-white">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as "browse" | "trending" | "official" | "saved")} className="border-b border-[#374151] bg-[#131316] px-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="browse">
              <Grid className="w-4 h-4 mr-2" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="trending">
              <TrendingUp className="w-4 h-4 mr-2" />
              Trending
            </TabsTrigger>
            <TabsTrigger value="official">
              <Shield className="w-4 h-4 mr-2" />
              Official
            </TabsTrigger>
            <TabsTrigger value="saved">
              <Heart className="w-4 h-4 mr-2" />
              Saved
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Results */}
        <ScrollArea className="flex-1 p-4 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <AlertCircle className="w-12 h-12 mb-4 text-gray-600" />
              <p className="text-lg">No templates found</p>
              <p className="text-sm">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-400">
                  Showing {templates.length} of {total} templates
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("grid")}
                    className="h-8 w-8"
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("list")}
                    className="h-8 w-8"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {templates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onClick={() => handleTemplateClick(template)}
                      onImport={() => handleImport(template)}
                      onSave={() => handleSave(template)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((template) => (
                    <TemplateListItem
                      key={template.id}
                      template={template}
                      onClick={() => handleTemplateClick(template)}
                      onImport={() => handleImport(template)}
                      onSave={() => handleSave(template)}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {total > pageSize && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-400 px-4">
                    Page {currentPage} of {Math.ceil(total / pageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.min(Math.ceil(total / pageSize), p + 1))}
                    disabled={currentPage >= Math.ceil(total / pageSize)}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </ScrollArea>

        {/* Template Detail Modal */}
        {selectedTemplate && (
          <TemplateDetailModal
            template={selectedTemplate}
            onClose={() => setSelectedTemplate(null)}
            onImport={() => handleImport(selectedTemplate)}
            onSave={() => handleSave(selectedTemplate)}
          />
        )}
      </div>
    </div>
  );
}

// Template Card Component
function TemplateCard({
  template,
  onClick,
  onImport,
  onSave,
}: {
  template: Template;
  onClick: () => void;
  onImport: () => void;
  onSave: () => void;
}) {
  const category = CATEGORIES.find((c) => c.value === template.category);

  return (
    <Card
      className="bg-[#1a1a22] border-[#374151] hover:border-purple-500/50 transition-colors cursor-pointer h-full"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {template.isOfficial && (
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                <Shield className="w-3 h-3 mr-1" />
                Official
              </Badge>
            )}
            {template.isVerified && !template.isOfficial && (
              <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                <Check className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); onSave(); }}>
            <HeartOff className="w-4 h-4 text-gray-500 hover:text-red-400" />
          </Button>
        </div>
        <h3 className="text-white font-medium text-lg mt-2 line-clamp-2">{template.name}</h3>
        <p className="text-gray-400 text-sm line-clamp-2 mt-1">{template.description}</p>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {template.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs bg-[#131316] border-[#2d2d3a] text-gray-400">
              {tag}
            </Badge>
          ))}
          {template.tags.length > 4 && (
            <Badge variant="outline" className="text-xs bg-[#131316] border-[#2d2d3a] text-gray-500">
              +{template.tags.length - 4}
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-400" />
            {template.rating.toFixed(1)} ({formatNumber(template.reviewCount)})
          </span>
          <span className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            {formatNumber(template.downloads)}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          <Badge variant="outline" className={getComplexityColor(template.complexity)}>
            {template.complexity}
          </Badge>
          {category && (
            <Badge variant="outline" className="bg-[#131316] border-[#2d2d3a] text-gray-400">
              {category.icon} {category.label}
            </Badge>
          )}
          {template.cloudProviders.map((p) => (
            <Badge key={p} variant="outline" className="bg-[#131316] border-[#2d2d3a] text-gray-400">
              {p.toUpperCase()}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="pt-0 border-t border-[#2d2d3a]">
        <Button className="w-full" size="sm" onClick={(e) => { e.stopPropagation(); onImport(); }}>
          <Download className="w-4 h-4 mr-2" />
          Import Template
        </Button>
      </CardFooter>
    </Card>
  );
}

// Template List Item Component
function TemplateListItem({
  template,
  onClick,
  onImport,
  onSave,
}: {
  template: Template;
  onClick: () => void;
  onImport: () => void;
  onSave: () => void;
}) {
  const category = CATEGORIES.find((c) => c.value === template.category);

  return (
    <Card
      className="bg-[#1a1a22] border-[#374151] hover:border-purple-500/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="py-3">
        <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-center">
          <div className="w-16 h-16 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-8 h-8 text-purple-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-white font-medium truncate">{template.name}</h4>
              {template.isOfficial && (
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                  <Shield className="w-3 h-3 mr-1" />
                  Official
                </Badge>
              )}
              {template.isVerified && !template.isOfficial && (
                <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                  <Check className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            <p className="text-gray-400 text-sm truncate mt-1">{template.description}</p>
            <div className="flex flex-wrap gap-1.5 mt-2 text-xs">
              <Badge variant="outline" className={getComplexityColor(template.complexity)}>
                {template.complexity}
              </Badge>
              {category && (
                <Badge variant="outline" className="bg-[#131316] border-[#2d2d3a] text-gray-400">
                  {category.label}
                </Badge>
              )}
              {template.cloudProviders.map((p) => (
                <Badge key={p} variant="outline" className="bg-[#131316] border-[#2d2d3a] text-gray-400">
                  {p.toUpperCase()}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400" />
                {template.rating.toFixed(1)}
              </span>
              <span className="flex items-center gap-1">
                <Download className="w-3 h-3" />
                {formatNumber(template.downloads)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onSave(); }}>
                <HeartOff className="w-4 h-4 text-gray-500 hover:text-red-400" />
              </Button>
              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onImport(); }}>
                <Download className="w-3 h-3 mr-1" />
                Import
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Template Detail Modal
function TemplateDetailModal({
  template,
  onClose,
  onImport,
  onSave,
}: {
  template: Template;
  onClose: () => void;
  onImport: () => void;
  onSave: () => void;
}) {
  const category = CATEGORIES.find((c) => c.value === template.category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] bg-[#1a1a22] border border-[#374151] rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-[#374151] bg-[#131316]">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-2">
              {template.isOfficial && (
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                  <Shield className="w-3 h-3 mr-1" />
                  Official
                </Badge>
              )}
              {template.isVerified && !template.isOfficial && (
                <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                  <Check className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
              <Badge variant="outline" className={getComplexityColor(template.complexity)}>
                {template.complexity}
              </Badge>
            </div>
            <h2 className="text-white font-semibold text-xl">{template.name}</h2>
            <p className="text-gray-400 mt-1">{template.description}</p>
            <div className="flex flex-wrap gap-2 mt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3" />
                v{template.version}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Updated {new Date(template.updatedAt).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {template.estimatedCost}
              </span>
              <span className="flex items-center gap-1">
                <Cloud className="w-3 h-3" />
                {template.cloudProviders.map((p) => p.toUpperCase()).join(", ")}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="overview" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4 border-b border-[#374151] bg-[#131316] p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="architecture">Architecture</TabsTrigger>
            <TabsTrigger value="parameters">Parameters</TabsTrigger>
            <TabsTrigger value="docs">Documentation</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex-1 overflow-auto p-4">
            <ScrollArea className="h-full">
              <div className="space-y-6">
                <div>
                  <h3 className="text-white font-medium mb-3">About</h3>
                  <p className="text-gray-300 whitespace-pre-wrap">{template.documentation}</p>
                </div>

                <div>
                  <h3 className="text-white font-medium mb-3">Metadata</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Author</p>
                      <p className="text-white font-medium flex items-center gap-1">
                        {template.author.avatar && <img src={template.author.avatar} className="w-5 h-5 rounded-full" />}
                        {template.author.name}
                        {template.author.verified && <Check className="w-4 h-4 text-green-400" />}
                        {template.author.organization && <span className="text-gray-500">({template.author.organization})</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">License</p>
                      <p className="text-white font-medium">{template.license}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Downloads</p>
                      <p className="text-white font-medium">{formatNumber(template.downloads)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Rating</p>
                      <p className="text-white font-medium flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400" />
                        {template.rating.toFixed(1)} ({template.reviewCount} reviews)
                      </p>
                    </div>
                  </div>
                </div>

                {template.sourceUrl && (
                  <div>
                    <a href={template.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-purple-400 hover:text-purple-300">
                      <ExternalLink className="w-4 h-4" />
                      View Source on GitHub
                    </a>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="architecture" className="flex-1 overflow-auto p-4">
            <ScrollArea className="h-full">
              <div className="space-y-4">
                <div>
                  <h3 className="text-white font-medium mb-3">Terraform Modules</h3>
                  {template.architecture.terraformModules.length > 0 ? (
                    <div className="space-y-2">
                      {template.architecture.terraformModules.map((mod, i) => (
                        <Card key={i} className="bg-[#131316] border-[#2d2d3a]">
                          <CardContent className="py-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-white font-mono text-sm">{mod.name}</p>
                                <p className="text-gray-400 text-xs">{mod.source}</p>
                              </div>
                              {mod.version && <Badge variant="outline">{mod.version}</Badge>}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No module information available</p>
                  )}
                </div>

                <div>
                  <h3 className="text-white font-medium mb-3">Outputs</h3>
                  {template.architecture.outputs.length > 0 ? (
                    <div className="space-y-2">
                      {template.architecture.outputs.map((out, i) => (
                        <Card key={i} className="bg-[#131316] border-[#2d2d3a]">
                          <CardContent className="py-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="text-white font-mono text-sm">{out.name}</p>
                                <p className="text-gray-400 text-xs">{out.description}</p>
                              </div>
                              <code className="text-xs bg-[#1a1a22] px-2 py-1 rounded text-purple-400 font-mono">{out.value}</code>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No outputs defined</p>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="parameters" className="flex-1 overflow-auto p-4">
            <ScrollArea className="h-full">
              <div className="space-y-4">
                <h3 className="text-white font-medium mb-3">Template Parameters</h3>
                {template.architecture.parameters.length > 0 ? (
                  <div className="space-y-3">
                    {template.architecture.parameters.map((param, i) => (
                      <Card key={i} className="bg-[#131316] border-[#2d2d3a]">
                        <CardContent className="py-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-white font-mono text-sm">{param.name}</p>
                                {param.required && <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Required</Badge>}
                                {param.sensitive && <Badge variant="outline" className="text-xs">Sensitive</Badge>}
                              </div>
                              <p className="text-gray-400 text-sm mt-1">{param.description}</p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                <span>Type: <code className="text-purple-400">{param.type}</code></span>
                                {param.default !== undefined && (
                                  <span>Default: <code className="text-gray-300">{JSON.stringify(param.default)}</code></span>
                                )}
                                {param.validation?.enum && (
                                  <span>Enum: <code className="text-gray-300">{param.validation.enum.join(", ")}</code></span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No parameters defined</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="docs" className="flex-1 overflow-auto p-4">
            <ScrollArea className="h-full">
              <div className="prose prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: markdownToHtml(template.documentation) }} />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-[#374151] bg-[#131316]">
          <Button variant="outline" onClick={onSave}>
            <HeartOff className="w-4 h-4 mr-2" />
            Save to Collection
          </Button>
          <Button onClick={onImport}>
            <Download className="w-4 h-4 mr-2" />
            Import Template
          </Button>
        </div>
      </div>
    </div>
  );
}

// Simple markdown to HTML converter for documentation
function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/^### (.*$)/gim, '<h3 class="text-white font-medium mb-2 mt-4">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-white font-semibold mb-2 mt-6">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-white font-bold mb-3 mt-6">$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`(.*?)`/gim, '<code class="bg-[#131316] px-1.5 py-0.5 rounded text-purple-400 text-sm font-mono">$1</code>')
    .replace(/```(\w+)?\n([\s\S]*?)```/gim, '<pre class="bg-[#131316] border border-[#2d2d3a] rounded-lg p-4 overflow-x-auto my-4"><code class="text-gray-300 font-mono text-sm">$2</code></pre>')
    .replace(/^\- (.*$)/gim, '<li class="text-gray-300 ml-4">$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li class="text-gray-300 ml-4">$1</li>')
    .replace(/\n\n/gim, '</p><p class="text-gray-300">')
    .replace(/\n/gim, '<br />');
}