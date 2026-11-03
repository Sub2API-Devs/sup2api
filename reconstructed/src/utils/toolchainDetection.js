/**
 * utils/toolchainDetection.ts
 *
 * 2.1.316 新增：本机工具链探测（语言运行时、包管理器）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3dq9c61y.js (18)
 * attribution: placement 18
 */
import { release } from "os";
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { BUILD_TOOL_NAMES, scanPathForExecutables, env, isScanCandidate } from "./env.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, string } from "../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { POLICY_HELPER_LOG_LEVELS } from "./settings/types.js";
import {
  getAllPolicyTierSettings,
  getSettingsForSource,
  getSettingsForSourceTightenOnly,
  getPolicySettingsLoadErrors,
  getSettingsParseErrorsForSource,
} from "./settings/settings.js";
import { REPO_DIR_SETTING_SOURCE_LIST, isSettingSourceEnabled } from "./settings/constants.js";
import { REMOTECONTROL_SHAREHOSTPROFILE } from "./settings/hooksValidation.js";
import { readMdmSnapshot, mdmReadSnapshot, replaceMdmSetting } from "./settings/mdm/settings.js";
import { invalidateCommandNames } from "./settings/commandSyncNames.js";
import { logError } from "./log.js";
import { logEvent } from "../services/analytics/index.js";
import { lit, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { withDeadline, raceWithAbortSignal } from "./sleep.js";
import { AbortError, errorMessage } from "./errors.js";
import { getPlatform, linuxDistroInfo } from "./platform.js";
import { readSmallFileOrNull } from "./readSmallFile.js";
import { parsePlistXml, isPlainObjectPlist } from "./plistParser.js";
import { safeParseJSON } from "./json.js";
import { MCP_SETTINGS_SCOPES, getMcpConfigsByScope } from "../services/mcp/config.js";
import { logForDebugging } from "./debug.js";
import { TOOL_HOST_ID_RE } from "../remote/tools/protocolConstants.js";
import { uniq } from "./collections.js";

//@ chunk-3dq9c61y.js:1129-1856 placement
/**
 * 主机档案探测常量组：探针文件大小、工具/发行版/架构正则、候选工具名、CLT 与 CUDA 路径。
 */
var HOST_PROFILE_DEADLINE_MS = 1500;
var MAX_PROFILE_FILE_BYTES = 262144;
var MAX_LISTED_TOOLS = 32;
var MAX_LISTED_MCP_SERVERS = 16;
var OS_VERSION_RE = /^[0-9][0-9A-Za-z.+_-]{0,23}$/;
var ARCH_NAME_RE = /^[a-z0-9_]{1,16}$/;
var DISTRO_NAME_RE = /^[a-z0-9._-]{1,24}$/;
var TOOL_NAME_RE = /^[A-Za-z0-9_.-]{1,64}$/;
var PROFILE_TOOL_CANDIDATES = [
  "swift",
  "xcodebuild",
  "xcrun",
  "pod",
  "fastlane",
  "carthage",
  "adb",
  "emulator",
  "sdkmanager",
  "flutter",
  "dart",
  "xcodes",
  "kubectl",
  "helm",
  "terraform",
  "bazel",
  "bazelisk",
  "nix",
  "conda",
  "mamba",
  "pipx",
  "podman",
  "nerdctl",
  "nvidia-smi",
  "psql",
  "mysql",
  "redis-cli",
  ...BUILD_TOOL_NAMES,
];
var NON_PROFILE_TOOLS = new Set([
  "xcodebuild",
  "swift",
  "swiftc",
  "xcrun",
  "git",
  "make",
  "clang",
  "clang++",
  "gcc",
  "g++",
  "python3",
  "pip3",
]);
var XCODE_APP_PATH = "/System/Library/CoreServices/SystemVersion.plist";
var APPLICATIONS_DIR = "/Applications";
var XCODE_CLT_DIR = "/Library/Developer/CommandLineTools/usr/bin";
var MACOS_VERSION_PLIST = "/usr/local/cuda/version.json";
var CUDA_LIBRARY_PATH = "/proc/driver/nvidia/version";
var hostProfileConfigSchema = DoctorLazy(() =>
  u({
    cuda: u({
      version: string(),
    }),
  }),
);
//@ chunk-3dq9c61y.js:1856-1947 placement
function hostProfileSharingMode() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_bridge_host_profile",
    "off",
  );
  return POLICY_HELPER_LOG_LEVELS.find((e) => e === featureValue_CACHED_MAY_BE_STALE) ?? "off";
}
//@ chunk-3dq9c61y.js:1947-2244 placement
/**
 * 按设置决定远程控制是否分享主机档案（off/basic/full）；相关设置解析出错时为 off。
 */
