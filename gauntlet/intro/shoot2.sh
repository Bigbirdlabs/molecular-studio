#!/bin/bash
# usage: shoot2.sh C|D  -> deterministic frames via ?t= (freezeAt), sequential
V=$1; OUT=/d/molecular-studio/gauntlet/intro/shots2; mkdir -p $OUT; rm -f $OUT/$V-*
CH="/c/Program Files/Google/Chrome/Application/chrome.exe"
for t in 500 1500 2500 3200 4000 5000 6000 7000 8000 9000; do for sz in "1440,900:d" "500,900:m"; do
  wh=${sz%%:*}; tag=${sz##*:}
  "$CH" --headless=new --disable-gpu --hide-scrollbars --window-size=$wh --virtual-time-budget=4000 \
    --user-data-dir="D:/Temp/introshot2-$V" --screenshot="D:/molecular-studio/gauntlet/intro/shots2/$V-$tag-$t.png" \
    "http://localhost:5199/gauntlet/intro/preview2.html?v=$V&t=$t" >/dev/null 2>&1
done; done
cd $OUT && python -I -c "
from PIL import Image
v='$V'; ts=(500,1500,2500,3200,4000,5000,6000,7000,8000,9000)
s=Image.new('RGB',(1600,1000)); 
for i,t in enumerate(ts): s.paste(Image.open(f'{v}-d-{t}.png').resize((400,250)),((i%4)*400,(i//4)*250))
s.save(f'sheet-{v}.png')"
ls $OUT | grep -c "^$V-"
