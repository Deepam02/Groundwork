---
description: Update (or start) the evidence-based hackathon.md build log
argument-hint: "[start]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(git log:*), Bash(git status:*), Bash(git diff:*), Bash(git rev-parse:*), Bash(git remote:*), Bash(git show:*)
---

Maintain `hackathon.md` at the project root as a public, evidence-based build log.

Arguments: `$ARGUMENTS` — empty means **update**; `start` means create/backfill the
log from existing project history. If an update is requested and `hackathon.md`
does not exist, start it automatically.

Follow the skill instructions exactly:

1. Read `.agents/skills/convex-hackathon-skill/SKILL.md`.
2. Read `.agents/skills/convex-hackathon-skill/references/log-format.md` before
   creating or editing `hackathon.md`.
3. Run the workflow in SKILL.md against this repository.

Hard boundaries from the skill, repeated here because they matter:

- Edit only `hackathon.md`. Never commit, push, deploy, publish, or submit.
- Claim a component, Convex feature, model, or deployment only with local
  evidence (`convex/convex.config.ts`, source, checked-in config) or an explicit
  statement from the user. Prefer `none` / `not deployed` over a guess.
- Never read `.env*` or any secret store to fill the log. Scan the whole file for
  address-shaped text and replace matches with `[redacted inbox]`, then say in
  one line what was removed.
- Idempotent: if no commits, staged changes, working-tree changes, or newer
  source evidence exist since the last entry, leave the file unchanged and do not
  bump **Last updated**.
- Per this project's CLAUDE.md, fixture results are not live results — do not
  describe unverified provider behavior or hosting as working.

Report in a few lines: show the new entry, or say the log was already current.
