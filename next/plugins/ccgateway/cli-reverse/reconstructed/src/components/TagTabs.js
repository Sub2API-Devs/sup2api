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
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { jsxProd_default_2 } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../ink/components/Text.js";
import { isFromPluginDirectory, displayTextOrRaw } from "../utils/plugins/pluginDisplayMetadata.js";
import { OFFICIAL_MARKETPLACE_DISPLAY } from "../utils/plugins/officialMarketplaceNames.js";

//@ chunk-gda5w2fs.js:4096-4556 fingerprint (2.1.88 match: truncateTag, 0.699)
function truncateTag(pattern) {
  if (!pattern.includes(pattern.charAt(0), 1))
    return (text, startIndex, endIndex) => {
      let index = text.indexOf(pattern, startIndex);
      return index + pattern.length > endIndex ? -1 : index;
    };
  let int32Array = new Int32Array(pattern.length);
  for (let i = 1, matchedLength = 0; i < pattern.length; i++) {
    while (matchedLength > 0 && pattern.charCodeAt(i) !== pattern.charCodeAt(matchedLength))
      matchedLength = int32Array[matchedLength - 1] ?? 0;
    if (pattern.charCodeAt(i) === pattern.charCodeAt(matchedLength)) matchedLength++;
    int32Array[i] = matchedLength;
  }
  return (text, startIndex, endIndex) => {
    for (let position = startIndex, matchedLength = 0; position < endIndex; position++) {
      while (matchedLength > 0 && text.charCodeAt(position) !== pattern.charCodeAt(matchedLength))
        matchedLength = int32Array[matchedLength - 1] ?? 0;
      if (text.charCodeAt(position) === pattern.charCodeAt(matchedLength)) matchedLength++;
      if (matchedLength === pattern.length) return position - pattern.length + 1;
    }
    return -1;
  };
}
//@ chunk-8ayegty4.js:296-631 fingerprint (2.1.88 match: TagTabs, 0.381)
function TagTabs(props) {
  let $ = useMemoCache(7);
  let { children, color, textColor, padded, bold, wrap } = props;
  let padding = padded ? " " : "";
  const windowWidth = textColor ?? (color ? "inverseText" : undefined);
  let element;
  if (
    $[0] !== bold ||
    $[1] !== children ||
    $[2] !== color ||
    $[3] !== padding ||
    $[4] !== windowWidth ||
    $[5] !== wrap
  ) {
    element = jsxProd_default_2(Text, {
      backgroundColor: color,
      color: windowWidth,
      bold,
      wrap,
      children: [padding, children, padding],
    });
    $[0] = bold;
    $[1] = children;
    $[2] = color;
    $[3] = padding;
    $[4] = windowWidth;
    $[5] = wrap;
    $[6] = element;
  } else element = $[6];
  return element;
}
//@ chunk-ca06bv0t.js:8675-9094 fingerprint (2.1.88 match: ALL_TAB_LABEL, 0.497)
function ALL_TAB_LABEL(plugins) {
  let marketplaceCounts = new Map();
  let officialMarketplaceName;
  for (let plugin of plugins) {
    if (isFromPluginDirectory(plugin)) officialMarketplaceName = plugin.marketplaceName;
    for (let marketplaceName of [plugin.marketplaceName, ...(plugin.alsoListedIn ?? [])])
      marketplaceCounts.set(marketplaceName, (marketplaceCounts.get(marketplaceName) ?? 0) + 1);
  }
  let sorted = [...marketplaceCounts]
    .map(([marketplaceName, pluginCount]) => ({
      marketplace: marketplaceName,
      label:
        marketplaceName === officialMarketplaceName
          ? OFFICIAL_MARKETPLACE_DISPLAY
          : displayTextOrRaw(marketplaceName),
      count: pluginCount,
    }))
    .sort((tabA, tabB) => {
      if (tabA.marketplace === officialMarketplaceName) return -1;
      if (tabB.marketplace === officialMarketplaceName) return 1;
      return tabB.count - tabA.count || tabA.label.localeCompare(tabB.label);
    });
  return [
    {
      marketplace: null,
      label: "All",
      count: plugins.length,
    },
    ...sorted,
  ];
}
export { TagTabs, truncateTag, ALL_TAB_LABEL };
