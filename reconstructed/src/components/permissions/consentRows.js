/**
 * components/permissions/consentRows.ts
 *
 * 2.1.316 新增：从权限建议解析授权选项行（规则、目录、模式切换）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0e8j1zzj.js (27)
 * attribution: placement 27
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
import { formatPermissionRule } from "../../utils/permissions/disallowedToolsFlag.js";
import { stripNonPrintable } from "../../utils/truncateGraphemes.js";
import {
  INVALID_TOOL_NAME_TEXT,
  identityFreeze4,
  identityFreeze3,
  mintDisplayedUpdates,
} from "../../utils/deepFreezePlainData.js";
import {
  permissionRuleValueFromString,
  hasWildcard,
  unescapeRuleContent_2,
} from "../../utils/permissions/permissionRuleParser.js";
import { mcpInfoFromString } from "../../services/mcp/mcpStringUtils.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { uniq } from "../../utils/collections.js";
import { formatPathList } from "./shellPermissionHelpers.js";
import { stripInvisibleChars } from "../../utils/invisibleChars.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { hu } from "../../../vendor/zod/v4/classic/schemas.js";
import { permissionUpdateSchema } from "../../utils/hooks/hookSpecificOutput.js";

//@ chunk-0e8j1zzj.js:2881-2910 placement
function isStorableRuleValue(o) {
  return isRuleRoundTripStable(o);
}
//@ chunk-0e8j1zzj.js:2910-3356 placement = extractRules (0.859)
/**
 * 过滤外部传入的更新列表：addRules 只保留形状合法且可存储的规则，其他类型原样保留。
 */
