/**
 * services/api/toolDefinitionShape.ts
 *
 * 2.1.316 新增：检查工具定义形状（defer_loading、input_schema、strict 等）与工具在遥测中的类别
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a76knw89.js (24)
 * attribution: placement 24
 */
import { computeContentHash } from "../../utils/commitAttribution.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { sortKeysDeep } from "../../utils/settings/settingsSourceTrust.js";
import { stringArray } from "../../utils/collections.js";
import { SKILL_2 } from "../../tools/SkillTool/skillToolNames.js";
import { sanitizeToolNameForAnalytics } from "../analytics/metadata.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { EXITPLANMODE_2 } from "../../tools/ExitPlanModeTool/constants.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { HostScoped } from "../../utils/hostScoped.js";

//@ chunk-a76knw89.js:8157-8238 placement
function On(e) {
  if (!("safeguards" in e)) return e;
  let { safeguards: safeguards, ...o } = e;
  return o;
}
//@ chunk-a76knw89.js:8238-8325 placement
function lO(e, n) {
  if (e === void 0) return;
  return Object.entries(e).find(([o]) => o === n)?.[1];
}
//@ chunk-a76knw89.js:8325-8455 placement
function toolKeyOf(e, n) {
  let o = lO(e, "name");
  if (typeof o === "string") return o;
  let r = lO(e, "type");
  return typeof r === "string" ? r : `tools[${n}]`;
}
//@ chunk-a76knw89.js:8455-8634 placement
function isDeferredCustomToolDefinition(e) {
  let n = lO(e, "type");
  return (
    typeof lO(e, "name") === "string" &&
    lO(e, "defer_loading") === !0 &&
    (n === void 0 || n === "custom") &&
    hasObjectType(lO(e, "input_schema")) &&
    !("cache_control" in e)
  );
}
//@ chunk-a76knw89.js:8634-8870 placement
function isPlainToolDefinition(e) {
  let n = lO(e, "type"),
    o = lO(e, "description");
  return (
    typeof lO(e, "name") === "string" &&
    (o === void 0 || typeof o === "string") &&
    lO(e, "defer_loading") !== !0 &&
    (n === void 0 || n === "custom") &&
    hasObjectType(lO(e, "input_schema")) &&
    !("cache_control" in e)
  );
}
//@ chunk-a76knw89.js:8870-8924 placement
var me = ["strict", "eager_input_streaming", "citations"];
//@ chunk-a76knw89.js:8924-8994 placement
function ye(e) {
  return e.some((n) => lO(n, "eager_input_streaming") === !0);
}
//@ chunk-a76knw89.js:8994-9236 placement
function TOOL_DEFINITION_FLAG_KEYS(e, { strict: strict, eager: eager, citations: citations }) {
  let c = { ...e };
  if (!strict && "strict" in c) {
    let { strict: strict, ...u } = c;
    c = u;
  }
  if (!eager && "eager_input_streaming" in c) {
    let { eager_input_streaming: eager_input_streaming, ...u } = c;
    c = u;
  }
  if (!citations && "citations" in c) {
    let { citations: citations, ...u } = c;
    c = u;
  }
  return c;
}
//@ chunk-a76knw89.js:9236-9332 placement = extractErrorTypeFromData (1)
function hasObjectType(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data) && lO(data, "type") === "object";
}
//@ chunk-a76knw89.js:9332-9380 placement
function Hri(e) {
  return computeContentHash(jsonStringify(sortKeysDeep(e))).slice(0, 16);
}
//@ chunk-a76knw89.js:9380-9615 placement
function readDeferredToolsDeltas(e) {
  if (!Array.isArray(e)) return [];
  return e.filter(
    (n) =>
      typeof n === "object" &&
      n !== null &&
      typeof n.name === "string" &&
      typeof n.listing === "string" &&
      ((typeof n.definition === "object" && n.definition !== null) || typeof n.sameAs === "string"),
  );
}
/**
 * 汇总消息中的 deferred_tools_delta 附件（按 uuid 去重）。
 */
//@ chunk-a76knw89.js:9615-10063 placement
function collectDeferredToolsDeltas(e, n = new Set()) {
  let o = new Map();
  for (let r of e) {
    if (
      r.type !== "attachment" ||
      r.attachment?.type !== "deferred_tools_delta" ||
      typeof r.uuid !== "string" ||
      n.has(r.uuid)
    )
      continue;
    let c = new Map();
    for (let s of readDeferredToolsDeltas(r.attachment.surfacedDefinitions)) {
      if ("definition" in s) {
        c.set(s.name, { definition: s.definition, listing: s.listing, definedIn: r.uuid });
        continue;
      }
      let u = o.get(s.sameAs)?.get(s.name);
      if (u !== void 0) c.set(s.name, u);
    }
    if (c.size > 0) o.set(r.uuid, c);
  }
  return o;
}
/**
 * 汇总消息中延迟工具增量里出现的全部工具名。
 */
