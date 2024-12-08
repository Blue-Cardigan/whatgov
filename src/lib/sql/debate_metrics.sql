-- Add a new function for summary statistics
CREATE OR REPLACE FUNCTION get_debate_summary_stats()
RETURNS TABLE (
    metric TEXT,
    min_value INTEGER,
    max_value INTEGER,
    avg_value NUMERIC,
    median_value NUMERIC,
    total_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH valid_debates AS (
        SELECT *
        FROM public.debates
        WHERE speaker_count > 0
    )
    SELECT 
        'Word Count' as metric,
        MIN(array_length(string_to_array(search_text, ' '), 1))::INTEGER as min_value,
        MAX(array_length(string_to_array(search_text, ' '), 1))::INTEGER as max_value,
        AVG(array_length(string_to_array(search_text, ' '), 1))::NUMERIC as avg_value,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY array_length(string_to_array(search_text, ' '), 1))::NUMERIC as median_value,
        COUNT(*)::INTEGER as total_count
    FROM valid_debates
    
    UNION ALL
    
    SELECT 
        'Speaker Count' as metric,
        MIN(speaker_count)::INTEGER as min_value,
        MAX(speaker_count)::INTEGER as max_value,
        AVG(speaker_count)::NUMERIC as avg_value,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY speaker_count)::NUMERIC as median_value,
        COUNT(*)::INTEGER as total_count
    FROM valid_debates
    
    UNION ALL
    
    SELECT 
        'Contribution Count' as metric,
        MIN(contribution_count)::INTEGER as min_value,
        MAX(contribution_count)::INTEGER as max_value,
        AVG(contribution_count)::NUMERIC as avg_value,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY contribution_count)::NUMERIC as median_value,
        COUNT(*)::INTEGER as total_count
    FROM valid_debates;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_debate_metrics()
