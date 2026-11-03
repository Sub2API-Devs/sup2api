/**
 * utils/wifProfile.ts
 *
 * 2.1.316 新增：工作负载身份联邦（WIF）profile：ANTHROPIC_CONFIG_DIR 下的 profile 选择、凭据与账号信息、状态行、凭据存储的沙箱拒读路径
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-640x3zn9.js (44)
 * attribution: placement 44
 */
import { join, resolve, sep, isAbsolute, parse, relative, dirname, basename } from "path";
import { realpathSync, lstatSync, readFileSync } from "fs";
import { rp } from "../../vendor/@anthropic-ai/sdk/lib/credentials/types.mjs";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, isDiskless } from "../bootstrap/state.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, o } from "../../vendor/zod/v4/classic/schemas.js";
import { env } from "./env.js";
import { jsonParse } from "./slowOperations.js";
import { logForDebugging } from "./debug.js";
import { errorMessage, isFsInaccessible, isEISDIR, isFsInaccessibleCode } from "./errors.js";
import { uniq } from "./collections.js";
import { getFsImplementation } from "./fsOperations.js";
import { PathSpace } from "./resultError.js";
import { storageErrorCode } from "./storage/storageErrors.js";

//@ chunk-640x3zn9.js:6485-6608 placement
function isWIFUserOAuthDeadError(e) {
  return (
    e instanceof rp && e.statusCode === null && e.message.includes("has expired and no refresh is available")
  );
}
//@ chunk-640x3zn9.js:6608-6676 placement
var de = ["ANTHROPIC_FEDERATION_RULE_ID", "ANTHROPIC_ORGANIZATION_ID"];
//@ chunk-640x3zn9.js:6676-6895 placement
class WifProfileCache {
  precedenceSource = { filled: !1 };
  authType = { filled: !1 };
  profileBaseUrl = { filled: !1 };
  accountInfo = { filled: !1 };
  federationIdentity = { filled: !1 };
  profileStoreDenyPaths = { filled: !1 };
  settingsBearerRejected = !1;
  primedFiles = void 0;
}
//@ chunk-640x3zn9.js:6895-6918 placement
var g = new HostScoped(() => new WifProfileCache());
//@ chunk-640x3zn9.js:6918-7073 placement
function getWIFPrecedenceSource() {
  let of = g.of(getRootSession().host);
  if (of.precedenceSource.filled) return of.precedenceSource.value;
  let n = computeWIFPrecedenceSource();
  return ((of.precedenceSource = { filled: !0, value: n }), n);
}
//@ chunk-640x3zn9.js:7073-7353 placement
function computeWIFPrecedenceSource() {
  let e = resolveConfigDir(),
    n = G();
  if (n) {
    if (e === null) return null;
    let r = profileAuthType(e, n);
    return r === "oidc_federation" || r === "user_oauth" ? "profile-explicit" : null;
  }
  if (J()) return "env-quad";
  if (e !== null) {
    let r = profileAuthType(e, resolveImplicitProfileName(e));
    if (r === "oidc_federation" || r === "user_oauth") return "profile-implicit";
  }
  return null;
}
//@ chunk-640x3zn9.js:7353-7575 placement
function clearWIFPrecedenceCache() {
  let of = g.of(getRootSession().host);
  ((of.precedenceSource = { filled: !1 }),
    (of.authType = { filled: !1 }),
    (of.profileBaseUrl = { filled: !1 }),
    (of.federationIdentity = { filled: !1 }),
    (of.profileStoreDenyPaths = { filled: !1 }),
    (of.settingsBearerRejected = !1),
    clearWIFAccountInfoCache());
}
//@ chunk-640x3zn9.js:7575-7629 placement
function clearWIFAccountInfoCache() {
  g.of(getRootSession().host).accountInfo = { filled: !1 };
}
//@ chunk-640x3zn9.js:7629-7663 placement
function isWIFActive() {
  return getWIFPrecedenceSource() !== null;
}
//@ chunk-640x3zn9.js:7663-7795 placement
function getWIFAuthType() {
  let of = g.of(getRootSession().host);
  if (of.authType.filled) return of.authType.value;
  let n = computeWIFAuthType();
  return ((of.authType = { filled: !0, value: n }), n);
}
//@ chunk-640x3zn9.js:7795-8069 placement
function computeWIFAuthType() {
  let e = getWIFPrecedenceSource();
  if (e === null) return null;
  if (e === "env-quad") return "oidc_federation";
  let n = resolveConfigDir();
  if (n === null) return null;
  let r =
      e === "profile-explicit"
        ? (process.env.ANTHROPIC_PROFILE?.trim() ?? "default")
        : resolveImplicitProfileName(n),
    s = profileAuthType(n, r);
  return s === "oidc_federation" || s === "user_oauth" ? s : null;
}
//@ chunk-640x3zn9.js:8069-8139 placement
function wouldWIFProfileYieldToClaudeAILogin() {
  return getWIFPrecedenceSource() === "profile-implicit" && getWIFAuthType() === "user_oauth";
}
//@ chunk-640x3zn9.js:8139-8279 placement
function getWIFAccountInfo() {
  let of = g.of(getRootSession().host);
  if (of.accountInfo.filled) return of.accountInfo.value;
  let n = computeWIFAccountInfo();
  return ((of.accountInfo = { filled: !0, value: n }), n);
}
//@ chunk-640x3zn9.js:8279-8470 placement
function computeWIFAccountInfo() {
  let e = getWIFPrecedenceSource();
  if (e === null || e === "env-quad") return;
  let n = resolveConfigDir();
  if (n === null) return;
  let r =
    e === "profile-explicit"
      ? (process.env.ANTHROPIC_PROFILE?.trim() ?? "default")
      : resolveImplicitProfileName(n);
  return readWIFAccountInfo(n, r);
}
//@ chunk-640x3zn9.js:8470-8730 placement
function readWIFAccountInfo(e, n) {
  let r = readProfileFile(credentialsPathFor(e, n));
  if (r === null) return;
  try {
    let parsed = JSON.parse(r);
    return {
      organizationUuid: parsed.organization_uuid,
      organizationName: parsed.organization_name,
      accountEmail: parsed.account_email,
      workspaceId: parsed.workspace_id,
      workspaceName: parsed.workspace_name,
    };
  } catch {
    return;
  }
}
//@ chunk-640x3zn9.js:8730-9258 placement
function getWIFStatusLine() {
  let e = getWIFPrecedenceSource();
  if (e === "env-quad") {
    let n = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
    return `env-quad \xB7 org ${w(process.env.ANTHROPIC_ORGANIZATION_ID ?? "")} \xB7 rule ${w(process.env.ANTHROPIC_FEDERATION_RULE_ID ?? "")}${n ? ` \xB7 ws ${n.startsWith("wrkspc_") ? w(n) : n}` : ""}`;
  }
  if (e === "profile-explicit" || e === "profile-implicit") {
    let n = resolveConfigDir(),
      r =
        n === null
          ? "default"
          : e === "profile-explicit"
            ? (process.env.ANTHROPIC_PROFILE?.trim() ?? "default")
            : resolveImplicitProfileName(n);
    return `credentials-file \xB7 ${getWIFAuthType() ?? "unknown"} \xB7 profile ${r}`;
  }
  return "inactive";
}
//@ chunk-640x3zn9.js:9258-9316 placement
function w(e) {
  return e.length <= 6 ? e : `\u2026${e.slice(-6)}`;
}
//@ chunk-640x3zn9.js:9316-9466 placement
function getWIFProfileBaseUrl() {
  let of = g.of(getRootSession().host);
  if (of.profileBaseUrl.filled) return of.profileBaseUrl.value;
  let n = computeWIFProfileBaseUrl();
  return ((of.profileBaseUrl = { filled: !0, value: n }), n);
}
/**
 * 读取当前 WIF profile 配置中的 base_url。
 */
