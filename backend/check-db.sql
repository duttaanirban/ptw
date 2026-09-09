SELECT
    migration_name,
    finished_at,
    applied_steps_count,
    rolled_back_at
FROM "_prisma_migrations"
ORDER BY started_at;

SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('Permit', 'WorkingAtHeightDetails')
ORDER BY table_name, ordinal_position;
