/**
 * components/permissions/consentRows.ts
 *
 * 2.1.316 新增：从权限建议解析授权选项行（规则、目录、模式切换）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-60gvymh4.js (1), chunk-8prszgkd.js (27)
 * attribution: placement 28
 */
import { isRuleRoundTripStable } from "../../utils/permissions/PermissionUpdate.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import {
  fitsLabelLimit,
  hasDisplayUnsafeChar,
  listLabel,
  disambiguateLabels,
  uniqueLabels,
} from "../../utils/permissions/approvalPayloadSerialization.js";
import {
  permissionRuleValueFromString,
  parseRuleString,
  hasWildcard,
  unescapeRuleContent_2,
} from "../../utils/permissions/permissionRuleParser.js";
import { stripNonPrintable } from "../../utils/truncateGraphemes.js";
import { mcpInfoFromString } from "../../services/mcp/mcpStringUtils.js";
import { identityFreeze4, identityFreeze3, mintDisplayedUpdates } from "../../utils/deepFreezePlainData.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { READ } from "../../tools/FileReadTool/constants.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { formatPathList } from "./shellPermissionHelpers.js";
import { stripInvisibleChars } from "../../utils/invisibleChars.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { custom } from "../../../vendor/zod/v4/classic/schemas.js";
import { permissionUpdateSchema } from "../../utils/hooks/hookSpecificOutput.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-60gvymh4.js:227-257 placement
/**
 * 无效工具名使用的占位文本。
 */
var INVALID_TOOL_NAME_TEXT = "(invalid tool name)";
//@ chunk-8prszgkd.js:3145-3174 placement
function isStorableRuleValue(value) {
  return isRuleRoundTripStable(value);
}
//@ chunk-8prszgkd.js:3174-3620 placement (2.1.88 match: extractRules, 0.859)
/**
 * 过滤外部传入的更新列表：addRules 只保留形状合法且可存储的规则，其他类型原样保留。
 */
function filterValidAddRules(updates) {
  let kept = [];
  for (let update of updates) {
    if (update === null || typeof update !== "object") continue;
    if (update.type !== "addRules") {
      kept.push(update);
      continue;
    }
    if (!Array.isArray(update.rules)) continue;
    let filtered = update.rules.filter(
      (update) =>
        update !== null &&
        typeof update === "object" &&
        typeof update.toolName === "string" &&
        (update.ruleContent === undefined || typeof update.ruleContent === "string") &&
        (update.ruleContent === undefined
          ? isRuleableToolName(update.toolName)
          : isStorableRuleValue({
              toolName: update.toolName,
              ruleContent: update.ruleContent,
            })),
    );
    if (filtered.length > 0)
      kept.push({
        ...update,
        rules: filtered,
      });
  }
  return kept;
}
//@ chunk-8prszgkd.js:3620-3685 placement
/**
 * 导出值：同一声明里的多个绑定：MAX_CONSENT_RULE_WIDTH（64：同意行规则宽度）；MAX_CONSENT_SUGGESTION_WIDTH（160：建议规则宽度上限）；INLINE_DESTINATIONS（可内联展示的规则去向）。
 */
var CONSENT_ROW_LIMITS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_CONSENT_RULE_WIDTH;
var MAX_CONSENT_SUGGESTION_WIDTH;
var INLINE_DESTINATIONS;
deferInit("chunk-8prszgkd.js:3620", () => {
  CONSENT_ROW_LIMITS = 8;
  MAX_CONSENT_RULE_WIDTH = 64;
  MAX_CONSENT_SUGGESTION_WIDTH = 160;
  INLINE_DESTINATIONS = new Set(["localSettings", "session"]);
});
//@ chunk-8prszgkd.js:3685-4419 placement
/**
 * 从权限更新建议中筛出可展示的“始终允许”规则行（限目标来源、类型与数量）。
 */
