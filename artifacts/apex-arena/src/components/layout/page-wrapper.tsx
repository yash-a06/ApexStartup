import { ReactNode } from "react";
import { Navbar } from "./navbar";

export function PageWrapper({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className={`flex-1 flex flex-col ${className}`}>
        {children}
      </main>
    </div>
  );
}
