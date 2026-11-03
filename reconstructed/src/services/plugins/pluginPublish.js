/**
 * services/plugins/pluginPublish.ts
 *
 * 2.1.316 新增：插件发布
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wm1cd8qt.js (25)
 * attribution: placement 25
 */
import { join, dirname, posix, resolve } from "path";
import { mkdir, writeFile, realpath } from "fs/promises";
import { Ar } from "../../../runtime/bun-runtime.js";
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

//@ chunk-wm1cd8qt.js:13254-13263 placement
/**
 * 模块命名空间对象占位（导出集合）。
 */
var pluginPublishNamespace = {};
//@ chunk-wm1cd8qt.js:13263-13296 placement
Ar(pluginPublishNamespace, {
  default: () => pluginPublishNamespace,
  run: () => runPluginPublish,
});
//@ chunk-wm1cd8qt.js:13296-13341 placement
/**
 * 判断发布请求是否与给定摘要匹配。
 */
var isPlanForDigest = (e, r) => "plan" in e && publishRequestHash(e) === r.digest;
//@ chunk-wm1cd8qt.js:13433-13591 placement
async function writeDraftManifestFs(e) {
  let r = join(e.root, PLUGIN_MANIFEST_PATH);
  await mkdir(dirname(r), {
    recursive: true,
  }).catch(() => {
    return;
  });
  return (await isDirectoryOrFalse(dirname(r)))
    ? writeFile(r, e.draft, {
        flag: "wx",
      }).then(
        () => true,
        () => false,
      )
    : false;
}
//@ chunk-wm1cd8qt.js:13620-13630 placement
/**
 * 发布文件的只读权限（0444）。
 */
var FILE_MODE_READONLY = 420;
//@ chunk-wm1cd8qt.js:13630-13789 placement
async function writeDraftManifestAnchored(e, r) {
  let o = identityPath_2(PLUGIN_MANIFEST_PATH);
  try {
    await e.mkdirp(posix.dirname(o));
    await e.create(o, Buffer.from(r.draft), FILE_MODE_READONLY);
    return true;
  } catch {
    return false;
  } finally {
    await e.close();
  }
}
//@ chunk-wm1cd8qt.js:13789-14005 placement
async function writeDraftManifest(publishFolder) {
  let { openTreeAnchor } = await import("./chunk-ejkghqj9.js");
  let o = await openTreeAnchor(await lazyDeviceTreeHost(), {
    gitRoot: publishFolder.root,
    realRoot: publishFolder.root,
  }).catch(() => {
    return;
  });
  if (o === undefined) return false;
  return !("unavailable" in o)
    ? writeDraftManifestAnchored(o, publishFolder)
    : writeDraftManifestFs(publishFolder);
}
//@ chunk-wm1cd8qt.js:14005-14302 placement
async function preparePublishPlan(e, r) {
  let publishFolder = await resolvePublishFolder(e.folder, e.description);
  let publishFolder_2 = await preparePublishFolder(e, r.organization);
  let i = isPlanForDigest(publishFolder_2, r) && publishFolder.kind === "needs-manifest";
  if (i && !r.drafts) return refusalResult("changed");
  let p = i && (await writeDraftManifest(publishFolder));
  if (i && !p) return refusalResult("unwritten");
  let n = p ? await preparePublishFolder(e, r.organization) : publishFolder_2;
  return isPlanForDigest(n, r) || "kind" in n ? n : refusalResult("changed");
}
//@ chunk-wm1cd8qt.js:14302-14385 placement
/**
 * 读取文件并校验内容哈希。
 */
async function readVerifiedFile(root, r, o) {
  let publishFile = await openPublishFile(root, r);
  return publishFile !== undefined && computeContentHash(publishFile) === o ? publishFile : undefined;
}
//@ chunk-wm1cd8qt.js:14385-14397 placement
var ZIP_ATTR_MASK = 65535;
//@ chunk-wm1cd8qt.js:14397-14406 placement
/**
 * 外部属性的移位（16）。
 */
var ZIP_ATTR_SHIFT = 16;
//@ chunk-wm1cd8qt.js:14406-14414 placement
var ZIP_OS_ID = 3;
//@ chunk-wm1cd8qt.js:14414-14449 placement
/**
 * 把文件模式转成 zip 外部属性。
 */
var zipAttributes = (mode) => ({
  os: ZIP_OS_ID,
  attrs: (mode & ZIP_ATTR_MASK) << ZIP_ATTR_SHIFT,
});
//@ chunk-wm1cd8qt.js:14449-14524 placement
/**
 * 生成 zip 条目键值对。
 */
function zipEntryPair(e, r) {
  return e !== undefined && r !== undefined ? [[e.path, [r, zipAttributes(e.mode)]]] : [];
}
//@ chunk-wm1cd8qt.js:14524-14533 placement
/**
 * zip 压缩级别（6）。
 */
var ZIP_COMPRESSION_LEVEL = 6;
//@ chunk-wm1cd8qt.js:14533-14562 placement
/**
 * zip 条目的固定修改时间（避免时间戳差异）。
 */