function consentRuleRows(
  updates,
  displayedTypes,
  labelPredicate,
  displayedDestinations = INLINE_DESTINATIONS,
) {
  let filtered = filterValidAddRules(updates).filter((update) => {
    if (!displayedTypes.has(update.type)) return false;
    if (
      (update.type === "addRules" || update.type === "replaceRules" || update.type === "removeRules") &&
      update.behavior !== "allow"
    )
      return false;
    return update.destination !== undefined && displayedDestinations.has(update.destination);
  });
  let allowed = [];
  for (let version of filtered) {
    if (version.type !== "addRules") {
      if (version.type === "addDirectories") {
        if (!Array.isArray(version.directories)) continue;
        let filtered = version.directories.filter(
          (directory) =>
            typeof directory === "string" &&
            directory.trim() !== "" &&
            bunStringWidth(directory) > 0 &&
            fitsLabelLimit(directory),
        );
        if (filtered.length === 0) continue;
        allowed.push({
          ...version,
          directories: filtered,
        });
        continue;
      }
      allowed.push(version);
      continue;
    }
    if (version.rules === undefined) continue;
    let filtered = version.rules.filter((rule) =>
      fitsLabelLimit(
        permissionRuleValueFromString({
          toolName: rule.toolName,
          ...(rule.ruleContent !== undefined && {
            ruleContent: rule.ruleContent,
          }),
        }),
      ),
    );
    let allowedRules = labelPredicate === undefined ? filtered : filtered.filter(labelPredicate);
    if (allowedRules.length > 0)
      allowed.push({
        ...version,
        rules: allowedRules,
      });
  }
  return allowed;
}
//@ chunk-8prszgkd.js:4419-4492 placement
/**
 * 导出值：DISPLAYED_UPDATE_TYPES（只展示 addRules 更新）。
 */
