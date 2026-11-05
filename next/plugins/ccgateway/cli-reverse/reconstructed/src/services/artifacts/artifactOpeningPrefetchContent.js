/**
 * services/artifacts/artifactOpeningPrefetchContent.ts
 *
 * 2.1.316 新增。识别会话开场新建的空 artifact，并预取其类型的 SKILL.md 与参考页，内联到首轮提示里。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gyjp76b4.js (25)
 * attribution: placement 25
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { jsonStringify } from "../../utils/slowOperations.js";
import {
  sweepResultLineField,
  artifactViewerUrlFor,
  scrubArtifactEnvelopeTags,
} from "../../tools/ArtifactTool/artifactUrls.js";
import { deniedBashRules, askedBashRules, toolMatchesRule } from "../../utils/permissions/permissions.js";
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
import { readArtifactContent, modelFacingReadErr } from "./webfetchRead.js";

//@ chunk-gyjp76b4.js:952-986 placement
function jsonSweepLine(threadList, maxChars) {
  return jsonStringify(sweepResultLineField(threadList, maxChars));
}
//@ chunk-gyjp76b4.js:986-997 placement
var PREFETCH_CONTENT_TIMEOUT_MS = 3000;
//@ chunk-gyjp76b4.js:997-1232 placement
function promptlessWithholdReason(toolByName, toolPermissionContext) {
  let effectiveMaxPermission = toolByName.mcpInfo?.effectiveMaxPermission;
  if (effectiveMaxPermission !== undefined && effectiveMaxPermission !== "allow") return "permission_ceiling";
  if (toolByName.requiresUserInteraction?.()) return "requires_interaction";
  return [...deniedBashRules(toolPermissionContext), ...askedBashRules(toolPermissionContext)].some((rule) =>
    toolMatchesRule(toolPermissionContext, toolByName, rule),
  )
    ? "rule"
    : undefined;
}
//@ chunk-gyjp76b4.js:1232-1492 placement
/**
 * 识别开场提示中新建 artifact 地址的正则
 */
var ARTIFACT_OPENING_RE =
  /^The user just created a new, empty (?:[^\n<]{1,80}? )?artifact at (https?:\/\/\S+) and has it open beside this conversation/;
var ARTIFACT_OPENING_URL_RE = /artifact at (https?:\/\/\S+) and has it open beside this conversation/g;
var SYSTEM_REMINDER_BLOCK_RE = /<system-reminder>([\s\S]*?)<\/system-reminder>/g;
//@ chunk-gyjp76b4.js:1492-1858 placement
function openingReminderTexts(messages, regex) {
  let out = [];
  for (let message of messages) {
    if (message.type === "assistant") break;
    if (message.type !== "user") continue;
    if (
      (message.origin !== undefined && message.origin.kind !== "human") ||
      message.verifiedSlackHumanTurn === true ||
      message.projectsUserTurn === true ||
      message.isMeta === true
    )
      continue;
    let { content } = message.message;
    let contents =
      typeof content === "string"
        ? [content]
        : content.flatMap((block) => (block.type === "text" ? [block.text] : []));
    for (let content of contents) out.push(...reminderTextsIn(content, regex));
  }
  return out;
}
//@ chunk-gyjp76b4.js:1858-1902 placement
var ARTIFACT_CREATED_PREFIX = "The user just created a new, empty ";
//@ chunk-gyjp76b4.js:1902-2162 placement
/**
 * 开场提示中是否有多个或可疑的 artifact 地址
 */
