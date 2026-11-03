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
import {
  prefetchArtifactTypeAndSystem,
  typeSkillPrintInstructions,
  MAX_REFERENCE_PAGES,
} from "./artifactOpeningPrefetch.js";
import { artifactReplToolInPool } from "../../tools/ArtifactTool/promptText.js";
import { buildSpellingNoteForText } from "./artifactPromptText.js";
import { errorMessage } from "../../utils/errors.js";
import { webfetchReadFile, getFetchErrorText } from "./webfetchRead.js";

//@ chunk-2r828m87.js:952-986 placement
function jsonSweepLine(n, e) {
  return jsonStringify(sweepResultLineField(n, e));
}
//@ chunk-2r828m87.js:986-997 placement
var PREFETCH_CONTENT_TIMEOUT_MS = 3000;
//@ chunk-2r828m87.js:997-1232 placement
function promptlessWithholdReason(toolByName, toolPermissionContext) {
  let effectiveMaxPermission = toolByName.mcpInfo?.effectiveMaxPermission;
  if (effectiveMaxPermission !== undefined && effectiveMaxPermission !== "allow") return "permission_ceiling";
  if (toolByName.requiresUserInteraction?.()) return "requires_interaction";
  return [...getDenyRules(toolPermissionContext), ...getAskRules(toolPermissionContext)].some((r) =>
    toolMatchesRule(toolPermissionContext, toolByName, r),
  )
    ? "rule"
    : undefined;
}
//@ chunk-2r828m87.js:1232-1492 placement
/**
 * 识别开场提示中新建 artifact 地址的正则
 */
var ARTIFACT_OPENING_RE =
  /^The user just created a new, empty (?:[^\n<]{1,80}? )?artifact at (https?:\/\/\S+) and has it open beside this conversation/;
var ARTIFACT_OPENING_URL_RE = /artifact at (https?:\/\/\S+) and has it open beside this conversation/g;
var SYSTEM_REMINDER_BLOCK_RE = /<system-reminder>([\s\S]*?)<\/system-reminder>/g;
//@ chunk-2r828m87.js:1492-1858 placement
function openingReminderTexts(n, e) {
  let i = [];
  for (let r of n) {
    if (r.type === "assistant") break;
    if (r.type !== "user") continue;
    if (
      (r.origin !== undefined && r.origin.kind !== "human") ||
      r.verifiedSlackHumanTurn === true ||
      r.projectsUserTurn === true ||
      r.isMeta === true
    )
      continue;
    let { content } = r.message;
    let a =
      typeof content === "string" ? [content] : content.flatMap((o) => (o.type === "text" ? [o.text] : []));
    for (let o of a) i.push(...reminderTextsIn(o, e));
  }
  return i;
}
//@ chunk-2r828m87.js:1858-1902 placement
var ARTIFACT_CREATED_PREFIX = "The user just created a new, empty ";
//@ chunk-2r828m87.js:1902-2162 placement
/**
 * 开场提示中是否有多个或可疑的 artifact 地址
 */
function hasAmbiguousArtifactOpening(n) {
  let regExp = new RegExp(ARTIFACT_OPENING_URL_RE);
  let index = n.indexOf(ARTIFACT_CREATED_PREFIX);
  while (index !== -1) {
    let r = index + ARTIFACT_CREATED_PREFIX.length;
    regExp.lastIndex = r;
    let match = regExp.exec(n);
    if (n.slice(r, match?.index).includes("<")) return true;
    index = match === null ? -1 : n.indexOf(ARTIFACT_CREATED_PREFIX, match.index + match[0].length);
  }
  return new Set([...n.matchAll(ARTIFACT_OPENING_URL_RE)].map((r) => r[1])).size > 1;
}
//@ chunk-2r828m87.js:2162-2277 placement
function reminderTextsIn(n, e) {
  if (!e(n) || hasAmbiguousArtifactOpening(n)) return [];
  return [...n.matchAll(SYSTEM_REMINDER_BLOCK_RE)].map((i) => (i[1] ?? "").trim()).filter((i) => i !== "");
}
//@ chunk-2r828m87.js:2277-2592 placement
function recognizeArtifactOpening(n) {
  if (new Set(n.flatMap((r) => [...r.matchAll(ARTIFACT_OPENING_URL_RE)].map((s) => s[1]))).size > 1)
    return null;
  let i;
  for (let r of n) {
    let s = ARTIFACT_OPENING_RE.exec(r)?.[1];
    let a = s === undefined ? null : parseArtifactUrl(s);
    if (s === undefined || a === null) continue;
    if (i !== undefined && i.slug !== a.slug) return null;
    i ??= {
      slug: a.slug,
      env: a.env,
      url: s,
    };
  }
  return i === undefined
    ? null
    : {
        blankArtifact: i,
      };
}
//@ chunk-2r828m87.js:2592-2845 placement
/**
 * 预取说明文件的前言
 */
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
//@ chunk-2r828m87.js:2980-5845 placement
/**
 * 预取开场 artifact 的说明文件与参考页
 */