function hostProfileSharing(n) {
  if (hostProfileSettingsBroken()) return "off";
  let e = (s) => s?.remoteControl?.shareHostProfile;
  let mapped = [
    ...getAllPolicyTierSettings(),
    getSettingsForSource("policySettings"),
    getSettingsForSource("flagSettings"),
    getSettingsForSource("userSettings"),
  ].map(e);
  let S = POLICY_HELPER_LOG_LEVELS.find((s) => mapped.includes(s)) ?? n;
  let c = [
    S,
    e(getSettingsForSourceTightenOnly("userSettings")),
    ...REPO_DIR_SETTING_SOURCE_LIST.filter(isSettingSourceEnabled).map((s) => e(getSettingsForSource(s))),
  ];
  return POLICY_HELPER_LOG_LEVELS.find((s) => c.includes(s)) ?? S;
}
//@ chunk-3dq9c61y.js:2244-2535 placement
function hostProfileSettingsBroken() {
  return [
    ...getPolicySettingsLoadErrors(),
    ...getSettingsParseErrorsForSource("flagSettings"),
    ...getSettingsParseErrorsForSource("userSettings"),
    ...REPO_DIR_SETTING_SOURCE_LIST.filter(isSettingSourceEnabled).flatMap((e) =>
      getSettingsParseErrorsForSource(e),
    ),
  ].some((e) => {
    if (e.path === "") return true;
    if (e.statusOnly) return false;
    if (e.severity !== "warning") return true;
    return (
      e.path === REMOTECONTROL_SHAREHOSTPROFILE ||
      e.path === "remoteControl" ||
      e.path.startsWith("remoteControl.")
    );
  });
}
//@ chunk-3dq9c61y.js:2535-2946 placement
/**
 * 重新注册环境前按主机档案分享设置过滤（basic 时去掉 MCP 服务器列表，off 时不分享）。
 */
