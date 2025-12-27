"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppHeader() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <header
            className="sticky top-0 z-20 border-b backdrop-blur-md bg-[var(--background)]/80"
            style={{ borderColor: "var(--border)" }}
        >
            <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-105 transition-transform">
                        S
                    </div>
                    <span className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                        Signal Desk
                    </span>
                </Link>

                {/* Navigation */}
                <nav className="flex items-center gap-1">
                    <NavLink href="/" active={isActive("/")}>
                        Inbox
                    </NavLink>
                    <NavLink href="/queue" active={isActive("/queue")}>
                        Queue
                    </NavLink>
                    <NavLink href="/insights" active={isActive("/insights")}>
                        Insights
                    </NavLink>
                    <div className="w-px h-6 bg-[var(--border)] mx-2" />
                    <NavLink href="/settings" active={isActive("/settings")}>
                        Settings
                    </NavLink>
                </nav>
            </div>
        </header>
    );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${active
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background-hover)]"
                }
            `}
        >
            {children}
        </Link>
    );
}
