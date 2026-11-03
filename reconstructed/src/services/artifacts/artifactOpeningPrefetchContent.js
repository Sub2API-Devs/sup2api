/**
 * services/artifacts/artifactOpeningPrefetchContent.ts
 *
 * 2.1.316 新增。识别会话开场新建的空 artifact，并预取其类型的 SKILL.md 与参考页，内联到首轮提示里。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2r828m87.js (25)
 * attribution: placement 25
 */
import { jsonStringify } from "../../utils/slowOperations.js";
import {
  sweepResultLineField,
  artifactViewerUrlFor,
  scrubArtifactEnvelopeTags,
} from "../../tools/ArtifactTool/artifactUrls.js";
import { getDenyRules, getAskRules, toolMatchesRule } from "../../utils/permissions/permissions.js";
import {
  parseArtifactUrl,
  ARTIFACT_TOOL_NAME,
  ARTIFACT_DATA_TOOL_NAME,
} from "../../tools/ArtifactTool/constants.js";
import { hasAutoReactNoticePending, getShareEntry, ownedByUser } from "./shareEntries.js";
import {
  copySourceConsented,
  attestedReadConsented,
} from "../../tools/ArtifactTool/permissions/readConsent.js";
import { warmShareEntry } from "./shareEntryWarm.js";
import {
  readTypeInstructions as readTypeInstructions_2,
  listArtifactTypes,
  typeCatalogOnForSession,
  renderTypeInstructions,
  replRouteTwoSteps,
  replRouteSection,
  TYPE_INSTRUCTIONS_FILE,
} from "./artifactTypes.js";
import { isArtifactReadEnabled, isArtifactToolsetSplit } from "./artifactToolGates.js";
import { listArtifactFiles } from "./publishedFiles.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { findToolByName } from "../../Tool.js";
import { artifactReadRule } from "../../tools/ArtifactTool/permissions/readRules.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { prefetchArtifactTypeAndSystem, typeSkillPrintInstructions, Dht } from "./artifactOpeningPrefetch.js";
import { artifactReplToolInPool } from "../../tools/ArtifactTool/promptText.js";
import { buildSpellingNoteForText } from "./artifactPromptText.js";
import { errorMessage } from "../../utils/errors.js";
import { gF, getFetchErrorText } from "./webfetchRead.js";

//@ chunk-2r828m87.js:952-986 placement
function O(n, e) {
  return jsonStringify(sweepResultLineField(n, e));
}
//@ chunk-2r828m87.js:986-997 placement
var H = 3000;
//@ chunk-2r828m87.js:997-1232 placement
function promptlessWithholdReason(n, e) {
  let i = n.mcpInfo?.effectiveMaxPermission;
  if (i !== void 0 && i !== "allow") return "permission_ceiling";
  if (n.requiresUserInteraction?.()) return "requires_interaction";
  return [...getDenyRules(e), ...getAskRules(e)].some((r) => toolMatchesRule(e, n, r)) ? "rule" : void 0;
}
/**
 * 识别开场提示中新建 artifact 地址的正则
 */
//@ chunk-2r828m87.js:1232-1492 placement
var ARTIFACT_OPENING_RE =
    /^The user just created a new, empty (?:[^\n<]{1,80}? )?artifact at (https?:\/\/\S+) and has it open beside this conversation/,
  R = /artifact at (https?:\/\/\S+) and has it open beside this conversation/g,
  U = /<system-reminder>([\s\S]*?)<\/system-reminder>/g;
//@ chunk-2r828m87.js:1492-1858 placement
function openingReminderTexts(n, e) {
  let i = [];
  for (let r of n) {
    if (r.type === "assistant") break;
    if (r.type !== "user") continue;
    if (
      (r.origin !== void 0 && r.origin.kind !== "human") ||
      r.verifiedSlackHumanTurn === !0 ||
      r.projectsUserTurn === !0 ||
      r.isMeta === !0
    )
      continue;
    let { content: content } = r.message,
      a =
        typeof content === "string" ? [content] : content.flatMap((o) => (o.type === "text" ? [o.text] : []));
    for (let o of a) i.push(...reminderTextsIn(o, e));
  }
  return i;
}
//@ chunk-2r828m87.js:1858-1902 placement
var F = "The user just created a new, empty ";
/**
 * 开场提示中是否有多个或可疑的 artifact 地址
 */