async function prefetchArtifactOpening(
  n,
  e,
  signal,
  r = {
    warmShareEntry,
    readTypeInstructions: readTypeInstructions_2,
    isArtifactReadEnabled,
    filesConsented: openingFilesConsented,
    listArtifactTypes,
    listFrameFiles: listArtifactFiles,
  },
  isDeferredTool,
) {
  let blankArtifact = n.blankArtifact;
  let startTime = performance.now();
  let combinedAbortSignal = createCombinedAbortSignal(signal, {
    timeoutMs: PREFETCH_CONTENT_TIMEOUT_MS,
    refTimer: true,
  });
  try {
    if (!r.isArtifactReadEnabled())
      return {
        kind: "skipped",
        reason: "artifact_off",
      };
    if (!typeCatalogOnForSession())
      return {
        kind: "skipped",
        reason: "catalog_off",
      };
    let toolPermissionContext = getToolPermissionContext(e);
    let toolByName = findToolByName(e.options.tools ?? [], ARTIFACT_TOOL_NAME);
    let w =
      toolByName === undefined ? "not_in_pool" : promptlessWithholdReason(toolByName, toolPermissionContext);
    if (w !== undefined)
      return {
        kind: "skipped",
        reason: "tool_unavailable",
        detail: w,
      };
    let url = blankArtifact.url;
    for (let l of ["deny", "ask"])
      if (artifactReadRule(toolPermissionContext, blankArtifact, url, l) !== null)
        return {
          kind: "skipped",
          reason: "rule",
          detail: l,
        };
    await r.warmShareEntry(
      blankArtifact,
      {
        abortController: {
          signal: combinedAbortSignal.signal,
        },
        credentials: e.credentials,
      },
      "opening_prefetch",
    );
    let toolPermissionContext_2 = getToolPermissionContext(e);
    for (let l of ["deny", "ask"])
      if (artifactReadRule(toolPermissionContext_2, blankArtifact, url, l) !== null)
        return {
          kind: "skipped",
          reason: "rule",
          detail: l,
        };
    let shareEntry = getShareEntry(blankArtifact.slug);
    if (!ownedByUser(shareEntry)) {
      if (combinedAbortSignal.signal.aborted && !signal.aborted)
        return {
          kind: "skipped",
          reason: "read_failed",
          detail: "the share probe took longer than the prefetch budget",
        };
      return {
        kind: "skipped",
        reason: "not_owned",
      };
    }
    if (shareEntry?.typeLocked !== true)
      return {
        kind: "skipped",
        reason: "not_typed",
      };
    let typeInstructions = await r.readTypeInstructions(
      blankArtifact,
      combinedAbortSignal.signal,
      e.credentials,
    );
    if (typeInstructions.kind !== "read")
      return {
        kind: "skipped",
        reason: "instructions_unavailable",
        detail: typeInstructions.kind === "unavailable" ? typeInstructions.why : "none",
      };
    let D = renderTypeInstructions(typeInstructions);
    try {
      await r.listArtifactTypes({
        firstParty: true,
        signal: combinedAbortSignal.signal,
        credentials: e.credentials,
        httpOnly: true,
      });
    } catch {}
    let m = await listTypeReferencePages(blankArtifact, combinedAbortSignal.signal, e, r);
    let C = artifactViewerUrlFor(blankArtifact);
    let x = artifactCallSpelling(isArtifactToolsetSplit());
    if (m.why === "listing failed") logFeatureSad("artifact_opening_prefetch", "listing_failed");
    if (!m.listed)
      logForDebugging(
        `[artifactOpeningPrefetch] type files of ${blankArtifact.slug} not saved: not attempted, the type's reference pages were not listed (the files consent does not stand for this artifact, or its listing failed)`,
      );
    let P = !m.listed
      ? null
      : typeInstructions.clipped
        ? await (r.readWholeInstructions ?? readTypeInstructions)(
            blankArtifact,
            combinedAbortSignal.signal,
            e.credentials,
          )
        : typeInstructions.text;
    let I =
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
              combinedAbortSignal.signal,
              r.readFrameFile,
            )
          ).type;
    let T =
      m.listed && artifactReplToolInPool(e.options.tools ?? [])
        ? replRouteTwoSteps(typeInstructions.text)
        : null;
    let v = T ?? "";
    let h =
      I === null
        ? null
        : {
            ...I,
            urlReadAsked: v !== "",
            skillByRead: !typeInstructions.clipped,
          };
    let b =
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
        manifest: parallelReadInstruction(
          C,
          x,
          T === null && isDeferredTool !== undefined && hasUnloadedArtifactData(e, isDeferredTool),
        ),
        typeFiles: h,
        durationMs: performance.now() - startTime,
      };
    return {
      kind: "attached",
      content: OPENING_INSTRUCTIONS_PREAMBLE + D,
      manifest: openingPrefetchSummary(
        C,
        m,
        x,
        T === null && isDeferredTool !== undefined && hasUnloadedArtifactData(e, isDeferredTool),
      ),
      typeFiles: null,
      durationMs: performance.now() - startTime,
    };
  } catch (error) {
    return {
      kind: "skipped",
      reason: "read_failed",
      detail:
        combinedAbortSignal.signal.aborted && !signal.aborted
          ? "the read took longer than the prefetch budget"
          : errorMessage(error),
    };
  } finally {
    combinedAbortSignal.cleanup();
  }
}
//@ chunk-2r828m87.js:5845-6094 placement
/**
 * 读取 artifact 类型的 SKILL.md 说明
 */
