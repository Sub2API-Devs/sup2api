/**
 * services/plugins/pluginPublish.ts
 *
 * 2.1.316 新增：插件发布
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-kd2hyn36.js (25)
 * attribution: placement 25
 */
import { join, dirname, posix, resolve } from "path";
import { mkdir, writeFile, realpath } from "fs/promises";
import { __export } from "../../../runtime/bun-runtime.js";
import {
  publishRequestHash,
  listAccountMarketplaces,
  uploadOrReplace,
  waitForContentScan,
  withArchive,
  organizationAvailability,
  normalizePublishInput,
  hashPublishInput,
  hashCanonical,
  hasPublishDenyRule,
  publishFlagState,
  checkPublishReadRules,
  ensureOrganization,
  explainUnreadable,
} from "./publish/publishUpload.js";
import { PLUGIN_MANIFEST_PATH } from "../../utils/plugins/commandSource.js";
import { isDirectoryOrFalse } from "../../utils/plugins/safeFileRead.js";
import { identityPath_2 } from "../../skills/loadSkillsDir.js";
import { lazyDeviceTreeHost } from "../../plugins/functionHooks/devModsWatch.js";
import {
  resolvePublishFolder,
  preparePublishFolder,
  openPublishFile,
  readAllListed,
  stoppedOrResult,
  fileChangedOutcome,
} from "./publish/publishSnapshot.js";
import {
  refusalResult,
  MAX_PUBLISH_BYTES,
  publishResultLines,
} from "../../tools/PublishPluginTool/constants.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { fetchMySubmissions, setPluginInstallPreference } from "./publish/publishStatus.js";
import { unreadableOnError } from "./publish/validationCopy.js";
import { errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { createInformationalSystemMessage } from "../../utils/messages.js";
import { getCwd } from "../../utils/cwd.js";
import { sessionScopedMapsSlot } from "../../utils/sessionScopedMaps.js";
import { getAuthUnavailableReason } from "../../utils/auth/authUnavailableReason.js";
import { logFeatureBadAsync, logFeatureOkAsync } from "../analytics/featureTelemetry.js";

//@ chunk-kd2hyn36.js:14402-14411 placement
/**
 * 模块命名空间对象占位（导出集合）。
 */
var pluginPublishNamespace = {};
//@ chunk-kd2hyn36.js:14411-14444 placement
__export(pluginPublishNamespace, {
  default: () => pluginPublishNamespace,
  run: () => runPluginPublish,
});
//@ chunk-kd2hyn36.js:14444-14489 placement
/**
 * 判断发布请求是否与给定摘要匹配。
 */
var isPlanForDigest = (candidate, approval) =>
  "plan" in candidate && publishRequestHash(candidate) === approval.digest;
//@ chunk-kd2hyn36.js:14581-14739 placement
async function writeDraftManifestFs(publishFolder) {
  let manifestPath = join(publishFolder.root, PLUGIN_MANIFEST_PATH);
  await mkdir(dirname(manifestPath), {
    recursive: true,
  }).catch(() => {
    return;
  });
  return (await isDirectoryOrFalse(dirname(manifestPath)))
    ? writeFile(manifestPath, publishFolder.draft, {
        flag: "wx",
      }).then(
        () => true,
        () => false,
      )
    : false;
}
//@ chunk-kd2hyn36.js:14768-14778 placement
/**
 * 发布草稿文件的权限位 0o644（420）：文件由发布流程写出，只允许属主写。
 */
var FILE_MODE_READONLY = 420;
//@ chunk-kd2hyn36.js:14778-14937 placement
async function writeDraftManifestAnchored(treeAnchor, publishFolder) {
  let manifestPath = identityPath_2(PLUGIN_MANIFEST_PATH);
  try {
    await treeAnchor.mkdirp(posix.dirname(manifestPath));
    await treeAnchor.create(manifestPath, Buffer.from(publishFolder.draft), FILE_MODE_READONLY);
    return true;
  } catch {
    return false;
  } finally {
    await treeAnchor.close();
  }
}
//@ chunk-kd2hyn36.js:14937-15153 placement
async function writeDraftManifest(publishFolder) {
  let { openTreeAnchor } = await import("../../utils/fsAnchor/treeAnchor.js");
  let treeAnchor = await openTreeAnchor(await lazyDeviceTreeHost(), {
    gitRoot: publishFolder.root,
    realRoot: publishFolder.root,
  }).catch(() => {
    return;
  });
  if (treeAnchor === undefined) return false;
  return !("unavailable" in treeAnchor)
    ? writeDraftManifestAnchored(treeAnchor, publishFolder)
    : writeDraftManifestFs(publishFolder);
}
//@ chunk-kd2hyn36.js:15153-15450 placement
async function preparePublishPlan(input, approval) {
  let publishFolder = await resolvePublishFolder(input.folder, input.description);
  let candidate = await preparePublishFolder(input, approval.organization);
  let needsDraft = isPlanForDigest(candidate, approval) && publishFolder.kind === "needs-manifest";
  if (needsDraft && !approval.drafts) return refusalResult("changed");
  let draftWritten = needsDraft && (await writeDraftManifest(publishFolder));
  if (needsDraft && !draftWritten) return refusalResult("unwritten");
  let finalFolder = draftWritten ? await preparePublishFolder(input, approval.organization) : candidate;
  return isPlanForDigest(finalFolder, approval) || "kind" in finalFolder
    ? finalFolder
    : refusalResult("changed");
}
//@ chunk-kd2hyn36.js:15450-15533 placement
/**
 * 读取文件并校验内容哈希。
 */
async function readVerifiedFile(root, filePath, expectedHash) {
  let publishFile = await openPublishFile(root, filePath);
  return publishFile !== undefined && computeContentHash(publishFile) === expectedHash
    ? publishFile
    : undefined;
}
//@ chunk-kd2hyn36.js:15533-15545 placement
var ZIP_ATTR_MASK = 65535;
//@ chunk-kd2hyn36.js:15545-15554 placement
/**
 * 外部属性的移位（16）。
 */
var ZIP_ATTR_SHIFT = 16;
//@ chunk-kd2hyn36.js:15554-15562 placement
var ZIP_OS_ID = 3;
//@ chunk-kd2hyn36.js:15562-15597 placement
/**
 * 把文件模式转成 zip 外部属性。
 */
var zipAttributes = (mode) => ({
  os: ZIP_OS_ID,
  attrs: (mode & ZIP_ATTR_MASK) << ZIP_ATTR_SHIFT,
});
//@ chunk-kd2hyn36.js:15597-15672 placement
/**
 * 生成 zip 条目键值对。
 */
function zipEntryPair(indexFile, content) {
  return indexFile !== undefined && content !== undefined
    ? [[indexFile.path, [content, zipAttributes(indexFile.mode)]]]
    : [];
}
//@ chunk-kd2hyn36.js:15672-15681 placement
/**
 * zip 压缩级别（6）。
 */
var ZIP_COMPRESSION_LEVEL = 6;
//@ chunk-kd2hyn36.js:15681-15710 placement
/**
 * zip 条目的固定修改时间（避免时间戳差异）。
 */
var ZIP_FIXED_MTIME = "1980-01-01T00:00:00";
//@ chunk-kd2hyn36.js:15710-15914 placement
async function buildPublishArchive(plan) {
  let { zipSync } = await import("../../../vendor/fflate/esm/index.mjs");
  let allListed = await readAllListed(
    plan.listing.files,
    (file) => readVerifiedFile(plan.root, file, plan.hashes[file.path]),
    zipEntryPair,
  );
  return "missed" in allListed
    ? allListed
    : zipSync(Object.fromEntries(allListed), {
        level: ZIP_COMPRESSION_LEVEL,
        mtime: ZIP_FIXED_MTIME,
      });
}
//@ chunk-kd2hyn36.js:15914-16152 placement
async function submitPublishArchive(request) {
  let mySubmissions = await fetchMySubmissions(request);
  if (!Array.isArray(mySubmissions)) return stoppedOrResult(request, mySubmissions, "nothing");
  let marketplaces = await listAccountMarketplaces(request);
  if (typeof marketplaces !== "string") return stoppedOrResult(request, marketplaces, "nothing");
  let upload = await uploadOrReplace(marketplaces, request);
  return "kind" in upload
    ? stoppedOrResult(request, upload, "uploading")
    : setPluginInstallPreference(request, await waitForContentScan(request, upload), mySubmissions);
}
//@ chunk-kd2hyn36.js:16152-16334 placement
async function uploadPublishArchive(plan, approval) {
  let archive = await unreadableOnError(buildPublishArchive(plan));
  if ("kind" in archive) return archive;
  if ("missed" in archive) return fileChangedOutcome(archive);
  return archive.length > MAX_PUBLISH_BYTES
    ? refusalResult("too-large")
    : submitPublishArchive(withArchive(archive, plan, approval)).catch((error) =>
        refusalResult("failed", [errorMessage(error)]),
      );
}
//@ chunk-kd2hyn36.js:16334-16459 placement
async function runPublishPlan(input, approval, signal) {
  let publishPlan = await preparePublishPlan(input, approval);
  return "kind" in publishPlan
    ? publishPlan
    : uploadPublishArchive(publishPlan.plan, {
        organization: approval.organization,
        mode: input.mode,
        signal,
      });
}
//@ chunk-kd2hyn36.js:16459-16680 placement
async function publishWithOrganization(input, context) {
  let { refusal, organization, shown } = context;
  if (refusal !== undefined) return refusalResult(refusal);
  if (organization === undefined) return refusalResult(organizationAvailability());
  return shown !== undefined
    ? runPublishPlan(
        normalizePublishInput(input),
        {
          digest: shown,
          drafts: context.drafts,
          organization,
        },
        context.signal,
      )
    : refusalResult("nobody-to-ask");
}
//@ chunk-kd2hyn36.js:16680-16848 placement
function questionChangedRefusal(previous, next) {
  let questionChanged = next.question !== undefined && hashPublishInput(next.question) !== previous?.question;
  let linesChanged = next.shown !== undefined && hashCanonical(next.shown) !== previous?.lines;
  return previous !== undefined && (questionChanged || linesChanged) ? "other-question" : undefined;
}
//@ chunk-kd2hyn36.js:16848-17042 placement
function showPublishStoppedMessage(result, ui) {
  if (!(result.kind === "refused" && result.refusal.kind === "stopped")) return;
  logForDebugging(`plugin publish: stopped: ${result.refusal.details.join(" ")}`);
  ui.appendSystemMessage?.(
    createInformationalSystemMessage(
      publishResultLines(result).join(`
`),
      "warning",
    ),
  );
}
//@ chunk-kd2hyn36.js:17114-17229 placement
async function publishWriteDenied(input, checkRules, ui) {
  let absPath = resolve(getCwd(), input.path);
  return checkRules && hasPublishDenyRule([absPath, await realpath(absPath).catch(() => absPath)], ui)
    ? "write-denied"
    : undefined;
}
//@ chunk-kd2hyn36.js:17229-17659 placement
/**
 * 插件发布入口：取出该工具调用之前展示给用户的摘要，依次检查开关、认证、问题是否变化、读规则与写拒绝规则，确定组织后执行发布；被停止时向会话追加提示，并记录 plugin_publish 特性状态。
 */
async function runPluginPublish(input, call, ui) {
  let approvals = sessionScopedMapsSlot.of(ui.session);
  let previousApproval = approvals.get(call.toolUseId ?? "");
  let shown = previousApproval?.digest;
  approvals.delete(call.toolUseId ?? "");
  let draftsAllowed = previousApproval?.drafts === true;
  let refusal =
    publishFlagState(input, ui) ??
    getAuthUnavailableReason() ??
    questionChangedRefusal(previousApproval, input) ??
    (await checkPublishReadRules(input, ui))?.refusal.kind ??
    (await publishWriteDenied(input, draftsAllowed, ui));
  let organization = await ensureOrganization(refusal);
  let result = await publishWithOrganization(input, {
    shown,
    drafts: draftsAllowed,
    organization,
    refusal,
    signal: call.signal,
  });
  let finalResult = result.kind === "refused" ? explainUnreadable(result, ui) : result;
  showPublishStoppedMessage(finalResult, ui);
  await (finalResult.kind === "refused"
    ? logFeatureBadAsync("plugin_publish", finalResult.refusal.kind)
    : logFeatureOkAsync("plugin_publish"));
  return finalResult;
}
export { pluginPublishNamespace, runPluginPublish };
