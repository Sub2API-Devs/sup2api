/**
 * plugins/bundled/claudeTest/consent.ts
 *
 * 2.1.316 新增：Claude Test 的同意、可用性与清理：allowed-starts、登录账号、GrowthBook 开关、旧版本文件夹清理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ae5g0zb5.js (22)
 * attribution: placement 22
 */
import { utimes, readdir, stat, rm, lstat, rmdir } from "fs/promises";
import { dirname, basename, join } from "path";
import { isRetentionCleanupSafe, getCutoffDate } from "../../../utils/cleanup.js";
import { logForDebugging } from "../../../utils/debug.js";
import { errorMessage, toError } from "../../../utils/errors.js";
import {
  helperServerState,
  portPortedFiles,
  claudeTestInstalledRoot,
  TEST_PLUGIN_ID,
  buildPlaywrightMcpServer,
  HELPER_TOOL_PREFIX,
  CLAUDE_TEST_APP_UP,
  HELPER_SERVER_NAME,
} from "./constants.js";
import { isDiskless, getRootSession } from "../../../bootstrap/state.js";
import { logFeatureBad, logFeatureOk } from "../../../services/analytics/featureTelemetry.js";
import {
  loadInstalledFiles,
  listProjectRoots,
  findUnsafeInheritedEnv,
  buildAppEnvironment,
  resolveTrustedNode,
  getTeammateEnvVarsToForward,
} from "./nodeEnvironment.js";
import { findDifferingInstalledFile, writeMadeHereKey, resolveAppDir } from "./runFiles.js";
import { pluginDataDirPath } from "../../../utils/plugins/pluginDirectories.js";
import {
  getAuthTokenSource,
  credentialIsOwnStoredLogin,
  isAnthropicAuthEnabled,
  getOauthAccountInfo,
  getSubscriptionType,
} from "../../../utils/auth.js";
import {
  getGrowthBookClientIdentity,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  hasFreshGrowthBookFeatures,
} from "../../../services/analytics/growthbook.js";
import { HostScoped } from "../../../utils/hostScoped.js";
import { TENGU_MELLOW_HOLLERITH } from "../../../services/api/withRetry.js";
import { claudeTestState, isPlainObjectNonArray } from "./appFacts.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-ae5g0zb5.js:76654-76790 placement
/**
 * 旧版本文件夹、哈希后缀与运行目录的名称格式。
 */
var VERSION_DIR_RE = /^\d+\.\d+\.\d+(-[0-9a-f]{12})?$/;
var HASH_SUFFIX_RE = /-[0-9a-f]{64}$/;
var RUN_DIR_NAME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(-\d+)?$/;
var ALLOWED_STARTS_JSON = "allowed-starts.json";
//@ chunk-ae5g0zb5.js:76790-77881 placement
/**
 * 清理旧版本文件夹、过期的 live 页面与记住的同意记录。
 */
async function cleanupOldClaudeTestFiles(markerPath) {
  try {
    let date = new Date();
    await utimes(markerPath, date, date);
    let cutoff = (await isRetentionCleanupSafe(undefined, 0)) ? getCutoffDate() : null;
    if (cutoff === null) return;
    let rootDir = dirname(markerPath);
    let dirents = await readdir(rootDir, {
      withFileTypes: true,
    });
    for (let dirent of dirents)
      if (
        dirent.isDirectory() &&
        dirent.name !== basename(markerPath) &&
        VERSION_DIR_RE.test(dirent.name) &&
        (await stat(join(rootDir, dirent.name))).mtime < cutoff
      )
        await rm(join(rootDir, dirent.name), {
          recursive: true,
          force: true,
        });
    let liveDir = join(rootDir, "live");
    let liveDirs = dirents.some((dirent) => dirent.name === "live" && dirent.isDirectory())
      ? await readdir(liveDir, {
          withFileTypes: true,
        }).catch(() => [])
      : [];
    for (let dirent of liveDirs) {
      if (!dirent.isDirectory() || !HASH_SUFFIX_RE.test(dirent.name)) continue;
      let runDirEntries = await readdir(join(liveDir, dirent.name), {
        withFileTypes: true,
      }).catch(() => []);
      for (let entry of runDirEntries) {
        let runDirPath = join(liveDir, dirent.name, entry.name);
        if (
          entry.isDirectory() &&
          RUN_DIR_NAME_RE.test(entry.name) &&
          (await lstat(runDirPath)).mtime < cutoff
        )
          await rm(runDirPath, {
            recursive: true,
            force: true,
          });
      }
      await rmdir(join(liveDir, dirent.name)).catch(() => {});
    }
    let consentDir = join(rootDir, "consent");
    let consentEntries = dirents.some((dirent) => dirent.name === "consent" && dirent.isDirectory())
      ? await readdir(consentDir, {
          withFileTypes: true,
        }).catch(() => [])
      : [];
    for (let entry of consentEntries) {
      if (!entry.isDirectory()) continue;
      let startsFile = join(consentDir, entry.name, ALLOWED_STARTS_JSON);
      let startsStat = await lstat(startsFile).catch(() => null);
      if (startsStat?.isFile() && startsStat.mtime < cutoff)
        await rm(startsFile, {
          force: true,
        });
    }
  } catch (error) {
    logForDebugging(
      `claude-test: old version folders, live pages or remembered starts not cleaned up: ${errorMessage(error)}`,
    );
  }
}
//@ chunk-ae5g0zb5.js:77881-77973 placement
/**
 * 读取浏览器助手的文件与服务状态，顺便把 server 记到共享状态里。
 */
