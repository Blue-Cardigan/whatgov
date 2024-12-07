CREATE OR REPLACE FUNCTION update_user_profile_mp_id(speaker_name TEXT)
RETURNS TABLE (
  member_id INTEGER,
  display_as TEXT,
  constituency TEXT
) AS $$
BEGIN
    -- Only proceed if mp or constituency has changed
    IF (TG_OP = 'UPDATE' AND 
        (COALESCE(OLD.mp, '') != COALESCE(NEW.mp, '') OR 
         COALESCE(OLD.constituency, '') != COALESCE(NEW.constituency, ''))) OR
       TG_OP = 'INSERT' THEN
        
        -- Don't update mp_id if both fields are empty
        IF NULLIF(TRIM(NEW.mp), '') IS NULL AND NULLIF(TRIM(NEW.constituency), '') IS NULL THEN
            NEW.mp_id = NULL;
            RETURN NEW;
        END IF;

        -- Try to find matching MP based on name and constituency
        UPDATE public.user_profiles
        SET mp_id = (
            SELECT member_id
            FROM public.members
            WHERE (
                -- Match on display name with various patterns
                LOWER(REGEXP_REPLACE(display_as, '^(Sir|Dame|Mr|Mrs|Ms|Dr)\s+', '')) 
                    LIKE LOWER(REGEXP_REPLACE(NEW.mp, '\s+MP$', '')) || '%'
                OR constituency = NEW.constituency
            )
            -- Only consider active MPs
            AND house_end_date IS NULL
            ORDER BY 
                -- Prioritize exact matches on both fields
                CASE WHEN LOWER(REGEXP_REPLACE(display_as, '^(Sir|Dame|Mr|Mrs|Ms|Dr)\s+', '')) = 
                          LOWER(REGEXP_REPLACE(NEW.mp, '\s+MP$', ''))
                     AND constituency = NEW.constituency THEN 0
                -- Then matches on display name
                     WHEN LOWER(REGEXP_REPLACE(display_as, '^(Sir|Dame|Mr|Mrs|Ms|Dr)\s+', '')) = 
                          LOWER(REGEXP_REPLACE(NEW.mp, '\s+MP$', '')) THEN 1
                -- Then matches on constituency
                     WHEN constituency = NEW.constituency THEN 2
                     ELSE 3
                END,
                -- For multiple matches, use most recent
                house_start_date DESC
            LIMIT 1
        )
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;