var ZIP_FIXED_MTIME = "1980-01-01T00:00:00";
//@ chunk-wm1cd8qt.js:14562-14766 placement
async function buildPublishArchive(e) {
  let { zipSync } = await import("./chunk-9t1jcaah.js");
  let allListed = await readAllListed(
    e.listing.files,
    (i) => readVerifiedFile(e.root, i, e.hashes[i.path]),
    zipEntryPair,
  );
  return "missed" in allListed
    ? allListed
    : zipSync(Object.fromEntries(allListed), {
        level: ZIP_COMPRESSION_LEVEL,
        mtime: ZIP_FIXED_MTIME,
      });
}
//@ chunk-wm1cd8qt.js:14766-15004 placement
async function submitPublishArchive(e) {
  let mySubmissions = await fetchMySubmissions(e);
  if (!Array.isArray(mySubmissions)) return stoppedOrResult(e, mySubmissions, "nothing");
  let o = await listAccountMarketplaces(e);
  if (typeof o !== "string") return stoppedOrResult(e, o, "nothing");
  let s = await uploadOrReplace(o, e);
  return "kind" in s
    ? stoppedOrResult(e, s, "uploading")
    : setPluginInstallPreference(e, await waitForContentScan(e, s), mySubmissions);
}
//@ chunk-wm1cd8qt.js:15004-15186 placement
async function uploadPublishArchive(plan, r) {
  let archive = await unreadableOnError(buildPublishArchive(plan));
  if ("kind" in archive) return archive;
  if ("missed" in archive) return fileChangedOutcome(archive);
  return archive.length > MAX_PUBLISH_BYTES
    ? refusalResult("too-large")
    : submitPublishArchive(withArchive(archive, plan, r)).catch((error) =>
        refusalResult("failed", [errorMessage(error)]),
      );
}
//@ chunk-wm1cd8qt.js:15186-15311 placement
async function runPublishPlan(e, r, signal) {
  let publishPlan = await preparePublishPlan(e, r);
  return "kind" in publishPlan
    ? publishPlan
    : uploadPublishArchive(publishPlan.plan, {
        organization: r.organization,
        mode: e.mode,
        signal,
      });
}
//@ chunk-wm1cd8qt.js:15311-15532 placement
async function publishWithOrganization(e, r) {
  let { refusal, organization, shown } = r;
  if (refusal !== undefined) return refusalResult(refusal);
  if (organization === undefined) return refusalResult(organizationAvailability());
  return shown !== undefined
    ? runPublishPlan(
        normalizePublishInput(e),
        {
          digest: shown,
          drafts: r.drafts,
          organization,
        },
        r.signal,
      )
    : refusalResult("nobody-to-ask");
}
//@ chunk-wm1cd8qt.js:15532-15700 placement
function questionChangedRefusal(e, r) {
  let o = r.question !== undefined && hashPublishInput(r.question) !== e?.question;
  let s = r.shown !== undefined && hashCanonical(r.shown) !== e?.lines;
  return e !== undefined && (o || s) ? "other-question" : undefined;
}
//@ chunk-wm1cd8qt.js:15700-15894 placement
function showPublishStoppedMessage(e, r) {
  if (!(e.kind === "refused" && e.refusal.kind === "stopped")) return;
  logForDebugging(`plugin publish: stopped: ${e.refusal.details.join(" ")}`);
  r.appendSystemMessage?.(
    createInformationalSystemMessage(
      publishResultLines(e).join(`
`),
      "warning",
    ),
  );
}
//@ chunk-wm1cd8qt.js:15966-16081 placement
async function publishWriteDenied(e, r, o) {
  let s = resolve(getCwd(), e.path);
  return r && hasPublishDenyRule([s, await realpath(s).catch(() => s)], o) ? "write-denied" : undefined;
}
//@ chunk-wm1cd8qt.js:16081-16511 placement
/**
 * 插件发布入口：取出该工具调用之前展示给用户的摘要，依次检查开关、认证、问题是否变化、读规则与写拒绝规则，确定组织后执行发布；被停止时向会话追加提示，并记录 plugin_publish 特性状态。
 */
async function runPluginPublish(e, r, o) {
  let s = sessionScopedMapsSlot.of(o.session);
  let i = s.get(r.toolUseId ?? "");
  let shown = i?.digest;
  s.delete(r.toolUseId ?? "");
  let p = i?.drafts === true;
  let n =
    publishFlagState(e, o) ??
    getAuthUnavailableReason() ??
    questionChangedRefusal(i, e) ??
    (await checkPublishReadRules(e, o))?.refusal.kind ??
    (await publishWriteDenied(e, p, o));
  let organization = await ensureOrganization(n);
  let m = await publishWithOrganization(e, {
    shown,
    drafts: p,
    organization,
    refusal: n,
    signal: r.signal,
  });
  let f = m.kind === "refused" ? explainUnreadable(m, o) : m;
  showPublishStoppedMessage(f, o);
  await (f.kind === "refused"
    ? logFeatureBadAsync("plugin_publish", f.refusal.kind)
    : logFeatureOkAsync("plugin_publish"));
  return f;
}