//@ chunk-640x3zn9.js:9466-9810 placement
function computeWIFProfileBaseUrl() {
  let e = getWIFPrecedenceSource();
  if (e === null || e === "env-quad") return;
  let n = resolveConfigDir();
  if (n === null) return;
  try {
    let r =
        e === "profile-explicit"
          ? (process.env.ANTHROPIC_PROFILE?.trim() ?? "default")
          : resolveImplicitProfileName(n),
      s = readProfileFile(join(n, "configs", `${r}.json`));
    if (s === null) return;
    let parsed = JSON.parse(s);
    return typeof parsed.base_url === "string" && parsed.base_url.trim() ? parsed.base_url.trim() : void 0;
  } catch {
    return;
  }
}
//@ chunk-640x3zn9.js:9810-9989 placement
var wifProfileConfigSchema = DoctorLazy(() =>
  u({
    organization_id: o().optional(),
    workspace_id: o().optional(),
    authentication: u({ type: o().optional(), federation_rule_id: o().optional() }).loose().optional(),
  }).loose(),
);
//@ chunk-640x3zn9.js:9989-10151 placement
function getWIFFederationIdentity() {
  let of = g.of(getRootSession().host);
  if (of.federationIdentity.filled) return of.federationIdentity.value;
  let n = computeWIFFederationIdentity();
  return ((of.federationIdentity = { filled: !0, value: n }), n);
}
/**
 * 计算 WIF 联邦身份（组织 id、联邦规则 id、工作区 id）：来自环境变量四件套或当前 profile 的 oidc_federation 配置。
 */
