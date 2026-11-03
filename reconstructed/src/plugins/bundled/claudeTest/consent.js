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
import {
  utimes,
  readdir,
  readdir as readdir_2,
  stat,
  rm,
  rm as rm_2,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  rmdir,
} from "fs/promises";
import {
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  basename,
  basename as basename_2,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
} from "path";
import { isRetentionCleanupSafe, getCutoffDate } from "../../../utils/cleanup.js";
import { logForDebugging } from "../../../utils/debug.js";
import { errorMessage, toError } from "../../../utils/errors.js";
import { Be, yt, buildPlaywrightMcpServer, u0e, CLAUDE_TEST_APP_UP, IZ } from "./constants.js";
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
import { claudeTestInstalledRoot, pet } from "../../../services/pluginTest/claudeTestPlugin.js";
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
import { claudeTestState, G } from "./appFacts.js";

/**
 * 旧版本文件夹、哈希后缀与运行目录的名称格式。
 */
//@ chunk-ae5g0zb5.js:76654-76790 placement
var VERSION_DIR_RE = /^\d+\.\d+\.\d+(-[0-9a-f]{12})?$/,
  HASH_SUFFIX_RE = /-[0-9a-f]{64}$/,
  RUN_DIR_NAME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(-\d+)?$/,
  ALLOWED_STARTS_JSON = "allowed-starts.json";
/**
 * 清理旧版本文件夹、过期的 live 页面与记住的同意记录。
 */
//@ chunk-ae5g0zb5.js:76790-77881 placement
async function cleanupOldClaudeTestFiles(e) {
  try {
    let date = new Date();
    await utimes(e, date, date);
    let r = (await isRetentionCleanupSafe(void 0, 0)) ? getCutoffDate() : null;
    if (r === null) return;
    let o = dirname_4(e),
      s = await readdir(o, { withFileTypes: !0 });
    for (let f of s)
      if (
        f.isDirectory() &&
        f.name !== basename_2(e) &&
        VERSION_DIR_RE.test(f.name) &&
        (await stat(join_5(o, f.name))).mtime < r
      )
        await rm_2(join_5(o, f.name), { recursive: !0, force: !0 });
    let a = join_5(o, "live"),
      c = s.some((f) => f.name === "live" && f.isDirectory())
        ? await readdir(a, { withFileTypes: !0 }).catch(() => [])
        : [];
    for (let f of c) {
      if (!f.isDirectory() || !HASH_SUFFIX_RE.test(f.name)) continue;
      let b = await readdir(join_5(a, f.name), { withFileTypes: !0 }).catch(() => []);
      for (let P of b) {
        let F = join_5(a, f.name, P.name);
        if (P.isDirectory() && RUN_DIR_NAME_RE.test(P.name) && (await lstat_4(F)).mtime < r)
          await rm_2(F, { recursive: !0, force: !0 });
      }
      await rmdir(join_5(a, f.name)).catch(() => {});
    }
    let _ = join_5(o, "consent"),
      w = s.some((f) => f.name === "consent" && f.isDirectory())
        ? await readdir(_, { withFileTypes: !0 }).catch(() => [])
        : [];
    for (let f of w) {
      if (!f.isDirectory()) continue;
      let b = join_5(_, f.name, ALLOWED_STARTS_JSON),
        P = await lstat_4(b).catch(() => null);
      if (P?.isFile() && P.mtime < r) await rm_2(b, { force: !0 });
    }
  } catch (error) {
    logForDebugging(
      `claude-test: old version folders, live pages or remembered starts not cleaned up: ${errorMessage(error)}`,
    );
  }
}
//@ chunk-ae5g0zb5.js:77881-77973 placement
var Gr = async () => {
  let e;
  try {
    let { server: server, ...r } = await describeHelperFilesState();
    return ((e = server), r);
  } finally {
    Be.server = e;
  }
};
//@ chunk-ae5g0zb5.js:77973-78837 placement
async function describeHelperFilesState() {
  if (isDiskless())
    return (logFeatureBad("claude_test_helper_files", "diskless"), { folder: "", problem: "diskless" });
  let { INSTALLED_FILES: INSTALLED_FILES } = await loadInstalledFiles(),
    n = yt(INSTALLED_FILES),
    r = claudeTestInstalledRoot(),
    o = await listProjectRoots(),
    s = await findUnsafeInheritedEnv(buildAppEnvironment(), o),
    a = await resolveTrustedNode(s, o);
  if (a === void 0)
    return (logFeatureBad("claude_test_helper_files", "no_node"), { folder: r, problem: "no_node" });
  try {
    let S = await findSymlinkedAncestor(r, Object.keys(n));
    if (S !== void 0)
      return (
        logFeatureBad("claude_test_helper_files", "linked"),
        { folder: r, problem: "linked", what: S === "." ? r : join_2(r, S) }
      );
    let w = await findDifferingInstalledFile(r, n);
    if (w !== void 0)
      return (
        logFeatureBad("claude_test_helper_files", "differs"),
        { folder: r, problem: "differs", what: w }
      );
  } catch (error) {
    return (
      logFeatureBad("claude_test_helper_files", "unwritable"),
      { folder: r, problem: "unwritable", what: errorMessage(error) }
    );
  }
  (await cleanupOldClaudeTestFiles(r),
    await writeMadeHereKey(pluginDataDirPath(pet)),
    logFeatureOk("claude_test_helper_files"));
  let i = buildPlaywrightMcpServer(a, s),
    c = getTeammateEnvVarsToForward(),
    _ = c.join() !== Be.toldIgnored;
  return (
    (Be.toldIgnored = c.join()),
    _ && c.length > 0 ? { folder: r, server: i, ignored: c } : { folder: r, server: i }
  );
}
/**
 * 在要写入的文件的各级父目录中找符号链接目录。
 */
