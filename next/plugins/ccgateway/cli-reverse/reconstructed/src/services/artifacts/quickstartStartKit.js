/**
 * services/artifacts/quickstartStartKit.ts
 *
 * 2.1.316 新增：快速开始套件（读取第一方类型技能与文件）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-965tj7mg.js (17)
 * attribution: placement 17
 */
import { startKitSwitchOn } from "./startKitSwitch.js";
import { findToolByName } from "../../Tool.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { artifactReplToolInPool } from "../../tools/ArtifactTool/promptText.js";
import { SKILL } from "../../tools/SkillTool/skillToolNames.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  checkDesignSystemReadable,
  raceWithDeadline,
  canReadDesignSystemFiles,
} from "./designSystemGuide.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { hasDesignSystemReadRule, recordForeignDesignSystemRead } from "./designSystemReadRules.js";
import { artifactReadRule } from "../../tools/ArtifactTool/permissions/readRules.js";
import { listArtifactFiles, MAX_LISTED_FILES } from "./publishedFiles.js";
import { parseArtifactUrl } from "../../tools/ArtifactTool/constants.js";
import { getAttestationKind } from "./attestation.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";
import { TYPE_INSTRUCTIONS_FILE, instructionsFromText } from "./artifactTypes.js";
import {
  MAX_REFERENCE_PAGES,
  prefetchArtifactTypeAndSystem,
  typeFileSkipReason,
  isBinaryTypeFile,
  artifactOpeningPrefetchPrompt,
} from "./artifactOpeningPrefetch.js";
import { webfetchReadFile } from "./webfetchRead.js";
import { scrubArtifactEnvelopeTags, sweepResultLineField } from "../../tools/ArtifactTool/artifactUrls.js";
import { errorMessage } from "../../utils/errors.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { scratchpadArtifactFilePath } from "../../tools/ArtifactTool/readFilePaths.js";
import { startKitSchema } from "../../tools/ArtifactTool/startKitSchemas.js";
import { getLiveState } from "../liveReplica/liveReplica.js";

//@ chunk-965tj7mg.js:7094-7267 placement
/**
 * 快速开始起步套件的常量：文件大小上限、参考文档路径与通用相对路径正则、路径/原因长度上限。
 */
var MAX_KIT_FILE_BYTES = 8000;
var GUIDE_READ_GRACE_MS = 2500;
var REFERENCE_PATH_RE = /^artifact-type\/reference\/[A-Za-z0-9][A-Za-z0-9._-]{0,63}\.md$/;
var KIT_RELATIVE_PATH_RE = /^[A-Za-z0-9_@][A-Za-z0-9._@+-]*(?:\/[A-Za-z0-9_@][A-Za-z0-9._@+-]*)*$/;
var MAX_KIT_PATH_LENGTH = 160;
var MAX_SKIP_TEXT_LENGTH = 1024;
//@ chunk-965tj7mg.js:7267-7332 placement
/**
 * 导出函数 `hasStartKitSwitchAndBash`：参数 e，返回 startKitSwitchOn() && findToolByName(e.options.tools ?? [], BASH_TOOL_NAME) !== void 0。
 */
function hasStartKitSwitchAndBash(tools) {
  return startKitSwitchOn() && findToolByName(tools.options.tools ?? [], BASH_TOOL_NAME) !== undefined;
}
//@ chunk-965tj7mg.js:7332-7379 placement
/**
 * 导出函数 `hasArtifactReplTool`：参数 e，返回 artifactReplToolInPool(e.options.tools ?? [])。
 */
function hasArtifactReplTool(tools) {
  return artifactReplToolInPool(tools.options.tools ?? []);
}
//@ chunk-965tj7mg.js:7379-7437 placement
/**
 * 导出函数 `hasSkillTool`：参数 e，返回 findToolByName(e.options.tools ?? [], SKILL) !== void 0。
 */
