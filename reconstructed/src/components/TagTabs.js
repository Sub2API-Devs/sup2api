/**
 * components/TagTabs.tsx
 *
 * 标签页切换条（会话列表的标签过滤，All 标签与截断）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/TagTabs.tsx
 * pieces: chunk-8ayegty4.js (1), chunk-ca06bv0t.js (1), chunk-gda5w2fs.js (1)
 * attribution: fingerprint 3
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../ink/components/Text.js";
import { isFromPluginDirectory, displayTextOrRaw } from "../utils/plugins/pluginDisplayMetadata.js";
import { OFFICIAL_MARKETPLACE_DISPLAY } from "../utils/plugins/officialMarketplaceNames.js";

//@ chunk-8ayegty4.js:296-631 fingerprint = TagTabs (0.381)
function TagTabs(b) {
  let $ = w(7),
    { children: children, color: color, textColor: textColor, padded: padded, bold: bold, wrap: wrap } = b,
    e = padded ? " " : "";
  const windowWidth = textColor ?? (color ? "inverseText" : void 0);
  let s;
  if (
    $[0] !== bold ||
    $[1] !== children ||
    $[2] !== color ||
    $[3] !== e ||
    $[4] !== windowWidth ||
    $[5] !== wrap
  )
    ((s = r(Text, {
      backgroundColor: color,
      color: windowWidth,
      bold: bold,
      wrap: wrap,
      children: [e, children, e],
    })),
      ($[0] = bold),
      ($[1] = children),
      ($[2] = color),
      ($[3] = e),
      ($[4] = windowWidth),
      ($[5] = wrap),
      ($[6] = s));
  else s = $[6];
  return s;
}
//@ chunk-ca06bv0t.js:8675-9094 fingerprint = ALL_TAB_LABEL (0.497)
function ALL_TAB_LABEL(r) {
  let n = new Map(),
    i;
  for (let s of r) {
    if (isFromPluginDirectory(s)) i = s.marketplaceName;
    for (let f of [s.marketplaceName, ...(s.alsoListedIn ?? [])]) n.set(f, (n.get(f) ?? 0) + 1);
  }
  let sorted = [...n]
    .map(([s, f]) => ({
      marketplace: s,
      label: s === i ? OFFICIAL_MARKETPLACE_DISPLAY : displayTextOrRaw(s),
      count: f,
    }))
    .sort((s, f) => {
      if (s.marketplace === i) return -1;
      if (f.marketplace === i) return 1;
      return f.count - s.count || s.label.localeCompare(f.label);
    });
  return [{ marketplace: null, label: "All", count: r.length }, ...sorted];
}
//@ chunk-gda5w2fs.js:4096-4556 fingerprint = truncateTag (0.699)
function truncateTag(e) {
  if (!e.includes(e.charAt(0), 1))
    return (t, r, o) => {
      let index = t.indexOf(e, r);
      return index + e.length > o ? -1 : index;
    };
  let int32Array = new Int32Array(e.length);
  for (let t = 1, r = 0; t < e.length; t++) {
    while (r > 0 && e.charCodeAt(t) !== e.charCodeAt(r)) r = int32Array[r - 1] ?? 0;
    if (e.charCodeAt(t) === e.charCodeAt(r)) r++;
    int32Array[t] = r;
  }
  return (t, r, o) => {
    for (let s = r, i = 0; s < o; s++) {
      while (i > 0 && t.charCodeAt(s) !== e.charCodeAt(i)) i = int32Array[i - 1] ?? 0;
      if (t.charCodeAt(s) === e.charCodeAt(i)) i++;
      if (i === e.length) return s - e.length + 1;
    }
    return -1;
  };
}

export { TagTabs, truncateTag, ALL_TAB_LABEL };