//@ chunk-640x3zn9.js:10151-10699 placement
function computeWIFFederationIdentity() {
  let source = getWIFPrecedenceSource();
  if (source === null) return;
  if (source === "env-quad")
    return federationIdentityOf({
      organizationId: env.ANTHROPIC_ORGANIZATION_ID,
      federationRuleId: env.ANTHROPIC_FEDERATION_RULE_ID,
      workspaceId: env.ANTHROPIC_WORKSPACE_ID,
    });
  let configDir = resolveConfigDir();
  if (configDir === null) return;
  try {
    let r = readProfileFile(join(configDir, "configs", `${resolveLiveProfileName(configDir)}.json`));
    if (r === null) return;
    let safeParse = wifProfileConfigSchema().safeParse(jsonParse(r));
    if (!safeParse.success || safeParse.data.authentication?.type !== "oidc_federation") return;
    return federationIdentityOf({
      organizationId: safeParse.data.organization_id,
      federationRuleId: safeParse.data.authentication.federation_rule_id,
      workspaceId: safeParse.data.workspace_id,
    });
  } catch {
    return;
  }
}
//@ chunk-640x3zn9.js:10699-10907 placement
function federationIdentityOf({
  organizationId: organizationId,
  federationRuleId: federationRuleId,
  workspaceId: workspaceId,
}) {
  let s = organizationId?.trim(),
    c = federationRuleId?.trim();
  if (!s || !c) return;
  let a = workspaceId?.trim() || void 0;
  return { organizationId: s, federationRuleId: c, ...(a !== void 0 && { workspaceId: a }) };
}
//@ chunk-640x3zn9.js:10907-10967 placement
function isWIFSettingsBearerRejected() {
  return g.of(getRootSession().host).settingsBearerRejected;
}
//@ chunk-640x3zn9.js:10967-11023 placement
function setWIFSettingsBearerRejected(e) {
  g.of(getRootSession().host).settingsBearerRejected = e;
}
//@ chunk-640x3zn9.js:11023-11077 placement
var Oe = ["configs", "credentials"],
  Ae = ["active_config"];
//@ chunk-640x3zn9.js:11077-11271 placement
function getWIFProfileStoreDenyPaths() {
  let of = g.of(getRootSession().host);
  if (of.profileStoreDenyPaths.filled) return of.profileStoreDenyPaths.value;
  let { value: n, complete: complete } = computeProfileStoreDenyPaths();
  if (complete) of.profileStoreDenyPaths = { filled: !0, value: n };
  return n;
}
/**
 * 计算沙箱应拒读的 WIF profile 存储路径：配置目录（若包含当前目录则只拒其中的凭据子目录与文件）以及当前 profile 的凭据文件。
 */