function hasSkillTool(tools) {
  return findToolByName(tools.options.tools ?? [], SKILL) !== undefined;
}
//@ chunk-965tj7mg.js:7437-7501 placement
function savedFilesSummary(saved) {
  return {
    dir: saved.dir,
    files: saved.files,
    skipped: saved.skipped,
  };
}
//@ chunk-965tj7mg.js:7501-7621 placement
function kitNotSaved(url, saved, notSaved = saved, kind = "list") {
  logForDebugging(`[quickstartStartKit] ${url} not saved: ${saved}`);
  return {
    notSaved,
    ...(kind !== "list" && {
      next: kind,
    }),
  };
}
//@ chunk-965tj7mg.js:7621-8246 placement
function notSavedReason(code) {
  return code === "other_org"
    ? ["it is in another of the user's organizations, which this login cannot read", "say_so"]
    : code === "not_a_link"
      ? ["its link is not an Artifact URL of this session's claude.ai", "own_calls"]
      : code === "not_served"
        ? ["this session does not serve published files", "own_calls"]
        : code === "rule"
          ? ["a permission rule covers reading it", "own_calls"]
          : code === "notice_pending"
            ? ["new comments are waiting on it, so a read of it asks first", "list"]
            : code === "probe_failed"
              ? ["its sharing could not be checked", "list"]
              : code.startsWith("probe_")
                ? ["its sharing could not be checked in time", "list"]
                : ["reading it would ask first", "list"];
}
//@ chunk-965tj7mg.js:8246-8920 placement
async function readQuickstartTypeFile(type, path, signal) {
  let { url, context, pipelineRan } = type;
  let readable = await checkDesignSystemReadable(
    url,
    signal,
    context,
    false,
    pipelineRan,
    "quickstart_start_kit",
  );
  if (!readable.ok) return kitNotSaved(path, readable.code, ...notSavedReason(readable.code));
  if (!readable.filesOk)
    return readable.filesRuled
      ? kitNotSaved(path, "rule", "a permission rule covers reading its files", "own_calls")
      : kitNotSaved(path, "a read would ask", "reading its files would ask first");
  let toolPermissionContext = getToolPermissionContext(context);
  if (
    hasDesignSystemReadRule(readable.parsed, url, "list_files", context, {
      pipelineRan,
    }) ||
    ["deny", "ask"].some(
      (path) => artifactReadRule(toolPermissionContext, readable.parsed, url, path) !== null,
    )
  )
    return kitNotSaved(path, "a rule covers reading it", undefined, "own_calls");
  let read = await raceWithDeadline(
    listArtifactFiles(readable.parsed, signal, context.credentials),
    signal,
    context,
    () => null,
  );
  if (read?.kind !== "ok") return kitNotSaved(path, "its files could not be listed", undefined, "own_calls");
  return {
    parsed: readable.parsed,
    owned: readable.owned,
    listing: read,
  };
}
//@ chunk-965tj7mg.js:8920-9024 placement
function isKitReadRuled(context, parsed, path) {
  return hasDesignSystemReadRule(parsed, context.url, "read_file", context.context, {
    fields: {
      path,
    },
    pipelineRan: context.pipelineRan,
  });
}
//@ chunk-965tj7mg.js:9024-9090 placement
/**
 * 导出函数 `readTypeSkillOrNull`：参数 e，返回 "notSaved" in i ? null : i。
 */
