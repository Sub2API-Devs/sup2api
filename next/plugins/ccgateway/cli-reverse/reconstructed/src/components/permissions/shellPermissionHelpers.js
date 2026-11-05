/**
 * components/permissions/shellPermissionHelpers.tsx
 *
 * Shell 权限辅助：规则建议标签（"Yes, and don't ask again for …"）、路径列表格式化；混入 peer 消息丢弃原因表。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/shellPermissionHelpers.tsx
 * pieces: chunk-8prszgkd.js (1), chunk-czq1j3j2.js (1), chunk-gh96j5t0.js (2)
 * attribution: callgraph-fingerprint 1, fingerprint 2, placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isValidHeaderValue } from "../../utils/peerMessageHeaders.js";
import { sanitizeTeammateLabel } from "../../utils/swarm/teammateIds.js";
import { plural } from "../../utils/stringUtils.js";
import { PEER_MESSAGE_DROP_REASONS } from "../../utils/udsMessaging/peerGuard.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { CONSENT_ROW_LIMITS, consentRowLabel, MAX_CONSENT_SUGGESTION_WIDTH } from "./consentRows.js";
import { permissionRuleValueFromString } from "../../utils/permissions/permissionRuleParser.js";
import { uniqueLabels } from "../../utils/permissions/approvalPayloadSerialization.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { bunStringWidth } from "../../ink/stringWidth.js";

//@ chunk-gh96j5t0.js:3486-3591 placement
function commandListDisplay(commands) {
  return {
    from: isValidHeaderValue(commands.from) ? commands.from : "(unrenderable sender address)",
    name: commands.name ? sanitizeTeammateLabel(commands.name) : "",
  };
}
//@ chunk-gh96j5t0.js:3591-3809 fingerprint (2.1.88 match: commandListDisplayTruncated, 0.389)
function commandListDisplayTruncated(commands) {
  let { from } = commandListDisplay(commands);
  let { name } = commandListDisplay(commands);
  let fromLabel = name ? `@${name} (${from})` : from;
  let suppressedSuffix =
    commands.suppressed > 0
      ? ` (+${commands.suppressed} similar ${plural(commands.suppressed, "drop")} suppressed)`
      : "";
  return `Dropped a peer message from ${fromLabel}: ${PEER_MESSAGE_DROP_REASONS[commands.reason]}.${suppressedSuffix}`;
}
//@ chunk-8prszgkd.js:5209-5554 callgraph-fingerprint (2.1.88 match: formatPathList, 0.258)
function formatPathList(paths) {
  if (paths.length === 0) return "";
  if (paths.length === 1)
    return jsxProd_default(Text, {
      bold: true,
      children: paths[0],
    });
  if (paths.length === 2)
    return jsxProd_default_2(Text, {
      children: [
        jsxProd_default(Text, {
          bold: true,
          children: paths[0],
        }),
        " and ",
        jsxProd_default(Text, {
          bold: true,
          children: paths[1],
        }),
      ],
    });
  return jsxProd_default_2(Text, {
    children: [
      paths.slice(0, -1).map((children, index) =>
        jsxProd_default_2(
          Text,
          {
            children: [
              jsxProd_default(Text, {
                bold: true,
                children,
              }),
              ",",
              " ",
            ],
          },
          index,
        ),
      ),
      "and ",
      jsxProd_default(Text, {
        bold: true,
        children: paths.at(-1),
      }),
    ],
  });
}
//@ chunk-czq1j3j2.js:1413040-1413440 fingerprint (2.1.88 match: generateShellSuggestionsLabel, 0.552)
function generateShellSuggestionsLabel(updates) {
  let allRules = updates.filter((update) => update.type === "addRules").flatMap((update) => update.rules);
  if (allRules.length === 0 || allRules.length > CONSENT_ROW_LIMITS) return null;
  let ruleLabels;
  try {
    ruleLabels = allRules.map((rule) =>
      permissionRuleValueFromString(
        rule.ruleContent === undefined
          ? {
              toolName: rule.toolName,
            }
          : {
              toolName: rule.toolName,
              ruleContent: rule.ruleContent,
            },
      ),
    );
  } catch {
    return null;
  }
  let displayLabels = uniqueLabels(normalizeCaseForComparison_2(ruleLabels), (label) =>
    consentRowLabel(label),
  );
  if (bunStringWidth(displayLabels.join(" and ")) > MAX_CONSENT_SUGGESTION_WIDTH) return null;
  return jsxProd_default_2(Text, {
    children: ["Yes, and don't ask again for ", formatPathList(displayLabels)],
  });
}
export { formatPathList, commandListDisplayTruncated, generateShellSuggestionsLabel, commandListDisplay };