//@ chunk-2r828m87.js:1902-2162 placement
function hasAmbiguousArtifactOpening(n) {
  let regExp = new RegExp(R),
    index = n.indexOf(F);
  while (index !== -1) {
    let r = index + F.length;
    regExp.lastIndex = r;
    let match = regExp.exec(n);
    if (n.slice(r, match?.index).includes("<")) return !0;
    index = match === null ? -1 : n.indexOf(F, match.index + match[0].length);
  }
  return new Set([...n.matchAll(R)].map((r) => r[1])).size > 1;
}
//@ chunk-2r828m87.js:2162-2277 placement
function reminderTextsIn(n, e) {
  if (!e(n) || hasAmbiguousArtifactOpening(n)) return [];
  return [...n.matchAll(U)].map((i) => (i[1] ?? "").trim()).filter((i) => i !== "");
}
//@ chunk-2r828m87.js:2277-2592 placement
function recognizeArtifactOpening(n) {
  if (new Set(n.flatMap((r) => [...r.matchAll(R)].map((s) => s[1]))).size > 1) return null;
  let i;
  for (let r of n) {
    let s = ARTIFACT_OPENING_RE.exec(r)?.[1],
      a = s === void 0 ? null : parseArtifactUrl(s);
    if (s === void 0 || a === null) continue;
    if (i !== void 0 && i.slug !== a.slug) return null;
    i ??= { slug: a.slug, env: a.env, url: s };
  }
  return i === void 0 ? null : { blankArtifact: i };
}
/**
 * 预取说明文件的前言
 */
//@ chunk-2r828m87.js:2592-2845 placement
var OPENING_INSTRUCTIONS_PREAMBLE =
  "The artifact named in this session's opening context carries an instructions file; it is below, read ahead for you. The artifact's own content was not read: read it as the opening context asks; that read's result will repeat these instructions.";
//@ chunk-2r828m87.js:2845-2906 placement
function openingFilesConsented(n, e) {
  return !hasAutoReactNoticePending(e.slug) && copySourceConsented(n, e, "files", "land");
}
//@ chunk-2r828m87.js:2906-2947 placement
function openingAttestedReadConsented(n, e) {
  return !hasAutoReactNoticePending(e) && attestedReadConsented(n, e);
}
//@ chunk-2r828m87.js:2947-2980 placement
var ARTIFACT_TYPE_REFERENCE = "artifact-type/reference/";
/**
 * 预取开场 artifact 的说明文件与参考页
 */