async function readTypeSkillOrNull(type) {
  let firstPartyTypeSkill = await readFirstPartyTypeSkill(type);
  return "notSaved" in firstPartyTypeSkill ? null : firstPartyTypeSkill;
}
//@ chunk-965tj7mg.js:9090-10391 placement
async function readFirstPartyTypeSkill(request) {
  let artifactUrl = parseArtifactUrl(request.url);
  let isFirstPartyType = () =>
    artifactUrl !== null && getAttestationKind(artifactUrl.slug) === "first_party_type";
  if (!isFirstPartyType()) return kitNotSaved("the type", "not listed first-party");
  let combinedAbortSignal = createCombinedAbortSignal(request.signal, {
    timeoutMs: request.budgetMs ?? MAX_KIT_FILE_BYTES,
    refTimer: true,
  });
  try {
    let quickstartTypeFile = await readQuickstartTypeFile(request, "the type", combinedAbortSignal.signal);
    if ("notSaved" in quickstartTypeFile) return quickstartTypeFile;
    let { parsed, owned, listing } = quickstartTypeFile;
    let stillAllowed = () =>
      isFirstPartyType() &&
      canReadDesignSystemFiles(parsed, request.url, request.context, request.pipelineRan);
    let mapped = listing.files.map((file) => file.path);
    if (!mapped.includes(TYPE_INSTRUCTIONS_FILE)) return kitNotSaved("the type", "it lists no SKILL.md");
    let sorted = mapped.filter((path) => REFERENCE_PATH_RE.test(path)).sort();
    if (sorted.length > MAX_REFERENCE_PAGES)
      return kitNotSaved("the type", `more than ${MAX_REFERENCE_PAGES} reference pages`);
    if ([TYPE_INSTRUCTIONS_FILE, ...sorted].some((path) => isKitReadRuled(request, parsed, path)))
      return kitNotSaved("the type", "a rule names one of its files");
    let read = await raceWithDeadline(
      webfetchReadFile(
        {
          ...parsed,
          file: TYPE_INSTRUCTIONS_FILE,
        },
        combinedAbortSignal.signal,
        request.context.credentials,
        "artifact_type_instructions_read",
      ),
      combinedAbortSignal.signal,
      request.context,
      () => null,
    );
    if (read === null || read.err !== null) return kitNotSaved("the type", "SKILL.md could not be read");
    if (!stillAllowed()) return kitNotSaved("the type", "the admission no longer stands after the read");
    let html = scrubArtifactEnvelopeTags(read.html);
    let snippet = await raceWithDeadline(
      prefetchArtifactTypeAndSystem(
        {
          type: {
            artifact: parsed,
            instructions: html,
            pages: sorted,
            stillConsented: stillAllowed,
          },
          system: null,
        },
        request.context,
        combinedAbortSignal.signal,
      ),
      combinedAbortSignal.signal,
      request.context,
      () => null,
    );
    if (snippet === null || snippet.type === null) return kitNotSaved("the type", "its files did not land");
    if (!owned) recordForeignDesignSystemRead(parsed, "read_file", request.context);
    return {
      saved: savedFilesSummary(snippet.type),
      skillInResult: !instructionsFromText(html, true).clipped,
    };
  } catch (error) {
    return kitNotSaved("the type", `failed: ${errorMessage(error)}`);
  } finally {
    combinedAbortSignal.cleanup();
  }
}
//@ chunk-965tj7mg.js:10391-10469 placement
function isReservedKitPath(path) {
  return path === "index.html" || path === TYPE_INSTRUCTIONS_FILE || path.startsWith("artifact-type/");
}
//@ chunk-965tj7mg.js:10469-10603 placement (2.1.88 match: formatFailureDetails, 0.777)
function formatFailureDetails(failures) {
  let limit = failures.length - 3;
  return (
    failures
      .slice(0, 3)
      .map((failure) => `${jsonStringify(sweepResultLineField(failure.path, 60))} (${failure.reason})`)
      .join(", ") + (limit > 0 ? ` and ${limit} more` : "")
  );
}
//@ chunk-965tj7mg.js:10603-12017 placement
/**
 * Artifact quickstart 起步包：在预算内读取类型与设计系统的 SKILL.md/参考页并保存到 scratchpad。
 */
