# Sampaloc IV BMIS Agent Instructions

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This project uses Next.js 16.2.3. APIs, conventions, and file structure may differ from older assumptions. Before writing Next.js code, read the relevant installed guide in `node_modules/next/dist/docs/` and heed deprecation notices. In Next.js 16, request middleware is represented by `proxy.ts`.

<!-- END:nextjs-agent-rules -->

## Project Identity

Sampaloc IV MIS is a Barangay Management Information System for resident registration, resident self-service, barangay administration, clinic medical records, document requests, announcements, officials, blotters, VAWC records, pets, inventory, and archives.

## Mandatory Reading Order

Before implementing any feature:

1. Read `context/project-overview.md`.
2. Read `context/architecture.md`.
3. Read `context/code-standards.md`.
4. Read `context/progress-tracker.md`.
5. Read `context/build-plan.md`.
6. Read relevant UI documentation if modifying UI: `context/ui-tokens.md`, `context/ui-rules.md`, and `context/ui-registry.md`.
7. Read `context/library-docs.md` if working with a library or integration.

Only read additional files when relevant to the task.

## Non-Negotiable Rules

1. Never assume a feature exists without checking the code.
2. Never implement features outside the requested scope.
3. Never modify the database schema without evaluating migrations and dependencies.
4. Never bypass authentication or authorization.
5. Never expose sensitive resident information, health information, VAWC details, passwords, OTPs, secrets, or private files.
6. Never duplicate an existing reusable component unnecessarily.
7. Never replace the established design system without approval.
8. Never introduce dependencies without a clear reason and approval.
9. Never claim tests or builds passed unless they were executed.
10. Never mark a feature completed without verification.
11. Never silently overwrite an architectural decision.
12. Never expose environment variable values or credential files.
13. Never add hardcoded hex values or new raw Tailwind color classes.

## Before Coding

- Identify the requested feature.
- Read applicable context files.
- Inspect relevant source code.
- Identify route group, server/client boundary, and affected modules.
- Identify security implications for resident, admin, health, document, blotter, and VAWC data.
- Create a concise implementation plan.

## During Coding

- Follow existing folder and naming patterns.
- Keep changes focused.
- Validate untrusted input with the existing Zod schema pattern.
- Enforce permissions on the server.
- Handle errors with safe user-facing messages.
- Avoid unrelated refactors.
- Read installed library documentation before relying on framework-specific behavior.

## After Coding

- Run relevant available checks, usually `npm run lint` and `npm run build` when appropriate.
- Verify acceptance criteria.
- Report modifications and remaining limitations.
- Update `context/progress-tracker.md`.
- Update `context/ui-registry.md` after adding or changing reusable UI components.
- Update other context files only if architecture, project scope, routes, libraries, or conventions changed.

## Session Continuity

At the beginning of every new session, use `context/progress-tracker.md` to understand the last completed task and current development status.

Do not automatically implement the next roadmap item unless the developer requests it.

## Available Local Skills

- `/architect` - before complex features.
- `/imprint` - after new UI components.
- `/review` - before demo or when something feels off.
- `/recover` - when the same problem persists after one corrective prompt.
- `/remember save` - when a feature spans multiple sessions.
- `/remember restore` - when returning after a multi-session feature.

