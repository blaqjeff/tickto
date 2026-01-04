'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { motion } from 'framer-motion';
import { Loader2, Upload, Calendar, MapPin, DollarSign, Tag, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

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
        price: '',
        totalTickets: '',
    });

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (!imageFile || !user) throw new Error("Image and user required");

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

            // Step B: Insert Event
            const { error: insertError } = await supabase
                .from('events')
                .insert([
                    {
                        title: formData.title,
                        description: formData.description,
                        date: new Date(formData.date).toISOString(),
                        location: formData.location,
                        price_sol: parseFloat(formData.price),
                        total_tickets: parseInt(formData.totalTickets),
                        cover_image: publicUrl,
                        owner_id: user.id, // Privy User ID
                        price_usdc: parseFloat(formData.price) * 150 // Mock conversion for now
                    }
                ]);

            if (insertError) throw insertError;

            // Step C: Redirect
            router.push('/');

        } catch (error) {
            console.error('Error creating event:', error);
            alert('Failed to create event. Please try again.');
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

                    {/* Price */}
                    <div className="space-y-2">
                        <label className="text-sm text-white/70 font-medium ml-1">Price (SOL)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                                placeholder="0.00"
                                required
                            />
                        </div>
                    </div>

                    {/* Total Tickets */}
                    <div className="space-y-2">
                        <label className="text-sm text-white/70 font-medium ml-1">Total Tickets</label>
                        <div className="relative">
                            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                            <input
                                type="number"
                                min="1"
                                value={formData.totalTickets}
                                onChange={e => setFormData({ ...formData, totalTickets: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                                placeholder="100"
                                required
                            />
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