//@ chunk-ae5g0zb5.js:78837-79040 placement
async function findSymlinkedAncestor(e, n) {
  let r = new Set(["."]);
  for (let o of n) for (let s = dirname_2(o); s !== "."; s = dirname_2(s)) r.add(s);
  for (let o of [...r].sort())
    if (
      (
        await lstat_2(join_2(e, o)).catch(() => {
          return;
        })
      )?.isSymbolicLink()
    )
      return o;
  return;
}
//@ chunk-ae5g0zb5.js:79040-79050 placement
var Ur = !1;
//@ chunk-ae5g0zb5.js:79050-79075 placement
var Dt = "no stored login";
//@ chunk-ae5g0zb5.js:79075-79400 placement
function readSignedInAccount() {
  try {
    if (
      getAuthTokenSource().source !== "claude.ai" ||
      !credentialIsOwnStoredLogin() ||
      !isAnthropicAuthEnabled()
    )
      return Dt;
    let e = getOauthAccountInfo(),
      n = getSubscriptionType();
    if (!e?.accountUuid || !e.organizationUuid || n === null) return;
    return `${e.accountUuid}:${e.organizationUuid}:${n}`;
  } catch (error) {
    logForDebugging(
      `claude-test: could not read who is signed in (${toError(error).name}); /claude-test is not offered`,
      { level: "error" },
    );
    return;
  }
}
//@ chunk-ae5g0zb5.js:79400-79735 placement
function readFlagAccount() {
  try {
    let e = getOauthAccountInfo(),
      n = getGrowthBookClientIdentity();
    return (
      e?.accountUuid !== void 0 &&
      e.organizationUuid !== void 0 &&
      n.accountUuid === e.accountUuid &&
      n.organizationUuid === e.organizationUuid
    );
  } catch (error) {
    return (
      logForDebugging(
        `claude-test: could not read the account Claude Code's flag client was built with (${toError(error).name}); /claude-test is not offered`,
        { level: "error" },
      ),
      !1
    );
  }
}
//@ chunk-ae5g0zb5.js:79735-79816 placement
function $r() {
  return { keptByLogin: new Map(), noted: void 0, loginWhenLastEmpty: void 0 };
}
/**
 * 读取 Claude Test 开关（override/disabled/payload）。
 */
