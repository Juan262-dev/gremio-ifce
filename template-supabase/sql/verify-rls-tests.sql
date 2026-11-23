-- TESTE TRANSACIONAL DO TEMPLATE SUPABASE (SEM DADOS REAIS).
-- Execute SOMENTE no projeto vazio e exclusivo de homologação do Grêmio.
-- Nunca rodar em produção. Os dados fictícios são revertidos com ROLLBACK.
begin;
do $guard$
begin
  if exists(select 1 from auth.users)
    or exists(select 1 from public.school_members)
    or exists(select 1 from public.school_votes)
  then raise exception 'Projeto não está vazio. Teste cancelado.'; end if;
end $guard$;

insert into auth.users(id,instance_id,aud,role,email,email_confirmed_at,created_at,updated_at) values
('11111111-1111-4111-8111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','gestor-ficticio@example.invalid',now(),now(),now()),
('22222222-2222-4222-8222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','estudante-ficticio@example.invalid',now(),now(),now()),
('33333333-3333-4333-8333-333333333333','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pendente-ficticio@example.invalid',now(),now(),now());

insert into public.school_roles(user_id,role,active)
values('11111111-1111-4111-8111-111111111111','admin',true);
insert into public.school_members(user_id,display_name,status) values
('11111111-1111-4111-8111-111111111111','Gestor de Teste','approved'),
('22222222-2222-4222-8222-222222222222','Estudante de Teste','approved'),
('33333333-3333-4333-8333-333333333333','Pendente de Teste','pending');
insert into public.school_notices(title,body,created_by)
values('Aviso fictício','Texto de ensaio','11111111-1111-4111-8111-111111111111');
insert into public.school_suggestions(user_id,body,status) values
('22222222-2222-4222-8222-222222222222','Sugestão fictícia A','pending'),
('33333333-3333-4333-8333-333333333333','Sugestão fictícia B','pending');
insert into public.school_polls(id,question,options,created_by)
values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Enquete fictícia?',array['Sim','Não'],'11111111-1111-4111-8111-111111111111');
insert into public.school_votes(poll_id,user_id,option_index)
values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222',0);

set local role authenticated;
set local "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222222';
do $verify$
declare duplicate_blocked boolean:=false; foreign_vote_blocked boolean:=false;
begin
  if (select count(*) from public.school_members)<>1 then raise exception 'ALERTA: aluno vê cadastros alheios'; end if;
  if (select count(*) from public.school_notices)<>1 then raise exception 'ALERTA: aprovado sem avisos'; end if;
  if (select count(*) from public.school_suggestions)<>1 then raise exception 'ALERTA: aluno vê sugestões alheias'; end if;
  if (select count(*) from public.school_votes)<>1 then raise exception 'ALERTA: aluno vê cédulas alheias'; end if;
  if (select count(*) from public.school_roles)<>0 then raise exception 'ALERTA: aluno vê cargo de terceiros'; end if;
  if (select school_private.is_admin()) then raise exception 'ALERTA: estudante recebeu privilégio'; end if;
  begin
    insert into public.school_votes(poll_id,user_id,option_index)
    values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222',1);
  exception when unique_violation then duplicate_blocked:=true;
  end;
  if not duplicate_blocked then raise exception 'ALERTA: voto duplicado'; end if;
  begin
    insert into public.school_votes(poll_id,user_id,option_index)
    values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','33333333-3333-4333-8333-333333333333',0);
  exception when insufficient_privilege then foreign_vote_blocked:=true;
  end;
  if not foreign_vote_blocked then raise exception 'ALERTA: voto em nome de terceiro'; end if;
end $verify$;

set local "request.jwt.claim.sub" = '33333333-3333-4333-8333-333333333333';
do $verify$
begin
  if (select count(*) from public.school_notices)<>0 then raise exception 'ALERTA: pendente vê avisos'; end if;
  if (select count(*) from public.school_polls)<>0 then raise exception 'ALERTA: pendente vê enquetes'; end if;
  if (select school_private.is_approved()) then raise exception 'ALERTA: pendente aprovado indevidamente'; end if;
end $verify$;

set local "request.jwt.claim.sub" = '11111111-1111-4111-8111-111111111111';
do $verify$
begin
  if not (select school_private.is_admin()) then raise exception 'ALERTA: gestor não reconhecido'; end if;
  if (select count(*) from public.school_members)<>3 then raise exception 'ALERTA: gestor não vê pedidos'; end if;
  if (select count(*) from public.school_suggestions)<>2 then raise exception 'ALERTA: gestor não vê sugestões'; end if;
  if (select count(*) from public.school_votes)<>0 then raise exception 'ALERTA: gestor vê cédulas individuais'; end if;
end $verify$;
reset role;
rollback;
