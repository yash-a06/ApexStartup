import { useState } from "react";
import { Link } from "wouter";
import { useListProblems, useListTags, ProblemCategory, Difficulty } from "@workspace/api-client-react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { useUser } from "@/lib/user-context";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CheckCircle2, Filter, Zap, Activity, Layers, Database, Code2, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

const categoryMeta = {
  trigger: { icon: Zap, label: "Triggers", color: "text-cyan-400" },
  async_apex: { icon: Activity, label: "Async Apex", color: "text-emerald-400" },
  classes: { icon: Layers, label: "Classes", color: "text-indigo-400" },
  soql: { icon: Database, label: "SOQL", color: "text-teal-400" },
} as const;

const difficultyColor = {
  easy: "text-success",
  medium: "text-warning",
  hard: "text-destructive",
} as const;

const difficultyDot = {
  easy: "bg-success shadow-[0_0_5px_hsl(var(--success))]",
  medium: "bg-warning shadow-[0_0_5px_hsl(var(--warning))]",
  hard: "bg-destructive shadow-[0_0_5px_hsl(var(--destructive))]",
} as const;

export default function Problems() {
  const { userId } = useUser();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ProblemCategory | "all">("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [tag, setTag] = useState<string | "all">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: problems, isLoading } = useListProblems({
    search: search || undefined,
    category: category !== "all" ? (category as ProblemCategory) : undefined,
    difficulty: difficulty !== "all" ? (difficulty as Difficulty) : undefined,
    tag: tag !== "all" ? tag : undefined,
    userId,
  });

  const { data: tags } = useListTags();

  const solvedCount = problems?.filter((p) => p.solved).length || 0;
  const totalCount = problems?.length || 0;

  const hasFilters = category !== "all" || difficulty !== "all" || tag !== "all";
  const activeFilterCount = [
    category !== "all",
    difficulty !== "all",
    tag !== "all",
  ].filter(Boolean).length;

  const clearAll = () => {
    setSearch("");
    setCategory("all");
    setDifficulty("all");
    setTag("all");
  };

  const FilterPanel = (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Category
        </label>
        <Select value={category} onValueChange={(v: any) => setCategory(v)}>
          <SelectTrigger className="h-9 bg-background border-white/10" data-testid="select-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(categoryMeta).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Difficulty
        </label>
        <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
          <SelectTrigger className="h-9 bg-background border-white/10" data-testid="select-difficulty">
            <SelectValue placeholder="All Difficulties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Difficulties</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Tags
        </label>
        <Select value={tag} onValueChange={(v: any) => setTag(v)}>
          <SelectTrigger className="h-9 bg-background border-white/10" data-testid="select-tags">
            <SelectValue placeholder="All Tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {tags?.map((t) => (
              <SelectItem key={t.tag} value={t.tag}>
                {t.tag} ({t.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasFilters && (
        <button
          className="w-full text-xs font-semibold text-primary hover:text-primary/80 pt-1 transition-colors uppercase tracking-widest"
          onClick={clearAll}
          data-testid="btn-clear-filters"
        >
          Clear filters
        </button>
      )}
    </div>
  );

  return (
    <PageWrapper className="container max-w-screen-xl px-3 sm:px-4 md:px-6 py-6 sm:py-10 mx-auto">
      {/* Page Header */}
      <div className="mb-6 sm:mb-10">
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-display mb-1 sm:mb-2">
          Problem Library
        </h1>
        <p className="text-muted-foreground text-sm sm:text-lg">
          Practice real Salesforce scenarios with instant feedback.
        </p>
      </div>

      {/* Mobile: search bar + filter toggle row */}
      <div className="flex items-center gap-2 mb-3 lg:hidden">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search problems..."
            className="pl-9 h-10 bg-background border-white/10 focus-visible:ring-primary focus-visible:border-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 h-10 px-3 rounded-md border text-sm font-medium transition-colors shrink-0",
            filtersOpen || hasFilters
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-white/10 bg-background text-muted-foreground hover:text-foreground hover:border-white/20",
          )}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden xs:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
          {filtersOpen ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Mobile: collapsible filter panel */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            key="mobile-filters"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden lg:hidden mb-3"
          >
            <div className="rounded-xl border border-white/5 bg-card/50 backdrop-blur-sm">
              {FilterPanel}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile: active filter chips when panel is closed */}
      {!filtersOpen && hasFilters && (
        <div className="flex flex-wrap gap-1.5 mb-3 lg:hidden">
          {category !== "all" && (
            <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1 font-medium">
              {categoryMeta[category as keyof typeof categoryMeta]?.label || category}
              <button onClick={() => setCategory("all")} className="ml-0.5 hover:text-primary/70">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {difficulty !== "all" && (
            <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1 font-medium capitalize">
              {difficulty}
              <button onClick={() => setDifficulty("all")} className="ml-0.5 hover:text-primary/70">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {tag !== "all" && (
            <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1 font-medium">
              {tag}
              <button onClick={() => setTag("all")} className="ml-0.5 hover:text-primary/70">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Desktop: sidebar + list layout */}
      <div className="grid lg:grid-cols-4 gap-6 sm:gap-8 items-start">
        {/* Sticky Filters Sidebar — desktop only */}
        <div className="hidden lg:block lg:col-span-1 space-y-6 lg:sticky lg:top-24">
          <div className="rounded-xl border border-white/5 bg-card/50 backdrop-blur-sm overflow-hidden shadow-2xl shadow-primary/5">
            <div className="p-5 border-b border-white/5 bg-secondary/30 flex items-center gap-2 font-semibold font-display">
              <Filter className="w-4 h-4 text-primary" /> Filters
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Search
                </label>
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="Search problems..."
                    className="pl-9 h-10 bg-background border-white/10 focus-visible:ring-primary focus-visible:border-primary transition-all"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    data-testid="input-search"
                  />
                </div>
              </div>
              {FilterPanel}
            </div>
          </div>
        </div>

        {/* Problems List */}
        <div className="lg:col-span-3">
          {/* List Header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="text-sm font-medium text-muted-foreground">
              <span className="text-foreground font-mono">{totalCount}</span> problems
            </div>
            <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <span className="text-foreground font-mono">{solvedCount}</span> solved
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-20 w-full rounded-xl bg-secondary/50 border border-white/5"
                />
              ))}
            </div>
          ) : problems?.length === 0 ? (
            <div className="rounded-xl border border-white/5 border-dashed py-20 bg-card/30 flex flex-col items-center justify-center text-center px-4">
              <div className="w-14 h-14 rounded-full bg-secondary/50 flex items-center justify-center mb-5 border border-white/5">
                <Search className="w-7 h-7 text-muted-foreground opacity-50" />
              </div>
              <h3 className="text-lg font-display font-semibold mb-2">No problems found</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                Try adjusting your search or clearing filters.
              </p>
              <button
                onClick={clearAll}
                className="mt-5 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-md text-sm font-medium transition-colors border border-white/10"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid gap-2.5">
              <AnimatePresence>
                {problems?.map((p, i) => {
                  const CatIcon =
                    categoryMeta[p.category as keyof typeof categoryMeta]?.icon || Code2;
                  const catColor =
                    categoryMeta[p.category as keyof typeof categoryMeta]?.color ||
                    "text-muted-foreground";

                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ delay: Math.min(i * 0.04, 0.4) }}
                    >
                      <Link href={`/problems/${p.slug}`} className="group block">
                        <div className="rounded-xl bg-card hover:bg-secondary/40 border border-white/5 hover:border-primary/30 transition-all duration-300 relative overflow-hidden glow-card">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />

                          <div className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                            {/* Status dot */}
                            <div className="shrink-0">
                              {p.solved ? (
                                <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center border border-success/20">
                                  <CheckCircle2 className="w-4 h-4 text-success" />
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full border-2 border-white/10 group-hover:border-primary/30 transition-colors" />
                              )}
                            </div>

                            {/* Title + meta */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm sm:text-base font-display group-hover:text-primary transition-colors truncate leading-snug mb-1">
                                {p.title}
                              </h3>
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Difficulty */}
                                <span
                                  className={cn(
                                    "text-[10px] uppercase tracking-widest font-mono font-bold flex items-center gap-1",
                                    difficultyColor[p.difficulty as keyof typeof difficultyColor],
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "w-1.5 h-1.5 rounded-full shrink-0",
                                      difficultyDot[p.difficulty as keyof typeof difficultyDot],
                                    )}
                                  />
                                  {p.difficulty}
                                </span>

                                <span className="w-px h-3 bg-white/10 shrink-0" />

                                {/* Category */}
                                <span className={cn("flex items-center gap-1 text-xs font-medium", catColor)}>
                                  <CatIcon className="w-3 h-3 shrink-0" />
                                  <span className="truncate">
                                    {categoryMeta[p.category as keyof typeof categoryMeta]?.label ||
                                      p.category}
                                  </span>
                                </span>

                                {/* Tags — hidden on xs */}
                                {p.tags.length > 0 && (
                                  <>
                                    <span className="hidden sm:block w-px h-3 bg-white/10 shrink-0" />
                                    <div className="hidden sm:flex gap-1 flex-wrap">
                                      {p.tags.slice(0, 2).map((t) => (
                                        <span
                                          key={t}
                                          className="text-[10px] font-mono text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded border border-white/5"
                                        >
                                          {t}
                                        </span>
                                      ))}
                                      {p.tags.length > 2 && (
                                        <span className="text-[10px] font-mono text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                          +{p.tags.length - 2}
                                        </span>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Acceptance rate — hidden on mobile */}
                            <div className="shrink-0 text-right hidden sm:block">
                              <div className="flex items-center justify-end gap-2 mb-0.5">
                                <div className="w-10 h-1 bg-white/5 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary"
                                    style={{ width: `${p.acceptanceRate}%` }}
                                  />
                                </div>
                                <span className="font-mono text-xs text-foreground font-medium w-10 text-right">
                                  {p.acceptanceRate}%
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                                Acceptance
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
