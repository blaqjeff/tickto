-- Add UPDATE policy for tickets table to allow public/anon clients to list and cancel listings.
CREATE POLICY "Allow public to update tickets" ON public.tickets FOR UPDATE USING (true) WITH CHECK (true);