var CONSENT_UPDATE_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DISPLAYED_UPDATE_TYPES;
deferInit("chunk-8prszgkd.js:4419", () => {
  CONSENT_UPDATE_TYPES = new Set(["addRules", "addDirectories"]);
  DISPLAYED_UPDATE_TYPES = new Set(["addRules"]);
});
//@ chunk-8prszgkd.js:4492-4583 placement
function isUnsafeRuleText(ruleText) {
  return (
    ruleText.trim() !== ruleText ||
    ruleText === "" ||
    hasDisplayUnsafeChar(ruleText) ||
    stripNonPrintable(ruleText) !== ruleText ||
    /[\t\n]/.test(ruleText) ||
    bunStringWidth(ruleText) === 0
  );
}
//@ chunk-8prszgkd.js:4583-4787 placement
function isRuleableToolName(toolName) {
  if (toolName === INVALID_TOOL_NAME_TEXT) return false;
  if (isUnsafeRuleText(toolName)) return false;
  let ruleValue = parseRuleString(
    permissionRuleValueFromString({
      toolName,
    }),
  );
  if (ruleValue.toolName !== toolName || ruleValue.ruleContent !== undefined) return false;
  if (hasWildcard(toolName)) return false;
  let mcpInfo = mcpInfoFromString(toolName);
  if (mcpInfo !== null && !mcpInfo.toolName) return false;
  return true;
}
//@ chunk-8prszgkd.js:4787-4886 placement
function titleFromRule(rule) {
  if (typeof rule !== "string" || rule.trim() === "" || bunStringWidth(rule) === 0 || !fitsLabelLimit(rule))
    return null;
  return identityFreeze4(rule);
}
//@ chunk-8prszgkd.js:4886-5209 placement
function joinBoldNames(names) {
  switch (names.length) {
    case 0:
      return "";
    case 1:
      return jsxProd_default(Text, {
        bold: true,
        children: names[0],
      });
    case 2:
      return jsxProd_default_2(Text, {
        children: [
          jsxProd_default(Text, {
            bold: true,
            children: names[0],
          }),
          " and ",
          jsxProd_default(Text, {
            bold: true,
            children: names[1],
          }),
        ],
      });
    default:
      return jsxProd_default_2(Text, {
        children: [
          jsxProd_default(Text, {
            bold: true,
            children: names.slice(0, -1).join(", "),
          }),
          ", and",
          " ",
          jsxProd_default(Text, {
            bold: true,
            children: names.slice(-1)[0],
          }),
        ],
      });
  }
}
//@ chunk-8prszgkd.js:5554-5654 placement
function normalizeRulePath(rulePath) {
  return unescapeRuleContent_2(
    (rulePath?.replace(/\/\*\*$/, "") || "").replace(/^\.\//, "").replace(/^\/\//, "/"),
  );
}
//@ chunk-8prszgkd.js:5654-5742 placement
function stripTrailingWildcard(ruleText) {
  if (!ruleText) return "";
  return ruleText.endsWith(":*") || ruleText.endsWith(" *") ? ruleText.slice(0, -2) : ruleText;
}
//@ chunk-8prszgkd.js:5742-5908 placement
function ruleMatchesTool(rule, toolName, stripBashRedirections) {
  if (rule.toolName === toolName) {
    let trimmedContent = stripTrailingWildcard(rule.ruleContent);
    if (!trimmedContent) return false;
    return Boolean(stripBashRedirections ? stripBashRedirections(trimmedContent) : trimmedContent);
  }
  if (rule.toolName === READ) return Boolean(normalizeRulePath(rule.ruleContent));
  return false;
}
//@ chunk-8prszgkd.js:5908-6007 placement
function safeDisplayText(text) {
  return text !== undefined &&
    stripNonPrintable(text) === text &&
    !/[\t\n\u2028\u2029]/.test(text) &&
    !hasDisplayUnsafeChar(text)
    ? identityFreeze3(text)
    : undefined;
}
//@ chunk-8prszgkd.js:6007-6036 placement
function consentRowLabel(value) {
  return listLabel(value);
}
//@ chunk-8prszgkd.js:6036-7962 placement
function parseSuggestionRows(suggestions, toolName, stripBashRedirections, machineLabel) {
  if (!Array.isArray(suggestions)) return null;
  if (suggestions.length > MAX_CONSENT_RULE_WIDTH) return null;
  if (suggestions.some((entry) => entry === null || typeof entry !== "object")) return null;
  let flattened = suggestions
    .filter((suggestion) => suggestion.type === "addRules")
    .flatMap((suggestion) => suggestion.rules || []);
  let flattened_2 = suggestions
    .filter((suggestion) => suggestion.type === "addDirectories")
    .flatMap((suggestion) => (Array.isArray(suggestion.directories) ? suggestion.directories : []));
  if (
    flattened.some(
      (rule) =>
        rule === null ||
        typeof rule !== "object" ||
        typeof rule.toolName !== "string" ||
        (rule.ruleContent !== undefined && typeof rule.ruleContent !== "string"),
    )
  )
    return null;
  if (flattened.length + flattened_2.length > CONSENT_ROW_LIMITS) return null;
  let filtered = flattened.filter((rule) => rule.toolName === READ);
  let filtered_2 = flattened.filter((rule) => rule.toolName === toolName);
  if (
    flattened_2.some(
      (directory) =>
        typeof directory !== "string" ||
        directory.trim() === "" ||
        bunStringWidth(directory) === 0 ||
        !fitsLabelLimit(directory),
    )
  )
    return null;
  let uniqueDirectories = normalizeCaseForComparison_2(flattened_2);
  let uniqueReadPaths = normalizeCaseForComparison_2(
    filtered.flatMap((rule) =>
      rule.ruleContent && normalizeRulePath(rule.ruleContent) ? rule.ruleContent : [],
    ),
  );
  if (uniqueReadPaths.some((path) => !fitsLabelLimit(path))) return null;
  let uniqueToolPaths = normalizeCaseForComparison_2(
    filtered_2.flatMap((rule) => {
      if (!rule.ruleContent) return [];
      return stripTrailingWildcard(rule.ruleContent) ? [rule.ruleContent] : [];
    }),
  );
  if (uniqueToolPaths.some((path) => !fitsLabelLimit(path))) return null;
  let toolLabels = disambiguateLabels(uniqueToolPaths, (path) => {
    let strippedPath = stripTrailingWildcard(path) || path;
    return consentRowLabel(stripBashRedirections ? stripBashRedirections(strippedPath) : strippedPath);
  });
  let allLabels = disambiguateLabels([...uniqueReadPaths, ...uniqueDirectories], (path) =>
    uniqueReadPaths.includes(path) ? consentRowLabel(normalizeRulePath(path)) : consentRowLabel(path),
  );
  let sliced = allLabels.slice(0, uniqueReadPaths.length);
  let sliced_2 = allLabels.slice(uniqueReadPaths.length);
  if (bunStringWidth([...toolLabels, ...sliced, ...sliced_2].join(" and ")) > MAX_CONSENT_SUGGESTION_WIDTH)
    return null;
  let hasDirectories = uniqueDirectories.length > 0;
  let hasReads = sliced.length > 0;
  let hasTools = toolLabels.length > 0;
  if (hasReads && !hasDirectories && !hasTools)
    return jsxProd_default_2(Text, {
      children: ["Yes, allow reading from ", formatPathList(sliced), " from this project"],
    });
  if (hasDirectories && !hasReads && !hasTools)
    return jsxProd_default_2(Text, {
      children: ["Yes, and always allow access to ", formatPathList(sliced_2), " from this project"],
    });
  if (hasTools && !hasDirectories && !hasReads)
    return jsxProd_default_2(Text, {
      children: [
        "Yes, and don't ask again for ",
        joinBoldNames(toolLabels),
        " commands",
        " ",
        machineLabel === undefined
          ? jsxProd_default_2(Fragment, {
              children: [
                "in",
                " ",
                jsxProd_default(Text, {
                  bold: true,
                  children: stripInvisibleChars(getOriginalCwd()),
                }),
              ],
            })
          : jsxProd_default_2(Fragment, {
              children: [
                "on ",
                jsxProd_default(Text, {
                  bold: true,
                  children: machineLabel,
                }),
              ],
            }),
      ],
    });
  if ((hasDirectories || hasReads) && !hasTools) {
    let allPaths = [...sliced_2, ...sliced];
    return jsxProd_default_2(Text, {
      children: ["Yes, and always allow access to ", formatPathList(allPaths), " from this project"],
    });
  }
  if ((hasDirectories || hasReads) && hasTools) {
    let allPaths = [...sliced_2, ...sliced];
    if (allPaths.length === 1 && toolLabels.length === 1)
      return jsxProd_default_2(Text, {
        children: [
          "Yes, and allow access to ",
          formatPathList(allPaths),
          " and",
          " ",
          joinBoldNames(toolLabels),
          " commands",
        ],
      });
    return jsxProd_default_2(Text, {
      children: [
        "Yes, and allow ",
        formatPathList(allPaths),
        " access and",
        " ",
        joinBoldNames(toolLabels),
        " commands",
      ],
    });
  }
  return null;
}
//@ chunk-8prszgkd.js:7962-8001 placement
var CONSENT_ROW_MINT_TOKEN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-8prszgkd.js:7962", () => {
  CONSENT_ROW_MINT_TOKEN = Symbol("ConsentRow mint token");
});
//@ chunk-8prszgkd.js:8001-8244 placement
/**
 * 同意选项行：只能由 consentRows 工厂（私有令牌）构造，冻结的 {node, applies}；ConsentRow.is 用私有字段判定实例。
 */
