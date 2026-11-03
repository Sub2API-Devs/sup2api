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
import { gar } from "../../utils/permissions/PermissionUpdate.js";
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
import { y3e, mAi, pAi, mintDisplayedUpdates } from "../../utils/deepFreezePlainData.js";
import {
  permissionRuleValueFromString,
  hasWildcard,
  unescapeRuleContent,
} from "../../utils/permissions/permissionRuleParser.js";
import { mcpInfoFromString } from "../../services/mcp/mcpStringUtils.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { uniq } from "../../utils/collections.js";
import { formatPathList } from "./shellPermissionHelpers.js";
import { hr } from "../../utils/invisibleChars.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { hu } from "../../../vendor/zod/v4/classic/schemas.js";
import { permissionUpdateSchema } from "../../utils/hooks/hookSpecificOutput.js";

//@ chunk-0e8j1zzj.js:2881-2910 placement
function isStorableRuleValue(o) {
  return gar(o);
}
/**
 * 过滤外部传入的更新列表：addRules 只保留形状合法且可存储的规则，其他类型原样保留。
 */
//@ chunk-0e8j1zzj.js:2910-3356 placement = extractRules (0.859)
function filterValidAddRules(updates) {
  let t = [];
  for (let d of updates) {
    if (d === null || typeof d !== "object") continue;
    if (d.type !== "addRules") {
      t.push(d);
      continue;
    }
    if (!Array.isArray(d.rules)) continue;
    let filtered = d.rules.filter(
      (update) =>
        update !== null &&
        typeof update === "object" &&
        typeof update.toolName === "string" &&
        (update.ruleContent === void 0 || typeof update.ruleContent === "string") &&
        (update.ruleContent === void 0
          ? isRuleableToolName(update.toolName)
          : isStorableRuleValue({ toolName: update.toolName, ruleContent: update.ruleContent })),
    );
    if (filtered.length > 0) t.push({ ...d, rules: filtered });
  }
  return t;
}
//@ chunk-0e8j1zzj.js:3356-3421 placement
var CONSENT_ROW_LIMITS = 8,
  hDe = 64,
  Cpt = 160,
  ds = new Set(["localSettings", "session"]);
/**
 * 从权限更新建议中筛出可展示的“始终允许”规则行（限目标来源、类型与数量）。
 */
//@ chunk-0e8j1zzj.js:3421-4155 placement
function consentRuleRows(o, t, d, c = ds) {
  let filtered = filterValidAddRules(o).filter((i) => {
      if (!t.has(i.type)) return !1;
      if (
        (i.type === "addRules" || i.type === "replaceRules" || i.type === "removeRules") &&
        i.behavior !== "allow"
      )
        return !1;
      return i.destination !== void 0 && c.has(i.destination);
    }),
    u = [];
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
        u.push({ ...i, directories: filtered });
        continue;
      }
      u.push(i);
      continue;
    }
    if (i.rules === void 0) continue;
    let filtered = i.rules.filter((rule) =>
        fitsLabelLimit(
          formatPermissionRule({
            toolName: rule.toolName,
            ...(rule.ruleContent !== void 0 && { ruleContent: rule.ruleContent }),
          }),
        ),
      ),
      k = d === void 0 ? filtered : filtered.filter(d);
    if (k.length > 0) u.push({ ...i, rules: k });
  }
  return u;
}
//@ chunk-0e8j1zzj.js:4155-4228 placement
var CONSENT_UPDATE_TYPES = new Set(["addRules", "addDirectories"]),
  HCs = new Set(["addRules"]);
