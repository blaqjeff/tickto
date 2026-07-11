'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Mic2, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

type Role = 'fan' | 'organizer' | null;

export default function OnboardingPage() {
    const { user, authenticated } = usePrivy();
    const router = useRouter();

    const [step, setStep] = useState<1 | 2>(1);
    const [role, setRole] = useState<Role>(null);
    const [username, setUsername] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Security check: if not authenticated, don't show the form (or redirect to home)
    if (!authenticated || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
            </div>
        );
    }

    const handleRoleSelect = (selectedRole: Role) => {
        setRole(selectedRole);
        // Add a slight delay for the animation to look nice before moving to step 2
        setTimeout(() => setStep(2), 300);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!username || username.length < 3) {
            setError("Username must be at least 3 characters");
            return;
        }

        if (!role) {
            setError("Please go back and select a role");
            return;
        }

        setIsSubmitting(true);

        try {
            // Upsert user into Supabase
            const { error: dbError } = await supabase
                .from('users')
                .upsert({
                    id: user.id,
                    primary_role: role,
                    username: username.toLowerCase(),
                    onboarded: true
                });

            if (dbError) {
                if (dbError.code === '23505') { // Postgres Unique Violation
                    throw new Error("This username is already taken. Please choose another.");
                }
                throw dbError;
            }

            // Successfully onboarded. Redirect based on role
            if (role === 'organizer') {
                router.replace('/dashboard');
            } else {
                router.replace('/discover');
            }

        } catch (err: any) {
            console.error("Onboarding error:", err);
            setError(err.message || "Failed to save profile. Please try again.");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="relative z-10 w-full max-w-2xl mx-auto">
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-white/5 border border-white/10 mb-6"
                    >
                        <Ticket className="w-8 h-8 text-white" />
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-semibold tracking-tight mb-4"
                    >
                        Welcome to Tickto
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-neutral-400 text-lg max-w-lg mx-auto"
                    >
                        {step === 1 ? "How are you planning to use Tickto?" : "Let's set up your profile."}
                    </motion.p>
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: -15 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -15 }}
                            className="grid md:grid-cols-2 gap-4"
                        >
                            {/* Fan Card */}
                            <button
                                onClick={() => handleRoleSelect('fan')}
                                className={clsx(
                                    "text-left p-6 md:p-8 rounded-xl border transition-all duration-200 group relative overflow-hidden",
                                    role === 'fan'
                                        ? "bg-white/5 border-white"
                                        : "bg-white/3 border-white/10 hover:bg-white/5 hover:border-white/20"
                                )}
                            >
                                <div className="relative z-10">
                                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center mb-6">
                                        <Ticket className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-medium mb-2">I&apos;m a Fan</h3>
                                    <p className="text-neutral-400 leading-relaxed text-sm">
                                        I want to buy tickets, attend events, and discover new experiences.
                                    </p>
                                </div>
                            </button>

                            {/* Organizer Card */}
                            <button
                                onClick={() => handleRoleSelect('organizer')}
                                className={clsx(
                                    "text-left p-6 md:p-8 rounded-xl border transition-all duration-200 group relative overflow-hidden",
                                    role === 'organizer'
                                        ? "bg-white/5 border-white"
                                        : "bg-white/3 border-white/10 hover:bg-white/5 hover:border-white/20"
                                )}
                            >
                                <div className="relative z-10">
                                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center mb-6">
                                        <Mic2 className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-medium mb-2">I&apos;m an Organizer</h3>
                                    <p className="text-neutral-400 leading-relaxed text-sm">
                                        I want to list events, sell tickets, and manage my attendees.
                                    </p>
                                </div>
                            </button>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 15 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 15 }}
                            className="bg-[#121212] border border-white/10 p-6 md:p-8 rounded-xl"
                        >
                            <div className="flex items-center gap-3 mb-8">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="text-neutral-400 hover:text-white transition-colors text-sm font-medium"
                                >
                                    &larr; Back
                                </button>
                                <div className="h-4 w-px bg-white/10" />
                                <div className="text-sm font-medium text-white flex items-center gap-2">
                                    {role === 'fan' ? <Ticket className="w-4 h-4" /> : <Mic2 className="w-4 h-4" />}
                                    {role === 'fan' ? "Fan Profile" : "Organizer Profile"}
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label htmlFor="username" className="block text-sm font-medium text-neutral-300 mb-2">
                                        Choose a username
                                    </label>
                                    <div className="relative flex items-center">
                                        <span className="absolute left-4 text-neutral-500 font-medium">@</span>
                                        <input
                                            id="username"
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                                            placeholder="yourname"
                                            autoComplete="off"
                                            spellCheck="false"
                                            disabled={isSubmitting}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl py-4 pl-10 pr-4 text-white placeholder-neutral-600 focus:outline-none focus:border-white/20 transition-all font-medium disabled:opacity-50"
                                        />
                                    </div>
                                    <p className="text-neutral-500 text-xs mt-2 ml-1">
                                        Only letters, numbers, and underscores.
                                    </p>
                                </div>

                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={!username || username.length < 3 || isSubmitting}
                                    className="w-full btn-primary py-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            Complete setup
                                            <ArrowRight className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
