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
import { FF } from "../../utils/plugins/safeFileRead.js";
import { _P } from "../../skills/loadSkillsDir.js";
import { _9s } from "../../plugins/functionHooks/devModsWatch.js";
import {
  resolvePublishFolder,
  preparePublishFolder,
  openPublishFile,
  readAllListed,
  stoppedOrResult,
  fileChangedOutcome,
} from "./publish/publishSnapshot.js";
import { Qh, kOr, publishResultLines } from "../../tools/PublishPluginTool/constants.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { fetchMySubmissions, setPluginInstallPreference } from "./publish/publishStatus.js";
import { unreadableOnError } from "./publish/validationCopy.js";
import { errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { createInformationalSystemMessage } from "../../utils/messages.js";
import { getCwd } from "../../utils/cwd.js";
import { AWn } from "../../utils/sessionScopedMaps.js";
import { getAuthUnavailableReason } from "../../utils/auth/authUnavailableReason.js";
import { logFeatureBadAsync, logFeatureOkAsync } from "../analytics/featureTelemetry.js";

//@ chunk-wm1cd8qt.js:13254-13263 placement
var u = {};
//@ chunk-wm1cd8qt.js:13263-13296 placement
Ar(u, { default: () => u, run: () => runPluginPublish });
//@ chunk-wm1cd8qt.js:13296-13341 placement
var c = (e, r) => "plan" in e && publishRequestHash(e) === r.digest;
//@ chunk-wm1cd8qt.js:13433-13591 placement
async function writeDraftManifestFs(e) {
  let r = join(e.root, PLUGIN_MANIFEST_PATH);
  return (
    await mkdir(dirname(r), { recursive: !0 }).catch(() => {
      return;
    }),
    (await FF(dirname(r)))
      ? writeFile(r, e.draft, { flag: "wx" }).then(
          () => !0,
          () => !1,
        )
      : !1
  );
}
//@ chunk-wm1cd8qt.js:13620-13630 placement
var K = 420;
//@ chunk-wm1cd8qt.js:13630-13789 placement
async function writeDraftManifestAnchored(e, r) {
  let o = _P(PLUGIN_MANIFEST_PATH);
  try {
    return (await e.mkdirp(posix.dirname(o)), await e.create(o, Buffer.from(r.draft), K), !0);
  } catch {
    return !1;
  } finally {
    await e.close();
  }
}
//@ chunk-wm1cd8qt.js:13789-14005 placement
async function writeDraftManifest(e) {
  let { openTreeAnchor: openTreeAnchor } = await import("./chunk-ejkghqj9.js"),
    o = await openTreeAnchor(await _9s(), { gitRoot: e.root, realRoot: e.root }).catch(() => {
      return;
    });
  if (o === void 0) return !1;
  return !("unavailable" in o) ? writeDraftManifestAnchored(o, e) : writeDraftManifestFs(e);
}
//@ chunk-wm1cd8qt.js:14005-14302 placement
async function preparePublishPlan(e, r) {
  let o = await resolvePublishFolder(e.folder, e.description),
    s = await preparePublishFolder(e, r.organization),
    i = c(s, r) && o.kind === "needs-manifest";
  if (i && !r.drafts) return Qh("changed");
  let p = i && (await writeDraftManifest(o));
  if (i && !p) return Qh("unwritten");
  let n = p ? await preparePublishFolder(e, r.organization) : s;
  return c(n, r) || "kind" in n ? n : Qh("changed");
}
//@ chunk-wm1cd8qt.js:14302-14385 placement
async function V(e, r, o) {
  let s = await openPublishFile(e, r);
  return s !== void 0 && computeContentHash(s) === o ? s : void 0;
}
//@ chunk-wm1cd8qt.js:14385-14397 placement
var X = 65535;
//@ chunk-wm1cd8qt.js:14397-14406 placement
var Y = 16;
//@ chunk-wm1cd8qt.js:14406-14414 placement
var G = 3;
//@ chunk-wm1cd8qt.js:14414-14449 placement
var J = (e) => ({ os: G, attrs: (e & X) << Y });
//@ chunk-wm1cd8qt.js:14449-14524 placement
function ee(e, r) {
  return e !== void 0 && r !== void 0 ? [[e.path, [r, J(e.mode)]]] : [];
}
//@ chunk-wm1cd8qt.js:14524-14533 placement
var re = 6;
//@ chunk-wm1cd8qt.js:14533-14562 placement
var oe = "1980-01-01T00:00:00";
//@ chunk-wm1cd8qt.js:14562-14766 placement
async function buildPublishArchive(e) {
  let { zipSync: zipSync } = await import("./chunk-9t1jcaah.js"),
    o = await readAllListed(e.listing.files, (i) => V(e.root, i, e.hashes[i.path]), ee);
  return "missed" in o ? o : zipSync(Object.fromEntries(o), { level: re, mtime: oe });
}
//@ chunk-wm1cd8qt.js:14766-15004 placement
async function submitPublishArchive(e) {
  let r = await fetchMySubmissions(e);
  if (!Array.isArray(r)) return stoppedOrResult(e, r, "nothing");
  let o = await listAccountMarketplaces(e);
  if (typeof o !== "string") return stoppedOrResult(e, o, "nothing");
  let s = await uploadOrReplace(o, e);
  return "kind" in s
    ? stoppedOrResult(e, s, "uploading")
    : setPluginInstallPreference(e, await waitForContentScan(e, s), r);
}
//@ chunk-wm1cd8qt.js:15004-15186 placement
async function uploadPublishArchive(e, r) {
  let o = await unreadableOnError(buildPublishArchive(e));
  if ("kind" in o) return o;
  if ("missed" in o) return fileChangedOutcome(o);
  return o.length > kOr
    ? Qh("too-large")
    : submitPublishArchive(withArchive(o, e, r)).catch((i) => Qh("failed", [errorMessage(i)]));
}
//@ chunk-wm1cd8qt.js:15186-15311 placement
async function runPublishPlan(e, r, o) {
  let s = await preparePublishPlan(e, r);
  return "kind" in s
    ? s
    : uploadPublishArchive(s.plan, { organization: r.organization, mode: e.mode, signal: o });
}
//@ chunk-wm1cd8qt.js:15311-15532 placement
async function publishWithOrganization(e, r) {
  let { refusal: refusal, organization: organization, shown: shown } = r;
  if (refusal !== void 0) return Qh(refusal);
  if (organization === void 0) return Qh(organizationAvailability());
  return shown !== void 0
    ? runPublishPlan(
        normalizePublishInput(e),
        { digest: shown, drafts: r.drafts, organization: organization },
        r.signal,
      )
    : Qh("nobody-to-ask");
}
//@ chunk-wm1cd8qt.js:15532-15700 placement
function questionChangedRefusal(e, r) {
  let o = r.question !== void 0 && hashPublishInput(r.question) !== e?.question,
    s = r.shown !== void 0 && hashCanonical(r.shown) !== e?.lines;
  return e !== void 0 && (o || s) ? "other-question" : void 0;
}
//@ chunk-wm1cd8qt.js:15700-15894 placement
function showPublishStoppedMessage(e, r) {
  if (!(e.kind === "refused" && e.refusal.kind === "stopped")) return;
  (logForDebugging(`plugin publish: stopped: ${e.refusal.details.join(" ")}`),
    r.appendSystemMessage?.(
      createInformationalSystemMessage(
        publishResultLines(e).join(`
`),
        "warning",
      ),
    ));
}
//@ chunk-wm1cd8qt.js:15966-16081 placement
async function publishWriteDenied(e, r, o) {
  let s = resolve(getCwd(), e.path);
  return r && hasPublishDenyRule([s, await realpath(s).catch(() => s)], o) ? "write-denied" : void 0;
}
/**
 * 插件发布入口：取出该工具调用之前展示给用户的摘要，依次检查开关、认证、问题是否变化、读规则与写拒绝规则，确定组织后执行发布；被停止时向会话追加提示，并记录 plugin_publish 特性状态。
 */
//@ chunk-wm1cd8qt.js:16081-16511 placement
async function runPluginPublish(e, r, o) {
  let of = AWn.of(o.session),
    i = of.get(r.toolUseId ?? ""),
    a = i?.digest;
  of.delete(r.toolUseId ?? "");
  let p = i?.drafts === !0,
    n =
      publishFlagState(e, o) ??
      getAuthUnavailableReason() ??
      questionChangedRefusal(i, e) ??
      (await checkPublishReadRules(e, o))?.refusal.kind ??
      (await publishWriteDenied(e, p, o)),
    l = await ensureOrganization(n),
    m = await publishWithOrganization(e, {
      shown: a,
      drafts: p,
      organization: l,
      refusal: n,
      signal: r.signal,
    }),
    f = m.kind === "refused" ? explainUnreadable(m, o) : m;
  return (
    showPublishStoppedMessage(f, o),
    await (f.kind === "refused"
      ? logFeatureBadAsync("plugin_publish", f.refusal.kind)
      : logFeatureOkAsync("plugin_publish")),
    f
  );
}
