/**
 * services/homeSeed/homeSidecar.ts
 *
 * 2.1.316 新增：home seed 附带文件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-twq47pff.js (11)
 * attribution: placement 11
 */
import { O7e, FOo, Kyt, classifyWorkingFile } from "./workingFiles.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, T, tc, A, o, pe, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { AS, computeContentHash } from "../../utils/commitAttribution.js";
import { Spo } from "../../tools/PowerShellTool/sessionChannelPowerShell.js";
import { bln, HOo, AAe, filterPortableSettings } from "./portableSettings.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { uniq } from "../../utils/collections.js";

/**
 * home seed 附带文件（记录已写入文件摘要、设置摘要与包 etag）的版本、上限与 schema。
 */
//@ chunk-twq47pff.js:12711-12973 placement
var SIDECAR_VERSION = 1,
  SIDECAR_ENTRY_FACTOR = 4,
  MAX_SIDECAR_ENTRIES = O7e * SIDECAR_ENTRY_FACTOR,
  MAX_SIDECAR_BYTES = 131072,
  homeSidecarSchema = DoctorLazy(() =>
    zodStrictObject({
      version: T(SIDECAR_VERSION),
      generation: tc().min(1),
      writtenAtMs: tc().min(0),
      entries: A(zodStrictObject({ path: o().min(1).max(FOo), sha256: o().regex(AS) })).max(
        MAX_SIDECAR_ENTRIES,
      ),
      settingsSha256: o().regex(AS).nullable(),
      packEtag: o().min(1).max(Spo).optional(),
    }),
  );
//@ chunk-twq47pff.js:12973-13166 placement
function parseHomeSidecar(t) {
  if (t.length > MAX_SIDECAR_BYTES) return null;
  let e = bln(t.toString("utf8"));
  if (!isPlainObject(e) || (Array.isArray(e.entries) && e.entries.length > MAX_SIDECAR_ENTRIES)) return null;
  let safeParse = homeSidecarSchema().safeParse(e);
  return safeParse.success ? safeParse.data : null;
}
//@ chunk-twq47pff.js:13166-13407 placement
function encodeHomeSidecar(t) {
  let safeParse = homeSidecarSchema().safeParse({ ...t, entries: t.entries.slice(-MAX_SIDECAR_ENTRIES) });
  if (!safeParse.success) throw Error("home sidecar is off its own schema");
  let buffer = Buffer.from(jsonStringify(safeParse.data));
  if (buffer.length > MAX_SIDECAR_BYTES) throw Error("home sidecar exceeds its byte bound");
  return buffer;
}
//@ chunk-twq47pff.js:13407-13478 placement
function qe(t) {
  let e = HOo(t);
  return { document: t, rendered: e, sha256: computeContentHash(e) };
}
//@ chunk-twq47pff.js:13478-13516 placement
var Ve = DoctorLazy(() => pe(o(), oe())),
  Pe = 1048576;
//@ chunk-twq47pff.js:13516-13618 placement
function toStringArray(t) {
  let safeParse = A(oe()).safeParse(t);
  return safeParse.success ? safeParse.data.filter((n) => typeof n === "string") : [];
}
//@ chunk-twq47pff.js:13618-13696 placement
function Xe(t, e) {
  let n = new Set(t);
  return [...t, ...uniq(e).filter((l) => !n.has(l))];
}
/**
 * 把包里的 deny/ask 规则合并进云端现有 settings.json：恢复模式按记录合并，否则与现有规则去重；无规则返回 null，超过大小上限或无法读取返回 unreadable。
 */
//@ chunk-twq47pff.js:13696-14335 placement
function renderRestrictiveSettings(t, e, n) {
  if (e.kind === "unusable") return "unreadable";
  let existing = e.kind === "object" ? e.value : {},
    safeParse = Ve().safeParse(existing.permissions ?? {});
  if (!safeParse.success) return "unreadable";
  let renderFull = n !== "refused_over_ours";
  if (renderFull && t === null) return null;
  let mergeRules = (j) => {
      let M = toStringArray(safeParse.data[j]),
        Q = t?.document.permissions?.[j] ?? [];
      return n === "restore" ? Xe(M, Q) : uniq([...M, ...Q].toReversed()).toReversed();
    },
    deny = mergeRules("deny"),
    ask = mergeRules("ask");
  if (deny.length === 0 && ask.length === 0) return null;
  let restrictive = { ...(deny.length > 0 && { deny: deny }), ...(ask.length > 0 && { ask: ask }) };
  if (!renderFull) return qe({ permissions: restrictive });
  let rendered =
    jsonStringify({ ...existing, permissions: { ...safeParse.data, ...restrictive } }, null, 2) +
    `
`;
  return Buffer.byteLength(rendered) > Pe
    ? "unreadable"
    : { rendered: rendered, sha256: computeContentHash(rendered) };
}
/**
 * 规划在云会话应用 home seed 包：generation 不新于已应用时返回 stale_generation；否则按附带文件算写入、需删除的旧文件，过滤像凭证的文件与设置，返回计划与计数。
 */