async function runQuickstartStartKit(request) {
  let budgetMs = request.budgetMs ?? MAX_KIT_FILE_BYTES;
  let combinedAbortSignal = createCombinedAbortSignal(request.signal, {
    timeoutMs: budgetMs,
    refTimer: true,
  });
  let combinedAbortSignal_2 = createCombinedAbortSignal(request.signal, {
    timeoutMs: budgetMs + (request.graceMs ?? GUIDE_READ_GRACE_MS),
    refTimer: true,
  });
  try {
    let quickstartTypeFile = await readQuickstartTypeFile(
      request,
      "the design system",
      combinedAbortSignal.signal,
    );
    if ("notSaved" in quickstartTypeFile) return quickstartTypeFile;
    let { parsed, owned, listing } = quickstartTypeFile;
    let filtered = listing.files.filter((file) => !isReservedKitPath(file.path));
    if (filtered.length === 0)
      return kitNotSaved("the design system", "it publishes no files of its own", undefined, "own_calls");
    let filtered_2 = filtered.filter((file) => isKitReadRuled(request, parsed, file.path));
    let kitSwitchOn = startKitSwitchOn();
    let skipReason = (file) =>
      filtered_2.includes(file) ? "a permission rule" : typeFileSkipReason(file, kitSwitchOn);
    let all = filtered.every((file) => skipReason(file) !== undefined || isBinaryTypeFile(file));
    let failures = filtered.flatMap((file) => {
      let reason = skipReason(file) ?? (all && isBinaryTypeFile(file) ? "font file" : undefined);
      return reason === undefined
        ? []
        : [
            {
              path: file.path,
              reason,
            },
          ];
    });
    if (failures.length === filtered.length)
      return kitNotSaved(
        "the design system",
        "none of its files can land",
        `none of its files could be saved: ${formatFailureDetails(failures)}`,
        filtered_2.length > 0 ? "own_calls" : "list",
      );
    let saved = await raceWithDeadline(
      prefetchArtifactTypeAndSystem(
        {
          type: null,
          system: {
            artifact: parsed,
            listing: filtered.filter((file) => !filtered_2.includes(file)),
            stillConsented: () =>
              canReadDesignSystemFiles(parsed, request.url, request.context, request.pipelineRan),
          },
        },
        request.context,
        combinedAbortSignal.signal,
      ),
      combinedAbortSignal_2.signal,
      request.context,
      () => null,
    );
    if (
      saved === null ||
      saved.system === null ||
      saved.system.files.every((file) =>
        filtered.some((binaryFile) => binaryFile.path === file.path && isBinaryTypeFile(binaryFile)),
      )
    )
      return kitNotSaved("the design system", "no file of it landed", "none of its files could be saved");
    if (!owned) recordForeignDesignSystemRead(parsed, "read_file", request.context);
    let summary = savedFilesSummary(saved.system);
    return {
      ...summary,
      skipped: summary.skipped.concat(
        filtered_2.map((file) => ({
          path: file.path,
          reason: "a permission rule",
        })),
      ),
    };
  } catch (error) {
    return kitNotSaved("the design system", `failed: ${errorMessage(error)}`, "saving them failed");
  } finally {
    combinedAbortSignal.cleanup();
    combinedAbortSignal_2.cleanup();
  }
}
//@ chunk-965tj7mg.js:12017-12253 placement
function validateSavedKit(kit, url) {
  let parsed = url === undefined ? null : parseArtifactUrl(url);
  return kit !== undefined &&
    parsed !== null &&
    kit.dir === scratchpadArtifactFilePath(parsed.slug) &&
    kit.files.every(
      (file) => file.path.length <= MAX_KIT_PATH_LENGTH && KIT_RELATIVE_PATH_RE.test(file.path),
    ) &&
    kit.skipped.length <= MAX_LISTED_FILES &&
    kit.skipped.every(
      (system) => system.path.length <= MAX_SKIP_TEXT_LENGTH && system.reason.length <= MAX_SKIP_TEXT_LENGTH,
    )
    ? kit
    : null;
}
//@ chunk-965tj7mg.js:12253-12666 placement
function parseStartKitResult(text, typeKey, typeKey_2) {
  let parsed = startKitSchema().safeParse(text);
  if (!parsed.success) return null;
  let type = validateSavedKit(parsed.data.type, typeKey);
  let validated = validateSavedKit(parsed.data.system, parsed.data.system_url);
  return artifactOpeningPrefetchPrompt({
    turnOne: {
      kind: "create",
      typeUrl: typeKey,
    },
    typeKey: typeKey_2,
    files: {
      type,
      system: validated,
    },
    ...(validated !== null && {
      systemUrl: parsed.data.system_url,
    }),
    skillInResult: parsed.data.skill_in_result,
    capabilitiesSkill: parsed.data.capabilities_skill,
    repl: parsed.data.repl_tool !== false,
    canCheckWork: false,
    copyFrom: getLiveState().frozenCopyFrom === true,
  });
}
//@ chunk-965tj7mg.js:12666-12782 placement
function describeKitContents(kit) {
  return kit?.type !== undefined
    ? kit.system !== undefined
      ? "both"
      : "type_only"
    : kit?.system !== undefined
      ? "system_only"
      : "none";
}
export {
  hasSkillTool,
  parseStartKitResult,
  hasArtifactReplTool,
  runQuickstartStartKit,
  readTypeSkillOrNull,
  describeKitContents,
  hasStartKitSwitchAndBash,
};