class ConsentRow {
  #e = true;
  node;
  applies;
  constructor(token, node, applies) {
    if (token !== CONSENT_ROW_MINT_TOKEN)
      throw Error("ConsentRow may only be constructed by the consentRows factories");
    this.node = node;
    this.applies = applies;
    Object.freeze(this);
  }
  static is(candidate) {
    return typeof candidate === "object" && candidate !== null && #e in candidate;
  }
}
//@ chunk-8prszgkd.js:8244-8275 placement
/**
 * 导出值：ConsentRowSchema（同意行的 schema）。
 */
var isConsentRow; // deferred: uses ConsentRow of its import cycle while loading; runs once the cycle is complete
var ConsentRowSchema;
deferInit("chunk-8prszgkd.js:8244", () => {
  isConsentRow = ConsentRow.is;
  ConsentRowSchema = DoctorLazy(() => custom(isConsentRow));
});
//@ chunk-8prszgkd.js:8275-8446 placement
function parsePermissionUpdates(updates) {
  if (updates.length > MAX_CONSENT_RULE_WIDTH) return null;
  let rows = [];
  for (let count of updates) {
    let update;
    try {
      update = permissionUpdateSchema().safeParse(count);
    } catch {
      return null;
    }
    if (!update.success) return null;
    rows.push(update.data);
  }
  return mintDisplayedUpdates(rows);
}
//@ chunk-8prszgkd.js:8446-9345 placement
/**
 * 把 SDK 传来的权限建议数组校验并转成授权选项行，非法时返回 null。
 */
