/**
 * components/permissions/FilePermissionDialog/usePermissionHandler.ts
 *
 * 文件权限选项的处理器表：accept-once / accept-session（加 session 规则）/ reject / block-outside-reads。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/FilePermissionDialog/usePermissionHandler.ts
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: callgraph-fingerprint 1, fingerprint 1
 */
import {
  isInClaudeFolder,
  isInGlobalClaudeFolder,
  Tht,
  jLo,
  buildReadRuleConsentLabel,
} from "./permissionOptions.js";
import {
  GLOBAL_CLAUDE_FOLDER_PERMISSION_PATTERN,
  CLAUDE_FOLDER_PERMISSION_PATTERN,
  FILE_EDIT_TOOL_NAME,
} from "../../../tools/FileEditTool/constants.js";
import {
  parseConsentSuggestions,
  modeSwitchRow,
  parseModeSuggestions,
  ruleMatchesTool,
  combineRows,
  isConsentRow,
} from "../consentRows.js";
import { generateSuggestions } from "../../../utils/permissions/filesystem.js";

//@ chunk-18hwfzwa.js:1367850-1369049 callgraph-fingerprint = handleAcceptSession (0.255)
function handleAcceptSession(h, x, D) {
  let L = isInClaudeFolder(h),
    ee = isInGlobalClaudeFolder(h);
  if ((L || ee) && x !== "read") {
    let rt = ee ? GLOBAL_CLAUDE_FOLDER_PERMISSION_PATTERN : CLAUDE_FOLDER_PERMISSION_PATTERN,
      kt = parseConsentSuggestions(
        [
          {
            type: "addRules",
            rules: [{ toolName: FILE_EDIT_TOOL_NAME, ruleContent: rt }],
            behavior: "allow",
            destination: "session",
          },
        ],
        {
          displayedTypes: Tht,
          renderLabel: (At) => {
            let It = At.length === 1 ? At[0] : void 0;
            if (
              It === void 0 ||
              It.type !== "addRules" ||
              It.rules.length !== 1 ||
              It.rules[0]?.toolName !== FILE_EDIT_TOOL_NAME ||
              It.rules[0]?.ruleContent !== rt
            )
              return null;
            return ee
              ? "Yes, and allow Claude to edit files in its ~/.claude folder for this session"
              : "Yes, and allow Claude to edit files in this project's .claude folder for this session";
          },
        },
      );
    return kt === null ? null : { row: kt, value: "yes-claude-folder" };
  }
  let ke = generateSuggestions(h, x, D),
    Re = [],
    found = ke.find((rt) => rt.type === "setMode");
  if (found?.type === "setMode" && found.mode === "acceptEdits") {
    let rt = modeSwitchRow("acceptEdits");
    if (rt !== null) Re.push(rt);
  }
  let found_2 = ke.find((rt) => rt.type === "addDirectories");
  if (found_2?.type === "addDirectories") {
    let rt = parseModeSuggestions(found_2.directories);
    if (rt !== null) Re.push(rt);
  }
  let filtered = ke.filter((rt) => rt.type === "addRules");
  if (filtered.length > 0) {
    let rt = parseConsentSuggestions(filtered, {
      displayedTypes: Tht,
      labelPredicate: (kt) => ruleMatchesTool(kt, jLo),
      renderLabel: buildReadRuleConsentLabel,
    });
    if (rt !== null) Re.push(rt);
  }
  let [ze, ...Xe] = Re;
  if (ze === void 0) return null;
  return { row: Xe.length === 0 ? ze : combineRows(ze, ...Xe), value: "yes-session" };
}
//@ chunk-18hwfzwa.js:1378346-1378871 fingerprint = PERMISSION_HANDLERS (0.396)
function PERMISSION_HANDLERS(h, x, D) {
  switch (h.type) {
    case "accept-once":
      return { behavior: "allow", updatedInput: x.input, ...(D && { feedback: D }) };
    case "accept-session": {
      if (!isConsentRow(h.row)) return { behavior: "allow", updatedInput: x.input };
      return { behavior: "allow", updatedInput: x.input, permissionUpdates: h.row.applies };
    }
    case "reject":
      return { behavior: "deny", ...(D && { feedback: D }) };
    case "block-outside-reads":
      return { behavior: "deny", blockOutsideReads: !0 };
    case "allow-outside-read-once":
      return {
        behavior: "allow",
        updatedInput: x.input,
        ...(D && { feedback: D }),
        askAgainOutsideReads: !0,
      };
  }
}

export { handleAcceptSession, PERMISSION_HANDLERS };