//@ chunk-twq47pff.js:14335-15344 placement
function planHomeSeedApply({
  pack: pack,
  packEtag: packEtag,
  refused: refused,
  sidecar: sidecar,
  lastAppliedGeneration: lastAppliedGeneration,
  permissionsAdmissible: permissionsAdmissible,
  onlyClaudeMd: onlyClaudeMd,
}) {
  if (pack.generation <= lastAppliedGeneration)
    return { kind: "stale_generation", generation: pack.generation, lastApplied: lastAppliedGeneration };
  let priorByPath = new Map(
      (sidecar?.entries ?? []).flatMap((x) => {
        let N = Kyt(x.path);
        return N === null ? [] : [[N.destination, { path: N.destination, kind: N.kind, sha256: x.sha256 }]];
      }),
    ),
    priorSha = new Map([...priorByPath.values()].map(({ path: path, sha256: sha256 }) => [path, sha256])),
    files = pack.files,
    filtered = files.filter((x) => !AAe(x.content.toString("utf8"))),
    writablePaths = new Set(filtered.map((x) => x.path)),
    filtered_2 = [...priorByPath.values()].filter(({ path: path }) => !writablePaths.has(path)),
    settingsPlan = refilterSeedSettings(pack.settings, permissionsAdmissible);
  return {
    kind: "plan",
    plan: {
      generation: pack.generation,
      packEtag: packEtag,
      writes: filtered.flatMap(Nn),
      removals: filtered_2,
      settings: settingsPlan.plan,
      priorSettingsSha256: sidecar?.settingsSha256 ?? null,
      priorEntries: priorSha,
      counts: {
        refused: refused,
        refilteredKeys: settingsPlan.refilteredKeys,
        refilteredCredentials: settingsPlan.refilteredCredentials + files.length - filtered.length,
        refilteredCredentialRestrictions: settingsPlan.refilteredCredentialRestrictions,
        refilteredCredentialFiles: files.length - filtered.length,
        permissionsDropped: settingsPlan.permissionsDropped,
      },
    },
  };
}
//@ chunk-twq47pff.js:15344-15412 placement
function Nn(t) {
  let e = classifyWorkingFile(t.path);
  return e === null ? [] : [{ ...t, kind: e }];
}
/**
 * 在云端重新筛选包里的设置：统计被去掉的键与凭证；不允许权限时去掉 allow，返回设置计划与计数。
 */
//@ chunk-twq47pff.js:15412-16188 placement
function refilterSeedSettings(t, e) {
  if (t === null)
    return {
      plan: null,
      refilteredKeys: 0,
      refilteredCredentials: 0,
      refilteredCredentialRestrictions: 0,
      permissionsDropped: !1,
    };
  let filtered = filterPortableSettings(t, {
      settingsToCloud: () => !0,
      preToolUseHookActiveHere: !1,
      hasLostAnAllowEntryAtParse: !1,
    }),
    counts = {
      refilteredKeys: filtered.counts.withheldKeys,
      refilteredCredentials:
        filtered.counts.rules.droppedCredential + filtered.counts.withheldCredentialTexts,
      refilteredCredentialRestrictions: filtered.counts.rules.droppedCredentialRestrictions,
    };
  if (filtered.document === null) return { plan: null, ...counts, permissionsDropped: !1 };
  let { permissions: permissions, ...u } = filtered.document,
    dropAllow = permissions?.allow !== void 0 && !e,
    { allow: allow, ...P } = permissions ?? {},
    settingsDoc = dropAllow
      ? Object.keys(P).length === 0
        ? u
        : { ...u, permissions: P }
      : filtered.document;
  if (Object.keys(settingsDoc).length === 0) return { plan: null, ...counts, permissionsDropped: dropAllow };
  return { plan: qe(settingsDoc), ...counts, permissionsDropped: dropAllow };
}

export {
  planHomeSeedApply,
  Ve,
  toStringArray,
  Xe,
  Pe,
  qe,
  MAX_SIDECAR_BYTES,
  parseHomeSidecar,
  SIDECAR_VERSION,
  MAX_SIDECAR_ENTRIES,
  renderRestrictiveSettings,
  encodeHomeSidecar,
};