var describeHelperState = async () => {
  let server;
  try {
    let { server: server_2, ...rest } = await describeHelperFilesState();
    server = server_2;
    return rest;
  } finally {
    helperServerState.server = server;
  }
};
//@ chunk-ae5g0zb5.js:77973-78837 placement
async function describeHelperFilesState() {
  if (isDiskless()) {
    logFeatureBad("claude_test_helper_files", "diskless");
    return {
      folder: "",
      problem: "diskless",
    };
  }
  let { INSTALLED_FILES } = await loadInstalledFiles();
  let installedFiles = portPortedFiles(INSTALLED_FILES);
  let rootDir = claudeTestInstalledRoot();
  let projectRoots = await listProjectRoots();
  let unsafeInheritedEnv = await findUnsafeInheritedEnv(buildAppEnvironment(), projectRoots);
  let command = await resolveTrustedNode(unsafeInheritedEnv, projectRoots);
  if (command === undefined) {
    logFeatureBad("claude_test_helper_files", "no_node");
    return {
      folder: rootDir,
      problem: "no_node",
    };
  }
  try {
    let symlinkedAncestor = await findSymlinkedAncestor(rootDir, Object.keys(installedFiles));
    if (symlinkedAncestor !== undefined) {
      logFeatureBad("claude_test_helper_files", "linked");
      return {
        folder: rootDir,
        problem: "linked",
        what: symlinkedAncestor === "." ? rootDir : join(rootDir, symlinkedAncestor),
      };
    }
    let differingInstalledFile = await findDifferingInstalledFile(rootDir, installedFiles);
    if (differingInstalledFile !== undefined) {
      logFeatureBad("claude_test_helper_files", "differs");
      return {
        folder: rootDir,
        problem: "differs",
        what: differingInstalledFile,
      };
    }
  } catch (error) {
    logFeatureBad("claude_test_helper_files", "unwritable");
    return {
      folder: rootDir,
      problem: "unwritable",
      what: errorMessage(error),
    };
  }
  await cleanupOldClaudeTestFiles(rootDir);
  await writeMadeHereKey(pluginDataDirPath(TEST_PLUGIN_ID));
  logFeatureOk("claude_test_helper_files");
  let server = buildPlaywrightMcpServer(command, unsafeInheritedEnv);
  let teammateEnvVarsToForward = getTeammateEnvVarsToForward();
  let shouldTellIgnored = teammateEnvVarsToForward.join() !== helperServerState.toldIgnored;
  helperServerState.toldIgnored = teammateEnvVarsToForward.join();
  return shouldTellIgnored && teammateEnvVarsToForward.length > 0
    ? {
        folder: rootDir,
        server,
        ignored: teammateEnvVarsToForward,
      }
    : {
        folder: rootDir,
        server,
      };
}
//@ chunk-ae5g0zb5.js:78837-79040 placement
/**
 * 在要写入的文件的各级父目录中找符号链接目录。
 */
async function findSymlinkedAncestor(rootDir, relativePaths) {
  let dirs = new Set(["."]);
  for (let relativePath of relativePaths)
    for (let dir = dirname(relativePath); dir !== "."; dir = dirname(dir)) dirs.add(dir);
  for (let dir of [...dirs].sort())
    if (
      (
        await lstat(join(rootDir, dir)).catch(() => {
          return;
        })
      )?.isSymbolicLink()
    )
      return dir;
  return;
}
//@ chunk-ae5g0zb5.js:79040-79050 placement
/**
 * Claude Test 的“开关开着但标记关闭”状态占位值（当前恒 false）。
 */