//@ chunk-ae5g0zb5.js:79816-80457 placement
function readClaudeTestGate(e, n = $r()) {
  return {
    note() {
      let r = n.noted === void 0;
      n.noted = { login: e.login(), holdsAnswers: e.holdsFetchedAnswers() };
      let { login: login, holdsAnswers: holdsAnswers } = n.noted;
      if (!holdsAnswers) n.loginWhenLastEmpty = login;
      else if (r && login !== void 0 && login !== Dt && e.wasToldStoredLogin()) n.loginWhenLastEmpty = login;
    },
    isOn() {
      let { value: r, source: source } = e.answer();
      if (source === "override") return r;
      if (source === "disabled") return e.isOnWithFlagsOff;
      let { noted: noted } = n;
      if (noted?.login === void 0) return !1;
      let a = noted.login !== Dt;
      if (noted.holdsAnswers) {
        if (n.loginWhenLastEmpty !== noted.login || (a && !e.wasToldStoredLogin())) return !1;
        let i = source === "payload" && r === !0;
        if (a) n.keptByLogin.set(noted.login, i);
        return i;
      }
      return n.keptByLogin.get(noted.login) ?? !1;
    },
  };
}
//@ chunk-ae5g0zb5.js:80457-80474 placement
var Wi = new HostScoped($r);
/**
 * 读取 Claude Test 开关（GrowthBook tengu_mellow_hollerith + 登录账号）。
 */
//@ chunk-ae5g0zb5.js:80474-80613 placement
function readClaudeTestGateState() {
  return readClaudeTestGate(
    {
      answer: () => getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_MELLOW_HOLLERITH, !1),
      holdsFetchedAnswers: hasFreshGrowthBookFeatures,
      login: readSignedInAccount,
      wasToldStoredLogin: readFlagAccount,
      isOnWithFlagsOff: Ur,
    },
    Wi.of(getRootSession().host),
  );
}
//@ chunk-ae5g0zb5.js:80613-80664 placement
var An = { note: () => readClaudeTestGateState().note(), isOn: () => readClaudeTestGateState().isOn() };
//@ chunk-ae5g0zb5.js:80664-80857 placement
var CLAUDE_TEST_GATE_STATE = { open: 0 },
  Ui = [
    "claude_test_allow",
    "claude_test_start_app",
    "claude_test_confirm_run",
    "claude_test_sign_in_as",
    "claude_test_fix_offer",
    "claude_test_more_tests",
    "claude_test_remember",
  ],
  Vr = 0;
//@ chunk-ae5g0zb5.js:80857-80892 placement
function Bi() {
  return ((CLAUDE_TEST_GATE_STATE.open += 1), Vr);
}
//@ chunk-ae5g0zb5.js:80892-80947 placement
function $i(e) {
  if (e === Vr) CLAUDE_TEST_GATE_STATE.open = Math.max(0, CLAUDE_TEST_GATE_STATE.open - 1);
}
//@ chunk-ae5g0zb5.js:80947-80977 placement
function Vi() {
  ((CLAUDE_TEST_GATE_STATE.open = 0), (Vr += 1));
}
//@ chunk-ae5g0zb5.js:80977-81008 placement
function Xi() {
  return CLAUDE_TEST_GATE_STATE.open > 0;
}
//@ chunk-ae5g0zb5.js:81008-81020 placement
var cu = 4000;
/**
 * 取会话根目录对应的项目目录及其工具权限决定（异步）。
 */
//@ chunk-ae5g0zb5.js:81020-81160 placement
async function resolveProjectAndPermission(e) {
  let n;
  try {
    n = await e.session.root();
  } catch {
    return;
  }
  let dir = (await resolveAppDir(e, n, claudeTestState.typedArgs)).dir;
  return { project: dir, answer: decideToolPermission(e, dir) };
}
//@ chunk-ae5g0zb5.js:81160-81518 placement
async function decideToolPermission(e, n) {
  try {
    if (
      (await e.tool.check({ tool: `${u0e}${CLAUDE_TEST_APP_UP}`, input: { project: n } })).decision !==
      "allow"
    )
      return;
    let o = await e.mcp.call(IZ, CLAUDE_TEST_APP_UP, { project: n });
    if (o.isError) return;
    let joined = o.content.map((c) => (c.type === "text" ? (c.text ?? "") : "")).join(""),
      parsed = JSON.parse(joined);
    if (!G(parsed) || !("up" in parsed)) return;
    let json = JSON.stringify(parsed);
    return json.length <= cu ? json : void 0;
  } catch {
    return;
  }
}

export {
  An,
  Wi,
  Dt,
  readClaudeTestGate,
  Gr,
  Ur,
  $r,
  cleanupOldClaudeTestFiles,
  readSignedInAccount,
  readFlagAccount,
  Ui,
  Bi,
  $i,
  Xi,
  resolveProjectAndPermission,
  Vi,
};
