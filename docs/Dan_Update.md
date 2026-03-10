# I Fed The Pet (IFTP) — Dan Update
**Last Updated:** Tuesday, 10 March 2026
**Updated By:** Jarques

---

> Rewrite Section 1 after every session. Copy it straight into Slack.
> Update Section 2 when priorities change.
> This file never grows.

---

## 1. LATEST UPDATE
*(Copy into Slack)*

Hey @Dan — big update covering everything from 28 Feb to today:

✅ **Android safe area + header layout — FIXED**
Header, logo, and bell now clear the status bar correctly on Android. Logo centred on all screen sizes.

✅ **Onboarding step order — FIXED**
Both join and create paths now ask household intent first, name last — matches the Figma flow.

✅ **Invited users auto-routed — FIXED**
When a pending user opens the app, they land straight on the invite-code screen — no wrong turns.

✅ **"Ask member to feed" targets specific person only — DONE**
The request notification only appears for the member you selected, not the whole household.

✅ **Feed History redesign — DONE**
Cards match your Figma design — single column, pet names wrap freely. iOS shadow fixed.

✅ **Invitation Code merged into Household card — DONE**
Cleaner layout in Settings — no separate section needed.

✅ **"Give your feedback" link — DONE**
Tappable mailto link in the Settings footer.

✅ **Feed button flicker on own device — FIXED**
After feeding, your device no longer shows a brief flash of the old state. Cross-device updates still arrive instantly.

✅ **Feed Reminders — DONE (UI + persistence)**
You can now set timed reminders per household. The "Feed reminders" toggle per member controls who gets them. Reminders saved to Supabase — survive app restarts. (Notification firing coming next — see below.)

🟡 **Reminders don't fire yet**
The reminder scheduling engine is built (server-side, pg_cron + Edge Function). Code is ready — needs a one-time deploy step. Doing it next session.

🟡 **Still open:**
- Invite email link leads to blank page (deep linking — Phase B)
- Native phone notifications (requires EAS Build — next after reminders)

Ready for testing when you are 🙌

---

## 2. WHAT'S COMING NEXT

| # | Item |
|---|------|
| Deploy | Deploy `process-reminders` Edge Function + pg_cron schedule (reminder notifications go live) |
| #2 | Native push notifications (EAS Build session) |
| #6 | Terms & Conditions + Privacy Policy views |
| #9 | Supabase RLS (security before go-live) |
| Phase B | Apple/Google sign-in, production build prep |