var IS_ON_WITH_FLAGS_OFF = false;
//@ chunk-ae5g0zb5.js:79050-79075 placement
/**
 * 没有存储登录时使用的占位文本。
 */
var NO_STORED_LOGIN = "no stored login";
//@ chunk-ae5g0zb5.js:79075-79400 placement
function readSignedInAccount() {
  try {
    if (
      getAuthTokenSource().source !== "claude.ai" ||
      !credentialIsOwnStoredLogin() ||
      !isAnthropicAuthEnabled()
    )
      return NO_STORED_LOGIN;
    let oauthAccountInfo = getOauthAccountInfo();
    let subscriptionType = getSubscriptionType();
    if (!oauthAccountInfo?.accountUuid || !oauthAccountInfo.organizationUuid || subscriptionType === null)
      return;
    return `${oauthAccountInfo.accountUuid}:${oauthAccountInfo.organizationUuid}:${subscriptionType}`;
  } catch (error) {
    logForDebugging(
      `claude-test: could not read who is signed in (${toError(error).name}); /claude-test is not offered`,
      {
        level: "error",
      },
    );
    return;
  }
}
//@ chunk-ae5g0zb5.js:79400-79735 placement
function readFlagAccount() {
  try {
    let oauthAccountInfo = getOauthAccountInfo();
    let growthBookClientIdentity = getGrowthBookClientIdentity();
    return (
      oauthAccountInfo?.accountUuid !== undefined &&
      oauthAccountInfo.organizationUuid !== undefined &&
      growthBookClientIdentity.accountUuid === oauthAccountInfo.accountUuid &&
      growthBookClientIdentity.organizationUuid === oauthAccountInfo.organizationUuid
    );
  } catch (error) {
    logForDebugging(
      `claude-test: could not read the account Claude Code's flag client was built with (${toError(error).name}); /claude-test is not offered`,
      {
        level: "error",
      },
    );
    return false;
  }
}
//@ chunk-ae5g0zb5.js:79735-79816 placement
/**
 * 新建 Claude Test 开关的说明状态（按登录保留的 Map 与上次提示）。
 */
function createGateNoteState() {
  return {
    keptByLogin: new Map(),
    noted: undefined,
    loginWhenLastEmpty: undefined,
  };
}
//@ chunk-ae5g0zb5.js:79816-80457 placement
/**
 * 读取 Claude Test 开关（override/disabled/payload）。
 */
function readClaudeTestGate(source, state = createGateNoteState()) {
  return {
    note() {
      let isFirstNote = state.noted === undefined;
      state.noted = {
        login: source.login(),
        holdsAnswers: source.holdsFetchedAnswers(),
      };
      let { login, holdsAnswers } = state.noted;
      if (!holdsAnswers) state.loginWhenLastEmpty = login;
      else if (isFirstNote && login !== undefined && login !== NO_STORED_LOGIN && source.wasToldStoredLogin())
        state.loginWhenLastEmpty = login;
    },
    isOn() {
      let { value, source: source_2 } = source.answer();
      if (source_2 === "override") return value;
      if (source_2 === "disabled") return source.isOnWithFlagsOff;
      let { noted } = state;
      if (noted?.login === undefined) return false;
      let hasStoredLogin = noted.login !== NO_STORED_LOGIN;
      if (noted.holdsAnswers) {
        if (state.loginWhenLastEmpty !== noted.login || (hasStoredLogin && !source.wasToldStoredLogin()))
          return false;
        let isOn = source_2 === "payload" && value === true;
        if (hasStoredLogin) state.keptByLogin.set(noted.login, isOn);
        return isOn;
      }
      return state.keptByLogin.get(noted.login) ?? false;
    },
  };
}
//@ chunk-ae5g0zb5.js:80457-80474 placement
/**
 * 按宿主保存 Claude Test 开关的评估状态。
 */
var claudeTestGateStateSlot; // deferred: uses createGateNoteState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ae5g0zb5.js:80457", () => {
  claudeTestGateStateSlot = new HostScoped(createGateNoteState);
});
//@ chunk-ae5g0zb5.js:80474-80613 placement
/**
 * 读取 Claude Test 开关（GrowthBook tengu_mellow_hollerith + 登录账号）。
 */
