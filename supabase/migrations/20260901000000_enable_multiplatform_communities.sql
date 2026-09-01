-- Multi-platform community discovery: Instagram, WhatsApp, Telegram, Discord.
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'instagram';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.communities'::regclass AND conname='communities_platform_check') THEN
    ALTER TABLE public.communities DROP CONSTRAINT communities_platform_check;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.submissions'::regclass AND conname='submissions_platform_check') THEN
    ALTER TABLE public.submissions DROP CONSTRAINT submissions_platform_check;
  END IF;
  ALTER TABLE public.communities ADD CONSTRAINT communities_platform_check CHECK (platform IN ('instagram','whatsapp','telegram','discord'));
  ALTER TABLE public.submissions ADD CONSTRAINT submissions_platform_check CHECK (platform IN ('instagram','whatsapp','telegram','discord'));
END $$;
CREATE OR REPLACE FUNCTION public.sync_community_platform_from_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.source_submission_id IS NOT NULL THEN
    UPDATE public.communities c
    SET platform = COALESCE((SELECT s.platform FROM public.submissions s WHERE s.id = NEW.source_submission_id), c.platform)
    WHERE c.id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS sync_community_platform_after_insert ON public.communities;
CREATE TRIGGER sync_community_platform_after_insert AFTER INSERT ON public.communities FOR EACH ROW EXECUTE FUNCTION public.sync_community_platform_from_submission();
