# grs-skills

Personal AI agent skills — generic, reusable across any project.

Managed with [skills.sh](https://skills.sh) CLI by Vercel Labs.

## How It Works

Skills in this repo are symlinked directly into each agent's global skill directory. Edit once in this repo → every linked agent gets the update.

```
gadanihiman/grs-skills  (this repo)
       ↓ install-global-skills.sh
       ↓ symlinks
~/.claude/skills/
~/.codex/skills/
~/.cursor/skills/
~/.gemini/skills/
~/.junie/skills/
```

## Skills

### Code Review

| Skill | Description |
|---|---|
| `pr-check` | Full backend PR self-review checklist — static analysis + human reviewer patterns |
| `pr-check-static` | Static analysis patterns (B1–B21): runtime bugs, logic errors, silent failures |
| `pr-check-style` | Human reviewer patterns (G1–G16): naming, complexity, DB schema, test design |
| `pr-check-frontend` | Frontend patterns (F1–F16): React, Next.js, Vue, Tailwind, React Query |

### Tools & Platforms

| Skill | Description |
|---|---|
| `figma` | Figma design-to-code workflow |
| `figma-implement-design` | Translate Figma designs into production-ready code |
| `notion-knowledge-capture` | Capture conversations and decisions into structured Notion pages |
| `notion-research-documentation` | Research across Notion and synthesize into documentation |
| `vercel-deploy` | Vercel deployment workflows |

## Setup (New Machine)

### Preferred: repo-driven global install

```bash
./scripts/install-global-skills.sh
```

This initializes and symlinks every skill in this repo to the current machine's global agent directories:

- `~/.claude/skills/`
- `~/.codex/skills/`
- `~/.cursor/skills/`
- `~/.gemini/skills/`
- `~/.junie/skills/`

On WSL, it also attempts to initialize Windows-native agent directories under `/mnt/c/Users/<you>/...` and points them back to this repo via `\\wsl.localhost\...`.

Useful options:

```bash
./scripts/install-global-skills.sh --dry-run
./scripts/install-global-skills.sh --no-windows
./scripts/install-global-skills.sh --windows-mode copy
```

### Legacy: install with skills.sh

```bash
npx skills add gadanihiman/grs-skills -g --agent '*' --yes
```

### Legacy fix for old skills.sh installs

> **Note:** kept for older `skills.sh` setups where Codex and Cursor were not symlinked automatically.

```bash
bash ~/Developer/grs-skills/scripts/fix-agent-symlinks.sh
```

## Add a New Skill

```bash
cd ~/Developer/grs-skills
npx skills init my-new-skill    # creates my-new-skill/SKILL.md
# edit my-new-skill/SKILL.md
git add . && git commit -m "add my-new-skill" && git push
# No need to re-run npx skills add — new folder is picked up automatically via symlink
```

## Skill Format

Each skill is a directory containing a single `SKILL.md` file with YAML frontmatter:

```markdown
---
name: skill-name
description: One-line description — used by agents to decide when to activate this skill.
---

# Skill Title

## Instructions
...
```
