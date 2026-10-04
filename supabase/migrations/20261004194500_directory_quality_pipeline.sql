-- Directory quality pipeline (idempotent schema/function representation).
-- This migration mirrors the already-applied remote migration state.

alter table public.communities
  add column if not exists quality_score smallint,
  add column if not exists quality_grade text,
  add column if not exists quality_issues jsonb not null default '[]'::jsonb,
  add column if not exists quality_checked_at timestamptz,
  add column if not exists quality_version integer not null default 1,
  add column if not exists quality_reviewed_at timestamptz,
  add column if not exists quality_reviewed_by uuid,
  add column if not exists quality_review_note text;

alter table public.communities drop constraint if exists communities_quality_score_check;
alter table public.communities add constraint communities_quality_score_check check (quality_score is null or quality_score between 0 and 100);
alter table public.communities drop constraint if exists communities_quality_grade_check;
alter table public.communities add constraint communities_quality_grade_check check (quality_grade is null or quality_grade in ('critical','needs_review','generic','good'));

create index if not exists communities_quality_grade_idx on public.communities(status,quality_grade,quality_score desc nulls last);
create index if not exists communities_quality_platform_grade_idx on public.communities(status,platform,quality_grade,quality_score asc nulls first);

create or replace function public.invalidate_directory_quality()
returns trigger language plpgsql security invoker set search_path=public
as $$
begin
  if tg_op='INSERT' or
     new.name is distinct from old.name or new.description is distinct from old.description or
     new.language is distinct from old.language or new.region is distinct from old.region or
     new.member_count is distinct from old.member_count or new.platform is distinct from old.platform or
     new.invite_url is distinct from old.invite_url or new.verification_status is distinct from old.verification_status or
     new.health_status is distinct from old.health_status or new.image_path is distinct from old.image_path or
     new.external_image_url is distinct from old.external_image_url then
    new.quality_score:=null; new.quality_grade:=null; new.quality_issues:='[]'::jsonb;
    new.quality_checked_at:=null; new.quality_version:=0; new.data_quality_checked_at:=null;
    new.needs_manual_review:=true; new.quality_reviewed_at:=null; new.quality_reviewed_by:=null; new.quality_review_note:=null;
  end if;
  return new;
end;
$$;
drop trigger if exists communities_invalidate_directory_quality on public.communities;
create trigger communities_invalidate_directory_quality before insert or update on public.communities
for each row execute function public.invalidate_directory_quality();
revoke all on function public.invalidate_directory_quality() from public,anon,authenticated;

create or replace function public.refresh_directory_quality(p_limit integer default 500)
returns integer language plpgsql security invoker set search_path=public
as $$
declare
  r record; cat_names text; txt text; score integer; grade text; issues jsonb;
  detected_lang text; duplicate_count integer; processed integer:=0;
  is_generic boolean; has_category boolean; has_explicit_critical boolean;