function parseConsentSuggestions(suggestions, options) {
  if (!Array.isArray(suggestions)) return null;
  let length;
  try {
    length = suggestions.length;
  } catch {
    return null;
  }
  if (
    typeof length !== "number" ||
    !Number.isSafeInteger(length) ||
    length < 0 ||
    length > MAX_CONSENT_RULE_WIDTH
  )
    return null;
  let totalRules = 0;
  let updates = [];
  for (let idx = 0; idx < length; idx++)
    try {
      let entry = suggestions[idx];
      let clone =
        entry !== null && typeof entry === "object"
          ? {
              ...entry,
            }
          : entry;
      let skipEntry = false;
      if (clone !== null && typeof clone === "object") {
        let entry = clone;
        for (let field of ["rules", "directories"]) {
          let list = entry[field];
          if (!Array.isArray(list)) continue;
          let listLength = list.length;
          if (typeof listLength !== "number" || !Number.isSafeInteger(listLength) || listLength < 0) {
            skipEntry = true;
            break;
          }
          totalRules += listLength;
          if (totalRules > MAX_CONSENT_RULE_WIDTH * CONSENT_ROW_LIMITS) return null;
          let copy = [];
          for (let idx = 0; idx < listLength; idx++) copy.push(list[idx]);
          entry[field] = copy;
        }
      }
      if (skipEntry) continue;
      updates.push(clone);
    } catch {}
  let parsed = [];
  for (let entry of updates) {
    let result;
    try {
      result = permissionUpdateSchema().safeParse(entry);
    } catch {
      continue;
    }
    if (result.success) parsed.push(result.data);
  }
  if (parsed.length === 0) return null;
  let consentRows = consentRuleRows(
    parsed,
    options.displayedTypes,
    options.labelPredicate,
    options.displayedDestinations,
  );
  if (consentRows.length === 0) return null;
  let displayedUpdates = mintDisplayedUpdates(consentRows);
  let label = options.renderLabel(displayedUpdates);
  if (label == null || typeof label === "boolean" || label === "") return null;
  return new ConsentRow(CONSENT_ROW_MINT_TOKEN, label, displayedUpdates);
}
//@ chunk-8prszgkd.js:9345-9720 placement
var PERMISSION_MODE_LABELS = {
  default: "default (ask each time)",
  acceptEdits: "accept edits (auto-approve file edits and common file commands)",
  auto: "auto (no routine prompts; a reviewer model screens actions)",
  dontAsk: "don't ask (auto-deny anything that would prompt)",
  plan: "plan mode (research and propose changes without making them)",
  bypassPermissions: "BYPASS PERMISSIONS (no further prompts)",
};
//@ chunk-8prszgkd.js:9720-10258 placement
function modeSwitchRow(mode, options) {
  if (mode === "bypassPermissions" && options?.isBypassPermissionsModeAvailable === false) return null;
  let permissionUpdates = parsePermissionUpdates([
    {
      type: "setMode",
      destination: "session",
      mode,
    },
  ]);
  if (permissionUpdates === null) throw Error("setModeRow: schema rejected a designed setMode update");
  if (options?.labelVariant === "plan-keep-context") {
    let label =
      mode === "acceptEdits"
        ? "Yes, auto-accept edits"
        : mode === "default"
          ? "Yes, manually approve edits"
          : null;
    if (label !== null)
      return new ConsentRow(
        CONSENT_ROW_MINT_TOKEN,
        jsxProd_default(Text, {
          children: label,
        }),
        permissionUpdates,
      );
  }
  return new ConsentRow(
    CONSENT_ROW_MINT_TOKEN,
    jsxProd_default_2(Text, {
      children: [
        "Yes, and switch to ",
        jsxProd_default(Text, {
          bold: true,
          children: PERMISSION_MODE_LABELS[mode],
        }),
        " for this session",
      ],
    }),
    permissionUpdates,
  );
}
//@ chunk-8prszgkd.js:10258-10853 placement
function parseModeSuggestions(directories) {
  if (!Array.isArray(directories)) return null;
  let directoryCount;
  try {
    directoryCount = directories.length;
  } catch {
    return null;
  }
  if (
    typeof directoryCount !== "number" ||
    !Number.isSafeInteger(directoryCount) ||
    directoryCount < 0 ||
    directoryCount > MAX_CONSENT_RULE_WIDTH
  )
    return null;
  let dirList = [];
  for (let dir = 0; dir < directoryCount; dir++)
    try {
      let directory = directories[dir];
      let label = titleFromRule(directory);
      if (label !== null) dirList.push(label);
    } catch {}
  let uniqueDirs = normalizeCaseForComparison_2(dirList);
  if (uniqueDirs.length === 0) return null;
  if (uniqueDirs.length > CONSENT_ROW_LIMITS) return null;
  let labels = uniqueLabels(uniqueDirs, (dir) => listLabel(dir));
  if (bunStringWidth(labels.join(", ")) > MAX_CONSENT_SUGGESTION_WIDTH) return null;
  let permissionUpdates = parsePermissionUpdates([
    {
      type: "addDirectories",
      destination: "session",
      directories: uniqueDirs,
    },
  ]);
  if (permissionUpdates === null) return null;
  return new ConsentRow(
    CONSENT_ROW_MINT_TOKEN,
    jsxProd_default_2(Text, {
      children: [
        "Yes, and always allow access to ",
        jsxProd_default(Text, {
          bold: true,
          children: labels.join(", "),
        }),
        " for this session",
      ],
    }),
    permissionUpdates,
  );
}
//@ chunk-8prszgkd.js:10853-11482 placement
function directoryRow(editablePrefixSeed, editablePrefix, toolName) {
  if (typeof editablePrefixSeed !== "string" || safeDisplayText(editablePrefixSeed) !== editablePrefixSeed)
    return null;
  if (typeof editablePrefix !== "string") return null;
  let trimmed = editablePrefix.trim();
  if (trimmed === "" || safeDisplayText(trimmed) !== trimmed) return null;
  if (trimmed === "*") {
    if (!isRuleableToolName(toolName)) return null;
    let permissionUpdates = parsePermissionUpdates([
      {
        type: "addRules",
        rules: [
          {
            toolName,
          },
        ],
        behavior: "allow",
        destination: "localSettings",
      },
    ]);
    if (permissionUpdates === null) return null;
    return new ConsentRow(
      CONSENT_ROW_MINT_TOKEN,
      `Yes, and don\u2019t ask again for any ${toolName} command`,
      permissionUpdates,
    );
  }
  if (
    !isRuleableToolName(toolName) ||
    !isStorableRuleValue({
      toolName,
      ruleContent: trimmed,
    })
  )
    return null;
  let permissionUpdates = parsePermissionUpdates([
    {
      type: "addRules",
      rules: [
        {
          toolName,
          ruleContent: trimmed,
        },
      ],
      behavior: "allow",
      destination: "localSettings",
    },
  ]);
  if (permissionUpdates === null) return null;
  return new ConsentRow(
    CONSENT_ROW_MINT_TOKEN,
    `Yes, and don\u2019t ask again for: ${trimmed}`,
    permissionUpdates,
  );
}
//@ chunk-8prszgkd.js:11482-11682 placement
/**
 * 导出值：EMPTY_DISPLAYED_UPDATES（空的已展示更新列表（非空断言））。
 */
