import { useState, useEffect, useMemo } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { useUser } from "@/lib/user-context";
import {
  useGetUser,
  useGetUserStats,
  useUpsertUser,
  getGetUserQueryKey,
  getGetUserStatsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useClerk, useUser as useClerkUser } from "@clerk/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Edit2, Check, Flame, Target, Activity, Calendar,
  Code2, CheckCircle2, LogIn, X, Zap, Trophy, ExternalLink, Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, formatDistanceToNow, subDays, startOfDay } from "date-fns";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { stiffness: 50, damping: 20 });
  const rounded = useTransform(springValue, (v) => Math.round(v));
  useEffect(() => { motionValue.set(value); }, [value, motionValue]);
  return <motion.span>{rounded}</motion.span>;
}

function ActivityHeatmap({ activity }: { activity: Array<{ createdAt: Date | string }> }) {
  const WEEKS = 26;
  const today = startOfDay(new Date());

  const dayMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of activity) {
      const key = format(startOfDay(new Date(a.createdAt)), "yyyy-MM-dd");
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [activity]);

  const weeks: Array<Array<{ date: Date; count: number }>> = [];
  const totalDays = WEEKS * 7;
  const startDate = subDays(today, totalDays - 1);
  const startDow = startDate.getDay();
  const paddedStart = subDays(startDate, startDow);

  for (let w = 0; w < WEEKS + 1; w++) {
    const week: Array<{ date: Date; count: number }> = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(paddedStart);
      date.setDate(paddedStart.getDate() + w * 7 + d);
      if (date > today) continue;
      const key = format(date, "yyyy-MM-dd");
      week.push({ date, count: dayMap.get(key) ?? 0 });
    }
    if (week.length) weeks.push(week);
  }

  const totalActivity = Array.from(dayMap.values()).reduce((a, b) => a + b, 0);
  const activeDays = dayMap.size;

  function cellColor(count: number) {
    if (count === 0) return "bg-white/[0.04] border-white/[0.04]";
    if (count === 1) return "bg-primary/20 border-primary/30";
    if (count === 2) return "bg-primary/40 border-primary/50";
    if (count <= 4) return "bg-primary/65 border-primary/70 shadow-[0_0_4px_hsl(var(--primary)/0.3)]";
    return "bg-primary border-primary/80 shadow-[0_0_8px_hsl(var(--primary)/0.5)]";
  }

  const months: string[] = [];
  for (let w = 0; w < weeks.length; w++) {
    const first = weeks[w][0];
    if (first && (w === 0 || format(first.date, "MMM") !== format(weeks[w - 1]?.[0]?.date ?? first.date, "MMM"))) {
      months.push(format(first.date, "MMM"));
    } else {
      months.push("");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-muted-foreground font-mono">
          <span className="text-foreground font-semibold">{totalActivity}</span> submissions · <span className="text-foreground font-semibold">{activeDays}</span> active days (last 6 months)
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>Less</span>
          {["bg-white/[0.04]", "bg-primary/20", "bg-primary/40", "bg-primary/65", "bg-primary"].map((c, i) => (
            <div key={i} className={cn("w-2.5 h-2.5 rounded-[3px] border border-white/10", c)} />
          ))}
          <span>More</span>
        </div>
      </div>
      <div className="overflow-x-auto pb-1">
        <div>
          <div className="flex gap-0.5 mb-0.5 min-w-max">
            {weeks.map((_, w) => (
              <div key={w} className="w-3 text-[9px] text-muted-foreground/50 font-mono leading-none text-center">
                {months[w] || ""}
              </div>
            ))}
          </div>
          <div className="flex gap-0.5 min-w-max">
            {weeks.map((week, w) => (
              <div key={w} className="flex flex-col gap-0.5">
                {week.map(({ date, count }, d) => (
                  <div
                    key={d}
                    title={`${format(date, "MMM d, yyyy")}: ${count} submission${count !== 1 ? "s" : ""}`}
                    className={cn("w-3 h-3 rounded-[3px] border transition-all cursor-default hover:scale-125", cellColor(count))}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { userId } = useUser();
  const { user: clerkUser } = useClerkUser();
  const { openUserProfile } = useClerk();
  const queryClient = useQueryClient();

  const { data: user, isLoading: loadingUser } = useGetUser(userId, {
    query: { enabled: !!userId, queryKey: getGetUserQueryKey(userId) }
  });
  const { data: stats, isLoading: loadingStats } = useGetUserStats(userId, {
    query: { enabled: !!userId, queryKey: getGetUserStatsQueryKey(userId) }
  });

  const upsertMut = useUpsertUser();
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");

  useEffect(() => {
    if (user && !isEditingName) setEditName(user.username);
    if (user && !isEditingBio) setEditBio(user.bio ?? "");
  }, [user]);

  const handleSaveName = () => {
    if (!editName.trim()) return;
    upsertMut.mutate(
      { data: { id: userId, username: editName } },
      {
        onSuccess: () => {
          setIsEditingName(false);
          queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(userId) });
          toast.success("Username updated");
        },
        onError: () => toast.error("Failed to update username"),
      }
    );
  };

  const handleSaveBio = () => {
    upsertMut.mutate(
      { data: { id: userId, username: user?.username ?? editName, bio: editBio || null } },
      {
        onSuccess: () => {
          setIsEditingBio(false);
          queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(userId) });
          toast.success("Bio updated");
        },
        onError: () => toast.error("Failed to update bio"),
      }
    );
  };

  if (!userId) {
    return (
      <PageWrapper className="container max-w-screen-xl px-4 py-20 mx-auto">
        <div className="flex flex-col items-center justify-center text-center gap-5 max-w-sm mx-auto">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-teal-400/10 border border-primary/20 flex items-center justify-center">
            <LogIn className="w-9 h-9 text-primary/70" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold mb-2">Sign in to Apex Arena</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Track your progress, view streaks, and see all solved problems after signing in.
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="outline" className="border-white/10 hover:bg-muted/50">
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-[0_0_15px_hsl(var(--primary)/0.2)]">
              <Link href="/sign-up">Create Account</Link>
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-4 w-full pt-2">
            {[
              { icon: "⚡", label: "Real Apex challenges" },
              { icon: "🔥", label: "Daily streaks" },
              { icon: "📊", label: "Progress tracking" },
            ].map((f) => (
              <div key={f.label} className="text-center p-3 rounded-xl bg-card/50 border border-white/5">
                <div className="text-2xl mb-1">{f.icon}</div>
                <div className="text-xs text-muted-foreground leading-tight">{f.label}</div>
              </div>
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (loadingUser || loadingStats) {
    return (
      <PageWrapper className="container max-w-screen-xl px-3 sm:px-4 py-8 sm:py-12 mx-auto">
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-[420px] rounded-xl bg-secondary/30 border border-white/5" />
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-28 rounded-xl bg-secondary/30 border border-white/5" />
            <Skeleton className="h-[320px] rounded-xl bg-secondary/30 border border-white/5" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!user || !stats) {
    return (
      <PageWrapper className="container max-w-screen-xl px-4 py-20 mx-auto text-center font-display text-2xl text-muted-foreground">
        User not found
      </PageWrapper>
    );
  }

  const avatarSrc = clerkUser?.imageUrl || user.avatarUrl;
  const displayName = user.username;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <PageWrapper className="container max-w-screen-xl px-3 sm:px-4 py-6 sm:py-10 mx-auto">
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">

        {/* Left column */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-5">
          {/* User card */}
          <Card className="border-white/5 overflow-hidden bg-card/50 backdrop-blur-sm shadow-xl">
            <div className="h-24 sm:h-28 bg-[url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center relative">
              <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
              <div className="absolute inset-0 bg-primary/10 mix-blend-overlay" />
            </div>
            <CardContent className="pt-0 relative px-4 sm:px-5 pb-5">
              {/* Avatar */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-card flex items-center justify-center -mt-10 sm:-mt-12 mb-4 shadow-xl relative z-10 overflow-hidden">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 to-teal-400/20 flex items-center justify-center text-3xl sm:text-4xl font-display font-bold text-primary">
                    {initials}
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="mb-2">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-9 font-display font-bold text-base bg-background border-primary/50 focus-visible:ring-primary"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setIsEditingName(false); }}
                    />
                    <Button size="sm" onClick={handleSaveName} disabled={upsertMut.isPending} className="h-9 px-3 shrink-0">
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditingName(false)} className="h-9 px-2 shrink-0">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight font-display truncate">{displayName}</h1>
                    <button
                      onClick={() => { setEditName(displayName); setIsEditingName(true); }}
                      className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-primary transition-all"
                      aria-label="Edit username"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Bio */}
              <div className="mb-4">
                {isEditingBio ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="Write a short bio about yourself…"
                      className="text-sm bg-background border-primary/30 focus-visible:ring-primary resize-none h-20"
                      maxLength={160}
                      autoFocus
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground font-mono">{editBio.length}/160</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setIsEditingBio(false)} className="h-7 px-2 text-xs">Cancel</Button>
                        <Button size="sm" onClick={handleSaveBio} disabled={upsertMut.isPending} className="h-7 px-3 text-xs">Save</Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="group cursor-pointer"
                    onClick={() => { setEditBio(user.bio ?? ""); setIsEditingBio(true); }}
                  >
                    {user.bio ? (
                      <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                        {user.bio}
                        <Edit2 className="w-3 h-3 inline ml-1.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground/40 italic group-hover:text-muted-foreground/70 transition-colors flex items-center gap-1.5">
                        <Edit2 className="w-3 h-3" />
                        Add a bio…
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-5">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                Joined {format(new Date(user.joinedAt), "MMMM yyyy")}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3 py-4 border-t border-white/5">
                <div>
                  <div className="text-2xl sm:text-3xl font-mono font-bold text-foreground mb-0.5">
                    <AnimatedNumber value={stats.solvedCount} />
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Solved</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-mono font-bold text-success mb-0.5 drop-shadow-[0_0_8px_hsl(var(--success)/0.3)]">
                    <AnimatedNumber value={stats.acceptanceRate} />%
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Acceptance</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-mono font-bold flex items-center gap-1.5 mb-0.5">
                    <AnimatedNumber value={stats.currentStreakDays} />
                    <Flame className="w-5 h-5 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Day Streak</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-mono font-bold text-foreground mb-0.5">
                    <AnimatedNumber value={stats.submissionCount} />
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Submissions</div>
                </div>
              </div>

              {/* Clerk manage account */}
              <button
                onClick={() => openUserProfile()}
                className="w-full mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-2 px-3 rounded-lg border border-white/5 hover:border-white/10 hover:bg-muted/30"
              >
                <Settings className="w-3.5 h-3.5" />
                Manage account &amp; security
                <ExternalLink className="w-3 h-3" />
              </button>
            </CardContent>
          </Card>

          {/* Difficulty breakdown */}
          <Card className="border-white/5 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3 px-4 sm:px-5 pt-4">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" /> Difficulty Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-5 pb-4 pt-0">
              <div className="grid grid-cols-3 gap-2">
                {stats.byDifficulty.map((d, i) => (
                  <motion.div key={d.difficulty} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                    <div className={cn(
                      "rounded-xl p-3 text-center border",
                      d.difficulty === "easy" ? "bg-success/5 border-success/20"
                        : d.difficulty === "medium" ? "bg-warning/5 border-warning/20"
                        : "bg-destructive/5 border-destructive/20"
                    )}>
                      <div className="text-xl font-mono font-bold mb-1 text-foreground">
                        <AnimatedNumber value={d.solved} />
                      </div>
                      <div className="text-[9px] uppercase tracking-widest font-semibold" style={{
                        color: d.difficulty === "easy" ? "hsl(var(--success))" : d.difficulty === "medium" ? "hsl(var(--warning))" : "hsl(var(--destructive))"
                      }}>
                        {d.difficulty}
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-0.5 font-mono">/ {d.total}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Category progress */}
          <Card className="border-white/5 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3 px-4 sm:px-5 pt-4 border-b border-white/5">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> Category Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 px-4 sm:px-5 pb-4 space-y-4">
              {stats.byCategory.map((c, i) => {
                const pct = c.total > 0 ? (c.solved / c.total) * 100 : 0;
                const labels: Record<string, string> = {
                  trigger: "Triggers",
                  async_apex: "Async Apex",
                  classes: "Classes",
                  soql: "SOQL",
                };
                return (
                  <motion.div
                    key={c.category}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="flex justify-between text-xs mb-1.5 font-medium">
                      <span className="text-foreground">{labels[c.category] ?? c.category}</span>
                      <span className="font-mono text-muted-foreground">
                        {c.solved}<span className="opacity-40"> / {c.total}</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1, ease: "easeOut", delay: i * 0.1 + 0.2 }}
                        className="h-full bg-gradient-to-r from-primary to-teal-400 shadow-[0_0_10px_hsl(var(--primary)/0.5)]"
                      />
                    </div>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">
          {/* Activity heatmap */}
          <Card className="border-white/5 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3 px-4 sm:px-6 pt-4 border-b border-white/5">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> Coding Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 px-4 sm:px-6 pb-4">
              <ActivityHeatmap activity={stats.recentActivity} />
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-white/5 bg-card/50 backdrop-blur-sm flex flex-col" style={{ minHeight: "320px" }}>
            <CardHeader className="border-b border-white/5 bg-secondary/20 px-4 sm:px-6 py-3.5">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Activity className="w-4 h-4 text-muted-foreground" /> Recent Submissions
                {stats.recentActivity.length > 0 && (
                  <span className="ml-auto text-xs font-mono text-muted-foreground font-normal">
                    {stats.recentActivity.length} shown
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto custom-scrollbar">
              {stats.recentActivity.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-secondary/50 flex items-center justify-center mb-5 border border-white/5">
                    <Code2 className="w-7 h-7 opacity-50" />
                  </div>
                  <p className="font-display font-medium text-base sm:text-lg text-foreground mb-2">No activity yet</p>
                  <p className="text-sm max-w-xs mb-6 leading-relaxed">
                    Your problem-solving journey starts here. Head over to the arena to write your first Apex.
                  </p>
                  <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-[0_0_15px_hsl(var(--primary)/0.2)]">
                    <Link href="/problems">Enter the Arena</Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {stats.recentActivity.map((activity, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="px-4 sm:px-5 py-3 hover:bg-secondary/30 transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium font-display text-sm mb-0.5 truncate">
                          <Link href={`/problems/${activity.problemSlug}`} className="text-foreground hover:text-primary transition-colors">
                            {activity.problemTitle}
                          </Link>
                        </div>
                        <div className="text-[10px] sm:text-xs font-mono text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-mono text-[10px] px-2 py-0.5 rounded-md shrink-0",
                          activity.status === "accepted"
                            ? "bg-success/10 text-success border-success/30 shadow-[0_0_8px_hsl(var(--success)/0.15)]"
                            : "bg-destructive/5 text-destructive border-destructive/20",
                        )}
                      >
                        {activity.status === "accepted" ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Accepted
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <X className="w-3 h-3" /> {activity.status.replace("_", " ")}
                          </span>
                        )}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Badges / achievements */}
          <Card className="border-white/5 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3 px-4 sm:px-6 pt-4 border-b border-white/5">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" /> Achievements
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 px-4 sm:px-6 pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[
                  { icon: "🔥", label: "First Solve", desc: "Submit your first accepted solution", earned: stats.solvedCount >= 1 },
                  { icon: "⚡", label: "Trigger Master", desc: "Solve 5 trigger problems", earned: (stats.byCategory.find(c => c.category === "trigger")?.solved ?? 0) >= 5 },
                  { icon: "🎯", label: "Accuracy", desc: "Maintain 70%+ acceptance rate", earned: stats.acceptanceRate >= 70 },
                  { icon: "🔟", label: "Top 10", desc: "Solve 10 unique problems", earned: stats.solvedCount >= 10 },
                  { icon: "🗓️", label: "Consistent", desc: "Maintain a 3-day streak", earned: stats.currentStreakDays >= 3 },
                  { icon: "🏃", label: "On a Roll", desc: "Submit 10+ times total", earned: stats.submissionCount >= 10 },
                  { icon: "📚", label: "Learner", desc: "Solve a problem in every category", earned: stats.byCategory.every(c => c.solved >= 1) },
                  { icon: "💎", label: "Elite", desc: "Solve a hard problem", earned: (stats.byDifficulty.find(d => d.difficulty === "hard")?.solved ?? 0) >= 1 },
                ].map((badge) => (
                  <div
                    key={badge.label}
                    className={cn(
                      "rounded-xl p-3 text-center border transition-all",
                      badge.earned
                        ? "bg-primary/5 border-primary/20 shadow-[0_0_12px_hsl(var(--primary)/0.05)]"
                        : "bg-secondary/20 border-white/5 opacity-40 grayscale"
                    )}
                    title={badge.desc}
                  >
                    <div className="text-2xl mb-1.5">{badge.icon}</div>
                    <div className="text-[10px] font-semibold font-display text-foreground leading-tight">{badge.label}</div>
                    {badge.earned && (
                      <div className="text-[9px] text-primary mt-0.5 font-mono">Earned</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
