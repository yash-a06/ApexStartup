import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import "highlight.js/styles/github-dark.css";
import type { Components } from "react-markdown";
import {
  ArrowLeft, RefreshCw, BookOpen, Clock,
  CheckCircle2, Sparkles, Copy, Check,
  List, ChevronRight, Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ArticleData {
  id: string;
  topicId: string;
  topicName: string;
  roadmapId: string;
  content: string;
  createdAt: string;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function extractToc(markdown: string): TocItem[] {
  const lines = markdown.split("\n");
  const items: TocItem[] = [];
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/\*\*/g, "").replace(/`/g, "").trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      items.push({ id, text, level });
    }
  }
  return items;
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors border border-white/[0.06]"
      title="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function CodeBlock({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
  const code = String(children).replace(/\n$/, "");
  const langMatch = className?.match(/language-(\w+)/);
  const lang = langMatch?.[1] ?? "";

  return (
    <div className="relative group my-5 rounded-xl overflow-hidden border border-white/[0.08] shadow-xl">
      {lang && (
        <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-white/[0.08]">
          <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest">{lang}</span>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
        </div>
      )}
      <div className="relative">
        <pre className={cn("!m-0 !rounded-none !border-0 !bg-[#0d1117] overflow-x-auto p-4 text-sm leading-relaxed")}>
          <code className={className} {...props}>{children}</code>
        </pre>
        <CopyButton code={code} />
      </div>
    </div>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-[0.85em] font-mono border border-primary/15 before:content-none after:content-none">
      {children}
    </code>
  );
}

const SECTION_ICONS: Record<string, string> = {
  "introduction": "📖",
  "prerequisites": "📋",
  "core concepts": "🧠",
  "architecture": "🏗️",
  "step-by-step": "🔢",
  "code examples": "💻",
  "best practices": "✅",
  "common mistakes": "⚠️",
  "interview questions": "🎯",
  "practice problems": "🏋️",
  "assignment": "📝",
  "quiz": "🧪",
  "summary": "📌",
  "related topics": "🔗",
};

function getSectionIcon(title: string): string {
  const lower = title.toLowerCase();
  for (const [key, icon] of Object.entries(SECTION_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return "📄";
}

const markdownComponents: Components = {
  pre({ children }) {
    return <>{children}</>;
  },
  code({ className, children, ...props }) {
    const isBlock = className?.startsWith("language-");
    if (isBlock) return <CodeBlock className={className} {...props}>{children}</CodeBlock>;
    return <InlineCode>{children}</InlineCode>;
  },
  h1({ children, id }) {
    return (
      <h1 id={id} className="group flex items-center gap-3 text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-foreground mt-0 mb-6 pb-4 border-b border-white/[0.08]">
        {children}
        {id && (
          <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary">
            <Hash className="w-5 h-5" />
          </a>
        )}
      </h1>
    );
  },
  h2({ children, id }) {
    const text = String(children);
    const icon = getSectionIcon(text);
    return (
      <h2 id={id} className="group flex items-center gap-3 text-xl sm:text-2xl font-bold font-display tracking-tight text-foreground mt-12 mb-5 pb-3 border-b border-white/[0.05]">
        <span className="text-xl shrink-0" aria-hidden>{icon}</span>
        <span>{children}</span>
        {id && (
          <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary ml-auto">
            <Hash className="w-4 h-4" />
          </a>
        )}
      </h2>
    );
  },
  h3({ children, id }) {
    return (
      <h3 id={id} className="group flex items-center gap-2 text-base sm:text-lg font-semibold font-display text-foreground/90 mt-8 mb-3">
        <span className="w-1 h-5 rounded-full bg-primary/60 shrink-0" />
        {children}
      </h3>
    );
  },
  h4({ children, id }) {
    return (
      <h4 id={id} className="text-sm font-semibold font-display text-foreground/80 mt-6 mb-2 uppercase tracking-wider">
        {children}
      </h4>
    );
  },
  p({ children }) {
    return <p className="text-[15px] leading-[1.85] text-muted-foreground mb-4">{children}</p>;
  },
  ul({ children }) {
    return <ul className="my-4 space-y-1.5 pl-0 list-none">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="my-4 space-y-1.5 pl-5 list-decimal">{children}</ol>;
  },
  li({ children }) {
    return (
      <li className="flex items-start gap-2.5 text-[15px] leading-[1.75] text-muted-foreground">
        <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
        <span className="flex-1">{children}</span>
      </li>
    );
  },
  blockquote({ children }) {
    return (
      <div className="my-5 flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 pl-5 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl" />
        <div className="text-sm text-foreground/80 leading-relaxed">{children}</div>
      </div>
    );
  },
  table({ children }) {
    return (
      <div className="my-6 overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="w-full text-sm border-collapse">{children}</table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="bg-white/[0.04] border-b border-white/[0.08]">{children}</thead>;
  },
  tbody({ children }) {
    return <tbody className="divide-y divide-white/[0.04]">{children}</tbody>;
  },
  th({ children }) {
    return <th className="px-4 py-3 text-left font-semibold text-foreground text-xs uppercase tracking-wider">{children}</th>;
  },
  td({ children }) {
    return <td className="px-4 py-3 text-muted-foreground leading-relaxed">{children}</td>;
  },
  hr() {
    return <hr className="my-10 border-white/[0.08]" />;
  },
  strong({ children }) {
    return <strong className="font-semibold text-foreground">{children}</strong>;
  },
  a({ href, children }) {
    return (
      <a href={href} className="text-primary hover:text-primary/80 underline underline-offset-2 decoration-primary/30 hover:decoration-primary/60 transition-colors" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
};

function StreamingSkeleton() {
  return (
    <div className="space-y-5 p-8">
      <Skeleton className="h-9 w-2/3 bg-white/5 rounded-lg" />
      <Skeleton className="h-1 w-full bg-white/[0.03] rounded" />
      <div className="space-y-3 pt-2">
        <Skeleton className="h-5 w-full bg-white/5 rounded" />
        <Skeleton className="h-5 w-5/6 bg-white/5 rounded" />
        <Skeleton className="h-5 w-4/5 bg-white/5 rounded" />
        <Skeleton className="h-5 w-full bg-white/5 rounded" />
      </div>
      <div className="pt-4 space-y-3">
        <Skeleton className="h-7 w-1/3 bg-white/5 rounded-lg" />
        <Skeleton className="h-5 w-full bg-white/5 rounded" />
        <Skeleton className="h-5 w-3/4 bg-white/5 rounded" />
        <Skeleton className="h-24 w-full bg-white/[0.03] rounded-xl" />
      </div>
      <div className="pt-4 space-y-3">
        <Skeleton className="h-7 w-2/5 bg-white/5 rounded-lg" />
        <Skeleton className="h-5 w-full bg-white/5 rounded" />
        <Skeleton className="h-5 w-5/6 bg-white/5 rounded" />
      </div>
    </div>
  );
}

function TableOfContents({ items, activeId }: { items: TocItem[]; activeId: string }) {
  if (items.length === 0) return null;
  const h2items = items.filter((i) => i.level === 2);
  return (
    <nav className="space-y-0.5">
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3 px-2">
        Contents
      </p>
      {h2items.map((item) => {
        const icon = getSectionIcon(item.text);
        const isActive = activeId === item.id;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all duration-150 group",
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]",
            )}
          >
            <span className="text-sm shrink-0">{icon}</span>
            <span className="truncate">{item.text}</span>
            {isActive && <ChevronRight className="w-3 h-3 ml-auto shrink-0" />}
          </a>
        );
      })}
    </nav>
  );
}

function ReadingProgress({ content }: { content: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!content) return;
    const handleScroll = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? (scrolled / total) * 100 : 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [content]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-white/[0.05]">
      <div
        className="h-full bg-gradient-to-r from-primary to-teal-400 transition-all duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export default function ArticlePage() {
  const { topicId } = useParams<{ topicId: string }>();
  const [, navigate] = useLocation();

  const searchParams = new URLSearchParams(window.location.search);
  const topicName = decodeURIComponent(searchParams.get("topic") ?? "");
  const roadmapId = searchParams.get("roadmap") ?? "";
  const roadmapTitle = decodeURIComponent(searchParams.get("roadmapTitle") ?? "Salesforce");

  const [article, setArticle] = useState<ArticleData | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "streaming" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeHeading, setActiveHeading] = useState("");
  const [tocOpen, setTocOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!topicId) return;
    fetchOrGenerate();
    return () => abortRef.current?.abort();
  }, [topicId]);

  useEffect(() => {
    const content = streamedContent || article?.content || "";
    const words = content.split(/\s+/).filter(Boolean).length;
    setWordCount(words);
    if (content) setTocItems(extractToc(content));
  }, [streamedContent, article]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveHeading(entry.target.id);
          }
        }
      },
      { rootMargin: "-10% 0px -80% 0px" }
    );
    const headings = document.querySelectorAll("h2[id], h3[id]");
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [tocItems]);

  const fetchOrGenerate = useCallback(async (forceRegenerate = false) => {
    if (forceRegenerate) {
      await fetch(`${BASE_URL}/api/articles/${topicId}`, { method: "DELETE" });
    }
    setStatus("loading");
    setStreamedContent("");
    setArticle(null);
    setErrorMsg("");
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${BASE_URL}/api/articles/${topicId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicName, roadmapId, roadmapTitle }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error("Failed to generate article");
      if (!res.body) throw new Error("No response body");

      setStatus("streaming");
      setStreaming(true);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.cached) {
              accumulated = parsed.content;
              setStreamedContent(parsed.content);
            } else if (parsed.content) {
              accumulated += parsed.content;
              setStreamedContent(accumulated);
            }
            if (parsed.done) {
              setStreaming(false);
              setStatus("done");
              setArticle({
                id: topicId ?? "",
                topicId: topicId ?? "",
                topicName,
                roadmapId,
                content: accumulated,
                createdAt: new Date().toISOString(),
              });
            }
          } catch { }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStreaming(false);
    }
  }, [topicId, topicName, roadmapId, roadmapTitle]);

  const displayContent = streamedContent || article?.content || "";
  const readingTime = Math.max(1, Math.round(wordCount / 200));

  return (
    <>
      <ReadingProgress content={displayContent} />
      <PageWrapper>
        <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6 sm:py-10">

          {/* Top bar */}
          <div className="flex items-center justify-between mb-6 gap-3">
            <button
              onClick={() => navigate("/roadmap")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Back to Roadmaps
            </button>
            <div className="flex items-center gap-2">
              {displayContent && (
                <button
                  onClick={() => setTocOpen(!tocOpen)}
                  className="xl:hidden flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-white/10 hover:border-white/20 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <List className="w-3.5 h-3.5" />
                  Contents
                </button>
              )}
              {status === "done" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground gap-1.5 h-8"
                  onClick={() => fetchOrGenerate(true)}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate
                </Button>
              )}
            </div>
          </div>

          {/* Hero */}
          <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-primary/8 via-transparent to-transparent p-6 sm:p-8 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5 uppercase tracking-widest">
                    {roadmapTitle}
                  </Badge>
                  {status === "done" && (
                    <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/5 gap-1 items-center">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Article ready
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold font-display tracking-tight mb-3">
                  {topicName || "Loading…"}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-mono">
                  {wordCount > 0 && (
                    <>
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" /> {wordCount.toLocaleString()} words
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> ~{readingTime} min read
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5" /> {tocItems.filter(i => i.level === 2).length} sections
                      </span>
                    </>
                  )}
                  {(status === "streaming" || status === "loading") && (
                    <span className="flex items-center gap-2 text-primary animate-pulse">
                      <Sparkles className="w-3.5 h-3.5" />
                      {status === "loading" ? "Preparing article…" : "AI writing article…"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile TOC */}
          {tocOpen && tocItems.length > 0 && (
            <div className="xl:hidden mb-6 rounded-xl border border-white/[0.08] bg-card/60 p-4">
              <TableOfContents items={tocItems} activeId={activeHeading} />
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
              <p className="text-sm text-destructive mb-4">{errorMsg}</p>
              <Button size="sm" onClick={() => fetchOrGenerate()}>Try again</Button>
            </div>
          )}

          {/* Main two-column layout */}
          <div className="flex gap-8 xl:gap-10 items-start">

            {/* Article body */}
            <div className="flex-1 min-w-0">
              {status === "loading" && (
                <div className="rounded-2xl border border-white/[0.06] bg-card/40 overflow-hidden">
                  <StreamingSkeleton />
                </div>
              )}

              {displayContent && (
                <div className="rounded-2xl border border-white/[0.06] bg-card/40 overflow-hidden">
                  <div className="p-6 sm:p-10 relative">
                    <div className="article-content">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight, rehypeSlug]}
                        components={markdownComponents}
                      >
                        {displayContent}
                      </ReactMarkdown>
                      {streaming && (
                        <span className="inline-block w-2 h-5 bg-primary rounded-sm animate-pulse ml-0.5 align-middle" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {status === "done" && (
                <div className="mt-6 flex items-center justify-between py-4 border-t border-white/[0.06]">
                  <button
                    onClick={() => navigate("/roadmap")}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    Back to Roadmaps
                  </button>
                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ↑ Back to top
                  </button>
                </div>
              )}
            </div>

            {/* Desktop TOC sidebar */}
            <aside className="hidden xl:block w-60 shrink-0">
              <div className="sticky top-20 rounded-xl border border-white/[0.06] bg-card/40 p-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
                {tocItems.length > 0 ? (
                  <TableOfContents items={tocItems} activeId={activeHeading} />
                ) : (
                  <div className="space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-6 w-full bg-white/[0.04] rounded" />
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </PageWrapper>
    </>
  );
}