function filterValidAddRules(updates) {
  let t = [];
  for (let update of updates) {
    if (update === null || typeof update !== "object") continue;
    if (update.type !== "addRules") {
      t.push(update);
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
      t.push({
        ...update,
        rules: filtered,
      });
  }
  return t;
}
//@ chunk-0e8j1zzj.js:3356-3421 placement
/**
 * 导出值：同一声明里的多个绑定：MAX_CONSENT_RULE_WIDTH（64：同意行规则宽度）；MAX_CONSENT_SUGGESTION_WIDTH（160：建议规则宽度上限）；INLINE_DESTINATIONS（可内联展示的规则去向）。
 */
var CONSENT_ROW_LIMITS = 8;
var MAX_CONSENT_RULE_WIDTH = 64;
var MAX_CONSENT_SUGGESTION_WIDTH = 160;
var INLINE_DESTINATIONS = new Set(["localSettings", "session"]);
//@ chunk-0e8j1zzj.js:3421-4155 placement
/**
 * 从权限更新建议中筛出可展示的“始终允许”规则行（限目标来源、类型与数量）。
 */
function consentRuleRows(
  updates,
  displayedTypes,
  labelPredicate,
  displayedDestinations = INLINE_DESTINATIONS,
) {
  let filtered = filterValidAddRules(updates).filter((i) => {
    if (!displayedTypes.has(i.type)) return false;
    if (
      (i.type === "addRules" || i.type === "replaceRules" || i.type === "removeRules") &&
      i.behavior !== "allow"
    )
      return false;
    return i.destination !== undefined && displayedDestinations.has(i.destination);
  });
  let u = [];
  for (let i of filtered) {
    if (i.type !== "addRules") {
      if (i.type === "addDirectories") {
        if (!Array.isArray(i.directories)) continue;
        let filtered = i.directories.filter(
          (directory) =>
            typeof directory === "string" &&
            directory.trim() !== "" &&
            bunStringWidth(directory) > 0 &&
            fitsLabelLimit(directory),
        );
        if (filtered.length === 0) continue;
        u.push({
          ...i,
          directories: filtered,
        });
        continue;
      }
      u.push(i);
      continue;
    }
    if (i.rules === undefined) continue;
    let filtered = i.rules.filter((rule) =>
      fitsLabelLimit(
        formatPermissionRule({
          toolName: rule.toolName,
          ...(rule.ruleContent !== undefined && {
            ruleContent: rule.ruleContent,
          }),
        }),
      ),
    );
    let k = labelPredicate === undefined ? filtered : filtered.filter(labelPredicate);
    if (k.length > 0)
      u.push({
        ...i,
        rules: k,
      });
  }
  return u;
}
//@ chunk-0e8j1zzj.js:4155-4228 placement
/**
 * 导出值：DISPLAYED_UPDATE_TYPES（只展示 addRules 更新）。
 */
var CONSENT_UPDATE_TYPES = new Set(["addRules", "addDirectories"]);
var DISPLAYED_UPDATE_TYPES = new Set(["addRules"]);
//@ chunk-0e8j1zzj.js:4228-4319 placement
function isUnsafeRuleText(o) {
  return (
    o.trim() !== o ||
    o === "" ||
    hasDisplayUnsafeChar(o) ||
    stripNonPrintable(o) !== o ||
    /[\t\n]/.test(o) ||
    bunStringWidth(o) === 0
  );
}
//@ chunk-0e8j1zzj.js:4319-4523 placement
function isRuleableToolName(toolName) {
  if (toolName === INVALID_TOOL_NAME_TEXT) return false;
  if (isUnsafeRuleText(toolName)) return false;
  let t = permissionRuleValueFromString(
    formatPermissionRule({
      toolName,
    }),
  );
  if (t.toolName !== toolName || t.ruleContent !== undefined) return false;
  if (hasWildcard(toolName)) return false;
  let d = mcpInfoFromString(toolName);
  if (d !== null && !d.toolName) return false;
  return true;
}
//@ chunk-0e8j1zzj.js:4523-4622 placement
function titleFromRule(o) {
  if (typeof o !== "string" || o.trim() === "" || bunStringWidth(o) === 0 || !fitsLabelLimit(o)) return null;
  return identityFreeze4(o);
}
//@ chunk-0e8j1zzj.js:4622-4945 placement
function joinBoldNames(o) {
  switch (o.length) {
    case 0:
      return "";
    case 1:
      return jsxProd_default(Text, {
        bold: true,
        children: o[0],
      });
    case 2:
      return jsxProd_default_2(Text, {
        children: [
          jsxProd_default(Text, {
            bold: true,
            children: o[0],
          }),
          " and ",
          jsxProd_default(Text, {
            bold: true,
            children: o[1],
          }),
        ],
      });
    default:
      return jsxProd_default_2(Text, {
        children: [
          jsxProd_default(Text, {
            bold: true,
            children: o.slice(0, -1).join(", "),
          }),
          ", and",
          " ",
          jsxProd_default(Text, {
            bold: true,
            children: o.slice(-1)[0],
          }),
        ],
      });
  }
}
//@ chunk-0e8j1zzj.js:5290-5390 placement
function normalizeRulePath(ruleContent) {
  return unescapeRuleContent_2(
    (ruleContent?.replace(/\/\*\*$/, "") || "").replace(/^\.\//, "").replace(/^\/\//, "/"),
  );
}
//@ chunk-0e8j1zzj.js:5390-5478 placement
function stripTrailingWildcard(ruleContent) {
  if (!ruleContent) return "";
  return ruleContent.endsWith(":*") || ruleContent.endsWith(" *") ? ruleContent.slice(0, -2) : ruleContent;
}
//@ chunk-0e8j1zzj.js:5478-5644 placement
function ruleMatchesTool(o, t, stripBashRedirections) {
  if (o.toolName === t) {
    let c = stripTrailingWildcard(o.ruleContent);
    if (!c) return false;
    return Boolean(stripBashRedirections ? stripBashRedirections(c) : c);
  }
  if (o.toolName === FILE_READ_TOOL_NAME) return Boolean(normalizeRulePath(o.ruleContent));
  return false;
}
//@ chunk-0e8j1zzj.js:5644-5743 placement
function safeDisplayText(o) {
  return o !== undefined &&
    stripNonPrintable(o) === o &&
    !/[\t\n\u2028\u2029]/.test(o) &&
    !hasDisplayUnsafeChar(o)
    ? identityFreeze3(o)
    : undefined;
}
//@ chunk-0e8j1zzj.js:5743-5772 placement
function consentRowLabel(o) {
  return listLabel(o);
}
//@ chunk-0e8j1zzj.js:5772-7696 placement
function parseSuggestionRows(o, t, stripBashRedirections, c) {
  if (!Array.isArray(o)) return null;
  if (o.length > MAX_CONSENT_RULE_WIDTH) return null;
  if (o.some((b) => b === null || typeof b !== "object")) return null;
  let flattened = o.filter((b) => b.type === "addRules").flatMap((b) => b.rules || []);
  let flattened_2 = o
    .filter((b) => b.type === "addDirectories")
    .flatMap((b) => (Array.isArray(b.directories) ? b.directories : []));
  if (
    flattened.some(
      (b) =>
        b === null ||
        typeof b !== "object" ||
        typeof b.toolName !== "string" ||
        (b.ruleContent !== undefined && typeof b.ruleContent !== "string"),
    )
  )
    return null;
  if (flattened.length + flattened_2.length > CONSENT_ROW_LIMITS) return null;
  let filtered = flattened.filter((b) => b.toolName === FILE_READ_TOOL_NAME);
  let filtered_2 = flattened.filter((b) => b.toolName === t);
  if (
    flattened_2.some(
      (b) => typeof b !== "string" || b.trim() === "" || bunStringWidth(b) === 0 || !fitsLabelLimit(b),
    )
  )
    return null;
  let k = uniq(flattened_2);
  let f = uniq(
    filtered.flatMap((b) => (b.ruleContent && normalizeRulePath(b.ruleContent) ? b.ruleContent : [])),
  );
  if (f.some((b) => !fitsLabelLimit(b))) return null;
  let g = uniq(
    filtered_2.flatMap((b) => {
      if (!b.ruleContent) return [];
      return stripTrailingWildcard(b.ruleContent) ? [b.ruleContent] : [];
    }),
  );
  if (g.some((b) => !fitsLabelLimit(b))) return null;
  let M = disambiguateLabels(g, (b) => {
    let E = stripTrailingWildcard(b) || b;
    return consentRowLabel(stripBashRedirections ? stripBashRedirections(E) : E);
  });
  let N = disambiguateLabels([...f, ...k], (b) =>
    f.includes(b) ? consentRowLabel(normalizeRulePath(b)) : consentRowLabel(b),
  );
  let sliced = N.slice(0, f.length);
  let sliced_2 = N.slice(f.length);
  if (bunStringWidth([...M, ...sliced, ...sliced_2].join(" and ")) > MAX_CONSENT_SUGGESTION_WIDTH)
    return null;
  let v = k.length > 0;
  let I = sliced.length > 0;
  let L = M.length > 0;
  if (I && !v && !L)
    return jsxProd_default_2(Text, {
      children: ["Yes, allow reading from ", formatPathList(sliced), " from this project"],
    });
  if (v && !I && !L)
    return jsxProd_default_2(Text, {
      children: ["Yes, and always allow access to ", formatPathList(sliced_2), " from this project"],
    });
  if (L && !v && !I)
    return jsxProd_default_2(Text, {
      children: [
        "Yes, and don't ask again for ",
        joinBoldNames(M),
        " commands",
        " ",
        c === undefined
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
                  children: c,
                }),
              ],
            }),
      ],
    });
  if ((v || I) && !L) {
    let b = [...sliced_2, ...sliced];
    return jsxProd_default_2(Text, {
      children: ["Yes, and always allow access to ", formatPathList(b), " from this project"],
    });
  }
  if ((v || I) && L) {
    let b = [...sliced_2, ...sliced];
    if (b.length === 1 && M.length === 1)
      return jsxProd_default_2(Text, {
        children: [
          "Yes, and allow access to ",
          formatPathList(b),
          " and",
          " ",
          joinBoldNames(M),
          " commands",
        ],
      });
    return jsxProd_default_2(Text, {
      children: ["Yes, and allow ", formatPathList(b), " access and", " ", joinBoldNames(M), " commands"],
    });
  }
  return null;
}
//@ chunk-0e8j1zzj.js:7696-7735 placement
var CONSENT_ROW_MINT_TOKEN = Symbol("ConsentRow mint token");
//@ chunk-0e8j1zzj.js:7735-7978 placement
/**
 * 同意选项行：只能由 consentRows 工厂（私有令牌）构造，冻结的 {node, applies}；ConsentRow.is 用私有字段判定实例。
 */
