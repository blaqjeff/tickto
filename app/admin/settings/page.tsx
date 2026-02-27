'use client';

export default function AdminSettingsPage() {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    Admin Settings
                </h1>
                <p className="text-zinc-400">
                    Manage global platform settings and configurations.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">

                {/* General Settings */}
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md">
                    <h3 className="text-lg font-medium text-white mb-4">General Platform Configurations</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-zinc-200">Maintenance Mode</p>
                                <p className="text-xs text-zinc-500">Temporarily disable the platform for updates.</p>
                            </div>
                            <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-zinc-400 cursor-not-allowed">
                                Disabled
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-zinc-200">New User Registrations</p>
                                <p className="text-xs text-zinc-500">Allow new users to sign up.</p>
                            </div>
                            <button className="px-4 py-2 bg-primary/20 border border-primary/30 text-primary rounded-lg text-sm font-medium">
                                Enabled
                            </button>
                        </div>
                    </div>
                </div>

                {/* Financial Settings */}
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md">
                    <h3 className="text-lg font-medium text-white mb-4">Financial & Fees</h3>
                    <div className="space-y-4 text-center">
                        <p className="text-sm text-zinc-500 italic mt-6">
                            Treasury and Fee settings layout coming soon.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