function readClaudeTestGateState() {
  return readClaudeTestGate(
    {
      answer: () => getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_MELLOW_HOLLERITH, false),
      holdsFetchedAnswers: hasFreshGrowthBookFeatures,
      login: readSignedInAccount,
      wasToldStoredLogin: readFlagAccount,
      isOnWithFlagsOff: IS_ON_WITH_FLAGS_OFF,
    },
    claudeTestGateStateSlot.of(getRootSession().host),
  );
}
//@ chunk-ae5g0zb5.js:80613-80664 placement
/**
 * 把开关状态包装成 {note, isOn} 两个取值函数。
 */
var claudeTestGateApi = {
  note: () => readClaudeTestGateState().note(),
  isOn: () => readClaudeTestGateState().isOn(),
};
//@ chunk-ae5g0zb5.js:80664-80857 placement
/**
 * 打开计数与代次
 */
var CLAUDE_TEST_GATE_STATE = {
  open: 0,
};
var CLAUDE_TEST_CONSENT_KINDS = [
  "claude_test_allow",
  "claude_test_start_app",
  "claude_test_confirm_run",
  "claude_test_sign_in_as",
  "claude_test_fix_offer",
  "claude_test_more_tests",
  "claude_test_remember",
];
var gateGeneration = 0;
//@ chunk-ae5g0zb5.js:80857-80892 placement
/**
 * 打开计数 +1 并返回代次
 */
function openGate() {
  CLAUDE_TEST_GATE_STATE.open += 1;
  return gateGeneration;
}
//@ chunk-ae5g0zb5.js:80892-80947 placement
/**
 * 代次一致时减少打开计数
 */
function closeGate(gate) {
  if (gate === gateGeneration) CLAUDE_TEST_GATE_STATE.open = Math.max(0, CLAUDE_TEST_GATE_STATE.open - 1);
}
//@ chunk-ae5g0zb5.js:80947-80977 placement
/**
 * 清零计数并递代次
 */
function resetGates() {
  CLAUDE_TEST_GATE_STATE.open = 0;
  gateGeneration += 1;
}
//@ chunk-ae5g0zb5.js:80977-81008 placement
/**
 * 是否有打开的同意
 */
function isGateOpen() {
  return CLAUDE_TEST_GATE_STATE.open > 0;
}
//@ chunk-ae5g0zb5.js:81008-81020 placement
/**
 * 4000
 */
var MAX_PANE_JSON_BYTES = 4000;
//@ chunk-ae5g0zb5.js:81020-81160 placement
/**
 * 取会话根目录对应的项目目录及其工具权限决定（异步）。
 */
async function resolveProjectAndPermission(ctx) {
  let root;
  try {
    root = await ctx.session.root();
  } catch {
    return;
  }
  let dir = (await resolveAppDir(ctx, root, claudeTestState.typedArgs)).dir;
  return {
    project: dir,
    answer: decideToolPermission(ctx, dir),
  };
}
//@ chunk-ae5g0zb5.js:81160-81518 placement
async function decideToolPermission(ctx, project) {
  try {
    if (
      (
        await ctx.tool.check({
          tool: `${HELPER_TOOL_PREFIX}${CLAUDE_TEST_APP_UP}`,
          input: {
            project,
          },
        })
      ).decision !== "allow"
    )
      return;
    let answer = await ctx.mcp.call(HELPER_SERVER_NAME, CLAUDE_TEST_APP_UP, {
      project,
    });
    if (answer.isError) return;
    let joined = answer.content.map((part) => (part.type === "text" ? (part.text ?? "") : "")).join("");
    let parsed = JSON.parse(joined);
    if (!isPlainObjectNonArray(parsed) || !("up" in parsed)) return;
    let json = JSON.stringify(parsed);
    return json.length <= MAX_PANE_JSON_BYTES ? json : undefined;
  } catch {
    return;
  }
}
export {
  claudeTestGateApi,
  claudeTestGateStateSlot,
  NO_STORED_LOGIN,
  readClaudeTestGate,
  describeHelperState,
  IS_ON_WITH_FLAGS_OFF,
  createGateNoteState,
  cleanupOldClaudeTestFiles,
  readSignedInAccount,
  readFlagAccount,
  CLAUDE_TEST_CONSENT_KINDS,
  openGate,
  closeGate,
  isGateOpen,
  resolveProjectAndPermission,
  resetGates,
};
