# TindaPOS — Claude Code Configuration

## Rules
- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary — prefer editing existing files
- NEVER create documentation files unless explicitly requested
- ALWAYS read a file before editing it
- Keep files under 500 lines
- Validate input at system boundaries

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that does not match DESIGN.md.

Key design rules from DESIGN.md:
- Primary font: Plus Jakarta Sans (UI) + DM Mono (prices only)
- Primary color: Amber #F59E0B — not blue, not purple, not teal
- Success/GCash: Green #16A34A
- Background: Warm off-white #FAFAF7
- Layout: Single-hand thumb-first mobile, sticky bottom bar always visible
- Language: Taglish default, English toggle via localStorage('lang')
- Touch targets: minimum 48px for all interactive elements

## Stack
- Framework: React (PWA)
- Styling: Tailwind CSS with custom design tokens from DESIGN.md
- Database: SQLite via Turso (offline-first with sync)
- Backup: Google Sheets API
- Receipt: Web Serial API (ESC/POS thermal printer)
- Payment: Static GCash QR image (vendor uploads screenshot)
- Storage: IndexedDB for item photos, custom logo, GCash QR image

## Skill routing
When the user's request matches an available skill, invoke it via the Skill tool.
- Design changes → read DESIGN.md first, then implement
- Bugs/errors → invoke /investigate
- Code review → invoke /review
- Security → invoke /security-review
