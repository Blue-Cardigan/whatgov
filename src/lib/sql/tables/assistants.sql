CREATE TABLE public.assistants (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    user_id uuid NULL,
    name text NOT NULL,
    description text NULL,
    filters jsonb NOT NULL DEFAULT '{}'::jsonb,
    vector_store_id uuid NULL,
    openai_assistant_id text NULL,
    file_ids text[] NULL,
    status text NULL DEFAULT 'pending'::text,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now(),
    is_active boolean NULL DEFAULT true,
    CONSTRAINT assistants_pkey PRIMARY KEY (id),
    CONSTRAINT assistants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
    CONSTRAINT assistants_status_check CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'ready'::text, 'failed'::text]))
);
