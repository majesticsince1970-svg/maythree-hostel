# Agent Rules for MayThree Hostel Management System

- TypeScript strict mode; no `any` types unless absolutely necessary
- All data access through Supabase client with RLS enforced
- Never use the service role key in frontend code
- Every schema change is a new file in supabase/migrations/
- Mobile-first responsive UI using Tailwind CSS
- Occupancy is computed per bed, never stored as a counter
- Use react-hook-form + zod for all form validation
- Use @tanstack/react-query for all server state
- All currency in INR, formatted with Indian numbering
- Phone validation for 10-digit Indian mobile numbers