//@ chunk-0e8j1zzj.js:4228-4319 placement
function cs(o) {
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
function isRuleableToolName(o) {
  if (o === y3e) return !1;
  if (cs(o)) return !1;
  let t = permissionRuleValueFromString(formatPermissionRule({ toolName: o }));
  if (t.toolName !== o || t.ruleContent !== void 0) return !1;
  if (hasWildcard(o)) return !1;
  let d = mcpInfoFromString(o);
  if (d !== null && !d.toolName) return !1;
  return !0;
}
//@ chunk-0e8j1zzj.js:4523-4622 placement
function Ho(o) {
  if (typeof o !== "string" || o.trim() === "" || bunStringWidth(o) === 0 || !fitsLabelLimit(o)) return null;
  return mAi(o);
}
//@ chunk-0e8j1zzj.js:4622-4945 placement
function joinBoldNames(o) {
  switch (o.length) {
    case 0:
      return "";
    case 1:
      return e(Text, { bold: !0, children: o[0] });
    case 2:
      return r(Text, {
        children: [e(Text, { bold: !0, children: o[0] }), " and ", e(Text, { bold: !0, children: o[1] })],
      });
    default:
      return r(Text, {
        children: [
          e(Text, { bold: !0, children: o.slice(0, -1).join(", ") }),
          ", and",
          " ",
          e(Text, { bold: !0, children: o.slice(-1)[0] }),
        ],
      });
  }
}
//@ chunk-0e8j1zzj.js:5290-5390 placement
function normalizeRulePath(o) {
  return unescapeRuleContent((o?.replace(/\/\*\*$/, "") || "").replace(/^\.\//, "").replace(/^\/\//, "/"));
}
//@ chunk-0e8j1zzj.js:5390-5478 placement
function Un(o) {
  if (!o) return "";
  return o.endsWith(":*") || o.endsWith(" *") ? o.slice(0, -2) : o;
}
//@ chunk-0e8j1zzj.js:5478-5644 placement
function ruleMatchesTool(o, t, d) {
  if (o.toolName === t) {
    let c = Un(o.ruleContent);
    if (!c) return !1;
    return Boolean(d ? d(c) : c);
  }
  if (o.toolName === FILE_READ_TOOL_NAME) return Boolean(normalizeRulePath(o.ruleContent));
  return !1;
}
//@ chunk-0e8j1zzj.js:5644-5743 placement
function safeDisplayText(o) {
  return o !== void 0 &&
    stripNonPrintable(o) === o &&
    !/[\t\n\u2028\u2029]/.test(o) &&
    !hasDisplayUnsafeChar(o)
    ? pAi(o)
    : void 0;
}
//@ chunk-0e8j1zzj.js:5743-5772 placement
function consentRowLabel(o) {
  return listLabel(o);
}
//@ chunk-0e8j1zzj.js:5772-7696 placement
function parseSuggestionRows(o, t, d, c) {
  if (!Array.isArray(o)) return null;
  if (o.length > hDe) return null;
  if (o.some((b) => b === null || typeof b !== "object")) return null;
  let flattened = o.filter((b) => b.type === "addRules").flatMap((b) => b.rules || []),
    flattened_2 = o
      .filter((b) => b.type === "addDirectories")
      .flatMap((b) => (Array.isArray(b.directories) ? b.directories : []));
  if (
    flattened.some(
      (b) =>
        b === null ||
        typeof b !== "object" ||
        typeof b.toolName !== "string" ||
        (b.ruleContent !== void 0 && typeof b.ruleContent !== "string"),
    )
  )
    return null;
  if (flattened.length + flattened_2.length > CONSENT_ROW_LIMITS) return null;
  let filtered = flattened.filter((b) => b.toolName === FILE_READ_TOOL_NAME),
    filtered_2 = flattened.filter((b) => b.toolName === t);
  if (
    flattened_2.some(
      (b) => typeof b !== "string" || b.trim() === "" || bunStringWidth(b) === 0 || !fitsLabelLimit(b),
    )
  )
    return null;
  let k = uniq(flattened_2),
    f = uniq(
      filtered.flatMap((b) => (b.ruleContent && normalizeRulePath(b.ruleContent) ? b.ruleContent : [])),
    );
  if (f.some((b) => !fitsLabelLimit(b))) return null;
  let g = uniq(
    filtered_2.flatMap((b) => {
      if (!b.ruleContent) return [];
      return Un(b.ruleContent) ? [b.ruleContent] : [];
    }),
  );
  if (g.some((b) => !fitsLabelLimit(b))) return null;
  let M = disambiguateLabels(g, (b) => {
      let E = Un(b) || b;
      return consentRowLabel(d ? d(E) : E);
    }),
    N = disambiguateLabels([...f, ...k], (b) =>
      f.includes(b) ? consentRowLabel(normalizeRulePath(b)) : consentRowLabel(b),
    ),
    sliced = N.slice(0, f.length),
    sliced_2 = N.slice(f.length);
  if (bunStringWidth([...M, ...sliced, ...sliced_2].join(" and ")) > Cpt) return null;
  let v = k.length > 0,
    I = sliced.length > 0,
    L = M.length > 0;
  if (I && !v && !L)
    return r(Text, { children: ["Yes, allow reading from ", formatPathList(sliced), " from this project"] });
  if (v && !I && !L)
    return r(Text, {
      children: ["Yes, and always allow access to ", formatPathList(sliced_2), " from this project"],
    });
  if (L && !v && !I)
    return r(Text, {
      children: [
        "Yes, and don't ask again for ",
        joinBoldNames(M),
        " commands",
        " ",
        c === void 0
          ? r(Fragment, { children: ["in", " ", e(Text, { bold: !0, children: hr(getOriginalCwd()) })] })
          : r(Fragment, { children: ["on ", e(Text, { bold: !0, children: c })] }),
      ],
    });
  if ((v || I) && !L) {
    let b = [...sliced_2, ...sliced];
    return r(Text, {
      children: ["Yes, and always allow access to ", formatPathList(b), " from this project"],
    });
  }
  if ((v || I) && L) {
    let b = [...sliced_2, ...sliced];
    if (b.length === 1 && M.length === 1)
      return r(Text, {
        children: [
          "Yes, and allow access to ",
          formatPathList(b),
          " and",
          " ",
          joinBoldNames(M),
          " commands",
        ],
      });
    return r(Text, {
      children: ["Yes, and allow ", formatPathList(b), " access and", " ", joinBoldNames(M), " commands"],
    });
  }
  return null;
}
//@ chunk-0e8j1zzj.js:7696-7735 placement
var Te = Symbol("ConsentRow mint token");
/**
 * 同意选项行：只能由 consentRows 工厂（私有令牌）构造，冻结的 {node, applies}；ConsentRow.is 用私有字段判定实例。
 */
//@ chunk-0e8j1zzj.js:7735-7978 placement
class ConsentRow {
  #e = !0;
  node;
  applies;
  constructor(o, t, d) {
    if (o !== Te) throw Error("ConsentRow may only be constructed by the consentRows factories");
    ((this.node = t), (this.applies = d), Object.freeze(this));
  }
  static is(o) {
    return typeof o === "object" && o !== null && #e in o;
  }
}
//@ chunk-0e8j1zzj.js:7978-8009 placement
var isConsentRow = ConsentRow.is,
  NCs = DoctorLazy(() => hu(isConsentRow));
//@ chunk-0e8j1zzj.js:8009-8180 placement
function parsePermissionUpdates(o) {
  if (o.length > hDe) return null;
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
/**
 * 把 SDK 传来的权限建议数组校验并转成授权选项行，非法时返回 null。
 */
//@ chunk-0e8j1zzj.js:8180-9079 placement
function parseConsentSuggestions(o, t) {
  if (!Array.isArray(o)) return null;
  let d;
  try {
    d = o.length;
  } catch {
    return null;
  }
  if (typeof d !== "number" || !Number.isSafeInteger(d) || d < 0 || d > hDe) return null;
  let c = 0,
    m = [];
  for (let f = 0; f < d; f++)
    try {
      let g = o[f],
        M = g !== null && typeof g === "object" ? { ...g } : g,
        N = !1;
      if (M !== null && typeof M === "object") {
        let x = M;
        for (let A of ["rules", "directories"]) {
          let T = x[A];
          if (!Array.isArray(T)) continue;
          let v = T.length;
          if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 0) {
            N = !0;
            break;
          }
          if (((c += v), c > hDe * CONSENT_ROW_LIMITS)) return null;
          let I = [];
          for (let L = 0; L < v; L++) I.push(T[L]);
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
  let h = mintDisplayedUpdates(i),
    renderLabel = t.renderLabel(h);
  if (renderLabel == null || typeof renderLabel === "boolean" || renderLabel === "") return null;
  return new ConsentRow(Te, renderLabel, h);
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
  if (o === "bypassPermissions" && t?.isBypassPermissionsModeAvailable === !1) return null;
  let d = parsePermissionUpdates([{ type: "setMode", destination: "session", mode: o }]);
  if (d === null) throw Error("setModeRow: schema rejected a designed setMode update");
  if (t?.labelVariant === "plan-keep-context") {
    let c =
      o === "acceptEdits" ? "Yes, auto-accept edits" : o === "default" ? "Yes, manually approve edits" : null;
    if (c !== null) return new ConsentRow(Te, e(Text, { children: c }), d);
  }
  return new ConsentRow(
    Te,
    r(Text, {
      children: [
        "Yes, and switch to ",
        e(Text, { bold: !0, children: PERMISSION_MODE_LABELS[o] }),
        " for this session",
      ],
    }),
    d,
  );
}
//@ chunk-0e8j1zzj.js:9992-10587 placement
function parseModeSuggestions(o) {
  if (!Array.isArray(o)) return null;
  let t;
  try {
    t = o.length;
  } catch {
    return null;
  }
  if (typeof t !== "number" || !Number.isSafeInteger(t) || t < 0 || t > hDe) return null;
  let d = [];
  for (let i = 0; i < t; i++)
    try {
      let h = o[i],
        k = Ho(h);
      if (k !== null) d.push(k);
    } catch {}
  let c = uniq(d);
  if (c.length === 0) return null;
  if (c.length > CONSENT_ROW_LIMITS) return null;
  let m = uniqueLabels(c, (i) => listLabel(i));
  if (bunStringWidth(m.join(", ")) > Cpt) return null;
  let u = parsePermissionUpdates([{ type: "addDirectories", destination: "session", directories: c }]);
  if (u === null) return null;
  return new ConsentRow(
    Te,
    r(Text, {
      children: [
        "Yes, and always allow access to ",
        e(Text, { bold: !0, children: m.join(", ") }),
        " for this session",
      ],
    }),
    u,
  );
}
//@ chunk-0e8j1zzj.js:10587-11216 placement
function directoryRow(o, t, d) {
  if (typeof o !== "string" || safeDisplayText(o) !== o) return null;
  if (typeof t !== "string") return null;
  let trimmed = t.trim();
  if (trimmed === "" || safeDisplayText(trimmed) !== trimmed) return null;
  if (trimmed === "*") {
    if (!isRuleableToolName(d)) return null;
    let u = parsePermissionUpdates([
      { type: "addRules", rules: [{ toolName: d }], behavior: "allow", destination: "localSettings" },
    ]);
    if (u === null) return null;
    return new ConsentRow(Te, `Yes, and don\u2019t ask again for any ${d} command`, u);
  }
  if (!isRuleableToolName(d) || !isStorableRuleValue({ toolName: d, ruleContent: trimmed })) return null;
  let m = parsePermissionUpdates([
    {
      type: "addRules",
      rules: [{ toolName: d, ruleContent: trimmed }],
      behavior: "allow",
      destination: "localSettings",
    },
  ]);
  if (m === null) return null;
  return new ConsentRow(Te, `Yes, and don\u2019t ask again for: ${trimmed}`, m);
}
//@ chunk-0e8j1zzj.js:11216-11416 placement
var AUTO_MODE_ROW_LABELS = {
    workflow: "Yes, and switch to auto mode",
    "exit-plan-resume": "Yes, and use auto mode",
  },
  ps = (() => {
    let o = parsePermissionUpdates([]);
    if (o === null) throw Error("NO_DISPLAYED_UPDATES: empty intake rejected");
    return o;
  })();
//@ chunk-0e8j1zzj.js:11416-11460 placement
function autoModeRow(o) {
  return new ConsentRow(Te, AUTO_MODE_ROW_LABELS[o], ps);
}
//@ chunk-0e8j1zzj.js:11460-11902 placement
function combineRows(o, ...t) {
  let d = [o, ...t];
  for (let u of d)
    if (!isConsentRow(u)) throw Error("combineRows accepts only constructor-produced ConsentRows");
  let flattened = d.flatMap((u) => [...u.applies]);
  if (flattened.length > hDe) throw Error("combineRows: combined updates exceed the display intake cap");
  let m = parsePermissionUpdates(flattened);
  if (m === null) throw Error("combineRows: schema rejected already-minted updates");
  return new ConsentRow(
    Te,
    e(Text, { children: d.map((u, i) => r(Text, { children: [i > 0 ? "; " : "", u.node] }, i)) }),
    m,
  );
}

export {
  CONSENT_ROW_LIMITS,
  consentRowLabel,
  Cpt,
  isConsentRow,
  parseConsentSuggestions,
  isRuleableToolName,
  autoModeRow,
  NCs,
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
  HCs,
  hDe,
};