var AUTO_MODE_ROW_LABELS; // deferred: uses parsePermissionUpdates of its import cycle while loading; runs once the cycle is complete
var EMPTY_DISPLAYED_UPDATES;
deferInit("chunk-8prszgkd.js:11482", () => {
  AUTO_MODE_ROW_LABELS = {
    workflow: "Yes, and switch to auto mode",
    "exit-plan-resume": "Yes, and use auto mode",
  };
  EMPTY_DISPLAYED_UPDATES = (() => {
    let permissionUpdates = parsePermissionUpdates([]);
    if (permissionUpdates === null) throw Error("NO_DISPLAYED_UPDATES: empty intake rejected");
    return permissionUpdates;
  })();
});
//@ chunk-8prszgkd.js:11682-11726 placement
function autoModeRow(variant) {
  return new ConsentRow(CONSENT_ROW_MINT_TOKEN, AUTO_MODE_ROW_LABELS[variant], EMPTY_DISPLAYED_UPDATES);
}
//@ chunk-8prszgkd.js:11726-12168 placement
function combineRows(first, ...rest) {
  let rows = [first, ...rest];
  for (let row of rows)
    if (!isConsentRow(row)) throw Error("combineRows accepts only constructor-produced ConsentRows");
  let updates = rows.flatMap((row) => [...row.applies]);
  if (updates.length > MAX_CONSENT_RULE_WIDTH)
    throw Error("combineRows: combined updates exceed the display intake cap");
  let permissionUpdates = parsePermissionUpdates(updates);
  if (permissionUpdates === null) throw Error("combineRows: schema rejected already-minted updates");
  return new ConsentRow(
    CONSENT_ROW_MINT_TOKEN,
    jsxProd_default(Text, {
      children: rows.map((row, index) =>
        jsxProd_default_2(
          Text,
          {
            children: [index > 0 ? "; " : "", row.node],
          },
          index,
        ),
      ),
    }),
    permissionUpdates,
  );
}
export {
  parseModeSuggestions,
  CONSENT_ROW_LIMITS,
  normalizeRulePath,
  consentRowLabel,
  MAX_CONSENT_SUGGESTION_WIDTH,
  isConsentRow,
  parseConsentSuggestions,
  isRuleableToolName,
  autoModeRow,
  INVALID_TOOL_NAME_TEXT,
  ConsentRowSchema,
  AUTO_MODE_ROW_LABELS,
  ruleMatchesTool,
  CONSENT_UPDATE_TYPES,
  parseSuggestionRows,
  directoryRow,
  safeDisplayText,
  modeSwitchRow,
  combineRows,
  DISPLAYED_UPDATE_TYPES,
  MAX_CONSENT_RULE_WIDTH,
};
