/* DatabaseSchema.sql */
-- Version: 1.0.0 - Generated from Supabase
-- Version: 1.0.5 - notifications: target_user_id + sender_user_id added for targeted feed requests (5 Mar 2026)
-- Version: 1.1.0 - reminders table added; user_households.receives_reminders added; RLS enabled on reminders (10 Mar 2026)
-- Version: 1.2.0 - RLS policies applied to reminders table: INSERT, SELECT, UPDATE, DELETE (10 Mar 2026)
-- Version: 1.2.1 - notifications.target_user_id comment updated: also used for reminder type (10 Mar 2026)
-- Version: 1.3.0 - RLS enabled on all tables (D1 resolved). reminders policies fixed admin-only INSERT/DELETE/UPDATE (D15 resolved). Helper functions: my_user_id(), is_household_member(). (15 Mar 2026)
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.
-- For the full RLS migration SQL, see docs/RLS_Migration.sql.

-- RLS: enabled. Policies: SELECT/INSERT/DELETE household member (is_household_member). No UPDATE.
CREATE TABLE public.feeding_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  household_id uuid,
  pet_ids ARRAY NOT NULL,
  fed_by_user_id uuid,
  fed_by_name text NOT NULL,
  pet_names text NOT NULL,
  undo_deadline timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT feeding_events_pkey PRIMARY KEY (id),
  CONSTRAINT feeding_events_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id),
  CONSTRAINT feeding_events_fed_by_user_id_fkey FOREIGN KEY (fed_by_user_id) REFERENCES public.users(id)
);

-- RLS: enabled. Policies: SELECT authenticated (true — short-term, allows invite code join); INSERT main_member_id = my_user_id(); UPDATE is_household_member.
-- TODO: tighten SELECT to is_household_member once getHouseholdByInvitationCode moves to Edge Function.
CREATE TABLE public.households (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  household_name text NOT NULL,
  invitation_code text NOT NULL UNIQUE,
  main_member_id uuid,
  is_pro boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT households_pkey PRIMARY KEY (id),
  CONSTRAINT households_main_member_id_fkey FOREIGN KEY (main_member_id) REFERENCES public.users(id)
);

-- RLS: enabled. Policies: SELECT/INSERT/UPDATE/DELETE own rows only (user_id = my_user_id()).
CREATE TABLE public.notification_reads (
  notification_id uuid NOT NULL,
  user_id uuid NOT NULL,
  read_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notification_reads_pkey PRIMARY KEY (notification_id, user_id),
  CONSTRAINT notification_reads_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id),
  CONSTRAINT notification_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- RLS: enabled. SELECT: household member AND (target_user_id IS NULL OR = me OR sender_user_id = me). INSERT/DELETE: household member.
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  household_id uuid,
  type text NOT NULL,
  message text NOT NULL,
  pet_name text,
  member_name text,
  requested_by text,
  created_at timestamp with time zone DEFAULT now(),
  target_user_id uuid,   -- targeted notifications: feed_request (member asked to feed) or reminder (recipient member); null = household-wide
  sender_user_id uuid,   -- feed_request only: the member who sent the request
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id)
);

-- RLS: enabled. Policies: SELECT/INSERT/UPDATE/DELETE household member (is_household_member).
CREATE TABLE public.pets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pet_name text NOT NULL,
  household_id uuid,
  last_fed_at timestamp with time zone,
  last_fed_by_id uuid,
  undo_deadline timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pets_pkey PRIMARY KEY (id),
  CONSTRAINT pets_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id),
  CONSTRAINT pets_last_fed_by_id_fkey FOREIGN KEY (last_fed_by_id) REFERENCES public.users(id)
);

-- RLS: enabled. SELECT: household member. INSERT/UPDATE/DELETE: admin only (households.main_member_id = my_user_id()). D15 fixed 15 Mar.
CREATE TABLE public.reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  label text NOT NULL,
  time text NOT NULL,   -- stored as "HH:mm"
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reminders_pkey PRIMARY KEY (id),
  CONSTRAINT reminders_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id)
);

-- RLS: enabled. SELECT: own row OR same household. INSERT: own row (user_id = my_user_id()). UPDATE: own row. DELETE: self-removal OR admin removes member.
CREATE TABLE public.user_households (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  household_id uuid,
  receives_reminders boolean DEFAULT false,   -- per-member opt-out for feed reminders (pessimistic UI toggle)
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_households_pkey PRIMARY KEY (id),
  CONSTRAINT user_households_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_households_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id)
);

-- RLS: enabled. SELECT: authenticated (true — short-term, allows getUserByEmail for pending-invite lookup). INSERT: auth_user_id = auth.uid(). UPDATE: own row only.
-- TODO: tighten SELECT to own row + co-member check once getUserByEmail moves to Edge Function.
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  member_name text NOT NULL,
  email_address text NOT NULL UNIQUE,
  is_main_member boolean DEFAULT false,
  invitation_status text CHECK (invitation_status = ANY (ARRAY['Pending'::text, 'Active'::text, 'Declined'::text])),
  notification_prefs jsonb DEFAULT '{"feedingNotifications": true, "memberJoinedNotifications": true}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  auth_user_id uuid UNIQUE,
  is_onboarding_completed boolean DEFAULT false,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id)
);

-- Policy on Reminders: Admin can update reminders
alter policy "Admin can update reminders"
on "public"."reminders"
to public
using (
    (EXISTS ( SELECT 1
   FROM (user_households uh
     JOIN users u ON ((u.id = uh.user_id)))
  WHERE ((uh.household_id = reminders.household_id) AND (u.auth_user_id = auth.uid()) AND (u.is_main_member = true))))

  ) with check (

      (EXISTS ( SELECT 1
   FROM (user_households uh
     JOIN users u ON ((u.id = uh.user_id)))
  WHERE ((uh.household_id = reminders.household_id) AND (u.auth_user_id = auth.uid()) AND (u.is_main_member = true))))

  );