RETURNS TABLE (
    category TEXT,
    bin TEXT,
    frequency INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH word_length_bins AS (
        SELECT
            CASE
                WHEN array_length(string_to_array(search_text, ' '), 1) < 51 THEN '0-50 words'
                WHEN array_length(string_to_array(search_text, ' '), 1) BETWEEN 51 AND 100 THEN '51-100 words'
                WHEN array_length(string_to_array(search_text, ' '), 1) BETWEEN 101 AND 250 THEN '101-250 words'
                WHEN array_length(string_to_array(search_text, ' '), 1) BETWEEN 251 AND 500 THEN '251-500 words'
                WHEN array_length(string_to_array(search_text, ' '), 1) BETWEEN 501 AND 1000 THEN '501-1000 words'
                WHEN array_length(string_to_array(search_text, ' '), 1) BETWEEN 1001 AND 2500 THEN '1001-2500 words'
                WHEN array_length(string_to_array(search_text, ' '), 1) BETWEEN 2501 AND 5000 THEN '2501-5000 words'
                WHEN array_length(string_to_array(search_text, ' '), 1) BETWEEN 5001 AND 10000 THEN '5001-10000 words'
                ELSE '10000+ words'
            END AS search_text_length,
            COUNT(*)::INTEGER AS word_length_frequency
        FROM public.debates
        GROUP BY search_text_length
    ),
    speaker_count_bins AS (
        SELECT
            CASE
                WHEN speaker_count = 0 THEN '0 speakers'
                WHEN speaker_count BETWEEN 1 AND 2 THEN '1-2 speakers'
                WHEN speaker_count BETWEEN 3 AND 5 THEN '3-5 speakers'
                WHEN speaker_count BETWEEN 6 AND 8 THEN '6-8 speakers'
                WHEN speaker_count BETWEEN 9 AND 12 THEN '9-12 speakers'
                WHEN speaker_count BETWEEN 13 AND 16 THEN '13-16 speakers'
                WHEN speaker_count BETWEEN 17 AND 20 THEN '17-20 speakers'
                WHEN speaker_count BETWEEN 21 AND 25 THEN '21-25 speakers'
                ELSE '26+ speakers'
            END AS speaker_count_range,
            COUNT(*)::INTEGER AS speaker_frequency
        FROM public.debates
        GROUP BY speaker_count_range
    ),
    contribution_count_bins AS (
        SELECT
            CASE
                WHEN contribution_count = 0 THEN '0 contributions'
                WHEN contribution_count BETWEEN 1 AND 2 THEN '1-2 contributions'
                WHEN contribution_count BETWEEN 3 AND 5 THEN '3-5 contributions'
                WHEN contribution_count BETWEEN 6 AND 8 THEN '6-8 contributions'
                WHEN contribution_count BETWEEN 9 AND 12 THEN '9-12 contributions'
                WHEN contribution_count BETWEEN 13 AND 16 THEN '13-16 contributions'
                WHEN contribution_count BETWEEN 17 AND 20 THEN '17-20 contributions'
                WHEN contribution_count BETWEEN 21 AND 25 THEN '21-25 contributions'
                ELSE '26+ contributions'
            END AS contribution_count_range,
            COUNT(*)::INTEGER AS contribution_frequency
        FROM public.debates
        GROUP BY contribution_count_range
    ),
    party_frequency AS (
        SELECT
            party_data.key AS party,
            COUNT(*)::INTEGER AS party_count_frequency
        FROM public.debates d,
             jsonb_each_text(d.party_count) AS party_data
        GROUP BY party_data.key
    )

    -- Combine all metrics with appropriate categories
    SELECT 
        'Search Text Length' AS category,
        search_text_length AS bin,
        word_length_frequency AS frequency
    FROM word_length_bins

    UNION ALL

    SELECT 
        'Speaker Count' AS category,
        speaker_count_range AS bin,
        speaker_frequency AS frequency
    FROM speaker_count_bins

    UNION ALL

    SELECT 
        'Contribution Count' AS category,
        contribution_count_range AS bin,
        contribution_frequency AS frequency
    FROM contribution_count_bins

    UNION ALL

    SELECT 
        'Party Frequency' AS category,
        party AS bin,
        party_count_frequency AS frequency
    FROM party_frequency
    ORDER BY category, bin;

END;
$$ LANGUAGE plpgsql;

-- Function to get detailed metrics with percentages and rankings
CREATE OR REPLACE FUNCTION get_debate_metrics_extended()
RETURNS TABLE (
    category TEXT,
    bin TEXT,
    frequency INTEGER,
    percentage DECIMAL(5,2),
    rank_in_category INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH base_metrics AS (
        SELECT * FROM get_debate_metrics()
    ),
    category_totals AS (
        SELECT 
            bm.category,
            SUM(bm.frequency)::INTEGER as total_frequency
        FROM base_metrics bm
        GROUP BY bm.category
    )
    SELECT 
        bm.category,
        bm.bin,
        bm.frequency,
        ROUND((bm.frequency::DECIMAL / ct.total_frequency * 100), 2) as percentage,
        RANK() OVER (
            PARTITION BY bm.category 
            ORDER BY bm.frequency DESC
        )::INTEGER as rank_in_category
    FROM base_metrics bm
    JOIN category_totals ct ON bm.category = ct.category
    ORDER BY bm.category, bm.frequency DESC;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM get_debate_metrics();
-- SELECT * FROM get_debate_metrics_extended();

-- For overlapping analysis:
CREATE OR REPLACE FUNCTION get_debate_metric_overlaps()
RETURNS TABLE (
    word_length_bin TEXT,
    speaker_count_bin TEXT,
    contribution_count_bin TEXT,
    overlap_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE
            WHEN array_length(string_to_array(search_text, ' '), 1) < 101 THEN '0-100 words'
            WHEN array_length(string_to_array(search_text, ' '), 1) BETWEEN 101 AND 500 THEN '100-500 words'
            WHEN array_length(string_to_array(search_text, ' '), 1) BETWEEN 501 AND 2500 THEN '500-2500 words'
            WHEN array_length(string_to_array(search_text, ' '), 1) BETWEEN 2501 AND 12500 THEN '2500-12500 words'
            ELSE '12500+ words'
        END AS word_length_bin,
        CASE
            WHEN speaker_count = 0 THEN '0 speakers'
            WHEN speaker_count BETWEEN 1 AND 5 THEN '1-5 speakers'
            WHEN speaker_count BETWEEN 6 AND 10 THEN '6-10 speakers'
            WHEN speaker_count BETWEEN 11 AND 20 THEN '11-20 speakers'
            ELSE '21+ speakers'
        END AS speaker_count_bin,
        CASE
            WHEN contribution_count = 0 THEN '0 contributions'
            WHEN contribution_count BETWEEN 1 AND 5 THEN '1-5 contributions'
            WHEN contribution_count BETWEEN 6 AND 10 THEN '6-10 contributions'
            WHEN contribution_count BETWEEN 11 AND 20 THEN '11-20 contributions'
            ELSE '21+ contributions'
        END AS contribution_count_bin,
        COUNT(*) AS overlap_count
    FROM public.debates
    GROUP BY 1, 2, 3
    ORDER BY 1, 2, 3;
END;
$$ LANGUAGE plpgsql;