class ConsentRow {
  #e = true;
  node;
  applies;
  constructor(o, node, applies) {
    if (o !== CONSENT_ROW_MINT_TOKEN)
      throw Error("ConsentRow may only be constructed by the consentRows factories");
    this.node = node;
    this.applies = applies;
    Object.freeze(this);
  }
  static is(o) {
    return typeof o === "object" && o !== null && #e in o;
  }
}
//@ chunk-0e8j1zzj.js:7978-8009 placement
/**
 * 导出值：ConsentRowSchema（同意行的 schema）。
 */
var isConsentRow = ConsentRow.is;
var ConsentRowSchema = DoctorLazy(() => hu(isConsentRow));
//@ chunk-0e8j1zzj.js:8009-8180 placement
function parsePermissionUpdates(o) {
  if (o.length > MAX_CONSENT_RULE_WIDTH) return null;
  let t = [];
  for (let d of o) {
    let c;
    try {
      c = permissionUpdateSchema().safeParse(d);
    } catch {
      return null;
    }
    if (!c.success) return null;
    t.push(c.data);
  }
  return mintDisplayedUpdates(t);
}
//@ chunk-0e8j1zzj.js:8180-9079 placement
/**
 * 把 SDK 传来的权限建议数组校验并转成授权选项行，非法时返回 null。
 */
