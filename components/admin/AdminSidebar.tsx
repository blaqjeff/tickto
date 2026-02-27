'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Calendar, Settings, Ticket } from 'lucide-react';

const navigation = [
    { name: 'Overview', href: '/admin', icon: LayoutDashboard },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Events', href: '/admin/events', icon: Calendar },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <div className="flex h-full w-64 flex-col bg-white/5 backdrop-blur-xl border-r border-white/10">
            <div className="flex h-16 items-center flex-shrink-0 px-6 mt-4">
                <Link href="/admin" className="flex items-center gap-2">
                    <div className="bg-primary/20 p-2 rounded-xl border border-primary/30">
                        <Ticket className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white leading-tight">Tickto</h1>
                        <p className="text-xs text-zinc-400 font-medium tracking-wide uppercase">Admin</p>
                    </div>
                </Link>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto">
                <nav className="flex-1 space-y-2 px-4 py-8">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`
                  group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200
                  ${isActive
                                        ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]'
                                        : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                    }
                `}
                            >
                                <item.icon
                                    className={`h-5 w-5 shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-zinc-500 group-hover:text-zinc-300'
                                        }`}
                                    aria-hidden="true"
                                />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Optional: Add a profile/logout section at the bottom later */}
            <div className="p-4 border-t border-white/10">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-500" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">Admin</p>
                        <p className="text-xs text-zinc-500 truncate">Owner</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
