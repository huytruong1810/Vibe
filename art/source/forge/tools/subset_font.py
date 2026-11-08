"""Deterministic Silver web subset; the original font remains the Unicode fallback."""
import sys
from pathlib import Path
from fontTools import subset


def main():
    source, target = map(Path, sys.argv[1:])
    options = subset.Options()
    options.flavor = "woff2"
    options.recalc_timestamp = False
    font = subset.load_font(str(source), options)
    builder = subset.Subsetter(options=options)
    builder.populate(unicodes=list(range(0x20, 0x530)) + list(range(0x2000, 0x2700)))
    builder.subset(font)
    subset.save_font(font, str(target), options)


if __name__ == "__main__":
    main()