begin
  for r in
    select * from public.communities
    where status='published' and coalesce(quality_version,0)<2
    order by quality_version asc,quality_checked_at asc nulls first,updated_at asc
    limit greatest(1,least(coalesce(p_limit,500),2000))
  loop
    score:=100; issues:='[]'::jsonb; txt:=lower(coalesce(r.name,'')||' '||coalesce(r.description,''));
    select string_agg(c.name,' | ' order by c.name) into cat_names
    from public.community_categories cc join public.categories c on c.id=cc.category_id and c.is_active
    where cc.community_id=r.id;
    has_category:=cat_names is not null and btrim(cat_names)<>'';
    is_generic:=coalesce(r.description_is_generic,false)
      or txt~'(a )?(community|group|server) for .*(connect|chat|meet people|similar interests)'
      or txt~'members to connect, chat, and meet people';

    detected_lang:=null;
    if coalesce(r.detected_language,'')<>'' then detected_lang:=r.detected_language;
    elsif txt~'[ऀ-ॿ]' then detected_lang:='Hindi';
    elsif txt~'[ঀ-৿]' then detected_lang:='Bengali';
    elsif txt~'[਀-੿]' then detected_lang:='Punjabi';
    elsif txt~'[ૠ-૿]' then detected_lang:='Gujarati';
    elsif txt~'[஀-௿]' then detected_lang:='Tamil';
    elsif txt~'[ఀ-౿]' then detected_lang:='Telugu';
    elsif txt~'[ಀ-೿]' then detected_lang:='Kannada';
    elsif txt~'[ഀ-ൿ]' then detected_lang:='Malayalam';
    elsif txt~'\\m(the|and|for|with|community|group|students|india|join|discussion|updates)\\M' then detected_lang:='English';
    end if;

    select count(*) into duplicate_count
    from public.communities x
    where x.status='published' and x.id<>r.id
      and lower(btrim(x.invite_url))=lower(btrim(r.invite_url));

    if r.invite_url is null or btrim(r.invite_url)='' then
      score:=score-25; issues:=issues||jsonb_build_array(jsonb_build_object('code','missing_invite_url','severity','critical','message','No usable join URL is stored.'));
    elsif r.platform='whatsapp' and lower(r.invite_url) not like 'https://chat.whatsapp.com/%'
      and lower(r.invite_url) not like 'https://www.whatsapp.com/%' and lower(r.invite_url) not like 'https://wa.me/%' then
      score:=score-2; issues:=issues||jsonb_build_array(jsonb_build_object('code','indirect_join_url','severity','low','message','The stored URL is a wrapper or source page rather than a direct WhatsApp join URL.'));
    end if;
    if duplicate_count>0 then score:=score-20; issues:=issues||jsonb_build_array(jsonb_build_object('code','duplicate_url','severity','critical','message',format('The same normalized invite URL appears on %s other listing(s).',duplicate_count))); end if;
    if not has_category then score:=score-10; issues:=issues||jsonb_build_array(jsonb_build_object('code','missing_category','severity','high','message','No active category is attached.')); end if;

    if txt~'(cyber ?security|information security|ethical hacking|infosec)' and coalesce(cat_names,'') not ilike '%cybersecurity%' then score:=score-12; issues:=issues||jsonb_build_array(jsonb_build_object('code','category_mismatch','severity','high','message','Description suggests cybersecurity, but the taxonomy does not.'));
    elsif txt~'(machine learning|deep learning|artificial intelligence|\\mllm\\M|generative ai)' and coalesce(cat_names,'') not ilike '%ai & ml%' then score:=score-10; issues:=issues||jsonb_build_array(jsonb_build_object('code','category_mismatch','severity','medium','message','Description suggests AI/ML, but the taxonomy may be too broad.'));
    elsif txt~'(docker|kubernetes|terraform|devops|aws|azure|google cloud|\\mgcp\\M|cloud computing)' and coalesce(cat_names,'') not ilike '%cloud & devops%' then score:=score-10; issues:=issues||jsonb_build_array(jsonb_build_object('code','category_mismatch','severity','medium','message','Description suggests cloud/DevOps, but the taxonomy may be too broad.'));
    elsif txt~'(react|next\\.js|vue\\.js|angular|laravel|node\\.js|typescript|javascript|html|css|\\mphp\\M)' and coalesce(cat_names,'') not ilike '%coding%' and coalesce(cat_names,'') not ilike '%web development%' then score:=score-8; issues:=issues||jsonb_build_array(jsonb_build_object('code','category_mismatch','severity','medium','message','Description suggests software/web development, but the taxonomy may be too broad.'));
    elsif txt~'(\\mstartup\\M|founder|entrepreneur|entrepreneurship|business)' and coalesce(cat_names,'') not ilike '%startup%' and coalesce(cat_names,'') not ilike '%entrepreneur%' then score:=score-8; issues:=issues||jsonb_build_array(jsonb_build_object('code','category_mismatch','severity','medium','message','Description suggests startups/business, but the taxonomy may be too broad.'));
    elsif txt~'(\\manime\\M|manga)' and coalesce(cat_names,'') not ilike '%anime%' then score:=score-8; issues:=issues||jsonb_build_array(jsonb_build_object('code','category_mismatch','severity','medium','message','Description suggests anime/fandom, but the taxonomy may be too broad.'));
    elsif txt~'(\\mgaming\\M|valorant|minecraft|free fire|bgmi|playstation|xbox)' and coalesce(cat_names,'') not ilike '%gaming%' then score:=score-8; issues:=issues||jsonb_build_array(jsonb_build_object('code','category_mismatch','severity','medium','message','Description suggests gaming, but the taxonomy may be too broad.'));
    end if;

    if coalesce(length(btrim(r.description)),0)<20 then score:=score-8; issues:=issues||jsonb_build_array(jsonb_build_object('code','short_description','severity','high','message','Description is too short to explain the community.'));
    elsif is_generic then score:=score-12; issues:=issues||jsonb_build_array(jsonb_build_object('code','generic_description','severity','medium','message','Description is a generic template and needs a community-specific explanation.'));
    end if;

    if coalesce(r.language,'')='' then
      score:=score-7;
      if detected_lang is null then issues:=issues||jsonb_build_array(jsonb_build_object('code','missing_language','severity','medium','message','Language is not provided and could not be detected confidently.'));
      else issues:=issues||jsonb_build_array(jsonb_build_object('code','language_detected','severity','info','message',format('Detected language: %s.',detected_lang))); end if;
    elsif detected_lang is not null and lower(r.language)='english' and lower(detected_lang)<>'english' then score:=score-7; issues:=issues||jsonb_build_array(jsonb_build_object('code','language_mismatch','severity','medium','message',format('Stored language is English, but text suggests %s.',detected_lang))); end if;
    if coalesce(r.region,'')='' then score:=score-7; issues:=issues||jsonb_build_array(jsonb_build_object('code','missing_region','severity','medium','message','Region is not provided.')); end if;
    if r.member_count is null then score:=score-7; issues:=issues||jsonb_build_array(jsonb_build_object('code','missing_member_count','severity','medium','message','Member count is not currently verified.')); end if;
    if r.image_path is null and coalesce(r.external_image_url,'')='' then score:=score-4; issues:=issues||jsonb_build_array(jsonb_build_object('code','missing_image','severity','low','message','No community image is stored.')); end if;
    if r.health_status='inactive' then score:=score-30; issues:=issues||jsonb_build_array(jsonb_build_object('code','health_inactive','severity','critical','message','Health monitoring has explicit inactive evidence.'));
    elsif r.health_status='needs_recheck' then score:=score-15; issues:=issues||jsonb_build_array(jsonb_build_object('code','health_needs_recheck','severity','high','message','Latest health check could not conclusively verify the public invite.'));
    elsif r.health_status='unknown' then score:=score-8; issues:=issues||jsonb_build_array(jsonb_build_object('code','health_unknown','severity','medium','message','This listing has not yet passed an automated health check.')); end if;
    if r.verification_status='broken' then score:=score-30; issues:=issues||jsonb_build_array(jsonb_build_object('code','verification_broken','severity','critical','message','Verification is marked broken.'));
    elsif r.verification_status='unverified' then score:=score-3; issues:=issues||jsonb_build_array(jsonb_build_object('code','unverified','severity','low','message','The listing has not been manually verified.')); end if;
    if txt~'(boudoir|glamour|beach[ -]?shoot|\\m18\\+\\M|dating|hot|sexy|escort|onlyfans|nude|\\mnsfw\\M)' then score:=score-20; issues:=issues||jsonb_build_array(jsonb_build_object('code','content_safety','severity','critical','message','Content requires manual safety review before stronger discovery exposure.')); end if;

    score:=greatest(0,least(score,100));
    has_explicit_critical:=duplicate_count>0 or r.health_status='inactive' or r.verification_status='broken' or r.invite_url is null
      or txt~'(boudoir|glamour|beach[ -]?shoot|\\m18\\+\\M|dating|hot|sexy|escort|onlyfans|nude|\\mnsfw\\M)';
    if has_explicit_critical or score<40 then grade:='critical';
    elsif is_generic then grade:='generic';
    elsif score<75 or r.health_status='needs_recheck' or issues @> '[{"code":"category_mismatch"}]'::jsonb then grade:='needs_review';
    else grade:='good'; end if;

    update public.communities set quality_score=score,quality_grade=grade,quality_issues=issues,quality_checked_at=now(),quality_version=2,
      data_quality_checked_at=now(),description_is_generic=is_generic,detected_language=coalesce(r.detected_language,detected_lang),
      needs_manual_review=(grade<>'good'),flag_reason=(select nullif(string_agg(value->>'code',';' order by ordinality),'') from jsonb_array_elements(issues) with ordinality)
    where id=r.id;
    processed:=processed+1;
  end loop;
  return processed;
end;
$$;
revoke all on function public.refresh_directory_quality(integer) from public,anon,authenticated;
grant execute on function public.refresh_directory_quality(integer) to service_role;