//@ chunk-640x3zn9.js:11271-11810 placement
function computeProfileStoreDenyPaths() {
  let configDir = resolveConfigDir();
  if (configDir === null) return { value: null, complete: !0 };
  let denied = { dirs: [configDir], files: [] };
  try {
    let r = resolve(configDir);
    denied = isRootOrContainsCwd(r)
      ? { dirs: Oe.map((a) => join(r, a)), files: Ae.map((a) => join(r, a)) }
      : { dirs: [r], files: [] };
    let filtered = we(configDir, resolveLiveProfileName(configDir)).filter(
      (a) =>
        !denied.dirs.some((dir) => a === dir || a.startsWith(dir + sep)) &&
        !denied.files.includes(a) &&
        !isRootOrContainsCwd(a) &&
        !Fe(a),
    );
    return { value: { dirs: denied.dirs, files: [...denied.files, ...filtered] }, complete: !0 };
  } catch (error) {
    return (
      logForDebugging(
        `WIF profile store: could not resolve the active profile's credentials path (${errorMessage(error)}); denying the store root only`,
        { level: "warn" },
      ),
      { value: denied, complete: !1 }
    );
  }
}
//@ chunk-640x3zn9.js:11810-11918 placement
function credentialsPathOrNull(e, n) {
  let r = credentialsPathFor(e, n);
  if (!r) return join(e, "credentials", `${n}.json`);
  return typeof r === "string" ? r : null;
}
//@ chunk-640x3zn9.js:11918-12017 placement
function we(e, n) {
  let r = credentialsPathOrNull(e, n);
  if (r === null || !r.trim()) return [];
  return uniq(isAbsolute(r) ? [resolve(r)] : [resolve(e, r), resolve(r)]);
}
//@ chunk-640x3zn9.js:12017-12091 placement
function isLoadableProfileName(e) {
  return !!e && /^[A-Za-z0-9_.-]+$/.test(e) && e !== "." && e !== "..";
}
//@ chunk-640x3zn9.js:12091-12157 placement
function resolveImplicitProfileName(e) {
  return readProfileFile(join(e, "active_config"))?.trim() || "default";
}
//@ chunk-640x3zn9.js:12157-12226 placement
function resolveLiveProfileName(e) {
  return process.env.ANTHROPIC_PROFILE?.trim() || resolveImplicitProfileName(e);
}
//@ chunk-640x3zn9.js:12226-12448 placement
function profileAuthType(e, n) {
  let r = readProfileFile(join(e, "configs", `${n}.json`));
  if (r === null) return null;
  let s;
  try {
    s = JSON.parse(r);
  } catch {
    return null;
  }
  let c = s?.authentication?.type ?? null;
  if (c === "user_oauth") {
    if (!readProfileFile(credentialsPathFor(e, n, s))?.trim()) return null;
  }
  return c;
}
//@ chunk-640x3zn9.js:12448-12632 placement
function credentialsPathFor(e, n, r) {
  if (r === void 0) {
    let s = readProfileFile(join(e, "configs", `${n}.json`));
    if (s !== null)
      try {
        r = JSON.parse(s);
      } catch {}
  }
  return r?.authentication?.credentials_path ?? join(e, "credentials", `${n}.json`);
}
//@ chunk-640x3zn9.js:12632-12668 placement
function resolveConfigDir() {
  return configDirLocation()?.dir ?? null;
}
//@ chunk-640x3zn9.js:12668-12948 placement
function configDirLocation() {
  if (isDiskless()) return null;
  let env = process.env,
    n = env.ANTHROPIC_CONFIG_DIR?.trim();
  if (n) return { dir: n, space: "userNamed" };
  let r = env.XDG_CONFIG_HOME?.trim();
  if (r) return { dir: join(r, "anthropic"), space: "home" };
  let s = env.HOME?.trim();
  return s ? { dir: join(s, ".config", "anthropic"), space: "home" } : null;
}
//@ chunk-640x3zn9.js:12948-13006 placement
function G() {
  return process.env.ANTHROPIC_PROFILE?.trim();
}
//@ chunk-640x3zn9.js:13006-13064 placement
function J() {
  return de.every((e) => process.env[e]?.trim());
}
//@ chunk-640x3zn9.js:13064-13189 placement
function isRootOrContainsCwd(e) {
  let n = canonicalLowerPath(e);
  if (n === parse(n).root) return !0;
  let r = relative(n, canonicalLowerPath(getFsImplementation().cwd())),
    s = r.split(sep)[0];
  return r === "" || (s !== ".." && !isAbsolute(r));
}
//@ chunk-640x3zn9.js:13189-13345 placement
function canonicalLowerPath(e) {
  let n = resolve(e),
    r = "";
  for (;;)
    try {
      n = join(realpathSync.native(n), r);
      break;
    } catch {
      let s = dirname(n);
      if (s === n) {
        n = join(n, r);
        break;
      }
      ((r = r ? join(basename(n), r) : basename(n)), (n = s));
    }
  return n.toLowerCase();
}
//@ chunk-640x3zn9.js:13345-13407 placement
function Fe(e) {
  try {
    return lstatSync(e).isDirectory();
  } catch {
    return !1;
  }
}
//@ chunk-640x3zn9.js:13407-13571 placement
function readProfileFile(e) {
  let primedFiles = g.of(getRootSession().host).primedFiles;
  if (primedFiles !== void 0 && primedFiles.has(e)) return primedFiles.get(e) ?? null;
  try {
    return readFileSync(e, "utf-8");
  } catch (error) {
    if (isFsInaccessible(error) || isEISDIR(error)) return null;
    throw error;
  }
}
//@ chunk-640x3zn9.js:13571-14239 placement
async function primeWIFProfileFiles(e) {
  let of = g.of(getRootSession().host),
    r = configDirLocation();
  if (of.precedenceSource.filled || r === null) return;
  let { dir: dir, space: space } = r,
    a = new Map(),
    l = async (_) => {
      let I;
      try {
        I = await e.hostFiles.readText(PathSpace[space](_));
      } catch (error) {
        return (
          logForDebugging(
            `WIF profile read-ahead: the storage backend threw reading ${_}: ${errorMessage(error)}`,
            { level: "warn" },
          ),
          null
        );
      }
      if (I.ok) {
        let A = I.value.found ? I.value.value : null;
        return (a.set(_, A), A);
      }
      if (isFsInaccessibleCode(storageErrorCode(I.error))) a.set(_, null);
      return null;
    },
    h = G();
  if (!h && J()) return;
  let Y = h || (await l(join(dir, "active_config")))?.trim() || "default";
  (await l(join(dir, "configs", `${Y}.json`)), (of.primedFiles = a));
  try {
    (getWIFPrecedenceSource(), getWIFAuthType());
  } catch (error) {
    logForDebugging(`WIF profile read-ahead: left to the first reader: ${errorMessage(error)}`);
  } finally {
    of.primedFiles = void 0;
  }
}

export {
  getWIFStatusLine,
  getWIFAccountInfo,
  getWIFAuthType,
  getWIFPrecedenceSource,
  wouldWIFProfileYieldToClaudeAILogin,
  isWIFActive,
  getWIFProfileBaseUrl,
  getWIFProfileStoreDenyPaths,
  isWIFUserOAuthDeadError,
  clearWIFPrecedenceCache,
  resolveConfigDir,
  isWIFSettingsBearerRejected,
  setWIFSettingsBearerRejected,
  resolveImplicitProfileName,
  clearWIFAccountInfoCache,
  readWIFAccountInfo,
  resolveLiveProfileName,
  getWIFFederationIdentity,
  primeWIFProfileFiles,
  isLoadableProfileName,
};
