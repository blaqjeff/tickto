'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Upload, Calendar, MapPin, Tag, Plus, Trash2, Ticket } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface TicketTier {
    name: string;
    price: string;
    quantity: string;
}

export default function CreateEventPage() {
    const { authenticated, user } = usePrivy();
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: '',
        location: '',
    });

    const [tiers, setTiers] = useState<TicketTier[]>([
        { name: 'General', price: '', quantity: '' }
    ]);

    // Access Control
    if (!authenticated) {
        if (typeof window !== 'undefined') router.push('/');
        return null;
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const addTier = () => {
        setTiers([...tiers, { name: '', price: '', quantity: '' }]);
    };

    const removeTier = (index: number) => {
        if (tiers.length > 1) {
            const newTiers = [...tiers];
            newTiers.splice(index, 1);
            setTiers(newTiers);
        }
    };

    const updateTier = (index: number, field: keyof TicketTier, value: string) => {
        const newTiers = [...tiers];
        newTiers[index] = { ...newTiers[index], [field]: value };
        setTiers(newTiers);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) { alert("Please sign in."); return; }
        setIsLoading(true);

        try {
            if (!imageFile) throw new Error("Image required");

            // 1. Force Types (Paranoid Mode)
            const numericTiers = tiers.map(t => ({
                name: t.name,
                price: Number(t.price),
                quantity: Number(t.quantity)
            }));

            // 2. Validate
            if (numericTiers.some(t => isNaN(t.price) || isNaN(t.quantity) || t.quantity < 1 || !t.name)) {
                throw new Error("Invalid price or quantity in tiers.");
            }

            // 3. Calc Totals
            const calculatedTotal = numericTiers.reduce((acc, t) => acc + t.quantity, 0);
            const lowestPrice = Math.min(...numericTiers.map(t => t.price));

            // Step A: Upload Image
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `public/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('event-images')
                .upload(filePath, imageFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('event-images')
                .getPublicUrl(filePath);

            // 4. Clean Payload
            const payload = {
                title: formData.title,
                description: formData.description,
                date: new Date(formData.date).toISOString(),
                location: formData.location,
                price_sol: lowestPrice,
                total_tickets: calculatedTotal,
                cover_image: publicUrl,
                owner_id: user.id, // CRITICAL: Must match auth.uid()
                price_usdc: lowestPrice * 150, // Mock conversion rate
                ticket_tiers: numericTiers
            };

            console.log("Submitting:", payload);

            // 5. Insert
            const { error: insertError } = await supabase.from('events').insert([payload]);
            if (insertError) throw insertError;

            window.location.href = "/"; // Success - Fresh state redirect
        } catch (err: any) {
            console.error("Create Failed:", err);
            alert(`Error: ${err.message || "Check console"}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="px-4 py-8 max-w-2xl mx-auto min-h-screen safe-bottom">
            <motion.header
                className="mb-8 text-center"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="heading text-3xl text-white mb-2">Create New Event</h1>
                <p className="text-white/50">Details, tickets, and artwork.</p>
            </motion.header>

            <motion.form
                onSubmit={handleSubmit}
                className="space-y-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                {/* Image Upload */}
                <div className="relative group">
                    <label className="block w-full aspect-video rounded-3xl border-2 border-dashed border-white/20 hover:border-purple-500/50 transition-colors cursor-pointer overflow-hidden bg-white/5">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                            required
                        />
                        {imagePreview ? (
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-white/40 group-hover:text-purple-400 transition-colors">
                                <Upload className="w-10 h-10 mb-2" />
                                <span className="text-sm font-medium">Upload Poster</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white font-medium">Change Image</span>
                        </div>
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Title */}
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm text-white/70 font-medium ml-1">Event Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                            placeholder="e.g. Neon Nights 2024"
                            required
                        />
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <label className="text-sm text-white/70 font-medium ml-1">Date & Time</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                            <input
                                type="datetime-local"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                                required
                            />
                        </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                        <label className="text-sm text-white/70 font-medium ml-1">Location</label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                            <input
                                type="text"
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                                placeholder="Start typing..."
                                required
                            />
                        </div>
                    </div>

                    {/* Ticket Tiers Section */}
                    <div className="space-y-4 md:col-span-2 pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-white/70 font-medium ml-1 flex items-center gap-2">
                                <Ticket className="w-4 h-4 text-purple-400" />
                                Ticket Tiers
                            </label>
                            <button
                                type="button"
                                onClick={addTier}
                                className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 font-medium"
                            >
                                <Plus className="w-3 h-3" />
                                Add Tier
                            </button>
                        </div>

                        <div className="space-y-3">
                            <AnimatePresence>
                                {tiers.map((tier, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="relative grid grid-cols-12 gap-3 bg-white/5 p-3 rounded-xl border border-white/5 group"
                                    >
                                        <div className="col-span-12 md:col-span-5">
                                            <input
                                                type="text"
                                                placeholder="Tier Name (e.g. VIP)"
                                                value={tier.name}
                                                onChange={e => updateTier(index, 'name', e.target.value)}
                                                className="w-full bg-transparent border-b border-white/10 focus:border-purple-500 pb-1 text-sm text-white focus:outline-none"
                                                required
                                            />
                                        </div>
                                        <div className="col-span-5 md:col-span-3">
                                            <div className="relative">
                                                <span className="absolute left-0 bottom-1 text-white/30 text-xs">SOL</span>
                                                <input
                                                    type="number"
                                                    placeholder="Price"
                                                    step="0.01"
                                                    min="0"
                                                    value={tier.price}
                                                    onChange={e => updateTier(index, 'price', e.target.value)}
                                                    className="w-full bg-transparent border-b border-white/10 focus:border-purple-500 pb-1 pl-8 text-sm text-white focus:outline-none text-right"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="col-span-5 md:col-span-3">
                                            <input
                                                type="number"
                                                placeholder="Qty"
                                                min="1"
                                                value={tier.quantity}
                                                onChange={e => updateTier(index, 'quantity', e.target.value)}
                                                className="w-full bg-transparent border-b border-white/10 focus:border-purple-500 pb-1 text-sm text-white focus:outline-none text-right"
                                                required
                                            />
                                        </div>
                                        <div className="col-span-2 md:col-span-1 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => removeTier(index)}
                                                disabled={tiers.length === 1}
                                                className="text-white/20 hover:text-red-400 disabled:opacity-0 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm text-white/70 font-medium ml-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors bg-transparent"
                            rows={4}
                            placeholder="Tell people what makes this event special..."
                            required
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transform hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Creating Event...
                            </>
                        ) : (
                            'Launch Event'
                        )}
                    </button>
                </div>
            </motion.form>
        </div>
    );
}
