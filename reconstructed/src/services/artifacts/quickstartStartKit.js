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
import { listArtifactFiles, iBt } from "./publishedFiles.js";
import { parseArtifactUrl } from "../../tools/ArtifactTool/constants.js";
import { getAttestationKind } from "./attestation.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";
import { TYPE_INSTRUCTIONS_FILE, instructionsFromText } from "./artifactTypes.js";
import {
  Dht,
  prefetchArtifactTypeAndSystem,
  typeFileSkipReason,
  isBinaryTypeFile,
  artifactOpeningPrefetchPrompt,
} from "./artifactOpeningPrefetch.js";
import { gF } from "./webfetchRead.js";
import { scrubArtifactEnvelopeTags, sweepResultLineField } from "../../tools/ArtifactTool/artifactUrls.js";
import { errorMessage } from "../../utils/errors.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { C9 } from "../../tools/ArtifactTool/readFilePaths.js";
import { SWn } from "../../tools/ArtifactTool/startKitSchemas.js";
import { getLiveState } from "../liveReplica/liveReplica.js";

/**
 * 快速开始起步套件的常量：文件大小上限、参考文档路径与通用相对路径正则、路径/原因长度上限。
 */
//@ chunk-965tj7mg.js:7094-7267 placement
var MAX_KIT_FILE_BYTES = 8000,
  GUIDE_READ_GRACE_MS = 2500,
  REFERENCE_PATH_RE = /^artifact-type\/reference\/[A-Za-z0-9][A-Za-z0-9._-]{0,63}\.md$/,
  KIT_RELATIVE_PATH_RE = /^[A-Za-z0-9_@][A-Za-z0-9._@+-]*(?:\/[A-Za-z0-9_@][A-Za-z0-9._@+-]*)*$/,
  MAX_KIT_PATH_LENGTH = 160,
  MAX_SKIP_TEXT_LENGTH = 1024;
