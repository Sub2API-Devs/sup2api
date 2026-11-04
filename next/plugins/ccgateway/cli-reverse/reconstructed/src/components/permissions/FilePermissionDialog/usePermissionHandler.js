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
  FILE_RULE_UPDATE_TYPES,
  FILE_FAMILY_TOOLTIP,
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

//@ chunk-18hwfzwa.js:1367850-1369049 callgraph-fingerprint (2.1.88 match: handleAcceptSession, 0.255)
function handleAcceptSession(filePath, operationType, toolPermissionContext) {
  let isProjectClaudeFolder = isInClaudeFolder(filePath);
  let isGlobalClaudeFolder = isInGlobalClaudeFolder(filePath);
  if ((isProjectClaudeFolder || isGlobalClaudeFolder) && operationType !== "read") {
    let rulePattern = isGlobalClaudeFolder
      ? GLOBAL_CLAUDE_FOLDER_PERMISSION_PATTERN
      : CLAUDE_FOLDER_PERMISSION_PATTERN;
    let consentSuggestions = parseConsentSuggestions(
      [
        {
          type: "addRules",
          rules: [
            {
              toolName: FILE_EDIT_TOOL_NAME,
              ruleContent: rulePattern,
            },
          ],
          behavior: "allow",
          destination: "session",
        },
      ],
      {
        displayedTypes: FILE_RULE_UPDATE_TYPES,
        renderLabel: (updates) => {
          let update = updates.length === 1 ? updates[0] : undefined;
          if (
            update === undefined ||
            update.type !== "addRules" ||
            update.rules.length !== 1 ||
            update.rules[0]?.toolName !== FILE_EDIT_TOOL_NAME ||
            update.rules[0]?.ruleContent !== rulePattern
          )
            return null;
          return isGlobalClaudeFolder
            ? "Yes, and allow Claude to edit files in its ~/.claude folder for this session"
            : "Yes, and allow Claude to edit files in this project's .claude folder for this session";
        },
      },
    );
    return consentSuggestions === null
      ? null
      : {
          row: consentSuggestions,
          value: "yes-claude-folder",
        };
  }
  let suggestions = generateSuggestions(filePath, operationType, toolPermissionContext);
  let rows = [];
  let found = suggestions.find((suggestion) => suggestion.type === "setMode");
  if (found?.type === "setMode" && found.mode === "acceptEdits") {
    let acceptEditsRow = modeSwitchRow("acceptEdits");
    if (acceptEditsRow !== null) rows.push(acceptEditsRow);
  }
  let found_2 = suggestions.find((suggestion) => suggestion.type === "addDirectories");
  if (found_2?.type === "addDirectories") {
    let modeSuggestions = parseModeSuggestions(found_2.directories);
    if (modeSuggestions !== null) rows.push(modeSuggestions);
  }
  let filtered = suggestions.filter((suggestion) => suggestion.type === "addRules");
  if (filtered.length > 0) {
    let consentSuggestions = parseConsentSuggestions(filtered, {
      displayedTypes: FILE_RULE_UPDATE_TYPES,
      labelPredicate: (rule) => ruleMatchesTool(rule, FILE_FAMILY_TOOLTIP),
      renderLabel: buildReadRuleConsentLabel,
    });
    if (consentSuggestions !== null) rows.push(consentSuggestions);
  }
  let [firstRow, ...restRows] = rows;
  if (firstRow === undefined) return null;
  return {
    row: restRows.length === 0 ? firstRow : combineRows(firstRow, ...restRows),
    value: "yes-session",
  };
}
//@ chunk-18hwfzwa.js:1378346-1378871 fingerprint (2.1.88 match: PERMISSION_HANDLERS, 0.396)
function PERMISSION_HANDLERS(option, payload, feedback) {
  switch (option.type) {
    case "accept-once":
      return {
        behavior: "allow",
        updatedInput: payload.input,
        ...(feedback && {
          feedback,
        }),
      };
    case "accept-session": {
      if (!isConsentRow(option.row))
        return {
          behavior: "allow",
          updatedInput: payload.input,
        };
      return {
        behavior: "allow",
        updatedInput: payload.input,
        permissionUpdates: option.row.applies,
      };
    }
    case "reject":
      return {
        behavior: "deny",
        ...(feedback && {
          feedback,
        }),
      };
    case "block-outside-reads":
      return {
        behavior: "deny",
        blockOutsideReads: true,
      };
    case "allow-outside-read-once":
      return {
        behavior: "allow",
        updatedInput: payload.input,
        ...(feedback && {
          feedback,
        }),
        askAgainOutsideReads: true,
      };
  }
}
export { handleAcceptSession, PERMISSION_HANDLERS };
