
-- Create function to update next_run_at
CREATE OR REPLACE FUNCTION public.calculate_next_run_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate next run based on day of week, setting time to 7am
    NEW.next_run_at := (
        CASE
            WHEN NEW.repeat_on->>'frequency' = 'weekly' THEN
                -- Get the next occurrence of the specified day of week
                CASE
                    WHEN EXTRACT(DOW FROM CURRENT_TIMESTAMP) <= (NEW.repeat_on->>'dayOfWeek')::int THEN
                        CURRENT_DATE + ((NEW.repeat_on->>'dayOfWeek')::int - EXTRACT(DOW FROM CURRENT_TIMESTAMP))::int
                    ELSE
                        CURRENT_DATE + (7 - EXTRACT(DOW FROM CURRENT_TIMESTAMP) + (NEW.repeat_on->>'dayOfWeek')::int)::int
                END + INTERVAL '7 hours'  -- Set to 7am
            ELSE NULL
        END
    );
    
    -- If the calculated time is in the past, add a week
    IF NEW.next_run_at <= CURRENT_TIMESTAMP THEN
        NEW.next_run_at := NEW.next_run_at + INTERVAL '7 days';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set next_run_at
CREATE TRIGGER set_next_run_at
    BEFORE INSERT OR UPDATE OF repeat_on, is_active
    ON public.saved_search_schedules
    FOR EACH ROW
    WHEN (NEW.is_active = TRUE)
    EXECUTE FUNCTION public.calculate_next_run_at();

-- Grant necessary permissions
GRANT ALL ON public.saved_search_schedules TO authenticated;