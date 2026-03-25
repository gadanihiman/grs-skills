#!/bin/bash
# fix-agent-symlinks.sh
# Run once after `npx skills add` to fix Codex and Cursor symlinks.
# Workaround for skills.sh v1.4.5 bug where Codex and Cursor are treated
# as "universal" agents and don't get symlinks in their specific dirs.

set -e

AGENTS_DIR="$HOME/.agents/skills"
SKILLS=($(ls "$AGENTS_DIR" | grep -v "^find-skills$\|^skill-creator$"))

echo "Skills found in ~/.agents/skills: ${#SKILLS[@]}"
echo ""

# Fix Codex
CODEX_DIR="$HOME/.codex/skills"
if [ -d "$CODEX_DIR" ]; then
  echo "Fixing ~/.codex/skills/..."
  for skill in "${SKILLS[@]}"; do
    rm -rf "$CODEX_DIR/$skill"
    ln -s "../../.agents/skills/$skill" "$CODEX_DIR/$skill"
    echo "  ✓ $skill"
  done
else
  echo "Skipping Codex — ~/.codex/skills not found"
fi

echo ""

# Fix Cursor
CURSOR_DIR="$HOME/.cursor/skills-cursor"
if [ -d "$CURSOR_DIR" ]; then
  echo "Fixing ~/.cursor/skills-cursor/..."
  for skill in "${SKILLS[@]}"; do
    ln -sf "../../.agents/skills/$skill" "$CURSOR_DIR/$skill"
    echo "  ✓ $skill"
  done
else
  echo "Skipping Cursor — ~/.cursor/skills-cursor not found"
fi

echo ""
echo "Done! Verifying..."
echo ""

# Verify
echo "Codex symlinks:"
ls -la "$CODEX_DIR" 2>/dev/null | grep "^l" | awk '{print "  ✓ "$9}' || echo "  (not found)"

echo ""
echo "Cursor symlinks:"
ls -la "$CURSOR_DIR" 2>/dev/null | grep "^l" | awk '{print "  ✓ "$9}' || echo "  (not found)"