//@ chunk-a76knw89.js:10063-10174 placement
function deltaToolNames(e, n = new Set()) {
  let o = new Set();
  for (let r of collectDeferredToolsDeltas(e, n).values()) for (let c of r.keys()) o.add(c);
  return o;
}
//@ chunk-a76knw89.js:10174-10559 placement
function findLatestDeferredToolsDelta(e, n) {
  let o = collectDeferredToolsDeltas(e, n),
    r = new Map(),
    c = new Set();
  for (let s of e) {
    if (
      s.type !== "attachment" ||
      s.attachment?.type !== "deferred_tools_delta" ||
      (typeof s.uuid === "string" && n.has(s.uuid))
    )
      continue;
    for (let u of stringArray(s.attachment.removedByBlock)) if (r.has(u)) c.add(u);
    if (typeof s.uuid !== "string") continue;
    for (let [u, p] of o.get(s.uuid) ?? []) (r.set(u, p), c.delete(u));
  }
  return { definedByValue: r, withdrawn: c };
}
//@ chunk-a76knw89.js:10559-10627 placement
function fVt(e, n) {
  return e !== void 0 && Object.hasOwn(e, n) ? e[n] : void 0;
}
//@ chunk-a76knw89.js:10627-10685 placement
function $ri(e, n = new Set()) {
  return new Set(collectDeferredToolsDeltas(e, n).keys());
}
//@ chunk-a76knw89.js:10685-10812 placement
var TOOL_CATEGORY_LABELS = {
  skill: "skill_tool",
  mcp: "mcp_tool",
  evalRegistered: "eval_registered",
  dynamic: "dynamic_tool",
  unreadable: "unreadable_tool",
};
/**
 * 工具在遥测中的类别：skill、mcp、eval_registered、dynamic 等。
 */
//@ chunk-a76knw89.js:10812-11126 placement
function toolCategoryForTelemetry(e) {
  try {
    if (e.name.startsWith(SKILL_2)) return TOOL_CATEGORY_LABELS.skill;
    let n = String(sanitizeToolNameForAnalytics(e.name));
    if (n !== e.name) return n;
    if (e.mcpInfo !== void 0) return TOOL_CATEGORY_LABELS.mcp;
    if (e.name.startsWith("eval_registered__")) return TOOL_CATEGORY_LABELS.evalRegistered;
    if (e.uiTableKey !== void 0 || e.name.includes("__")) return TOOL_CATEGORY_LABELS.dynamic;
    return e.name;
  } catch {
    return TOOL_CATEGORY_LABELS.unreadable;
  }
}
//@ chunk-a76knw89.js:11126-11170 placement
var Mn = [
  ...Object.values(TOOL_CATEGORY_LABELS),
  BASH_TOOL_NAME,
  EXITPLANMODE_2,
  FILE_EDIT_TOOL_NAME,
  FILE_READ_TOOL_NAME,
  FILE_WRITE_TOOL_NAME,
];
//@ chunk-a76knw89.js:11170-11239 placement
function FYr(e) {
  let n = toolCategoryForTelemetry(e);
  return Mn.find((o) => o === n) ?? "other_tool";
}
//@ chunk-a76knw89.js:11239-11265 placement
var An = new HostScoped(() => new Set());
//@ chunk-a76knw89.js:11265-11300 placement
function Ce(e, n) {
  return `${e}_${n}`;
}
//@ chunk-a76knw89.js:11300-11317 placement
var $e = /_(\d+)$/;
//@ chunk-a76knw89.js:11317-11390 placement
function Tqe(e) {
  let match = $e.exec(e);
  return match ? e.slice(0, -match[0].length) : void 0;
}

export {
  toolCategoryForTelemetry,
  collectDeferredToolsDeltas,
  fVt,
  FYr,
  deltaToolNames,
  $ri,
  isDeferredCustomToolDefinition,
  toolKeyOf,
  On,
  lO,
  me,
  ye,
  TOOL_DEFINITION_FLAG_KEYS,
  Ce,
  Tqe,
  An,
  $e,
  findLatestDeferredToolsDelta,
  isPlainToolDefinition,
  Hri,
};