function hasAmbiguousArtifactOpening(text) {
  let regExp = new RegExp(ARTIFACT_OPENING_URL_RE);
  let index = text.indexOf(ARTIFACT_CREATED_PREFIX);
  while (index !== -1) {
    let prefixLength = index + ARTIFACT_CREATED_PREFIX.length;
    regExp.lastIndex = prefixLength;
    let match = regExp.exec(text);
    if (text.slice(prefixLength, match?.index).includes("<")) return true;
    index = match === null ? -1 : text.indexOf(ARTIFACT_CREATED_PREFIX, match.index + match[0].length);
  }
  return new Set([...text.matchAll(ARTIFACT_OPENING_URL_RE)].map((match) => match[1])).size > 1;
}
//@ chunk-gyjp76b4.js:2162-2277 placement
function reminderTextsIn(text, regex) {
  if (!regex(text) || hasAmbiguousArtifactOpening(text)) return [];
  return [...text.matchAll(SYSTEM_REMINDER_BLOCK_RE)]
    .map((match) => (match[1] ?? "").trim())
    .filter((text) => text !== "");
}
//@ chunk-gyjp76b4.js:2277-2592 placement
function recognizeArtifactOpening(texts) {
  if (
    new Set(texts.flatMap((text) => [...text.matchAll(ARTIFACT_OPENING_URL_RE)].map((match) => match[1])))
      .size > 1
  )
    return null;
  let found;
  for (let text of texts) {
    let url = ARTIFACT_OPENING_RE.exec(text)?.[1];
    let parsed = url === undefined ? null : parseArtifactUrl(url);
    if (url === undefined || parsed === null) continue;
    if (found !== undefined && found.slug !== parsed.slug) return null;
    found ??= {
      slug: parsed.slug,
      env: parsed.env,
      url,
    };
  }
  return found === undefined
    ? null
    : {
        blankArtifact: found,
      };
}
//@ chunk-gyjp76b4.js:2592-2845 placement
/**
 * 预取说明文件的前言
 */
var OPENING_INSTRUCTIONS_PREAMBLE =
  "The artifact named in this session's opening context carries an instructions file; it is below, read ahead for you. The artifact's own content was not read: read it as the opening context asks; that read's result will repeat these instructions.";
//@ chunk-gyjp76b4.js:2845-2906 placement
function openingFilesConsented(context, files) {
  return !hasAutoReactNoticePending(files.slug) && copySourceConsented(context, files, "files", "land");
}
//@ chunk-gyjp76b4.js:2906-2947 placement
function openingAttestedReadConsented(context, read) {
  return !hasAutoReactNoticePending(read) && attestedReadConsented(context, read);
}
//@ chunk-gyjp76b4.js:2947-2980 placement
var ARTIFACT_TYPE_REFERENCE = "artifact-type/reference/";
//@ chunk-gyjp76b4.js:2980-5845 placement
/**
 * 预取开场 artifact 的说明文件与参考页
 */