async function readTypeInstructions(n, e, i) {
  let r = await webfetchReadFile(
    {
      ...n,
      file: TYPE_INSTRUCTIONS_FILE,
    },
    e,
    i,
    "artifact_type_instructions_read",
  );
  if (r.err !== null) {
    logForDebugging(
      `[artifactOpeningPrefetch] type files of ${n.slug} not saved: the whole SKILL.md was not read (${getFetchErrorText(r)})`,
    );
    return null;
  }
  return scrubArtifactEnvelopeTags(r.html);
}
//@ chunk-2r828m87.js:6094-6898 placement
/**
 * 识别会话开场新建的空 artifact，并预取其类型的 SKILL.md 与参考页，内联到首轮提示里。
 */
async function artifactOpeningPrefetchContent(n, e, i, r, s) {
  let a = recognizeArtifactOpening([
    ...openingReminderTexts(e, r.isSystemReminderOnlyText),
    ...(i === null ? [] : reminderTextsIn(i, r.isSystemReminderOnlyText)),
  ]);
  if (a === null) return null;
  let o = await prefetchArtifactOpening(a, n, n.abortController.signal, s, r.isDeferredTool);
  logForDebugging(
    o.kind === "attached"
      ? `[artifactOpeningPrefetch] attached: ${o.content.length} chars + index ${o.manifest.length} chars in ${Math.round(o.durationMs)}ms`
      : `[artifactOpeningPrefetch] skipped: ${o.reason}${o.detail === undefined ? "" : ` (${o.detail})`}`,
  );
  if (o.kind === "attached") {
    logFeatureOk("artifact_opening_prefetch", {
      duration_ms: Math.round(o.durationMs),
    });
    return {
      content: `${o.content}

${o.manifest}`,
      slug: a.blankArtifact.slug,
      typeFiles: o.typeFiles,
    };
  }
  if (o.reason === "read_failed" || o.detail === "listing failed")
    logFeatureSad("artifact_opening_prefetch", o.reason === "read_failed" ? "read_failed" : "listing_failed");
  return null;
}
//@ chunk-2r828m87.js:6898-7295 placement
/**
 * 列出类型参考页（需文件同意）
 */
