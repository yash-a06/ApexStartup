import { PageWrapper } from "@/components/layout/page-wrapper";
import { Link } from "wouter";
import { useGetPlatformStats, useListFeaturedProblems } from "@workspace/api-client-react";
import { Code2, Zap, Layers, Database, ArrowRight, Users, Activity, Terminal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

const categoryMeta = {
  trigger: { icon: Zap, label: "Triggers", desc: "Master before/after and bulkification", color: "text-cyan-400", bg: "bg-cyan-400/10", border: "group-hover:border-cyan-400/50" },
  async_apex: { icon: Activity, label: "Async Apex", desc: "Batch, Future, Queueable, Schedulable", color: "text-mint-400", bg: "bg-emerald-400/10", border: "group-hover:border-emerald-400/50" },
  classes: { icon: Layers, label: "Classes", desc: "OOP, inheritance, and design patterns", color: "text-indigo-400", bg: "bg-indigo-400/10", border: "group-hover:border-indigo-400/50" },
  soql: { icon: Database, label: "SOQL", desc: "Queries, relationships, and aggregates", color: "text-teal-400", bg: "bg-teal-400/10", border: "group-hover:border-teal-400/50" },
} as const;

function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { stiffness: 50, damping: 20 });
  const rounded = useTransform(springValue, (v) => Math.round(v));

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return <motion.span>{rounded}</motion.span>;
}

