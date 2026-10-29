"""Build fonts/flags.woff2: Noto Color Emoji cut down to the flags listed in styles.css ("Flags in it: ...").

Add the country code to that list, then run from the repo root:

  curl -LO https://raw.githubusercontent.com/googlefonts/noto-emoji/main/2D/fonts/Noto-COLRv1.ttf
  uv run --with fonttools --with brotli python fonts/flags.py Noto-COLRv1.ttf
"""
import re
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

codes = re.search(r'Flags in it: ([A-Z ]+)', open('styles.css').read())[1].split()
font = TTFont(sys.argv[1])
cmap = font.getBestCmap()
want = {tuple(cmap[0x1F1E6 + ord(ch) - 65] for ch in code) for code in codes}
# A flag is a ligature of two letters. Keep only the flags we want, or the subsetter keeps every
# flag whose letters are present (most of them, about 400 KB).
for lookup in font['GSUB'].table.LookupList.Lookup:
    for st in lookup.SubTable:
        st = getattr(st, 'ExtSubTable', st)
        if getattr(st, 'LookupType', None) == 4:
            for first, ligs in st.ligatures.items():
                st.ligatures[first] = [lig for lig in ligs if (first, *lig.Component) in want]
options = subset.Options()
options.layout_features = ['*']
subsetter = subset.Subsetter(options)
subsetter.populate(unicodes=range(0x1F1E6, 0x1F200))
subsetter.subset(font)
font.flavor = 'woff2'
font.save('fonts/flags.woff2')
print(f'fonts/flags.woff2: {len(codes)} flags')
