#! /usr/bin/env bash

find layouts -type f | while read -r file; do
  theme_file="$HUGO_THEMESDIR/congo/$file"
  if [[ -f "$theme_file" ]]; then
    echo "===="
    echo "Comparing $file"
    echo "===="
    echo "$theme_file"
    diff -u --color=always "$theme_file" "$file" || :
    echo
  fi
done
