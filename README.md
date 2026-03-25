# grs-skills

Personal AI agent skills — generic, reusable across any project.

Managed with [skills.sh](https://skills.sh) CLI by Vercel Labs.

## How It Works

Skills are installed to `~/.agents/skills/` and symlinked to each agent's directory. Edit once → every agent gets the update.

```
gadanihiman/grs-skills  (this repo)
       ↓ npx skills add
~/.agents/skills/       ← central hub
       ↓ symlinks
~/.claude/skills/
~/.codex/skills/
~/.cursor/skills-cursor/
```

## Skills

| Skill | Description |
|---|---|
| `figma` | Figma design-to-code workflow |
| `figma-implement-design` | Translate Figma designs into production-ready code |
| `notion-knowledge-capture` | Capture conversations and decisions into structured Notion pages |
| `notion-research-documentation` | Research across Notion and synthesize into documentation |
| `vercel-deploy` | Vercel deployment workflows |

## Setup (New Machine)

### 1. Install skills

```bash
npx skills add gadanihiman/grs-skills -g --agent '*' --yes
```

### 2. Fix Codex & Cursor symlinks

> **Note:** skills.sh v1.4.5 bug — Codex and Cursor are not symlinked automatically.

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