//@ chunk-2r828m87.js:2980-5845 placement
async function prefetchArtifactOpening(
  n,
  e,
  i,
  r = {
    warmShareEntry: warmShareEntry,
    readTypeInstructions: readTypeInstructions_2,
    isArtifactReadEnabled: isArtifactReadEnabled,
    filesConsented: openingFilesConsented,
    listArtifactTypes: listArtifactTypes,
    listFrameFiles: listArtifactFiles,
  },
  s,
) {
  let blankArtifact = n.blankArtifact,
    startTime = performance.now(),
    p = createCombinedAbortSignal(i, { timeoutMs: H, refTimer: !0 });
  try {
    if (!r.isArtifactReadEnabled()) return { kind: "skipped", reason: "artifact_off" };
    if (!typeCatalogOnForSession()) return { kind: "skipped", reason: "catalog_off" };
    let y = getToolPermissionContext(e),
      A = findToolByName(e.options.tools ?? [], ARTIFACT_TOOL_NAME),
      w = A === void 0 ? "not_in_pool" : promptlessWithholdReason(A, y);
    if (w !== void 0) return { kind: "skipped", reason: "tool_unavailable", detail: w };
    let url = blankArtifact.url;
    for (let l of ["deny", "ask"])
      if (artifactReadRule(y, blankArtifact, url, l) !== null)
        return { kind: "skipped", reason: "rule", detail: l };
    await r.warmShareEntry(
      blankArtifact,
      { abortController: { signal: p.signal }, credentials: e.credentials },
      "opening_prefetch",
    );
    let N = getToolPermissionContext(e);
    for (let l of ["deny", "ask"])
      if (artifactReadRule(N, blankArtifact, url, l) !== null)
        return { kind: "skipped", reason: "rule", detail: l };
    let E = getShareEntry(blankArtifact.slug);
    if (!ownedByUser(E)) {
      if (p.signal.aborted && !i.aborted)
        return {
          kind: "skipped",
          reason: "read_failed",
          detail: "the share probe took longer than the prefetch budget",
        };
      return { kind: "skipped", reason: "not_owned" };
    }
    if (E?.typeLocked !== !0) return { kind: "skipped", reason: "not_typed" };
    let typeInstructions = await r.readTypeInstructions(blankArtifact, p.signal, e.credentials);
    if (typeInstructions.kind !== "read")
      return {
        kind: "skipped",
        reason: "instructions_unavailable",
        detail: typeInstructions.kind === "unavailable" ? typeInstructions.why : "none",
      };
    let D = renderTypeInstructions(typeInstructions);
    try {
      await r.listArtifactTypes({
        firstParty: !0,
        signal: p.signal,
        credentials: e.credentials,
        httpOnly: !0,
      });
    } catch {}
    let m = await listTypeReferencePages(blankArtifact, p.signal, e, r),
      C = artifactViewerUrlFor(blankArtifact),
      x = artifactCallSpelling(isArtifactToolsetSplit());
    if (m.why === "listing failed") logFeatureSad("artifact_opening_prefetch", "listing_failed");
    if (!m.listed)
      logForDebugging(
        `[artifactOpeningPrefetch] type files of ${blankArtifact.slug} not saved: not attempted, the type's reference pages were not listed (the files consent does not stand for this artifact, or its listing failed)`,
      );
    let P = !m.listed
        ? null
        : typeInstructions.clipped
          ? await (r.readWholeInstructions ?? readTypeInstructions)(blankArtifact, p.signal, e.credentials)
          : typeInstructions.text,
      I =
        P === null
          ? null
          : (
              await prefetchArtifactTypeAndSystem(
                {
                  type: {
                    artifact: blankArtifact,
                    instructions: P,
                    pages: m.pages.map((page) => ARTIFACT_TYPE_REFERENCE + page),
                    stillConsented: () => r.filesConsented(e, blankArtifact),
                  },
                  system: null,
                },
                e,
                p.signal,
                r.readFrameFile,
              )
            ).type,
      T =
        m.listed && artifactReplToolInPool(e.options.tools ?? [])
          ? replRouteTwoSteps(typeInstructions.text)
          : null,
      v = T ?? "",
      h = I === null ? null : { ...I, urlReadAsked: v !== "", skillByRead: !typeInstructions.clipped },
      b =
        h === null
          ? null
          : typeSkillPrintInstructions(
              h,
              [v, buildSpellingNoteForText(typeInstructions.text), replRouteSection(typeInstructions.text)]
                .map((l) => l.trim())
                .filter((l) => l !== "")
                .map(
                  (l) => `

${l}`,
                )
                .join(""),
            );
    if (h !== null && b === null)
      logForDebugging(
        `[artifactOpeningPrefetch] type files of ${blankArtifact.slug} saved but not used: SKILL.md does not fit one Bash output, the text stays inline`,
      );
    if (h !== null && b !== null)
      return {
        kind: "attached",
        content: b,
        manifest: parallelReadInstruction(C, x, T === null && s !== void 0 && M(e, s)),
        typeFiles: h,
        durationMs: performance.now() - startTime,
      };
    return {
      kind: "attached",
      content: OPENING_INSTRUCTIONS_PREAMBLE + D,
      manifest: openingPrefetchSummary(C, m, x, T === null && s !== void 0 && M(e, s)),
      typeFiles: null,
      durationMs: performance.now() - startTime,
    };
  } catch (error) {
    return {
      kind: "skipped",
      reason: "read_failed",
      detail:
        p.signal.aborted && !i.aborted
          ? "the read took longer than the prefetch budget"
          : errorMessage(error),
    };
  } finally {
    p.cleanup();
  }
}
/**
 * 读取 artifact 类型的 SKILL.md 说明
 */
//@ chunk-2r828m87.js:5845-6094 placement
async function readTypeInstructions(n, e, i) {
  let r = await gF({ ...n, file: TYPE_INSTRUCTIONS_FILE }, e, i, "artifact_type_instructions_read");
  if (r.err !== null)
    return (
      logForDebugging(
        `[artifactOpeningPrefetch] type files of ${n.slug} not saved: the whole SKILL.md was not read (${getFetchErrorText(r)})`,
      ),
      null
    );
  return scrubArtifactEnvelopeTags(r.html);
}
/**
 * 识别会话开场新建的空 artifact，并预取其类型的 SKILL.md 与参考页，内联到首轮提示里。
 */
//@ chunk-2r828m87.js:6094-6898 placement
async function artifactOpeningPrefetchContent(n, e, i, r, s) {
  let a = recognizeArtifactOpening([
    ...openingReminderTexts(e, r.isSystemReminderOnlyText),
    ...(i === null ? [] : reminderTextsIn(i, r.isSystemReminderOnlyText)),
  ]);
  if (a === null) return null;
  let o = await prefetchArtifactOpening(a, n, n.abortController.signal, s, r.isDeferredTool);
  if (
    (logForDebugging(
      o.kind === "attached"
        ? `[artifactOpeningPrefetch] attached: ${o.content.length} chars + index ${o.manifest.length} chars in ${Math.round(o.durationMs)}ms`
        : `[artifactOpeningPrefetch] skipped: ${o.reason}${o.detail === void 0 ? "" : ` (${o.detail})`}`,
    ),
    o.kind === "attached")
  )
    return (
      logFeatureOk("artifact_opening_prefetch", { duration_ms: Math.round(o.durationMs) }),
      {
        content: `${o.content}

${o.manifest}`,
        slug: a.blankArtifact.slug,
        typeFiles: o.typeFiles,
      }
    );
  if (o.reason === "read_failed" || o.detail === "listing failed")
    logFeatureSad("artifact_opening_prefetch", o.reason === "read_failed" ? "read_failed" : "listing_failed");
  return null;
}
/**
 * 列出类型参考页（需文件同意）
 */