//@ chunk-965tj7mg.js:7267-7332 placement
function rt(e) {
  return startKitSwitchOn() && findToolByName(e.options.tools ?? [], BASH_TOOL_NAME) !== void 0;
}
//@ chunk-965tj7mg.js:7332-7379 placement
function at(e) {
  return artifactReplToolInPool(e.options.tools ?? []);
}
//@ chunk-965tj7mg.js:7379-7437 placement
function lt(e) {
  return findToolByName(e.options.tools ?? [], SKILL) !== void 0;
}
//@ chunk-965tj7mg.js:7437-7501 placement
function A(e) {
  return { dir: e.dir, files: e.files, skipped: e.skipped };
}
//@ chunk-965tj7mg.js:7501-7621 placement
function kitNotSaved(e, i, s = i, n = "list") {
  return (
    logForDebugging(`[quickstartStartKit] ${e} not saved: ${i}`),
    { notSaved: s, ...(n !== "list" && { next: n }) }
  );
}
//@ chunk-965tj7mg.js:7621-8246 placement
function notSavedReason(e) {
  return e === "other_org"
    ? ["it is in another of the user's organizations, which this login cannot read", "say_so"]
    : e === "not_a_link"
      ? ["its link is not an Artifact URL of this session's claude.ai", "own_calls"]
      : e === "not_served"
        ? ["this session does not serve published files", "own_calls"]
        : e === "rule"
          ? ["a permission rule covers reading it", "own_calls"]
          : e === "notice_pending"
            ? ["new comments are waiting on it, so a read of it asks first", "list"]
            : e === "probe_failed"
              ? ["its sharing could not be checked", "list"]
              : e.startsWith("probe_")
                ? ["its sharing could not be checked in time", "list"]
                : ["reading it would ask first", "list"];
}
//@ chunk-965tj7mg.js:8246-8920 placement
async function readQuickstartTypeFile(e, i, s) {
  let { url: url, context: context, pipelineRan: pipelineRan } = e,
    o = await checkDesignSystemReadable(url, s, context, !1, pipelineRan, "quickstart_start_kit");
  if (!o.ok) return kitNotSaved(i, o.code, ...notSavedReason(o.code));
  if (!o.filesOk)
    return o.filesRuled
      ? kitNotSaved(i, "rule", "a permission rule covers reading its files", "own_calls")
      : kitNotSaved(i, "a read would ask", "reading its files would ask first");
  let S = getToolPermissionContext(context);
  if (
    hasDesignSystemReadRule(o.parsed, url, "list_files", context, { pipelineRan: pipelineRan }) ||
    ["deny", "ask"].some((p) => artifactReadRule(S, o.parsed, url, p) !== null)
  )
    return kitNotSaved(i, "a rule covers reading it", void 0, "own_calls");
  let m = await raceWithDeadline(listArtifactFiles(o.parsed, s, context.credentials), s, context, () => null);
  if (m?.kind !== "ok") return kitNotSaved(i, "its files could not be listed", void 0, "own_calls");
  return { parsed: o.parsed, owned: o.owned, listing: m };
}
//@ chunk-965tj7mg.js:8920-9024 placement
function isKitReadRuled(e, i, s) {
  return hasDesignSystemReadRule(i, e.url, "read_file", e.context, {
    fields: { path: s },
    pipelineRan: e.pipelineRan,
  });
}
//@ chunk-965tj7mg.js:9024-9090 placement
async function dt(e) {
  let i = await readFirstPartyTypeSkill(e);
  return "notSaved" in i ? null : i;
}
//@ chunk-965tj7mg.js:9090-10391 placement
async function readFirstPartyTypeSkill(e) {
  let s = parseArtifactUrl(e.url),
    n = () => s !== null && getAttestationKind(s.slug) === "first_party_type";
  if (!n()) return kitNotSaved("the type", "not listed first-party");
  let a = createCombinedAbortSignal(e.signal, { timeoutMs: e.budgetMs ?? MAX_KIT_FILE_BYTES, refTimer: !0 });
  try {
    let l = await readQuickstartTypeFile(e, "the type", a.signal);
    if ("notSaved" in l) return l;
    let { parsed: parsed, owned: owned, listing: listing } = l,
      p = () => n() && canReadDesignSystemFiles(parsed, e.url, e.context, e.pipelineRan),
      mapped = listing.files.map((file) => file.path);
    if (!mapped.includes(TYPE_INSTRUCTIONS_FILE)) return kitNotSaved("the type", "it lists no SKILL.md");
    let sorted = mapped.filter((c) => REFERENCE_PATH_RE.test(c)).sort();
    if (sorted.length > Dht) return kitNotSaved("the type", `more than ${Dht} reference pages`);
    if ([TYPE_INSTRUCTIONS_FILE, ...sorted].some((c) => isKitReadRuled(e, parsed, c)))
      return kitNotSaved("the type", "a rule names one of its files");
    let g = await raceWithDeadline(
      gF(
        { ...parsed, file: TYPE_INSTRUCTIONS_FILE },
        a.signal,
        e.context.credentials,
        "artifact_type_instructions_read",
      ),
      a.signal,
      e.context,
      () => null,
    );
    if (g === null || g.err !== null) return kitNotSaved("the type", "SKILL.md could not be read");
    if (!p()) return kitNotSaved("the type", "the admission no longer stands after the read");
    let h = scrubArtifactEnvelopeTags(g.html),
      y = await raceWithDeadline(
        prefetchArtifactTypeAndSystem(
          { type: { artifact: parsed, instructions: h, pages: sorted, stillConsented: p }, system: null },
          e.context,
          a.signal,
        ),
        a.signal,
        e.context,
        () => null,
      );
    if (y === null || y.type === null) return kitNotSaved("the type", "its files did not land");
    if (!owned) recordForeignDesignSystemRead(parsed, "read_file", e.context);
    return { saved: A(y.type), skillInResult: !instructionsFromText(h, !0).clipped };
  } catch (error) {
    return kitNotSaved("the type", `failed: ${errorMessage(error)}`);
  } finally {
    a.cleanup();
  }
}
//@ chunk-965tj7mg.js:10391-10469 placement
function C(e) {
  return e === "index.html" || e === TYPE_INSTRUCTIONS_FILE || e.startsWith("artifact-type/");
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
/**
 * Artifact quickstart 起步包：在预算内读取类型与设计系统的 SKILL.md/参考页并保存到 scratchpad。
 */
//@ chunk-965tj7mg.js:10603-12017 placement
async function runQuickstartStartKit(e) {
  let s = e.budgetMs ?? MAX_KIT_FILE_BYTES,
    n = createCombinedAbortSignal(e.signal, { timeoutMs: s, refTimer: !0 }),
    a = createCombinedAbortSignal(e.signal, {
      timeoutMs: s + (e.graceMs ?? GUIDE_READ_GRACE_MS),
      refTimer: !0,
    });
  try {
    let l = await readQuickstartTypeFile(e, "the design system", n.signal);
    if ("notSaved" in l) return l;
    let { parsed: parsed, owned: owned, listing: listing } = l,
      filtered = listing.files.filter((file) => !C(file.path));
    if (filtered.length === 0)
      return kitNotSaved("the design system", "it publishes no files of its own", void 0, "own_calls");
    let filtered_2 = filtered.filter((r) => isKitReadRuled(e, parsed, r.path)),
      k = startKitSwitchOn(),
      g = (r) => (filtered_2.includes(r) ? "a permission rule" : typeFileSkipReason(r, k)),
      all = filtered.every((r) => g(r) !== void 0 || isBinaryTypeFile(r)),
      flattened = filtered.flatMap((r) => {
        let w = g(r) ?? (all && isBinaryTypeFile(r) ? "font file" : void 0);
        return w === void 0 ? [] : [{ path: r.path, reason: w }];
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
        n.signal,
      ),
      a.signal,
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
    let b = A(c.system);
    return {
      ...b,
      skipped: b.skipped.concat(filtered_2.map((r) => ({ path: r.path, reason: "a permission rule" }))),
    };
  } catch (error) {
    return kitNotSaved("the design system", `failed: ${errorMessage(error)}`, "saving them failed");
  } finally {
    (n.cleanup(), a.cleanup());
  }
}
//@ chunk-965tj7mg.js:12017-12253 placement
function validateSavedKit(e, i) {
  let s = i === void 0 ? null : parseArtifactUrl(i);
  return e !== void 0 &&
    s !== null &&
    e.dir === C9(s.slug) &&
    e.files.every(
      (file) => file.path.length <= MAX_KIT_PATH_LENGTH && KIT_RELATIVE_PATH_RE.test(file.path),
    ) &&
    e.skipped.length <= iBt &&
    e.skipped.every((n) => n.path.length <= MAX_SKIP_TEXT_LENGTH && n.reason.length <= MAX_SKIP_TEXT_LENGTH)
    ? e
    : null;
}
//@ chunk-965tj7mg.js:12253-12666 placement
function parseStartKitResult(e, i, s) {
  let safeParse = SWn().safeParse(e);
  if (!safeParse.success) return null;
  let a = validateSavedKit(safeParse.data.type, i),
    l = validateSavedKit(safeParse.data.system, safeParse.data.system_url);
  return artifactOpeningPrefetchPrompt({
    turnOne: { kind: "create", typeUrl: i },
    typeKey: s,
    files: { type: a, system: l },
    ...(l !== null && { systemUrl: safeParse.data.system_url }),
    skillInResult: safeParse.data.skill_in_result,
    capabilitiesSkill: safeParse.data.capabilities_skill,
    repl: safeParse.data.repl_tool !== !1,
    canCheckWork: !1,
    copyFrom: getLiveState().frozenCopyFrom === !0,
  });
}
//@ chunk-965tj7mg.js:12666-12782 placement
function describeKitContents(e) {
  return e?.type !== void 0
    ? e.system !== void 0
      ? "both"
      : "type_only"
    : e?.system !== void 0
      ? "system_only"
      : "none";
}
