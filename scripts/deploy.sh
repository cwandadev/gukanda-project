#!/usr/bin/env bash
# Ship your work to the team without running anything locally:
#   bash scripts/deploy.sh "feat: what I did"             commit -> push a branch -> open a Pull Request
#   bash scripts/deploy.sh "feat: what I did" my-branch   same, with your own branch name
#   bash scripts/deploy.sh --merge                        merge this branch's Pull Request (goes LIVE)
# Vercel builds a Preview site for every Pull Request, and the live site from the main branch.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

die() { echo "ERROR: $*" >&2; exit 1; }

git remote get-url origin >/dev/null 2>&1 || die "No 'origin' remote. Run gukanda-remote.sh first (answer n when it asks to push)."
ORIGIN_URL="$(git remote get-url origin)"
WEB_URL="$(echo "$ORIGIN_URL" | sed -E 's#^git@github.com:#https://github.com/#; s#\.git$##')"
git fetch -q origin || die "Could not reach GitHub (login/token?)."
DEFAULT="$(git remote show origin 2>/dev/null | sed -n 's/^ *HEAD branch: //p')"
[ -n "$DEFAULT" ] || DEFAULT=main
CURRENT="$(git branch --show-current)"
HAVE_GH=0
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then HAVE_GH=1; fi

# ---------- --merge ----------
if [ "${1:-}" = "--merge" ]; then
  [ "$HAVE_GH" = 1 ] || die "--merge needs the GitHub CLI (sudo pacman -S github-cli, then gh auth login). Or press Merge on github.com."
  [ "$CURRENT" != "$DEFAULT" ] || die "You are on $DEFAULT. Switch to the branch you want to merge."
  read -r -p "Merge '$CURRENT' into $DEFAULT? This updates the LIVE site. [y/N] " ans
  [ "${ans:-n}" = "y" ] || { echo "Cancelled."; exit 0; }
  gh pr merge "$CURRENT" --squash --delete-branch
  git checkout -q "$DEFAULT" && git pull -q --ff-only
  echo "Merged. Vercel is deploying $DEFAULT to production now."
  exit 0
fi

# ---------- commit + push + Pull Request ----------
MSG="${1:-}"
[ -n "$MSG" ] || die 'Give a commit message, e.g.: bash scripts/deploy.sh "feat: client booking"'

git ls-files --error-unmatch .env.local >/dev/null 2>&1 && die ".env.local is tracked by git. Run: git rm --cached .env.local"

# a branch of your own (never work straight on main)
if [ "$CURRENT" = "$DEFAULT" ]; then
  SLUG="$(echo "$MSG" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g' | cut -c1-40)"
  BRANCH="${2:-feat/$SLUG}"
  git checkout -q -b "$BRANCH"
  # the work now lives on the branch; keep local main identical to GitHub's main
  git branch -f "$DEFAULT" "origin/$DEFAULT" 2>/dev/null || true
else
  BRANCH="$CURRENT"
fi

git add -A
# refuse to commit anything that looks like a secret key
if git diff --cached -U0 | grep -E '^\+' | grep -qE 'sb_secret_[A-Za-z0-9_-]{8,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.'; then
  git reset -q
  die "A staged change looks like a secret/JWT key. Nothing was committed. Remove it and try again."
fi
if ! git diff --cached --quiet; then
  git commit -q -m "$MSG"
  echo "Committed: $MSG"
fi
[ "$(git rev-list --count "origin/$DEFAULT..HEAD")" -gt 0 ] || die "Nothing new compared to $DEFAULT. Nothing to deploy."

echo "Pushing branch $BRANCH..."
git push -u origin "$BRANCH" || die "Push rejected. If GitHub has newer commits: git pull --rebase origin $BRANCH, then run this again."

if [ "$HAVE_GH" = 1 ]; then
  if URL="$(gh pr view "$BRANCH" --json url -q .url 2>/dev/null)"; then
    echo "Pull Request already open (updated by this push): $URL"
  else
    BODY="$(printf 'Changes:\n%s\n\nPreview: the Vercel check on this Pull Request links the preview site.\n' "$(git log --format='- %s' "origin/$DEFAULT..HEAD")")"
    URL="$(gh pr create --base "$DEFAULT" --head "$BRANCH" --title "$MSG" --body "$BODY")"
    echo "Pull Request opened: $URL"
  fi
else
  echo "Open the Pull Request here:  $WEB_URL/pull/new/$BRANCH"
  echo "(One-command PRs: sudo pacman -S github-cli && gh auth login)"
fi

echo
echo "Vercel is building a Preview now. Its link appears on the Pull Request (Vercel check / comment)."
echo "When the team is happy:  bash scripts/deploy.sh --merge   (or press Merge on github.com)"