async function prefetchArtifactOpening(
  request,
  context,
  signal,
  deps = {
    warmShareEntry,
    readTypeInstructions: readTypeInstructions_2,
    isArtifactReadEnabled,
    filesConsented: openingFilesConsented,
    listArtifactTypes,
    listFrameFiles: listArtifactFiles,
  },
  isDeferredTool,
) {
  let blankArtifact = request.blankArtifact;
  let startTime = performance.now();
  let combinedAbortSignal = createCombinedAbortSignal(signal, {
    timeoutMs: PREFETCH_CONTENT_TIMEOUT_MS,
    refTimer: true,
  });
  try {
    if (!deps.isArtifactReadEnabled())
      return {
        kind: "skipped",
        reason: "artifact_off",
      };
    if (!typeCatalogOnForSession())
      return {
        kind: "skipped",
        reason: "catalog_off",
      };
    let toolPermissionContext = getToolPermissionContext(context);
    let toolByName = findToolByName(context.options.tools ?? [], ARTIFACT_TOOL_NAME);
    let withholdReason =
      toolByName === undefined ? "not_in_pool" : promptlessWithholdReason(toolByName, toolPermissionContext);
    if (withholdReason !== undefined)
      return {
        kind: "skipped",
        reason: "tool_unavailable",
        detail: withholdReason,
      };
    let url = blankArtifact.url;
    for (let behavior of ["deny", "ask"])
      if (artifactReadRule(toolPermissionContext, blankArtifact, url, behavior) !== null)
        return {
          kind: "skipped",
          reason: "rule",
          detail: behavior,
        };
    await deps.warmShareEntry(
      blankArtifact,
      {
        abortController: {
          signal: combinedAbortSignal.signal,
        },
        credentials: context.credentials,
      },
      "opening_prefetch",
    );
    let toolPermissionContext_2 = getToolPermissionContext(context);
    for (let behavior of ["deny", "ask"])
      if (artifactReadRule(toolPermissionContext_2, blankArtifact, url, behavior) !== null)
        return {
          kind: "skipped",
          reason: "rule",
          detail: behavior,
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
    let typeInstructions = await deps.readTypeInstructions(
      blankArtifact,
      combinedAbortSignal.signal,
      context.credentials,
    );
    if (typeInstructions.kind !== "read")
      return {
        kind: "skipped",
        reason: "instructions_unavailable",
        detail: typeInstructions.kind === "unavailable" ? typeInstructions.why : "none",
      };
    let instructionsText = renderTypeInstructions(typeInstructions);
    try {
      await deps.listArtifactTypes({
        firstParty: true,
        signal: combinedAbortSignal.signal,
        credentials: context.credentials,
        httpOnly: true,
      });
    } catch {}
    let pages = await listTypeReferencePages(blankArtifact, combinedAbortSignal.signal, context, deps);
    let viewerUrl = artifactViewerUrlFor(blankArtifact);
    let spelling = artifactCallSpelling(isArtifactToolsetSplit());
    if (pages.why === "listing failed") logFeatureSad("artifact_opening_prefetch", "listing_failed");
    if (!pages.listed)
      logForDebugging(
        `[artifactOpeningPrefetch] type files of ${blankArtifact.slug} not saved: not attempted, the type's reference pages were not listed (the files consent does not stand for this artifact, or its listing failed)`,
      );
    let wholeInstructions = !pages.listed
      ? null
      : typeInstructions.clipped
        ? await (deps.readWholeInstructions ?? readTypeInstructions)(
            blankArtifact,
            combinedAbortSignal.signal,
            context.credentials,
          )
        : typeInstructions.text;
    let typePrefetch =
      wholeInstructions === null
        ? null
        : (
            await prefetchArtifactTypeAndSystem(
              {
                type: {
                  artifact: blankArtifact,
                  instructions: wholeInstructions,
                  pages: pages.pages.map((page) => ARTIFACT_TYPE_REFERENCE + page),
                  stillConsented: () => deps.filesConsented(context, blankArtifact),
                },
                system: null,
              },
              context,
              combinedAbortSignal.signal,
              deps.readFrameFile,
            )
          ).type;
    let replRoute =
      pages.listed && artifactReplToolInPool(context.options.tools ?? [])
        ? replRouteTwoSteps(typeInstructions.text)
        : null;
    let replRouteText = replRoute ?? "";
    let skillInput =
      typePrefetch === null
        ? null
        : {
            ...typePrefetch,
            urlReadAsked: replRouteText !== "",
            skillByRead: !typeInstructions.clipped,
          };
    let skillText =
      skillInput === null
        ? null
        : typeSkillPrintInstructions(
            skillInput,
            [
              replRouteText,
              buildSpellingNoteForText(typeInstructions.text),
              replRouteSection(typeInstructions.text),
            ]
              .map((line) => line.trim())
              .filter((line) => line !== "")
              .map(
                (line) => `

${line}`,
              )
              .join(""),
          );
    if (skillInput !== null && skillText === null)
      logForDebugging(
        `[artifactOpeningPrefetch] type files of ${blankArtifact.slug} saved but not used: SKILL.md does not fit one Bash output, the text stays inline`,
      );
    if (skillInput !== null && skillText !== null)
      return {
        kind: "attached",
        content: skillText,
        manifest: parallelReadInstruction(
          viewerUrl,
          spelling,
          replRoute === null &&
            isDeferredTool !== undefined &&
            hasUnloadedArtifactData(context, isDeferredTool),
        ),
        typeFiles: skillInput,
        durationMs: performance.now() - startTime,
      };
    return {
      kind: "attached",
      content: OPENING_INSTRUCTIONS_PREAMBLE + instructionsText,
      manifest: openingPrefetchSummary(
        viewerUrl,
        pages,
        spelling,
        replRoute === null &&
          isDeferredTool !== undefined &&
          hasUnloadedArtifactData(context, isDeferredTool),
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
//@ chunk-gyjp76b4.js:5845-6094 placement
/**
 * 读取 artifact 类型的 SKILL.md 说明
 */
async function readTypeInstructions(artifact, signal, credentials) {
  let file = await readArtifactContent(
    {
      ...artifact,
      file: TYPE_INSTRUCTIONS_FILE,
    },
    signal,
    credentials,
    "artifact_type_instructions_read",
  );
  if (file.err !== null) {
    logForDebugging(
      `[artifactOpeningPrefetch] type files of ${artifact.slug} not saved: the whole SKILL.md was not read (${modelFacingReadErr(file)})`,
    );
    return null;
  }
  return scrubArtifactEnvelopeTags(file.html);
}
//@ chunk-gyjp76b4.js:6094-6898 placement
/**
 * 识别会话开场新建的空 artifact，并预取其类型的 SKILL.md 与参考页，内联到首轮提示里。
 */
async function artifactOpeningPrefetchContent(context, messages, signal, credentials, options) {
  let openings = recognizeArtifactOpening([
    ...openingReminderTexts(messages, credentials.isSystemReminderOnlyText),
    ...(signal === null ? [] : reminderTextsIn(signal, credentials.isSystemReminderOnlyText)),
  ]);
  if (openings === null) return null;
  let result = await prefetchArtifactOpening(
    openings,
    context,
    context.abortController.signal,
    options,
    credentials.isDeferredTool,
  );
  logForDebugging(
    result.kind === "attached"
      ? `[artifactOpeningPrefetch] attached: ${result.content.length} chars + index ${result.manifest.length} chars in ${Math.round(result.durationMs)}ms`
      : `[artifactOpeningPrefetch] skipped: ${result.reason}${result.detail === undefined ? "" : ` (${result.detail})`}`,
  );
  if (result.kind === "attached") {
    logFeatureOk("artifact_opening_prefetch", {
      duration_ms: Math.round(result.durationMs),
    });
    return {
      content: `${result.content}

${result.manifest}`,
      slug: openings.blankArtifact.slug,
      typeFiles: result.typeFiles,
    };
  }
  if (result.reason === "read_failed" || result.detail === "listing failed")
    logFeatureSad(
      "artifact_opening_prefetch",
      result.reason === "read_failed" ? "read_failed" : "listing_failed",
    );
  return null;
}
//@ chunk-gyjp76b4.js:6898-7295 placement
/**
 * 列出类型参考页（需文件同意）
 */
async function listTypeReferencePages(blankArtifact, signal, listSignal, credentials) {
  if (!credentials.filesConsented(listSignal, blankArtifact))
    return {
      listed: false,
      pages: [],
      why: "no files consent",
    };
  let listing;
  try {
    listing = await credentials.listFrameFiles(blankArtifact, signal, listSignal.credentials);
  } catch {
    listing = null;
  }
  if (listing?.kind !== "ok")
    return {
      listed: false,
      pages: [],
      why: "listing failed",
    };
  return {
    listed: true,
    pages: listing.files
      .map((file) => file.path)
      .filter((path) => path.startsWith(ARTIFACT_TYPE_REFERENCE) && path.endsWith(".md"))
      .map((httpStatus) => httpStatus.slice(ARTIFACT_TYPE_REFERENCE.length))
      .filter((path) => !path.includes("/"))
      .sort(),
  };
}
//@ chunk-gyjp76b4.js:7295-7627 placement
function artifactCallSpelling(spelling) {
  return {
    readFile: spelling
      ? (slug, scope) =>
          `Artifact action "read", url "${slug}", path ${jsonSweepLine(scope, MAX_OPENING_BLOCK_CHARS)}`
      : (slug, scope) =>
          `Artifact action "read_file", url "${slug}", path ${jsonSweepLine(scope, MAX_OPENING_BLOCK_CHARS)}`,
    listFiles: spelling
      ? (slug) => `Artifact action "list", url "${slug}", scope "files"`
      : (slug) => `Artifact action "list_files", url "${slug}"`,
    readArtifact: (slug) => `Artifact action "read", url "${slug}"`,
  };
}
//@ chunk-gyjp76b4.js:7627-7637 placement
var MAX_PAGE_LIST_CHARS = MAX_REFERENCE_PAGES;
//@ chunk-gyjp76b4.js:7637-8232 placement
/**
 * 参考页清单文字
 */
function referencePagesNote(artifact, pages, pageList) {
  let sliced = pages.slice(0, MAX_PAGE_LIST_CHARS);
  let mapped = sliced.map(
    (page) =>
      `- ${jsonSweepLine(ARTIFACT_TYPE_REFERENCE + page, MAX_OPENING_BLOCK_CHARS)}: ${pageList.readFile(artifact, ARTIFACT_TYPE_REFERENCE + page)}`,
  );
  if (pages.length > sliced.length)
    mapped.push(
      `- and ${pages.length - sliced.length} more under ${ARTIFACT_TYPE_REFERENCE} (${pageList.listFiles(artifact)} names them)`,
    );
  return [
    `Reference pages of the type of the artifact at ${artifact}, on the artifact and not loaded (the names are the type's own files, listed as data):`,
    ...mapped,
    `Issue every file read you need, and the artifact read itself (${pageList.readArtifact(artifact)}), in ONE message (parallel tool calls); then Read any file a result says was saved; then write. Use exactly the call shapes given here; no other fields.`,
  ].join(`
`);
}
//@ chunk-gyjp76b4.js:8232-8306 placement
function hasUnloadedArtifactData(context, data) {
  let toolByName = findToolByName(context.options.tools ?? [], ARTIFACT_DATA_TOOL_NAME);
  return toolByName !== undefined && !data(toolByName);
}
//@ chunk-gyjp76b4.js:8306-8477 placement
/**
 * ArtifactData 已加载时的提示
 */
var ARTIFACT_DATA_LOADED_HINT =
  "ArtifactData is loaded in this session: read the canvas (ArtifactData list / get on this url) in that same first message rather than searching for the tool first.";
//@ chunk-gyjp76b4.js:8477-8851 placement
/**
 * 预取结果说明文字
 */
function openingPrefetchSummary(artifact, typed, signal, credentials) {
  let note = referencePagesNote(artifact, typed.pages, signal);
  return [
    `Loaded ahead of this turn for the artifact at ${artifact}: the instructions file found on it (SKILL.md) \u2014 inlined above; do not read it again.`,
    ...(typed.pages.length > 0
      ? [note]
      : [
          ...(typed.listed
            ? []
            : [
                `Its type's reference pages are on the artifact under ${ARTIFACT_TYPE_REFERENCE} (${signal.listFiles(artifact)} names them).`,
              ]),
          ...note
            .split(
              `
`,
            )
            .slice(1),
        ]),
    ...(credentials ? [ARTIFACT_DATA_LOADED_HINT] : []),
  ].join(`
`);
}
//@ chunk-gyjp76b4.js:8851-9023 placement
/**
 * 提示把 Bash 与 artifact 读取并行发出
 */
function parallelReadInstruction(artifact, signal, credentials) {
  return [
    `Make that Bash call and the artifact read itself, ${signal.readArtifact(artifact)}, in ONE message (parallel tool calls); then write.`,
    ...(credentials ? [ARTIFACT_DATA_LOADED_HINT] : []),
  ].join(`
`);
}
//@ chunk-gyjp76b4.js:9023-9033 placement
var MAX_OPENING_BLOCK_CHARS = 128;
export {
  openingAttestedReadConsented,
  openingFilesConsented,
  openingReminderTexts,
  reminderTextsIn,
  recognizeArtifactOpening,
  artifactCallSpelling,
  promptlessWithholdReason,
  artifactOpeningPrefetchContent,
};
