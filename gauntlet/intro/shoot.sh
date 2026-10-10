#!/bin/bash
# usage: shoot.sh A|B  -> frames at several virtual times
V=$1; OUT=/d/molecular-studio/gauntlet/intro/shots; mkdir -p $OUT
CH="/c/Program Files/Google/Chrome/Application/chrome.exe"
for t in 600 1500 2500 3500 4300; do
  for sz in "1440,900:d" "390,844:m"; do
    wh=${sz%%:*}; tag=${sz##*:}
    "$CH" --headless=new --disable-gpu --hide-scrollbars --window-size=$wh --virtual-time-budget=$t \
      --user-data-dir="D:/Temp/introshot-$V-$tag" --screenshot="D:/molecular-studio/gauntlet/intro/shots/$V-$tag-$t.png" \
      "http://localhost:5199/gauntlet/intro/preview.html?v=$V" >/dev/null 2>&1
  done
done
ls $OUT | grep "^$V-"
