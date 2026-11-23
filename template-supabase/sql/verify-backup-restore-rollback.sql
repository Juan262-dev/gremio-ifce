-- ENSAIO LIMITADO DE RESTAURAÇÃO LÓGICA: somente dados fictícios e banco de homologação vazio.
-- O teste NÃO substitui um dump externo, backup de Auth ou ensaio de desastre entre projetos.
-- Garante ROLLBACK para não deixar contas ou dados de teste.
begin;
do $safety$
begin
  if exists (select 1 from auth.users)
    or exists (select 1 from public.school_members)
    or exists (select 1 from public.school_roles)
    or exists (select 1 from public.school_notices)
    or exists (select 1 from public.school_study_materials)
    or exists (select 1 from public.school_events)
    or exists (select 1 from public.school_registrations)
    or exists (select 1 from public.school_polls)
    or exists (select 1 from public.school_votes)
    or exists (select 1 from public.school_suggestions)
  then
    raise exception 'Ensaio cancelado: banco não está vazio';
  end if;
end $safety$;

-- Conta e registros 100% fictícios, criados dentro da transação.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        '00000000-0000-0000-0000-000000000000',
        'authenticated','authenticated','ensaio-backup@example.invalid',now(),now(),now());
insert into public.school_members(user_id,display_name,status)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Aluna Fictícia','approved');
insert into public.school_suggestions(id,user_id,body,status)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Sugestão fictícia','pending');
insert into public.school_polls(id,question,options,created_by)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        'Enquete fictícia?',array['Sim','Não'],'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.school_votes(poll_id,user_id,option_index)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',0);

-- Simula um snapshot lógico interno de dados relacionais (não copia senhas nem Auth).
create temp table backup_members on commit drop as select * from public.school_members;
create temp table backup_suggestions on commit drop as select * from public.school_suggestions;
create temp table backup_polls on commit drop as select * from public.school_polls;
create temp table backup_votes on commit drop as select * from public.school_votes;
do $verify$
begin
  if (select count(*) from backup_members)<>1
     or (select count(*) from backup_suggestions)<>1
     or (select count(*) from backup_polls)<>1
     or (select count(*) from backup_votes)<>1
  then raise exception 'Snapshot incompleto'; end if;
end $verify$;

-- Simula perda dos registros do Grêmio, preservando o usuário fictício de Auth.
delete from public.school_votes;
delete from public.school_suggestions;
delete from public.school_polls;
delete from public.school_members;
do $verify$
begin
 if (select count(*) from public.school_votes)<>0
   or (select count(*) from public.school_suggestions)<>0
 then raise exception 'Falha ao simular perda de registros'; end if;
end $verify$;

-- Restauração em ordem de dependência.
insert into public.school_members select * from backup_members;
insert into public.school_polls select * from backup_polls;
insert into public.school_suggestions select * from backup_suggestions;
insert into public.school_votes select * from backup_votes;

-- Verificação exata, incluindo integridade de relacionamento entre voto e enquete.
do $verify$
begin
 if exists ((select * from backup_members except select * from public.school_members)
    union all (select * from public.school_members except select * from backup_members))
 then raise exception 'Restauração de membros divergiu'; end if;
 if exists ((select * from backup_suggestions except select * from public.school_suggestions)
    union all (select * from public.school_suggestions except select * from backup_suggestions))
 then raise exception 'Restauração de sugestões divergiu'; end if;
 if exists ((select * from backup_polls except select * from public.school_polls)
    union all (select * from public.school_polls except select * from backup_polls))
 then raise exception 'Restauração de enquetes divergiu'; end if;
 if exists ((select * from backup_votes except select * from public.school_votes)
    union all (select * from public.school_votes except select * from backup_votes))
 then raise exception 'Restauração de votos divergiu'; end if;
 if (select count(*) from public.school_votes v
     join public.school_polls p on p.id=v.poll_id
     join public.school_members m on m.user_id=v.user_id)<>1
 then raise exception 'Relações entre dados restaurados divergiram'; end if;
end $verify$;
select 'ENSAIO DE RESTAURAÇÃO LÓGICA OK (dados serão revertidos)' as resultado;
rollback;
