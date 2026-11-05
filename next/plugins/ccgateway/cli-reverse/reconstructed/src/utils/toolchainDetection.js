/**
 * utils/toolchainDetection.ts
 *
 * 2.1.316 新增：本机工具链探测（语言运行时、包管理器）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-x64bfgzn.js (18)
 * attribution: placement 18
 */
import { release } from "os";
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { BUILD_TOOL_NAMES, scanPathForExecutables, env, isScanCandidate } from "./env.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
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
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";

//@ chunk-x64bfgzn.js:1129-1856 placement
/**
 * 主机档案探测的常量组：探测截止时间、读文件上限、工具/发行版/架构名的正则、候选工具名，以及 plist 与 CUDA 的路径。
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
  objectSchema({
    cuda: objectSchema({
      version: stringSchema(),
    }),
  }),
);
//@ chunk-x64bfgzn.js:1856-1947 placement
function hostProfileSharingMode() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_bridge_host_profile",
    "off",
  );
  return POLICY_HELPER_LOG_LEVELS.find((value) => value === featureValue_CACHED_MAY_BE_STALE) ?? "off";
}
//@ chunk-x64bfgzn.js:1947-2244 placement
/**
 * 按设置决定远程控制是否分享主机档案（off/basic/full）；相关设置解析出错时为 off。
 */
function hostProfileSharing(options) {
  if (hostProfileSettingsBroken()) return "off";
  let read = (settings) => settings?.remoteControl?.shareHostProfile;
  let mapped = [
    ...getAllPolicyTierSettings(),
    getSettingsForSource("policySettings"),
    getSettingsForSource("flagSettings"),
    getSettingsForSource("userSettings"),
  ].map(read);
  let strongestBefore = POLICY_HELPER_LOG_LEVELS.find((level) => mapped.includes(level)) ?? options;
  let levels = [
    strongestBefore,
    read(getSettingsForSourceTightenOnly("userSettings")),
    ...REPO_DIR_SETTING_SOURCE_LIST.filter(isSettingSourceEnabled).map((source) =>
      read(getSettingsForSource(source)),
    ),
  ];
  return POLICY_HELPER_LOG_LEVELS.find((level) => levels.includes(level)) ?? strongestBefore;
}
//@ chunk-x64bfgzn.js:2244-2535 placement
function hostProfileSettingsBroken() {
  return [
    ...getPolicySettingsLoadErrors(),
    ...getSettingsParseErrorsForSource("flagSettings"),
    ...getSettingsParseErrorsForSource("userSettings"),
    ...REPO_DIR_SETTING_SOURCE_LIST.filter(isSettingSourceEnabled).flatMap((errors) =>
      getSettingsParseErrorsForSource(errors),
    ),
  ].some((other) => {
    if (other.path === "") return true;
    if (other.statusOnly) return false;
    if (other.severity !== "warning") return true;
    return (
      other.path === REMOTECONTROL_SHAREHOSTPROFILE ||
      other.path === "remoteControl" ||
      other.path.startsWith("remoteControl.")
    );
  });
}
//@ chunk-x64bfgzn.js:2535-2946 placement
/**
 * 重新注册环境前按主机档案分享设置过滤（basic 时去掉 MCP 服务器列表，off 时不分享）。
 */