async function listTypeReferencePages(blankArtifact, signal, i, r) {
  if (!r.filesConsented(i, blankArtifact))
    return {
      listed: false,
      pages: [],
      why: "no files consent",
    };
  let s;
  try {
    s = await r.listFrameFiles(blankArtifact, signal, i.credentials);
  } catch {
    s = null;
  }
  if (s?.kind !== "ok")
    return {
      listed: false,
      pages: [],
      why: "listing failed",
    };
  return {
    listed: true,
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
      ? (e, i) => `Artifact action "read", url "${e}", path ${jsonSweepLine(i, MAX_OPENING_BLOCK_CHARS)}`
      : (e, i) =>
          `Artifact action "read_file", url "${e}", path ${jsonSweepLine(i, MAX_OPENING_BLOCK_CHARS)}`,
    listFiles: n
      ? (e) => `Artifact action "list", url "${e}", scope "files"`
      : (e) => `Artifact action "list_files", url "${e}"`,
    readArtifact: (e) => `Artifact action "read", url "${e}"`,
  };
}
//@ chunk-2r828m87.js:7627-7637 placement
var MAX_PAGE_LIST_CHARS = MAX_REFERENCE_PAGES;
//@ chunk-2r828m87.js:7637-8232 placement
/**
 * 参考页清单文字
 */
function referencePagesNote(n, pages, i) {
  let sliced = pages.slice(0, MAX_PAGE_LIST_CHARS);
  let mapped = sliced.map(
    (a) =>
      `- ${jsonSweepLine(ARTIFACT_TYPE_REFERENCE + a, MAX_OPENING_BLOCK_CHARS)}: ${i.readFile(n, ARTIFACT_TYPE_REFERENCE + a)}`,
  );
  if (pages.length > sliced.length)
    mapped.push(
      `- and ${pages.length - sliced.length} more under ${ARTIFACT_TYPE_REFERENCE} (${i.listFiles(n)} names them)`,
    );
  return [
    `Reference pages of the type of the artifact at ${n}, on the artifact and not loaded (the names are the type's own files, listed as data):`,
    ...mapped,
    `Issue every file read you need, and the artifact read itself (${i.readArtifact(n)}), in ONE message (parallel tool calls); then Read any file a result says was saved; then write. Use exactly the call shapes given here; no other fields.`,
  ].join(`
`);
}
//@ chunk-2r828m87.js:8232-8306 placement
function hasUnloadedArtifactData(n, e) {
  let toolByName = findToolByName(n.options.tools ?? [], ARTIFACT_DATA_TOOL_NAME);
  return toolByName !== undefined && !e(toolByName);
}
//@ chunk-2r828m87.js:8306-8477 placement
/**
 * ArtifactData 已加载时的提示
 */
var ARTIFACT_DATA_LOADED_HINT =
  "ArtifactData is loaded in this session: read the canvas (ArtifactData list / get on this url) in that same first message rather than searching for the tool first.";
//@ chunk-2r828m87.js:8477-8851 placement
/**
 * 预取结果说明文字
 */
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
//@ chunk-2r828m87.js:8851-9023 placement
/**
 * 提示把 Bash 与 artifact 读取并行发出
 */
function parallelReadInstruction(n, e, i) {
  return [
    `Make that Bash call and the artifact read itself, ${e.readArtifact(n)}, in ONE message (parallel tool calls); then write.`,
    ...(i ? [ARTIFACT_DATA_LOADED_HINT] : []),
  ].join(`
`);
}
//@ chunk-2r828m87.js:9023-9033 placement
var MAX_OPENING_BLOCK_CHARS = 128;
export {
  openingAttestedReadConsented,
  openingFilesConsented,
  openingReminderTexts,
  reminderTextsIn,
  recognizeArtifactOpening,
  artifactCallSpelling,
  promptlessWithholdReason,
};
