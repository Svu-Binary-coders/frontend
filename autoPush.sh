#!/bin/bash

# Auto push changes to GitHub

# Check if there are any changes to commit
if git diff --quiet && git diff --cached --quiet; then
  echo "No changes to commit."
  exit 0
fi

# Use provided commit message or default
if [ -z "$1" ]; then
  COMMIT_MESSAGE="Auto commit: $(date)"
else
  COMMIT_MESSAGE="$1"
fi

# Get current branch name
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Add, commit, push
git add .
git commit -m "$COMMIT_MESSAGE"
git push origin "$CURRENT_BRANCH"
echo "Changes committed and pushed to: $CURRENT_BRANCH"

# Ask user if they want to merge into main
read -p "Do you want to merge into main? (y/n) " answer
if [[ "$answer" == "y" ]]; then
  git checkout main
  git merge "$CURRENT_BRANCH"
  git push origin main
  echo "Merged '$CURRENT_BRANCH' into main and pushed."
  git checkout "$CURRENT_BRANCH"
else
  echo "Staying on branch: $CURRENT_BRANCH"
fi