export default function Home() {
  const { data: stats, isLoading: loadingStats } = useGetPlatformStats();
  const { data: featured, isLoading: loadingFeatured } = useListFeaturedProblems();

  return (
    <PageWrapper>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.08] pt-12 pb-10 sm:pt-28 sm:pb-20 lg:pt-36 lg:pb-28 bg-background">
        <div className="absolute inset-0 z-0 bg-grid-pattern opacity-20 mask-image-radial-gradient" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="container max-w-screen-xl px-4 md:px-6 mx-auto relative z-10 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          {/* Text */}
          <div className="flex-1 text-center lg:text-left w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Badge variant="outline" className="mb-4 sm:mb-6 border-primary/30 text-primary bg-primary/10 px-3 py-1 font-mono text-[10px] sm:text-xs uppercase tracking-widest">
                Salesforce Developer Practice Arena
              </Badge>
              <h1 className="text-3xl xs:text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tighter mb-4 sm:mb-6 font-display leading-[1.1]">
                Master Apex{" "}
                <br className="hidden lg:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-400 animate-pulse-slow glow-text">
                  The Hard Way
                </span>
              </h1>
              <p className="max-w-2xl mx-auto lg:mx-0 text-sm sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-10 font-sans font-light leading-relaxed">
                Real-world scenarios. Strict governor limits. Instant feedback. Level up your Salesforce development skills in a competitive environment.
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                <Link
                  href="/problems"
                  className="inline-flex h-11 sm:h-12 items-center justify-center rounded-md bg-primary px-6 sm:px-8 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all hover:bg-primary/90 hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-testid="link-explore-problems"
                >
                  Start Coding
                </Link>
                <Link
                  href="/problems"
                  className="inline-flex h-11 sm:h-12 items-center justify-center rounded-md border border-white/10 bg-secondary/50 backdrop-blur-sm px-6 sm:px-8 text-sm font-semibold shadow-sm transition-all hover:bg-secondary hover:border-white/20 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Browse Problems
                </Link>
              </div>

              <div className="mt-7 sm:mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-8 border-t border-white/10 pt-5 sm:pt-8">
                <div className="text-xs text-muted-foreground font-mono">Trusted by developers at</div>
                <div className="flex gap-4 opacity-50 grayscale">
                  <div className="font-bold font-display tracking-tight text-base sm:text-xl">CloudInc</div>
                  <div className="font-bold font-display tracking-tight text-base sm:text-xl italic">Nexus</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Code snippet — hidden on xs, shown sm+ */}
          <motion.div
            className="hidden sm:block flex-1 w-full max-w-lg"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="rounded-xl border border-white/10 bg-[#0d1117] overflow-hidden shadow-2xl shadow-primary/5 relative group">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center px-4 py-3 border-b border-white/5 bg-[#161b22]">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="ml-4 text-xs font-mono text-muted-foreground flex items-center gap-2 truncate">
                  <Terminal className="w-3 h-3 shrink-0" /> AccountTriggerHandler.cls
                </div>
              </div>
              <div className="p-4 font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto h-[220px] sm:h-[240px]">
                <div className="text-purple-400">public class <span className="text-blue-400">AccountTriggerHandler</span> {"{"}</div>
                <div className="pl-4 text-purple-400">public static void <span className="text-blue-400">beforeInsert</span>(List&lt;Account&gt; newList) {"{"}</div>
                <div className="pl-8 text-gray-400">// Ensure all new accounts have a domain</div>
                <div className="pl-8 text-purple-400">for <span className="text-foreground">(Account acc : newList) {"{"}</span></div>
                <div className="pl-12 text-foreground">if <span className="text-purple-400">(</span>acc.Website != <span className="text-blue-400">null</span><span className="text-purple-400">) {"{"}</span></div>
                <div className="pl-16 text-foreground">acc.Domain__c = extractDomain<span className="text-purple-400">(</span>acc.Website<span className="text-purple-400">)</span>;</div>
                <div className="pl-12 text-purple-400">{"}"}</div>
                <div className="pl-8 text-purple-400">{"}"}</div>
                <div className="pl-4 text-purple-400">{"}"}</div>
                <div className="text-purple-400">{"}"}</div>
                <div className="mt-2 text-primary animate-pulse">_</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Ribbon */}
      <div className="border-b border-white/[0.08] bg-secondary/30 backdrop-blur-md">
        <div className="container max-w-screen-xl px-4 md:px-6 mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/[0.08]">
            <StatCard icon={Code2} value={stats?.totalProblems} label="Problems" loading={loadingStats} />
            <StatCard icon={Activity} value={stats?.totalSubmissions} label="Submissions" loading={loadingStats} />
            <StatCard icon={Users} value={stats?.totalUsers} label="Developers" loading={loadingStats} />
            <StatCard icon={Zap} value={99.9} label="Uptime %" loading={false} />
          </div>
        </div>
      </div>

      <div className="container max-w-screen-xl px-4 md:px-6 mx-auto py-10 sm:py-16 md:py-24 space-y-12 sm:space-y-20 lg:space-y-28">

        {/* Training Tracks */}
        <section>
          <div className="flex items-center justify-between mb-4 sm:mb-8">
            <h2 className="text-xl sm:text-3xl font-bold tracking-tight font-display">Training Tracks</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {(Object.entries(categoryMeta) as [keyof typeof categoryMeta, (typeof categoryMeta)[keyof typeof categoryMeta]][]).map(
              ([key, meta], i) => {
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Link href={`/problems?category=${key}`} className="block group h-full">
                      <Card className={cn("h-full bg-card hover:bg-secondary/50 transition-all duration-300 border-white/5 relative overflow-hidden glow-card hover:-translate-y-1", meta.border)}>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <CardHeader className="p-4 sm:p-6">
                          <div className={cn("w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-3 sm:mb-6 shadow-inner", meta.bg, meta.color)}>
                            <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
                          </div>
                          <CardTitle className="text-sm sm:text-xl font-display group-hover:text-primary transition-colors leading-snug">{meta.label}</CardTitle>
                          <CardDescription className="text-xs font-light mt-1 leading-relaxed hidden sm:block">{meta.desc}</CardDescription>
                        </CardHeader>
                      </Card>
                    </Link>
                  </motion.div>
                );
              }
            )}
          </div>
        </section>

        {/* Featured Challenges */}
        <section>
          <div className="flex items-center justify-between mb-4 sm:mb-8">
            <h2 className="text-xl sm:text-3xl font-bold tracking-tight font-display">Featured Challenges</h2>
            <Link href="/problems" className="text-xs sm:text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 group">
              View all <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid gap-2.5">
            {loadingFeatured
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full bg-secondary rounded-xl" />
                ))
              : featured?.map((p, i) => {
                  const diffColor =
                    p.difficulty === "easy" ? "text-success border-success/25 bg-success/8"
                    : p.difficulty === "medium" ? "text-warning border-warning/25 bg-warning/8"
                    : "text-destructive border-destructive/25 bg-destructive/8";
                  const dotColor =
                    p.difficulty === "easy" ? "bg-success shadow-[0_0_4px_hsl(var(--success))]"
                    : p.difficulty === "medium" ? "bg-warning shadow-[0_0_4px_hsl(var(--warning))]"
                    : "bg-destructive shadow-[0_0_4px_hsl(var(--destructive))]";
                  return (
                    <motion.div
                      key={p.id}
                      className="w-full min-w-0"
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 }}
                    >
                      <Link href={`/problems/${p.slug}`} className="block w-full min-w-0">
                        <div className="rounded-xl border border-white/5 hover:border-primary/30 bg-card hover:bg-secondary/40 transition-all duration-300 relative overflow-hidden group w-full">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="p-3.5 sm:p-5">
                            <div className="flex items-center gap-2 mb-2 w-full min-w-0">
                              <span className={cn("w-2 h-2 rounded-full shrink-0", dotColor)} />
                              <h3 className="font-semibold text-sm sm:text-base font-display leading-snug min-w-0 flex-1 group-hover:text-primary transition-colors" style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
                                {p.title}
                              </h3>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-4">
                              <span className={cn("text-[10px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border shrink-0", diffColor)}>
                                {p.difficulty}
                              </span>
                              {p.tags.slice(0, 2).map((t) => (
                                <span key={t} className="text-[10px] font-mono text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                  {t}
                                </span>
                              ))}
                              <span className="ml-auto text-[10px] font-mono text-muted-foreground shrink-0">
                                {p.acceptanceRate}% acceptance
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  loading,
}: {
  icon: React.ElementType;
  value: number | string | undefined;
  label: string;
  loading: boolean;
}) {
  const numValue = typeof value === "number" ? value : parseFloat(value as string) || 0;

  return (
    <div className="flex flex-col items-center p-4 sm:p-6 md:p-8 hover:bg-white/[0.02] transition-colors relative group overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <Icon className="w-4 h-4 sm:w-6 sm:h-6 text-muted-foreground mb-2 sm:mb-4 group-hover:text-primary transition-colors" />
      {loading ? (
        <Skeleton className="h-7 sm:h-10 w-14 sm:w-20 mb-1 bg-white/10" />
      ) : (
        <div className="text-2xl sm:text-4xl font-extrabold text-foreground font-mono tracking-tight mb-0.5 sm:mb-1">
          {typeof value === "number" ? <AnimatedNumber value={numValue} /> : value}
        </div>
      )}
      <div className="text-[9px] sm:text-xs text-muted-foreground uppercase tracking-[0.15em] font-semibold">{label}</div>
    </div>
  );
}