//@ chunk-2r828m87.js:6898-7295 placement
async function listTypeReferencePages(n, e, i, r) {
  if (!r.filesConsented(i, n)) return { listed: !1, pages: [], why: "no files consent" };
  let s;
  try {
    s = await r.listFrameFiles(n, e, i.credentials);
  } catch {
    s = null;
  }
  if (s?.kind !== "ok") return { listed: !1, pages: [], why: "listing failed" };
  return {
    listed: !0,
    pages: s.files
      .map((file) => file.path)
      .filter((a) => a.startsWith(ARTIFACT_TYPE_REFERENCE) && a.endsWith(".md"))
      .map((a) => a.slice(ARTIFACT_TYPE_REFERENCE.length))
      .filter((a) => !a.includes("/"))
      .sort(),
  };
}
//@ chunk-2r828m87.js:7295-7627 placement
function artifactCallSpelling(n) {
  return {
    readFile: n
      ? (e, i) => `Artifact action "read", url "${e}", path ${O(i, S)}`
      : (e, i) => `Artifact action "read_file", url "${e}", path ${O(i, S)}`,
    listFiles: n
      ? (e) => `Artifact action "list", url "${e}", scope "files"`
      : (e) => `Artifact action "list_files", url "${e}"`,
    readArtifact: (e) => `Artifact action "read", url "${e}"`,
  };
}
//@ chunk-2r828m87.js:7627-7637 placement
var Y = Dht;
/**
 * 参考页清单文字
 */
//@ chunk-2r828m87.js:7637-8232 placement
function referencePagesNote(n, e, i) {
  let sliced = e.slice(0, Y),
    mapped = sliced.map(
      (a) => `- ${O(ARTIFACT_TYPE_REFERENCE + a, S)}: ${i.readFile(n, ARTIFACT_TYPE_REFERENCE + a)}`,
    );
  if (e.length > sliced.length)
    mapped.push(
      `- and ${e.length - sliced.length} more under ${ARTIFACT_TYPE_REFERENCE} (${i.listFiles(n)} names them)`,
    );
  return [
    `Reference pages of the type of the artifact at ${n}, on the artifact and not loaded (the names are the type's own files, listed as data):`,
    ...mapped,
    `Issue every file read you need, and the artifact read itself (${i.readArtifact(n)}), in ONE message (parallel tool calls); then Read any file a result says was saved; then write. Use exactly the call shapes given here; no other fields.`,
  ].join(`
`);
}
//@ chunk-2r828m87.js:8232-8306 placement
function M(n, e) {
  let i = findToolByName(n.options.tools ?? [], ARTIFACT_DATA_TOOL_NAME);
  return i !== void 0 && !e(i);
}
/**
 * ArtifactData 已加载时的提示
 */
//@ chunk-2r828m87.js:8306-8477 placement
var ARTIFACT_DATA_LOADED_HINT =
  "ArtifactData is loaded in this session: read the canvas (ArtifactData list / get on this url) in that same first message rather than searching for the tool first.";
/**
 * 预取结果说明文字
 */
//@ chunk-2r828m87.js:8477-8851 placement
function openingPrefetchSummary(n, e, i, r) {
  let s = referencePagesNote(n, e.pages, i);
  return [
    `Loaded ahead of this turn for the artifact at ${n}: the instructions file found on it (SKILL.md) \u2014 inlined above; do not read it again.`,
    ...(e.pages.length > 0
      ? [s]
      : [
          ...(e.listed
            ? []
            : [
                `Its type's reference pages are on the artifact under ${ARTIFACT_TYPE_REFERENCE} (${i.listFiles(n)} names them).`,
              ]),
          ...s
            .split(
              `
`,
            )
            .slice(1),
        ]),
    ...(r ? [ARTIFACT_DATA_LOADED_HINT] : []),
  ].join(`
`);
}
/**
 * 提示把 Bash 与 artifact 读取并行发出
 */
//@ chunk-2r828m87.js:8851-9023 placement
function parallelReadInstruction(n, e, i) {
  return [
    `Make that Bash call and the artifact read itself, ${e.readArtifact(n)}, in ONE message (parallel tool calls); then write.`,
    ...(i ? [ARTIFACT_DATA_LOADED_HINT] : []),
  ].join(`
`);
}
//@ chunk-2r828m87.js:9023-9033 placement
var S = 128;

export {
  openingAttestedReadConsented,
  openingFilesConsented,
  openingReminderTexts,
  reminderTextsIn,
  recognizeArtifactOpening,
  artifactCallSpelling,
  promptlessWithholdReason,
};
