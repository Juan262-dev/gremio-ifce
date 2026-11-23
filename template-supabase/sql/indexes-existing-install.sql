-- Aplicar somente se o banco já recebeu create_school_template_rls_v1.
-- Não executar junto de schema.sql em uma instalação nova.
create index school_notices_author_idx on public.school_notices(created_by);
create index school_study_materials_author_idx on public.school_study_materials(created_by);
create index school_events_author_idx on public.school_events(created_by);
create index school_registrations_user_idx on public.school_registrations(user_id);
create index school_polls_author_idx on public.school_polls(created_by);
create index school_votes_user_idx on public.school_votes(user_id);
