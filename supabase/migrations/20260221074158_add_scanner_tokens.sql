CREATE TABLE IF NOT EXISTS public.scanner_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE
);

-- RLS
ALTER TABLE public.scanner_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view their scanner tokens"
ON public.scanner_tokens
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.events
        WHERE events.id = scanner_tokens.event_id
        AND events.owner_id = auth.uid()::text
    )
);

CREATE POLICY "Organizers can create scanner tokens"
ON public.scanner_tokens
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.events
        WHERE events.id = scanner_tokens.event_id
        AND events.owner_id = auth.uid()::text
    )
);

CREATE POLICY "Organizers can update their scanner tokens"
ON public.scanner_tokens
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.events
        WHERE events.id = scanner_tokens.event_id
        AND events.owner_id = auth.uid()::text
    )
);

CREATE POLICY "Organizers can delete their scanner tokens"
ON public.scanner_tokens
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.events
        WHERE events.id = scanner_tokens.event_id
        AND events.owner_id = auth.uid()::text
    )
);
