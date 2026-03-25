# grs-skills

Personal AI agent skills — generic, reusable across any project.

Managed with [skills.sh](https://skills.sh) CLI by Vercel Labs.

## How It Works

All agent skill directories are **symlinks** pointing here. Edit once → every agent gets the update.

```
~/Developer/my-skills/    ← this repo (source of truth)
       ↓ symlinks via: npx skills add gadanihiman/grs-skills -g --agent '*'
~/.claude/skills/
~/.codex/skills/
~/.cursor/skills-cursor/
~/.opencode/skills/
```

## Skills

### Tools & Platforms

| Skill | Description |
|---|---|
| `figma` | Figma design-to-code workflow |
| `figma-implement-design` | Translate Figma designs into production-ready code |
| `notion-knowledge-capture` | Capture conversations and decisions into structured Notion pages |
| `notion-research-documentation` | Research across Notion and synthesize into documentation |
| `vercel-deploy` | Vercel deployment workflows |

## Install

```bash
npx skills add gadanihiman/grs-skills --global --skill '*' --agent '*' --yes
```

## Add a New Skill

```bash
cd ~/Developer/my-skills
npx skills init my-new-skill    # creates my-new-skill/SKILL.md
# edit my-new-skill/SKILL.md
git add . && git commit -m "add my-new-skill" && git push
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
