import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminGuard } from '@/components/admin/AdminGuard';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AdminGuard>
            <div className="flex h-screen bg-[#0a0a0a] overflow-hidden text-zinc-100 font-sans selection:bg-primary/30">

                {/* Background glow effects for premium feel */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] opacity-50 mix-blend-screen" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] opacity-50 mix-blend-screen" />
                </div>

                {/* Sidebar */}
                <AdminSidebar />

                {/* Main Content Area */}
                <div className="flex flex-1 flex-col overflow-hidden relative z-10">

                    {/* Top Header/Navigation (Mobile menu toggle in future) */}
                    <header className="flex h-16 shrink-0 items-center gap-x-4 border-b border-white/5 px-6 backdrop-blur-sm">
                        <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 justify-end items-center">
                            {/* Add global search or top nav items here later if needed */}
                            <div className="text-sm text-zinc-400">
                                Tickto Admin Portal
                            </div>
                        </div>
                    </header>

                    {/* Page Content */}
                    <main className="flex-1 overflow-y-auto">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 h-full">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </AdminGuard>
    );
}