async function filterSharedEnvironment(hostProfile) {
  if (hostProfile === undefined) return;
  try {
    let mode = hostProfileSharingMode();
    if (mode === "off") return;
    let mdmSnapshot = await readMdmSnapshot();
    invalidateCommandNames();
    let sharingBefore = hostProfileSharing(mode);
    let mdmBefore = mdmReadSnapshot();
    let sharingAfter;
    replaceMdmSetting(mdmSnapshot.mdm, mdmSnapshot.hkcu, mdmSnapshot.wslInherits, mdmSnapshot.whereAsked);
    try {
      invalidateCommandNames();
      sharingAfter = hostProfileSharing(mode);
    } finally {
      replaceMdmSetting(mdmBefore.mdm, mdmBefore.hkcu, mdmBefore.wslInherits, mdmBefore.whereAsked);
      invalidateCommandNames();
    }
    let sharingLogLevel =
      POLICY_HELPER_LOG_LEVELS.find((level) => level === sharingBefore || level === sharingAfter) ?? "off";
    if (sharingLogLevel === "off") return;
    if (sharingLogLevel === "basic" && hostProfile.mcp_servers !== undefined) {
      let { mcp_servers: mcpServers, ...rest } = hostProfile;
      return rest;
    }
    return hostProfile;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-x64bfgzn.js:2946-3178 placement
/**
 * 若允许分享，收集主机档案（full 时包含 MCP 服务器）。
 */
async function collectHostProfileIfShared(signal) {
  try {
    let mode = hostProfileSharingMode();
    if (mode === "off") return;
    let profile = hostProfileSharing(mode);
    if (profile === "off") {
      logEvent("tengu_bridge_host_profile_collect", {
        outcome: lit("disabled"),
      });
      return;
    }
    return await collectHostProfile({
      includeMcpServers: profile === "full",
      signal,
    });
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-x64bfgzn.js:3178-3837 placement
/**
 * 收集主机档案并上报结果遥测。
 */
async function collectHostProfile({ includeMcpServers, signal }) {
  let now = Date.now();
  let platformResult = hostPlatform();
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
      platform: fromEnumOpt(platformResult),
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
      platform: fromEnumOpt(platformResult),
      arch: fromEnumOpt("x64"),
    });
    logFeatureBad("bridge_host_profile", "error");
    return;
  }
}
//@ chunk-x64bfgzn.js:3837-4581 placement
/**
 * 在截止时间内收集主机档案：系统版本、发行版、PATH 中的工具、Xcode/Android SDK/CUDA 与可选的 MCP 服务器。
 */
async function gatherHostProfile({
  includeMcpServers,
  signal,
  alsoLookFor = [],
  maxTools = MAX_LISTED_TOOLS,
}) {
  let platform = hostPlatform();
  if (platform === undefined) return;
  let pathToolsToList = [...PROFILE_TOOL_CANDIDATES, ...alsoLookFor];
  let detectionState = {
    pathTools: new Set(),
    mcpServers: [],
  };
  let detectionTasks = [
    detectOsVersion(platform, detectionState),
    detectAndroidSdk(detectionState),
    scanPathForExecutables(pathToolsToList, detectionState.pathTools),
  ];
  if (platform === "darwin")
    detectionTasks.push(detectXcode(detectionState), detectXcodeCommandLineTools(detectionState));
  if (platform === "linux") detectionTasks.push(detectCuda(detectionState));
  if (includeMcpServers) detectionTasks.push(collectMcpServerNames(detectionState));
  let detectionPromise = withDeadline(
    Promise.all(
      detectionTasks.map((task) =>
        task.catch((error) => {
          logError(error);
        }),
      ),
    ).then(() => true),
    HOST_PROFILE_DEADLINE_MS,
  ).then((isComplete) => isComplete === true);
  let aborted = false;
  let complete =
    signal === undefined
      ? await detectionPromise
      : await raceWithAbortSignal(detectionPromise, signal, () => new AbortError()).catch(() => {
          aborted = true;
          return false;
        });
  return {
    profile: {
      platform,
      ...(ARCH_NAME_RE.test("x64") && {
        arch: "x64",
      }),
      ...(detectionState.osVersion !== undefined && {
        os_version: detectionState.osVersion,
      }),
      ...(detectionState.distro !== undefined && {
        distro: detectionState.distro,
      }),
      ...(getPlatform() === "wsl" && {
        wsl: true,
      }),
      tools: orderHostTools(platform, detectionState, pathToolsToList, maxTools),
      ...(includeMcpServers && {
        mcp_servers: detectionState.mcpServers.slice(0, MAX_LISTED_MCP_SERVERS),
      }),
      collected_at: new Date().toISOString(),
    },
    complete,
    aborted,
  };
}
//@ chunk-x64bfgzn.js:4581-4677 placement (2.1.88 match: detectTerminal, 0.92)
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
//@ chunk-x64bfgzn.js:4677-5020 placement
/**
 * 探测系统版本与发行版。
 */
async function detectOsVersion(platform, profile) {
  switch (platform) {
    case "darwin":
      profile.osVersion = await readPlistVersion(XCODE_APP_PATH, "ProductVersion");
      return;
    case "linux": {
      let distroInfo = await linuxDistroInfo();
      if (distroInfo?.linuxDistroVersion && OS_VERSION_RE.test(distroInfo.linuxDistroVersion))
        profile.osVersion = distroInfo.linuxDistroVersion;
      let lower = distroInfo?.linuxDistroId?.toLowerCase();
      if (lower && DISTRO_NAME_RE.test(lower)) profile.distro = lower;
      return;
    }
    case "win32": {
      let releaseName = release();
      if (OS_VERSION_RE.test(releaseName)) profile.osVersion = releaseName;
      return;
    }
  }
}
//@ chunk-x64bfgzn.js:5020-5162 placement
async function readPlistVersion(path, key) {
  let xml = await readSmallFileOrNull(path, MAX_PROFILE_FILE_BYTES);
  if (xml === null) return;
  let plistXml = parsePlistXml(xml);
  let plistValue = isPlainObjectPlist(plistXml) ? plistXml[key] : undefined;
  return typeof plistValue === "string" && OS_VERSION_RE.test(plistValue) ? plistValue : undefined;
}
//@ chunk-x64bfgzn.js:5162-5501 placement
/**
 * 探测 Xcode 版本。
 */
async function detectXcode(profile) {
  let entries;
  try {
    entries = await readdir(APPLICATIONS_DIR);
  } catch {
    return;
  }
  let sorted = entries
    .filter((appName) => /^Xcode.*\.app$/.test(appName))
    .sort((left, right) =>
      right.localeCompare(left, undefined, {
        numeric: true,
      }),
    );
  if (sorted.length === 0) return;
  let xcodeApp = sorted.includes("Xcode.app") ? "Xcode.app" : sorted[0];
  let plistVersion = await readPlistVersion(
    join(APPLICATIONS_DIR, xcodeApp, "Contents", "version.plist"),
    "CFBundleShortVersionString",
  );
  profile.xcode = plistVersion === undefined ? "xcode" : `xcode@${plistVersion}`;
}
//@ chunk-x64bfgzn.js:5501-5548 placement
async function detectXcodeCommandLineTools(profile) {
  if (await isDirectoryAsync(XCODE_CLT_DIR)) profile.clt = "clt";
}
//@ chunk-x64bfgzn.js:5548-5686 placement
async function detectAndroidSdk(profile) {
  let root = env.ANDROID_HOME ?? env.ANDROID_SDK_ROOT;
  if (root === undefined || !(await isScanCandidate(root)) || !(await isDirectoryAsync(root))) return;
  profile.androidSdk = "android-sdk";
}
//@ chunk-x64bfgzn.js:5686-5904 placement
async function detectCuda(profile) {
  let smallFileOrNull = await readSmallFileOrNull(MACOS_VERSION_PLIST, MAX_PROFILE_FILE_BYTES);
  if (smallFileOrNull !== null) {
    let parsed = hostProfileConfigSchema().safeParse(safeParseJSON(smallFileOrNull, false));
    profile.cuda =
      parsed.success && OS_VERSION_RE.test(parsed.data.cuda.version)
        ? `cuda@${parsed.data.cuda.version}`
        : "cuda";
    return;
  }
  try {
    await readFile(CUDA_LIBRARY_PATH, "utf8");
    profile.cuda = "cuda";
  } catch {}
}
//@ chunk-x64bfgzn.js:5904-5977 placement
async function isDirectoryAsync(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}
//@ chunk-x64bfgzn.js:5977-6341 placement
/**
 * 收集用户与托管范围的 MCP 服务器名。
 */
async function collectMcpServerNames(profile) {
  let names = new Set();
  for (let scope of MCP_SETTINGS_SCOPES) {
    if (scope === "project") continue;
    let serverNames;
    try {
      serverNames = Object.keys(
        getMcpConfigsByScope(scope, {
          expandVars: false,
        }).servers,
      );
    } catch (error) {
      logForDebugging(`[bridge:host-profile] could not read ${scope} MCP config: ${errorMessage(error)}`, {
        level: "warn",
      });
      continue;
    }
    let scope_2 = scope === "managed" ? "enterprise" : scope;
    for (let serverName of serverNames) {
      if (!TOOL_NAME_RE.test(serverName) || names.has(serverName)) continue;
      names.add(serverName);
      profile.mcpServers.push({
        name: serverName,
        scope: scope_2,
      });
    }
  }
}
//@ chunk-x64bfgzn.js:6341-6625 placement
function orderHostTools(platform, profile, ordered, maxTools) {
  let hasXcode = platform !== "darwin" || profile.xcode !== undefined || profile.clt !== undefined;
  let filtered = ordered.filter(
    (tool) => profile.pathTools.has(tool) && (hasXcode || !NON_PROFILE_TOOLS.has(tool)),
  );
  let filtered_2 = [
    profile.xcode,
    profile.clt,
    ...filtered.filter((tool) => tool === "swift"),
    profile.androidSdk,
    profile.cuda,
    ...filtered.filter((tool) => tool !== "swift"),
  ].filter((toolId) => toolId !== undefined && TOOL_HOST_ID_RE.test(toolId));
  return normalizeCaseForComparison_2(filtered_2).slice(0, maxTools);
}
export { filterSharedEnvironment, collectHostProfileIfShared, hostProfileSharing, gatherHostProfile };
