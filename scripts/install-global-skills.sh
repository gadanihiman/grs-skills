#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

DRY_RUN=0
WINDOWS_MODE="symlink"
WINDOWS_HOME=""
INSTALL_WINDOWS=1

usage() {
  cat <<'EOF'
Usage: install-global-skills.sh [options]

Install every skill in this repository into global agent skill directories.

Options:
  --dry-run               Print planned actions without writing anything
  --windows-mode <mode>   One of: symlink, copy (default: symlink)
  --windows-home <path>   Explicit Windows home path under /mnt, e.g. /mnt/c/Users/name
  --no-windows            Skip Windows-native agent directories
  -h, --help              Show this help text
EOF
}

log() {
  printf '%s\n' "$*"
}

run_cmd() {
  if [ "$DRY_RUN" -eq 1 ]; then
    log "[dry-run] $*"
  else
    "$@"
  fi
}

ensure_dir() {
  local dir="$1"
  if [ -d "$dir" ]; then
    return
  fi
  run_cmd mkdir -p "$dir"
}

backup_if_needed() {
  local dest="$1"
  local backup="${dest}.backup.${TIMESTAMP}"

  if [ ! -e "$dest" ] && [ ! -L "$dest" ]; then
    return
  fi

  run_cmd mv "$dest" "$backup"
  log "Backed up existing path: $dest -> $backup"
}

link_one() {
  local src="$1"
  local dest="$2"
  local expected="$src"

  if [ -L "$dest" ]; then
    local current
    current="$(readlink "$dest")"
    if [ "$current" = "$expected" ]; then
      log "OK symlink: $dest"
      return
    fi
  fi

  if [ -e "$dest" ] || [ -L "$dest" ]; then
    backup_if_needed "$dest"
  fi

  run_cmd ln -s "$src" "$dest"
  log "Linked: $dest -> $src"
}

copy_one() {
  local src="$1"
  local dest="$2"

  if [ -e "$dest" ] || [ -L "$dest" ]; then
    backup_if_needed "$dest"
  fi

  run_cmd cp -R "$src" "$dest"
  log "Copied: $src -> $dest"
}

install_skill_set() {
  local target_root="$1"
  local mode="$2"
  local src

  ensure_dir "$target_root"

  for src in "${SKILL_DIRS[@]}"; do
    local skill_name
    skill_name="$(basename "$src")"
    local dest="$target_root/$skill_name"

    if [ "$mode" = "copy" ]; then
      copy_one "$src" "$dest"
    else
      link_one "$src" "$dest"
    fi
  done
}

discover_windows_home() {
  if [ -n "$WINDOWS_HOME" ]; then
    return
  fi

  local candidate
  for candidate in /mnt/c/Users/*; do
    [ -d "$candidate" ] || continue
    if [ -d "$candidate/.junie" ] || [ -d "$candidate/.codex" ] || [ -d "$candidate/.claude" ] || [ -d "$candidate/.cursor" ] || [ -d "$candidate/.gemini" ]; then
      WINDOWS_HOME="$candidate"
      return
    fi
  done
}

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --windows-mode)
      WINDOWS_MODE="${2:-}"
      shift 2
      ;;
    --windows-home)
      WINDOWS_HOME="${2:-}"
      shift 2
      ;;
    --no-windows)
      INSTALL_WINDOWS=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      log "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

if [ "$WINDOWS_MODE" != "symlink" ] && [ "$WINDOWS_MODE" != "copy" ]; then
  log "Invalid --windows-mode: $WINDOWS_MODE"
  exit 1
fi

mapfile -t SKILL_DIRS < <(
  find "$REPO_ROOT" -mindepth 2 -maxdepth 2 -type f -name 'SKILL.md' -printf '%h\n' | sort
)

if [ "${#SKILL_DIRS[@]}" -eq 0 ]; then
  log "No skills found under $REPO_ROOT"
  exit 1
fi

log "Repo root: $REPO_ROOT"
log "Discovered ${#SKILL_DIRS[@]} skill(s)"
printf '  - %s\n' "${SKILL_DIRS[@]##"$REPO_ROOT"/}"

LINUX_TARGETS=(
  "$HOME/.claude/skills"
  "$HOME/.codex/skills"
  "$HOME/.cursor/skills"
  "$HOME/.gemini/skills"
  "$HOME/.junie/skills"
)

if [ -d "$HOME/.gemini/antigravity" ]; then
  LINUX_TARGETS+=("$HOME/.gemini/antigravity/skills")
fi

log ""
log "Installing to Linux/WSL agent directories"
for target in "${LINUX_TARGETS[@]}"; do
  log "Target: $target"
  install_skill_set "$target" "symlink"
done

if [ "$INSTALL_WINDOWS" -eq 1 ]; then
  discover_windows_home

  if [ -n "$WINDOWS_HOME" ] && [ -d "$WINDOWS_HOME" ]; then
    WINDOWS_REPO_ROOT="$(wslpath -w "$REPO_ROOT")"
    log ""
    log "Installing to Windows-native agent directories under $WINDOWS_HOME"
    log "Windows source root: $WINDOWS_REPO_ROOT"

    WINDOWS_TARGETS=(
      "$WINDOWS_HOME/.claude/skills"
      "$WINDOWS_HOME/.codex/skills"
      "$WINDOWS_HOME/.cursor/skills"
      "$WINDOWS_HOME/.gemini/skills"
      "$WINDOWS_HOME/.junie/skills"
    )

    if [ -d "$WINDOWS_HOME/.gemini/antigravity" ]; then
      WINDOWS_TARGETS+=("$WINDOWS_HOME/.gemini/antigravity/skills")
    fi

    for target in "${WINDOWS_TARGETS[@]}"; do
      log "Target: $target"
      ensure_dir "$target"

      for src in "${SKILL_DIRS[@]}"; do
        skill_name="$(basename "$src")"
        dest="$target/$skill_name"

        if [ "$WINDOWS_MODE" = "copy" ]; then
          copy_one "$src" "$dest"
        else
          windows_src="$(wslpath -w "$src")"
          link_one "$windows_src" "$dest"
        fi
      done
    done
  else
    log ""
    log "Windows home not detected; skipping Windows-native agent directories"
  fi
fi

log ""
log "Done"
