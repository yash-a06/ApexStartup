import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider } from "@/lib/user-context";

import Home from "@/pages/home";
import Problems from "@/pages/problems";
import Workspace from "@/pages/workspace";
import Profile from "@/pages/profile";
import Roadmap from "@/pages/roadmap";
import Article from "@/pages/article";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsVariant: "iconButton" as const,
  },
  variables: {
    colorPrimary: "#00E5FF",
    colorForeground: "hsl(210, 40%, 98%)",
    colorMutedForeground: "hsl(215, 20%, 65%)",
    colorDanger: "hsl(350, 89%, 60%)",
    colorBackground: "hsl(230, 28%, 4%)",
    colorInput: "hsl(230, 28%, 12%)",
    colorInputForeground: "hsl(210, 40%, 98%)",
    colorNeutral: "hsl(230, 28%, 20%)",
    fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-[hsl(230,28%,6%)] border border-white/[0.08] rounded-xl w-[440px] max-w-full overflow-hidden shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-white font-bold tracking-tight",
    headerSubtitle: "text-[hsl(215,20%,65%)]",
    socialButtonsBlockButtonText: "text-white font-medium",
    formFieldLabel: "text-[hsl(210,40%,90%)] font-medium",
    footerActionLink: "text-[#00E5FF] hover:text-[#00E5FF]/80 font-medium",
    footerActionText: "text-[hsl(215,20%,65%)]",
    dividerText: "text-[hsl(215,20%,65%)]",
    identityPreviewEditButton: "text-[#00E5FF]",
    formFieldSuccessText: "text-[hsl(152,69%,41%)]",
    alertText: "text-white",
    logoBox: "flex justify-center mb-1",
    logoImage: "h-10 w-auto",
    socialButtonsBlockButton:
      "border-white/[0.08] bg-white/5 hover:bg-white/10 text-white transition-colors",
    formButtonPrimary:
      "bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-[hsl(230,28%,4%)] font-semibold transition-colors",
    formFieldInput:
      "bg-[hsl(230,28%,12%)] border-white/[0.08] text-white focus:border-[#00E5FF]/50",
    footerAction: "border-t border-white/[0.08]",
    dividerLine: "bg-white/[0.08]",
    alert: "border-white/[0.08] bg-white/5",
    otpCodeFieldInput: "bg-[hsl(230,28%,12%)] border-white/[0.08] text-white",
    formFieldRow: "",
    main: "",
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

const authFeatures = [
  { icon: "⚡", title: "Real Apex challenges", desc: "Triggers, SOQL, async patterns, governor limits" },
  { icon: "📊", title: "Track your progress", desc: "Streaks, acceptance rate, solved counts by category" },
  { icon: "🗺️", title: "Guided roadmaps", desc: "Structured learning paths from beginner to expert" },
  { icon: "🏆", title: "Leaderboards", desc: "See how you rank against other Apex developers" },
];

function AuthLayout({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="min-h-[100dvh] flex bg-background">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] flex-col justify-between p-10 xl:p-14 bg-[hsl(230,28%,5%)] border-r border-white/[0.06] relative overflow-hidden shrink-0">
        {/* Background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,hsl(186,100%,50%,0.08),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-[radial-gradient(ellipse_60%_80%_at_50%_120%,hsl(186,100%,50%,0.06),transparent)]" />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(hsl(186,100%,50%) 1px,transparent 1px),linear-gradient(90deg,hsl(186,100%,50%) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

        <div className="relative z-10">
          <a href={basePath || "/"} className="flex items-center gap-2.5 group w-fit">
            <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors border border-primary/20">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            </div>
            <span className="font-bold text-lg tracking-tight font-display text-foreground">Apex Arena</span>
          </a>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-3xl xl:text-4xl font-extrabold font-display tracking-tight text-foreground leading-tight mb-3">
              {title}
            </h1>
            <p className="text-muted-foreground leading-relaxed">{subtitle}</p>
          </div>
          <div className="space-y-4">
            {authFeatures.map((f) => (
              <div key={f.title} className="flex items-start gap-3.5 group">
                <div className="w-9 h-9 rounded-lg bg-primary/8 border border-primary/15 flex items-center justify-center text-base shrink-0 group-hover:bg-primary/15 transition-colors">
                  {f.icon}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground font-display">{f.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-muted-foreground/60 font-mono">
            © {new Date().getFullYear()} Apex Arena · Built for Salesforce developers
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-auto">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_0%,hsl(186,100%,50%,0.04),transparent)]" />
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex items-center gap-2.5">
          <div className="bg-primary/10 p-2 rounded-lg border border-primary/20">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
          </div>
          <span className="font-bold text-lg tracking-tight font-display">Apex Arena</span>
        </div>
        <div className="relative z-10 w-full flex justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthLayout
      title="Master Salesforce Apex"
      subtitle="Sign in to track your progress, resume where you left off, and climb the leaderboards."
    >
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        forceRedirectUrl={`${basePath}/profile`}
      />
    </AuthLayout>
  );
}

function SignUpPage() {
  return (
    <AuthLayout
      title="Join 1000+ Apex developers"
      subtitle="Create your free account and start solving real Salesforce Apex challenges today."
    >
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        forceRedirectUrl={`${basePath}/profile`}
      />
    </AuthLayout>
  );
}

function Router() {
  return (
    <UserProvider>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/problems" component={Problems} />
        <Route path="/problems/:slug" component={Workspace} />
        <Route path="/profile" component={Profile} />
        <Route path="/roadmap" component={Roadmap} />
        <Route path="/roadmap/article/:topicId" component={Article} />
        <Route component={NotFound} />
      </Switch>
    </UserProvider>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to your Apex Arena account",
          },
        },
        signUp: {
          start: {
            title: "Join Apex Arena",
            subtitle: "Start mastering Salesforce Apex today",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Router />
          <Toaster theme="dark" position="bottom-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
