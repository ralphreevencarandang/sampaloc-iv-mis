# Memory — Resident Registration and Login Recovery

Last updated: 2026-10-16 00:36 Asia/Singapore

## What was built

Resident registration now redirects to the exact `/Login` URL after success, displays “Account registered successfully. Please log in.”, and does not authenticate the resident. Errors keep the resident on registration.

Registration collects required ID type, string ID number, conditional Other specification, and the existing restricted image upload. Birthdate controls voting selection: residents aged 15 or older can choose Yes or No; younger residents are forced to No and incompatible precinct details are cleared. Shared validation enforces the rules on the server.

Relevant files:
- `app/(Resident)/register/page.tsx`
- `app/(Resident)/Login/page.tsx` and `LoginForm.tsx`
- `lib/resident-registration.ts`, `lib/prisma.ts`
- `validations/auth.validation.ts`
- `server/actions/auth.actions.ts`, `server/actions/resident.actions.ts`
- `prisma/schema.prisma`, migration `20261015000000_add_resident_id_details`
- `tests/resident-registration.test.ts`, `tests/prisma-cache.test.ts`

Detailed implementation and verification records are in `context/progress-tracker.md`; UI patterns are in `context/ui-registry.md`.

## Decisions made

- Preserve the uppercase `/Login` URL, with no query parameters. The user explicitly rejected a registration query parameter.
- Registration success uses a short-lived notice mechanism; it must never create an authenticated session. Existing approval requirements remain in effect.
- The voting age threshold is the user's application rule, not an automatic registered-voter designation.
- No new dependencies were added. Existing residents retain nullable ID metadata; new registrations require it through validation.

## Problems solved

- Prisma rejected `idType` because development hot reload retained an older global client. `lib/prisma.ts` now checks cached resident scalar fields against the generated field enum before reuse. Client generation and regression tests passed.
- `/Login` returned 404 although the source folder and production manifest used the correct casing. The development manifest retained lowercase `login`. A server restart alone briefly served the page but did not resolve the stale cache. Stopping the project dev server, preserving `.next/dev` under `.next/dev-recovery-*`, and starting it with a fresh dev cache resolved the issue. No application routing change was needed.

## Current state

- Last live checks: `/Login` returned HTTP 200 with the login form; a separate notice check returned HTTP 200 with the exact success message and no authenticated session created.
- Development server was left running on port 3000. Check its current availability next session rather than assuming it persists.
- Database migration status on October 16 confirmed all 28 migrations applied. Do not assume the ID migration is still pending based on older notes.
- Six focused tests, TypeScript checks, and focused ESLint passed. Run tests with `node --import tsx --test tests/resident-registration.test.ts tests/prisma-cache.test.ts`.
- Production build passed for the initial implementation. Later targeted fixes passed focused checks; no subsequent full build was performed.
- Repository-wide lint has six existing errors and 26 warnings in unrelated files; locations are recorded in the progress tracker.
- The agent did not submit a real registration against Cloudinary and the database. The user reported reaching login after registration, but has not yet confirmed the final flow after route-cache recovery.
- Git working tree was clean immediately before this memory file was created. No commit or push was performed by the agent.

## Next session starts with

Restore this memory and read the project instructions. If continuing registration verification, first confirm `/Login` still loads and ask whether the user's registration retry succeeds through the clean login URL. Investigate any actual remaining failure before changing code. Do not start the unrelated security roadmap automatically.

## Open questions

- Has the user completed a registration successfully after the final development cache recovery?
- Does the complete browser flow preserve the success notice and remain unauthenticated until an approved resident logs in?