async function filterSharedEnvironment(hostProfile) {
  if (hostProfile === undefined) return;
  try {
    let e = hostProfileSharingMode();
    if (e === "off") return;
    let mdmSnapshot = await readMdmSnapshot();
    invalidateCommandNames();
    let S = hostProfileSharing(e);
    let c = mdmReadSnapshot();
    let s;
    replaceMdmSetting(mdmSnapshot.mdm, mdmSnapshot.hkcu, mdmSnapshot.wslInherits, mdmSnapshot.whereAsked);
    try {
      invalidateCommandNames();
      s = hostProfileSharing(e);
    } finally {
      replaceMdmSetting(c.mdm, c.hkcu, c.wslInherits, c.whereAsked);
      invalidateCommandNames();
    }
    let _ = POLICY_HELPER_LOG_LEVELS.find((P) => P === S || P === s) ?? "off";
    if (_ === "off") return;
    if (_ === "basic" && hostProfile.mcp_servers !== undefined) {
      let { mcp_servers: mcpServers, ...h } = hostProfile;
      return h;
    }
    return hostProfile;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-3dq9c61y.js:2946-3178 placement
/**
 * 若允许分享，收集主机档案（full 时包含 MCP 服务器）。
 */
async function collectHostProfileIfShared(signal) {
  try {
    let e = hostProfileSharingMode();
    if (e === "off") return;
    let r = hostProfileSharing(e);
    if (r === "off") {
      logEvent("tengu_bridge_host_profile_collect", {
        outcome: lit("disabled"),
      });
      return;
    }
    return await collectHostProfile({
      includeMcpServers: r === "full",
      signal,
    });
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-3dq9c61y.js:3178-3837 placement
/**
 * 收集主机档案并上报结果遥测。
 */
async function collectHostProfile({ includeMcpServers, signal }) {
  let now = Date.now();
  let S = hostPlatform();
  try {
    let hostProfile = await gatherHostProfile({
      includeMcpServers,
      signal,
    });
    if (hostProfile === undefined) return;
    let { profile, complete, aborted } = hostProfile;
    logEvent("tengu_bridge_host_profile_collect", {
      outcome: complete ? lit("ok") : aborted ? lit("aborted") : lit("partial"),
      duration_ms: Date.now() - now,
      tools_count: profile.tools.length,
      mcp_count: profile.mcp_servers?.length ?? 0,
      platform: fromEnumOpt(S),
      arch: fromEnumOpt("x64"),
      wsl: profile.wsl === true,
    });
    if (complete) logFeatureOk("bridge_host_profile");
    else if (!aborted) logFeatureSad("bridge_host_profile", "deadline");
    return profile;
  } catch (error) {
    logError(error);
    logEvent("tengu_bridge_host_profile_collect", {
      outcome: lit("error"),
      duration_ms: Date.now() - now,
      platform: fromEnumOpt(S),
      arch: fromEnumOpt("x64"),
    });
    logFeatureBad("bridge_host_profile", "error");
    return;
  }
}
//@ chunk-3dq9c61y.js:3837-4581 placement
/**
 * 在截止时间内收集主机档案：系统版本、发行版、PATH 中的工具、Xcode/Android SDK/CUDA 与可选的 MCP 服务器。
 */
async function gatherHostProfile({
  includeMcpServers,
  signal,
  alsoLookFor = [],
  maxTools = MAX_LISTED_TOOLS,
}) {
  let c = hostPlatform();
  if (c === undefined) return;
  let s = [...PROFILE_TOOL_CANDIDATES, ...alsoLookFor];
  let _ = {
    pathTools: new Set(),
    mcpServers: [],
  };
  let P = [detectOsVersion(c, _), detectAndroidSdk(_), scanPathForExecutables(s, _.pathTools)];
  if (c === "darwin") P.push(detectXcode(_), detectXcodeCommandLineTools(_));
  if (c === "linux") P.push(detectCuda(_));
  if (includeMcpServers) P.push(collectMcpServerNames(_));
  let h = withDeadline(
    Promise.all(
      P.map((E) =>
        E.catch((error) => {
          logError(error);
        }),
      ),
    ).then(() => true),
    HOST_PROFILE_DEADLINE_MS,
  ).then((E) => E === true);
  let aborted = false;
  let complete =
    signal === undefined
      ? await h
      : await raceWithAbortSignal(h, signal, () => new AbortError()).catch(() => {
          aborted = true;
          return false;
        });
  return {
    profile: {
      platform: c,
      ...(ARCH_NAME_RE.test("x64") && {
        arch: "x64",
      }),
      ...(_.osVersion !== undefined && {
        os_version: _.osVersion,
      }),
      ...(_.distro !== undefined && {
        distro: _.distro,
      }),
      ...(getPlatform() === "wsl" && {
        wsl: true,
      }),
      tools: orderHostTools(c, _, s, maxTools),
      ...(includeMcpServers && {
        mcp_servers: _.mcpServers.slice(0, MAX_LISTED_MCP_SERVERS),
      }),
      collected_at: new Date().toISOString(),
    },
    complete,
    aborted,
  };
}
//@ chunk-3dq9c61y.js:4581-4677 placement = detectTerminal (0.92)
/**
 * （误归 deepLink）平台名常量折叠函数，linux 构建恒返回 "linux"。
 */
function hostPlatform() {
  switch ("linux") {
    case "darwin":
    case "linux":
    case "win32":
      return "linux";
    default:
      return;
  }
}
//@ chunk-3dq9c61y.js:4677-5020 placement
/**
 * 探测系统版本与发行版。
 */
async function detectOsVersion(n, e) {
  switch (n) {
    case "darwin":
      e.osVersion = await readPlistVersion(XCODE_APP_PATH, "ProductVersion");
      return;
    case "linux": {
      let r = await linuxDistroInfo();
      if (r?.linuxDistroVersion && OS_VERSION_RE.test(r.linuxDistroVersion))
        e.osVersion = r.linuxDistroVersion;
      let lower = r?.linuxDistroId?.toLowerCase();
      if (lower && DISTRO_NAME_RE.test(lower)) e.distro = lower;
      return;
    }
    case "win32": {
      let r = release();
      if (OS_VERSION_RE.test(r)) e.osVersion = r;
      return;
    }
  }
}
//@ chunk-3dq9c61y.js:5020-5162 placement
async function readPlistVersion(n, e) {
  let smallFileOrNull = await readSmallFileOrNull(n, MAX_PROFILE_FILE_BYTES);
  if (smallFileOrNull === null) return;
  let plistXml = parsePlistXml(smallFileOrNull);
  let c = isPlainObjectPlist(plistXml) ? plistXml[e] : undefined;
  return typeof c === "string" && OS_VERSION_RE.test(c) ? c : undefined;
}
//@ chunk-3dq9c61y.js:5162-5501 placement
/**
 * 探测 Xcode 版本。
 */
async function detectXcode(n) {
  let e;
  try {
    e = await readdir(APPLICATIONS_DIR);
  } catch {
    return;
  }
  let sorted = e
    .filter((s) => /^Xcode.*\.app$/.test(s))
    .sort((s, _) =>
      _.localeCompare(s, undefined, {
        numeric: true,
      }),
    );
  if (sorted.length === 0) return;
  let S = sorted.includes("Xcode.app") ? "Xcode.app" : sorted[0];
  let plistVersion = await readPlistVersion(
    join(APPLICATIONS_DIR, S, "Contents", "version.plist"),
    "CFBundleShortVersionString",
  );
  n.xcode = plistVersion === undefined ? "xcode" : `xcode@${plistVersion}`;
}
//@ chunk-3dq9c61y.js:5501-5548 placement
async function detectXcodeCommandLineTools(n) {
  if (await isDirectoryAsync(XCODE_CLT_DIR)) n.clt = "clt";
}
//@ chunk-3dq9c61y.js:5548-5686 placement
async function detectAndroidSdk(n) {
  let e = env.ANDROID_HOME ?? env.ANDROID_SDK_ROOT;
  if (e === undefined || !(await isScanCandidate(e)) || !(await isDirectoryAsync(e))) return;
  n.androidSdk = "android-sdk";
}
//@ chunk-3dq9c61y.js:5686-5904 placement
async function detectCuda(n) {
  let smallFileOrNull = await readSmallFileOrNull(MACOS_VERSION_PLIST, MAX_PROFILE_FILE_BYTES);
  if (smallFileOrNull !== null) {
    let r = hostProfileConfigSchema().safeParse(safeParseJSON(smallFileOrNull, false));
    n.cuda = r.success && OS_VERSION_RE.test(r.data.cuda.version) ? `cuda@${r.data.cuda.version}` : "cuda";
    return;
  }
  try {
    await readFile(CUDA_LIBRARY_PATH, "utf8");
    n.cuda = "cuda";
  } catch {}
}
//@ chunk-3dq9c61y.js:5904-5977 placement
async function isDirectoryAsync(n) {
  try {
    return (await stat(n)).isDirectory();
  } catch {
    return false;
  }
}
//@ chunk-3dq9c61y.js:5977-6341 placement
/**
 * 收集用户与托管范围的 MCP 服务器名。
 */
async function collectMcpServerNames(n) {
  let e = new Set();
  for (let r of MCP_SETTINGS_SCOPES) {
    if (r === "project") continue;
    let S;
    try {
      S = Object.keys(
        getMcpConfigsByScope(r, {
          expandVars: false,
        }).servers,
      );
    } catch (error) {
      logForDebugging(`[bridge:host-profile] could not read ${r} MCP config: ${errorMessage(error)}`, {
        level: "warn",
      });
      continue;
    }
    let scope = r === "managed" ? "enterprise" : r;
    for (let s of S) {
      if (!TOOL_NAME_RE.test(s) || e.has(s)) continue;
      e.add(s);
      n.mcpServers.push({
        name: s,
        scope,
      });
    }
  }
}
//@ chunk-3dq9c61y.js:6341-6625 placement
function orderHostTools(n, e, r, maxTools) {
  let c = n !== "darwin" || e.xcode !== undefined || e.clt !== undefined;
  let filtered = r.filter((P) => e.pathTools.has(P) && (c || !NON_PROFILE_TOOLS.has(P)));
  let filtered_2 = [
    e.xcode,
    e.clt,
    ...filtered.filter((P) => P === "swift"),
    e.androidSdk,
    e.cuda,
    ...filtered.filter((P) => P !== "swift"),
  ].filter((P) => P !== undefined && TOOL_HOST_ID_RE.test(P));
  return uniq(filtered_2).slice(0, maxTools);
}
export { collectHostProfileIfShared, filterSharedEnvironment, hostProfileSharing, gatherHostProfile };
