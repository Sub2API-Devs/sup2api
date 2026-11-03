/**
 * components/permissions/shellPermissionHelpers.tsx
 *
 * Shell 权限辅助：规则建议标签（"Yes, and don't ask again for …"）、路径列表格式化；混入 peer 消息丢弃原因表。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/shellPermissionHelpers.tsx
 * pieces: chunk-0e8j1zzj.js (1), chunk-18hwfzwa.js (1), chunk-66jn0ssz.js (2)
 * attribution: callgraph-fingerprint 1, fingerprint 2, file-last-pair 1
 */
import { BAi } from "../../utils/peerMessageHeaders.js";
import { sanitizeTeammateLabel } from "../../utils/swarm/teammateIds.js";
import { plural } from "../../utils/stringUtils.js";
import { PEER_MESSAGE_DROP_REASONS } from "../../utils/udsMessaging/peerGuard.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { CONSENT_ROW_LIMITS, consentRowLabel, Cpt } from "./consentRows.js";
import { formatPermissionRule } from "../../utils/permissions/disallowedToolsFlag.js";
import { uniqueLabels } from "../../utils/permissions/approvalPayloadSerialization.js";
import { uniq } from "../../utils/collections.js";
import { bunStringWidth } from "../../ink/stringWidth.js";

//@ chunk-66jn0ssz.js:3487-3592 file-last-pair
function commandListDisplay(commands) {
  return {
    from: BAi(commands.from) ? commands.from : "(unrenderable sender address)",
    name: commands.name ? sanitizeTeammateLabel(commands.name) : "",
  };
}
//@ chunk-66jn0ssz.js:3592-3810 fingerprint = commandListDisplayTruncated (0.389)
function commandListDisplayTruncated(commands) {
  let { from: from } = commandListDisplay(commands),
    { name: r } = commandListDisplay(commands),
    s = r ? `@${r} (${from})` : from,
    d =
      commands.suppressed > 0
        ? ` (+${commands.suppressed} similar ${plural(commands.suppressed, "drop")} suppressed)`
        : "";
  return `Dropped a peer message from ${s}: ${PEER_MESSAGE_DROP_REASONS[commands.reason]}.${d}`;
}
//@ chunk-0e8j1zzj.js:4945-5290 callgraph-fingerprint = formatPathList (0.257)
function formatPathList(paths) {
  if (paths.length === 0) return "";
  if (paths.length === 1) return e(Text, { bold: !0, children: paths[0] });
  if (paths.length === 2)
    return r(Text, {
      children: [
        e(Text, { bold: !0, children: paths[0] }),
        " and ",
        e(Text, { bold: !0, children: paths[1] }),
      ],
    });
  return r(Text, {
    children: [
      paths
        .slice(0, -1)
        .map((t, d) => r(Text, { children: [e(Text, { bold: !0, children: t }), ",", " "] }, d)),
      "and ",
      e(Text, { bold: !0, children: paths.at(-1) }),
    ],
  });
}
//@ chunk-18hwfzwa.js:1390271-1390671 fingerprint = generateShellSuggestionsLabel (0.551)
function generateShellSuggestionsLabel(h) {
  let allRules = h.filter((ee) => ee.type === "addRules").flatMap((ee) => ee.rules);
  if (allRules.length === 0 || allRules.length > CONSENT_ROW_LIMITS) return null;
  let D;
  try {
    D = allRules.map((ee) =>
      formatPermissionRule(
        ee.ruleContent === void 0
          ? { toolName: ee.toolName }
          : { toolName: ee.toolName, ruleContent: ee.ruleContent },
      ),
    );
  } catch {
    return null;
  }
  let L = uniqueLabels(uniq(D), (ee) => consentRowLabel(ee));
  if (bunStringWidth(L.join(" and ")) > Cpt) return null;
  return r(Text, { children: ["Yes, and don't ask again for ", formatPathList(L)] });
}

export { formatPathList, commandListDisplayTruncated, generateShellSuggestionsLabel, commandListDisplay };
