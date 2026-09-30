# Supabase database setup

1. Open the Supabase Dashboard and select the project.
2. In the left sidebar, select **SQL Editor**.
3. Select **New query**.
4. Open `supabase/schema.sql` in this project and copy the complete file contents.
5. Paste the SQL into the SQL Editor (replace any existing text).
6. Select **Run** (or press **Ctrl+Enter**) and wait for the query to finish successfully.
7. Confirm the six tables (`divisions`, `profiles`, `requests`, `comments`, `activity_logs`, and `notifications`) appear under **Table Editor**.
8. In **Authentication → Providers**, enable **Email**.
9. Run `npm run seed` from the project root to create the demo users and profiles. Do not create the demo users manually first.

If `npm run seed` reports `Could not find the table 'public.divisions'`, the schema has not been run successfully. Return to **SQL Editor**, run the complete `supabase/schema.sql`, confirm `divisions` exists in **Table Editor**, and run the seed again.

If seed reports `Only super_admin can change profile roles` after the schema was already installed, run `supabase/fix-seed-role-trigger.sql` once in **SQL Editor**, then run `npm run seed` again. This is a schema trigger fix, not a local database setup.

If the API reports `column requests.archived_at does not exist`, run `supabase/migrations/20260930_add_archived_at.sql` once in **SQL Editor**, then restart the backend. This migration preserves existing request data.

Run the schema once in a new project. If it has already been applied, do not run it again without first reviewing the existing objects and migration plan.
