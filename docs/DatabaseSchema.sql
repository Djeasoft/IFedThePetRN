/* DatabaseSchema.sql */
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.
-- Version: 1.0.0 - Generated from Supabase

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
CREATE TABLE public.notification_reads (
  notification_id uuid NOT NULL,
  user_id uuid NOT NULL,
  read_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notification_reads_pkey PRIMARY KEY (notification_id, user_id),
  CONSTRAINT notification_reads_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id),
  CONSTRAINT notification_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  household_id uuid,
  type text NOT NULL,
  message text NOT NULL,
  pet_name text,
  member_name text,
  requested_by text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id)
);
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
CREATE TABLE public.user_households (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  household_id uuid,
  receives_reminders boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_households_pkey PRIMARY KEY (id),
  CONSTRAINT user_households_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_households_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id)
);
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