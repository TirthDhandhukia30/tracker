# Architecture Refactoring Plan

## Current State

- 42 TypeScript/React files
- ~6,000 total lines
- No formal design system
- Console logs in production code
- Some unused components
- Flat file structure

## Target Structure

```
src/
├── app/                    # App shell, routing, providers
│   ├── App.tsx
│   ├── routes.tsx
│   └── providers/
├── features/               # Domain modules
│   ├── daily/
│   ├── calendar/
│   ├── intelligence/
│   ├── steps/
│   └── weight/
├── components/             # Shared UI primitives
│   └── ui/
├── hooks/                  # Shared hooks
├── lib/                    # Utilities, services
├── styles/                 # Design tokens, global CSS
└── types/                  # Shared type definitions
```

## Phase 1: Cleanup

- Remove console.log statements
- Remove unused imports
- Remove dead code
- Consolidate duplicate patterns

## Phase 2: Design System

- Extract design tokens
- Create component primitives
- Document usage patterns

## Phase 3: State Standardization

- Standardize loading/error states
- Centralize data fetching patterns
- Remove prop drilling

## Phase 4: Performance

- Code splitting by route
- Memoization audit
- Bundle optimization