function parseConsentSuggestions(o, t) {
  if (!Array.isArray(o)) return null;
  let d;
  try {
    d = o.length;
  } catch {
    return null;
  }
  if (typeof d !== "number" || !Number.isSafeInteger(d) || d < 0 || d > MAX_CONSENT_RULE_WIDTH) return null;
  let c = 0;
  let m = [];
  for (let idx = 0; idx < d; idx++)
    try {
      let g = o[idx];
      let M =
        g !== null && typeof g === "object"
          ? {
              ...g,
            }
          : g;
      let N = false;
      if (M !== null && typeof M === "object") {
        let x = M;
        for (let A of ["rules", "directories"]) {
          let T = x[A];
          if (!Array.isArray(T)) continue;
          let v = T.length;
          if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 0) {
            N = true;
            break;
          }
          c += v;
          if (c > MAX_CONSENT_RULE_WIDTH * CONSENT_ROW_LIMITS) return null;
          let I = [];
          for (let idx = 0; idx < v; idx++) I.push(T[idx]);
          x[A] = I;
        }
      }
      if (N) continue;
      m.push(M);
    } catch {}
  let u = [];
  for (let f of m) {
    let g;
    try {
      g = permissionUpdateSchema().safeParse(f);
    } catch {
      continue;
    }
    if (g.success) u.push(g.data);
  }
  if (u.length === 0) return null;
  let i = consentRuleRows(u, t.displayedTypes, t.labelPredicate, t.displayedDestinations);
  if (i.length === 0) return null;
  let h = mintDisplayedUpdates(i);
  let k = t.renderLabel(h);
  if (k == null || typeof k === "boolean" || k === "") return null;
  return new ConsentRow(CONSENT_ROW_MINT_TOKEN, k, h);
}
//@ chunk-0e8j1zzj.js:9079-9454 placement
var PERMISSION_MODE_LABELS = {
  default: "default (ask each time)",
  acceptEdits: "accept edits (auto-approve file edits and common file commands)",
  auto: "auto (no routine prompts; a reviewer model screens actions)",
  dontAsk: "don't ask (auto-deny anything that would prompt)",
  plan: "plan mode (research and propose changes without making them)",
  bypassPermissions: "BYPASS PERMISSIONS (no further prompts)",
};
//@ chunk-0e8j1zzj.js:9454-9992 placement
function modeSwitchRow(o, t) {
  if (o === "bypassPermissions" && t?.isBypassPermissionsModeAvailable === false) return null;
  let permissionUpdates = parsePermissionUpdates([
    {
      type: "setMode",
      destination: "session",
      mode: o,
    },
  ]);
  if (permissionUpdates === null) throw Error("setModeRow: schema rejected a designed setMode update");
  if (t?.labelVariant === "plan-keep-context") {
    let c =
      o === "acceptEdits" ? "Yes, auto-accept edits" : o === "default" ? "Yes, manually approve edits" : null;
    if (c !== null)
      return new ConsentRow(
        CONSENT_ROW_MINT_TOKEN,
        jsxProd_default(Text, {
          children: c,
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
          children: PERMISSION_MODE_LABELS[o],
        }),
        " for this session",
      ],
    }),
    permissionUpdates,
  );
}
//@ chunk-0e8j1zzj.js:9992-10587 placement
function parseModeSuggestions(directories) {
  if (!Array.isArray(directories)) return null;
  let t;
  try {
    t = directories.length;
  } catch {
    return null;
  }
  if (typeof t !== "number" || !Number.isSafeInteger(t) || t < 0 || t > MAX_CONSENT_RULE_WIDTH) return null;
  let d = [];
  for (let i = 0; i < t; i++)
    try {
      let h = directories[i];
      let k = titleFromRule(h);
      if (k !== null) d.push(k);
    } catch {}
  let c = uniq(d);
  if (c.length === 0) return null;
  if (c.length > CONSENT_ROW_LIMITS) return null;
  let m = uniqueLabels(c, (i) => listLabel(i));
  if (bunStringWidth(m.join(", ")) > MAX_CONSENT_SUGGESTION_WIDTH) return null;
  let permissionUpdates = parsePermissionUpdates([
    {
      type: "addDirectories",
      destination: "session",
      directories: c,
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
          children: m.join(", "),
        }),
        " for this session",
      ],
    }),
    permissionUpdates,
  );
}
//@ chunk-0e8j1zzj.js:10587-11216 placement
function directoryRow(editablePrefixSeed, editablePrefix, d) {
  if (typeof editablePrefixSeed !== "string" || safeDisplayText(editablePrefixSeed) !== editablePrefixSeed)
    return null;
  if (typeof editablePrefix !== "string") return null;
  let trimmed = editablePrefix.trim();
  if (trimmed === "" || safeDisplayText(trimmed) !== trimmed) return null;
  if (trimmed === "*") {
    if (!isRuleableToolName(d)) return null;
    let permissionUpdates = parsePermissionUpdates([
      {
        type: "addRules",
        rules: [
          {
            toolName: d,
          },
        ],
        behavior: "allow",
        destination: "localSettings",
      },
    ]);
    if (permissionUpdates === null) return null;
    return new ConsentRow(
      CONSENT_ROW_MINT_TOKEN,
      `Yes, and don\u2019t ask again for any ${d} command`,
      permissionUpdates,
    );
  }
  if (
    !isRuleableToolName(d) ||
    !isStorableRuleValue({
      toolName: d,
      ruleContent: trimmed,
    })
  )
    return null;
  let permissionUpdates = parsePermissionUpdates([
    {
      type: "addRules",
      rules: [
        {
          toolName: d,
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
//@ chunk-0e8j1zzj.js:11216-11416 placement
/**
 * 导出值：EMPTY_DISPLAYED_UPDATES（空的已展示更新列表（非空断言））。
 */
var AUTO_MODE_ROW_LABELS = {
  workflow: "Yes, and switch to auto mode",
  "exit-plan-resume": "Yes, and use auto mode",
};
var EMPTY_DISPLAYED_UPDATES = (() => {
  let permissionUpdates = parsePermissionUpdates([]);
  if (permissionUpdates === null) throw Error("NO_DISPLAYED_UPDATES: empty intake rejected");
  return permissionUpdates;
})();
//@ chunk-0e8j1zzj.js:11416-11460 placement
function autoModeRow(o) {
  return new ConsentRow(CONSENT_ROW_MINT_TOKEN, AUTO_MODE_ROW_LABELS[o], EMPTY_DISPLAYED_UPDATES);
}
//@ chunk-0e8j1zzj.js:11460-11902 placement
function combineRows(o, ...t) {
  let d = [o, ...t];
  for (let u of d)
    if (!isConsentRow(u)) throw Error("combineRows accepts only constructor-produced ConsentRows");
  let flattened = d.flatMap((u) => [...u.applies]);
  if (flattened.length > MAX_CONSENT_RULE_WIDTH)
    throw Error("combineRows: combined updates exceed the display intake cap");
  let permissionUpdates = parsePermissionUpdates(flattened);
  if (permissionUpdates === null) throw Error("combineRows: schema rejected already-minted updates");
  return new ConsentRow(
    CONSENT_ROW_MINT_TOKEN,
    jsxProd_default(Text, {
      children: d.map((u, i) =>
        jsxProd_default_2(
          Text,
          {
            children: [i > 0 ? "; " : "", u.node],
          },
          i,
        ),
      ),
    }),
    permissionUpdates,
  );
}
export {
  CONSENT_ROW_LIMITS,
  consentRowLabel,
  MAX_CONSENT_SUGGESTION_WIDTH,
  isConsentRow,
  parseConsentSuggestions,
  isRuleableToolName,
  autoModeRow,
  ConsentRowSchema,
  AUTO_MODE_ROW_LABELS,
  ruleMatchesTool,
  CONSENT_UPDATE_TYPES,
  parseSuggestionRows,
  directoryRow,
  safeDisplayText,
  modeSwitchRow,
  normalizeRulePath,
  parseModeSuggestions,
  combineRows,
  DISPLAYED_UPDATE_TYPES,
  MAX_CONSENT_RULE_WIDTH,
};
