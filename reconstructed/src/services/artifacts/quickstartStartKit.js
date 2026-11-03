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
function hasStartKitSwitchAndBash(e) {
  return startKitSwitchOn() && findToolByName(e.options.tools ?? [], BASH_TOOL_NAME) !== undefined;
}
//@ chunk-965tj7mg.js:7332-7379 placement
/**
 * 导出函数 `hasArtifactReplTool`：参数 e，返回 artifactReplToolInPool(e.options.tools ?? [])。
 */
function hasArtifactReplTool(e) {
  return artifactReplToolInPool(e.options.tools ?? []);
}
//@ chunk-965tj7mg.js:7379-7437 placement
/**
 * 导出函数 `hasSkillTool`：参数 e，返回 findToolByName(e.options.tools ?? [], SKILL) !== void 0。
 */
function hasSkillTool(e) {
  return findToolByName(e.options.tools ?? [], SKILL) !== undefined;
}
//@ chunk-965tj7mg.js:7437-7501 placement
function savedFilesSummary(e) {
  return {
    dir: e.dir,
    files: e.files,
    skipped: e.skipped,
  };
}
//@ chunk-965tj7mg.js:7501-7621 placement
function kitNotSaved(e, i, notSaved = i, n = "list") {
  logForDebugging(`[quickstartStartKit] ${e} not saved: ${i}`);
  return {
    notSaved,
    ...(n !== "list" && {
      next: n,
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
async function readQuickstartTypeFile(e, i, signal) {
  let { url, context, pipelineRan } = e;
  let o = await checkDesignSystemReadable(url, signal, context, false, pipelineRan, "quickstart_start_kit");
  if (!o.ok) return kitNotSaved(i, o.code, ...notSavedReason(o.code));
  if (!o.filesOk)
    return o.filesRuled
      ? kitNotSaved(i, "rule", "a permission rule covers reading its files", "own_calls")
      : kitNotSaved(i, "a read would ask", "reading its files would ask first");
  let toolPermissionContext = getToolPermissionContext(context);
  if (
    hasDesignSystemReadRule(o.parsed, url, "list_files", context, {
      pipelineRan,
    }) ||
    ["deny", "ask"].some((p) => artifactReadRule(toolPermissionContext, o.parsed, url, p) !== null)
  )
    return kitNotSaved(i, "a rule covers reading it", undefined, "own_calls");
  let m = await raceWithDeadline(
    listArtifactFiles(o.parsed, signal, context.credentials),
    signal,
    context,
    () => null,
  );
  if (m?.kind !== "ok") return kitNotSaved(i, "its files could not be listed", undefined, "own_calls");
  return {
    parsed: o.parsed,
    owned: o.owned,
    listing: m,
  };
}
//@ chunk-965tj7mg.js:8920-9024 placement
function isKitReadRuled(e, parsed, path) {
  return hasDesignSystemReadRule(parsed, e.url, "read_file", e.context, {
    fields: {
      path,
    },
    pipelineRan: e.pipelineRan,
  });
}
//@ chunk-965tj7mg.js:9024-9090 placement
/**
 * 导出函数 `readTypeSkillOrNull`：参数 e，返回 "notSaved" in i ? null : i。
 */
async function readTypeSkillOrNull(e) {
  let firstPartyTypeSkill = await readFirstPartyTypeSkill(e);
  return "notSaved" in firstPartyTypeSkill ? null : firstPartyTypeSkill;
}
//@ chunk-965tj7mg.js:9090-10391 placement
async function readFirstPartyTypeSkill(e) {
  let artifactUrl = parseArtifactUrl(e.url);
  let n = () => artifactUrl !== null && getAttestationKind(artifactUrl.slug) === "first_party_type";
  if (!n()) return kitNotSaved("the type", "not listed first-party");
  let combinedAbortSignal = createCombinedAbortSignal(e.signal, {
    timeoutMs: e.budgetMs ?? MAX_KIT_FILE_BYTES,
    refTimer: true,
  });
  try {
    let quickstartTypeFile = await readQuickstartTypeFile(e, "the type", combinedAbortSignal.signal);
    if ("notSaved" in quickstartTypeFile) return quickstartTypeFile;
    let { parsed, owned, listing } = quickstartTypeFile;
    let p = () => n() && canReadDesignSystemFiles(parsed, e.url, e.context, e.pipelineRan);
    let mapped = listing.files.map((file) => file.path);
    if (!mapped.includes(TYPE_INSTRUCTIONS_FILE)) return kitNotSaved("the type", "it lists no SKILL.md");
    let sorted = mapped.filter((c) => REFERENCE_PATH_RE.test(c)).sort();
    if (sorted.length > MAX_REFERENCE_PAGES)
      return kitNotSaved("the type", `more than ${MAX_REFERENCE_PAGES} reference pages`);
    if ([TYPE_INSTRUCTIONS_FILE, ...sorted].some((c) => isKitReadRuled(e, parsed, c)))
      return kitNotSaved("the type", "a rule names one of its files");
    let g = await raceWithDeadline(
      webfetchReadFile(
        {
          ...parsed,
          file: TYPE_INSTRUCTIONS_FILE,
        },
        combinedAbortSignal.signal,
        e.context.credentials,
        "artifact_type_instructions_read",
      ),
      combinedAbortSignal.signal,
      e.context,
      () => null,
    );
    if (g === null || g.err !== null) return kitNotSaved("the type", "SKILL.md could not be read");
    if (!p()) return kitNotSaved("the type", "the admission no longer stands after the read");
    let h = scrubArtifactEnvelopeTags(g.html);
    let y = await raceWithDeadline(
      prefetchArtifactTypeAndSystem(
        {
          type: {
            artifact: parsed,
            instructions: h,
            pages: sorted,
            stillConsented: p,
          },
          system: null,
        },
        e.context,
        combinedAbortSignal.signal,
      ),
      combinedAbortSignal.signal,
      e.context,
      () => null,
    );
    if (y === null || y.type === null) return kitNotSaved("the type", "its files did not land");
    if (!owned) recordForeignDesignSystemRead(parsed, "read_file", e.context);
    return {
      saved: savedFilesSummary(y.type),
      skillInResult: !instructionsFromText(h, true).clipped,
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
//@ chunk-965tj7mg.js:10469-10603 placement = formatFailureDetails (0.777)
function formatFailureDetails(e) {
  let i = e.length - 3;
  return (
    e
      .slice(0, 3)
      .map((s) => `${jsonStringify(sweepResultLineField(s.path, 60))} (${s.reason})`)
      .join(", ") + (i > 0 ? ` and ${i} more` : "")
  );
}
//@ chunk-965tj7mg.js:10603-12017 placement
/**
 * Artifact quickstart 起步包：在预算内读取类型与设计系统的 SKILL.md/参考页并保存到 scratchpad。
 */
async function runQuickstartStartKit(e) {
  let budgetMs = e.budgetMs ?? MAX_KIT_FILE_BYTES;
  let combinedAbortSignal = createCombinedAbortSignal(e.signal, {
    timeoutMs: budgetMs,
    refTimer: true,
  });
  let combinedAbortSignal_2 = createCombinedAbortSignal(e.signal, {
    timeoutMs: budgetMs + (e.graceMs ?? GUIDE_READ_GRACE_MS),
    refTimer: true,
  });
  try {
    let quickstartTypeFile = await readQuickstartTypeFile(e, "the design system", combinedAbortSignal.signal);
    if ("notSaved" in quickstartTypeFile) return quickstartTypeFile;
    let { parsed, owned, listing } = quickstartTypeFile;
    let filtered = listing.files.filter((file) => !isReservedKitPath(file.path));
    if (filtered.length === 0)
      return kitNotSaved("the design system", "it publishes no files of its own", undefined, "own_calls");
    let filtered_2 = filtered.filter((r) => isKitReadRuled(e, parsed, r.path));
    let kitSwitchOn = startKitSwitchOn();
    let g = (r) => (filtered_2.includes(r) ? "a permission rule" : typeFileSkipReason(r, kitSwitchOn));
    let all = filtered.every((r) => g(r) !== undefined || isBinaryTypeFile(r));
    let flattened = filtered.flatMap((r) => {
      let w = g(r) ?? (all && isBinaryTypeFile(r) ? "font file" : undefined);
      return w === undefined
        ? []
        : [
            {
              path: r.path,
              reason: w,
            },
          ];
    });
    if (flattened.length === filtered.length)
      return kitNotSaved(
        "the design system",
        "none of its files can land",
        `none of its files could be saved: ${formatFailureDetails(flattened)}`,
        filtered_2.length > 0 ? "own_calls" : "list",
      );
    let c = await raceWithDeadline(
      prefetchArtifactTypeAndSystem(
        {
          type: null,
          system: {
            artifact: parsed,
            listing: filtered.filter((r) => !filtered_2.includes(r)),
            stillConsented: () => canReadDesignSystemFiles(parsed, e.url, e.context, e.pipelineRan),
          },
        },
        e.context,
        combinedAbortSignal.signal,
      ),
      combinedAbortSignal_2.signal,
      e.context,
      () => null,
    );
    if (
      c === null ||
      c.system === null ||
      c.system.files.every((file) => filtered.some((w) => w.path === file.path && isBinaryTypeFile(w)))
    )
      return kitNotSaved("the design system", "no file of it landed", "none of its files could be saved");
    if (!owned) recordForeignDesignSystemRead(parsed, "read_file", e.context);
    let b = savedFilesSummary(c.system);
    return {
      ...b,
      skipped: b.skipped.concat(
        filtered_2.map((r) => ({
          path: r.path,
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
function validateSavedKit(e, i) {
  let s = i === undefined ? null : parseArtifactUrl(i);
  return e !== undefined &&
    s !== null &&
    e.dir === scratchpadArtifactFilePath(s.slug) &&
    e.files.every(
      (file) => file.path.length <= MAX_KIT_PATH_LENGTH && KIT_RELATIVE_PATH_RE.test(file.path),
    ) &&
    e.skipped.length <= MAX_LISTED_FILES &&
    e.skipped.every((n) => n.path.length <= MAX_SKIP_TEXT_LENGTH && n.reason.length <= MAX_SKIP_TEXT_LENGTH)
    ? e
    : null;
}
//@ chunk-965tj7mg.js:12253-12666 placement
function parseStartKitResult(e, i, typeKey) {
  let n = startKitSchema().safeParse(e);
  if (!n.success) return null;
  let type = validateSavedKit(n.data.type, i);
  let l = validateSavedKit(n.data.system, n.data.system_url);
  return artifactOpeningPrefetchPrompt({
    turnOne: {
      kind: "create",
      typeUrl: i,
    },
    typeKey,
    files: {
      type,
      system: l,
    },
    ...(l !== null && {
      systemUrl: n.data.system_url,
    }),
    skillInResult: n.data.skill_in_result,
    capabilitiesSkill: n.data.capabilities_skill,
    repl: n.data.repl_tool !== false,
    canCheckWork: false,
    copyFrom: getLiveState().frozenCopyFrom === true,
  });
}
//@ chunk-965tj7mg.js:12666-12782 placement
function describeKitContents(e) {
  return e?.type !== undefined
    ? e.system !== undefined
      ? "both"
      : "type_only"
    : e?.system !== undefined
      ? "system_only"
      : "none";
}
