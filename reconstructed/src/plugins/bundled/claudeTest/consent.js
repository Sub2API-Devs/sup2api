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
import { claudeTestInstalledRoot, TEST_PLUGIN_ID } from "../../../services/pluginTest/claudeTestPlugin.js";
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
async function cleanupOldClaudeTestFiles(e) {
  try {
    let date = new Date();
    await utimes(e, date, date);
    let r = (await isRetentionCleanupSafe(undefined, 0)) ? getCutoffDate() : null;
    if (r === null) return;
    let o = dirname(e);
    let s = await readdir(o, {
      withFileTypes: true,
    });
    for (let f of s)
      if (
        f.isDirectory() &&
        f.name !== basename(e) &&
        VERSION_DIR_RE.test(f.name) &&
        (await stat(join(o, f.name))).mtime < r
      )
        await rm(join(o, f.name), {
          recursive: true,
          force: true,
        });
    let a = join(o, "live");
    let c = s.some((f) => f.name === "live" && f.isDirectory())
      ? await readdir(a, {
          withFileTypes: true,
        }).catch(() => [])
      : [];
    for (let f of c) {
      if (!f.isDirectory() || !HASH_SUFFIX_RE.test(f.name)) continue;
      let b = await readdir(join(a, f.name), {
        withFileTypes: true,
      }).catch(() => []);
      for (let P of b) {
        let F = join(a, f.name, P.name);
        if (P.isDirectory() && RUN_DIR_NAME_RE.test(P.name) && (await lstat(F)).mtime < r)
          await rm(F, {
            recursive: true,
            force: true,
          });
      }
      await rmdir(join(a, f.name)).catch(() => {});
    }
    let _ = join(o, "consent");
    let w = s.some((f) => f.name === "consent" && f.isDirectory())
      ? await readdir(_, {
          withFileTypes: true,
        }).catch(() => [])
      : [];
    for (let f of w) {
      if (!f.isDirectory()) continue;
      let b = join(_, f.name, ALLOWED_STARTS_JSON);
      let P = await lstat(b).catch(() => null);
      if (P?.isFile() && P.mtime < r)
        await rm(b, {
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
    let { server: server_2, ...r } = await describeHelperFilesState();
    server = server_2;
    return r;
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
  let n = portPortedFiles(INSTALLED_FILES);
  let r = claudeTestInstalledRoot();
  let o = await listProjectRoots();
  let unsafeInheritedEnv = await findUnsafeInheritedEnv(buildAppEnvironment(), o);
  let command = await resolveTrustedNode(unsafeInheritedEnv, o);
  if (command === undefined) {
    logFeatureBad("claude_test_helper_files", "no_node");
    return {
      folder: r,
      problem: "no_node",
    };
  }
  try {
    let symlinkedAncestor = await findSymlinkedAncestor(r, Object.keys(n));
    if (symlinkedAncestor !== undefined) {
      logFeatureBad("claude_test_helper_files", "linked");
      return {
        folder: r,
        problem: "linked",
        what: symlinkedAncestor === "." ? r : join(r, symlinkedAncestor),
      };
    }
    let differingInstalledFile = await findDifferingInstalledFile(r, n);
    if (differingInstalledFile !== undefined) {
      logFeatureBad("claude_test_helper_files", "differs");
      return {
        folder: r,
        problem: "differs",
        what: differingInstalledFile,
      };
    }
  } catch (error) {
    logFeatureBad("claude_test_helper_files", "unwritable");
    return {
      folder: r,
      problem: "unwritable",
      what: errorMessage(error),
    };
  }
  await cleanupOldClaudeTestFiles(r);
  await writeMadeHereKey(pluginDataDirPath(TEST_PLUGIN_ID));
  logFeatureOk("claude_test_helper_files");
  let server = buildPlaywrightMcpServer(command, unsafeInheritedEnv);
  let teammateEnvVarsToForward = getTeammateEnvVarsToForward();
  let _ = teammateEnvVarsToForward.join() !== helperServerState.toldIgnored;
  helperServerState.toldIgnored = teammateEnvVarsToForward.join();
  return _ && teammateEnvVarsToForward.length > 0
    ? {
        folder: r,
        server,
        ignored: teammateEnvVarsToForward,
      }
    : {
        folder: r,
        server,
      };
}
//@ chunk-ae5g0zb5.js:78837-79040 placement
/**
 * 在要写入的文件的各级父目录中找符号链接目录。
 */
async function findSymlinkedAncestor(e, n) {
  let r = new Set(["."]);
  for (let o of n) for (let s = dirname(o); s !== "."; s = dirname(s)) r.add(s);
  for (let o of [...r].sort())
    if (
      (
        await lstat(join(e, o)).catch(() => {
          return;
        })
      )?.isSymbolicLink()
    )
      return o;
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
function readClaudeTestGate(e, n = createGateNoteState()) {
  return {
    note() {
      let r = n.noted === undefined;
      n.noted = {
        login: e.login(),
        holdsAnswers: e.holdsFetchedAnswers(),
      };
      let { login, holdsAnswers } = n.noted;
      if (!holdsAnswers) n.loginWhenLastEmpty = login;
      else if (r && login !== undefined && login !== NO_STORED_LOGIN && e.wasToldStoredLogin())
        n.loginWhenLastEmpty = login;
    },
    isOn() {
      let { value: r, source } = e.answer();
      if (source === "override") return r;
      if (source === "disabled") return e.isOnWithFlagsOff;
      let { noted } = n;
      if (noted?.login === undefined) return false;
      let a = noted.login !== NO_STORED_LOGIN;
      if (noted.holdsAnswers) {
        if (n.loginWhenLastEmpty !== noted.login || (a && !e.wasToldStoredLogin())) return false;
        let i = source === "payload" && r === true;
        if (a) n.keptByLogin.set(noted.login, i);
        return i;
      }
      return n.keptByLogin.get(noted.login) ?? false;
    },
  };
}
//@ chunk-ae5g0zb5.js:80457-80474 placement
/**
 * 按宿主保存 Claude Test 开关的评估状态。
 */
var claudeTestGateStateSlot = new HostScoped(createGateNoteState);
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
async function resolveProjectAndPermission(e) {
  let n;
  try {
    n = await e.session.root();
  } catch {
    return;
  }
  let dir = (await resolveAppDir(e, n, claudeTestState.typedArgs)).dir;
  return {
    project: dir,
    answer: decideToolPermission(e, dir),
  };
}
//@ chunk-ae5g0zb5.js:81160-81518 placement
async function decideToolPermission(e, project) {
  try {
    if (
      (
        await e.tool.check({
          tool: `${HELPER_TOOL_PREFIX}${CLAUDE_TEST_APP_UP}`,
          input: {
            project,
          },
        })
      ).decision !== "allow"
    )
      return;
    let o = await e.mcp.call(HELPER_SERVER_NAME, CLAUDE_TEST_APP_UP, {
      project,
    });
    if (o.isError) return;
    let joined = o.content.map((c) => (c.type === "text" ? (c.text ?? "") : "")).join("");
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
