/**
 * utils/git/builderGit/gitRun.ts
 *
 * builderGit：运行 git 与错误识别（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (16)
 * attribution: placement 16
 */
import { constants } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";
import { open, unlink } from "fs/promises";
import { READ_LIMITS } from "../../fsBoundRead.js";
import { logForDebugging } from "../../debug.js";
import { PROTECTED_ENV_VARS } from "../../permissions/protectedEnvAndGitPaths.js";
import { DIRECTORY_ENV_NAMES } from "./gitEnv.js";
import { caCertEnvVars } from "../../settings/managedSettingsKeys.js";
import { subprocessEnv } from "../../subprocessEnv.js";
import { env } from "../../env.js";
import { getHostAuthEnvVar } from "../../managedEnvConstants.js";
import { pickByHelper } from "../gitSafeEnv.js";
import { getEnvCaseInsensitive } from "../../plugins/securityDefaultPlugin.js";

//@ chunk-s61vbvea.js:214361-214438 placement
/**
 * stderr 被隐去时展示给用户的说明文字。
 */
var WITHHELD_STDERR_NOTICE = "git's own message is not shown, because it can quote private files";
//@ chunk-s61vbvea.js:214438-214492 placement
/**
 * 取 git 输出的 stderr（可能带隐去标注）。
 */
function seenStderr(e) {
  return e.withheldStderr?.() ?? e.stderr;
}
//@ chunk-s61vbvea.js:214492-214642 placement
function withholdGitStderr(e) {
  let stderr = e.stderr;
  return stderr === ""
    ? e
    : {
        ...e,
        stderr: "git's own message is not shown, because it can quote private files",
        withheldStderr: () => stderr,
      };
}
//@ chunk-s61vbvea.js:214790-214898 placement
/**
 * 让 git 把路径参数当字面量的环境变量。
 */
var LITERAL_PATHSPEC_ENV = {
  GIT_LITERAL_PATHSPECS: "1",
  GIT_GLOB_PATHSPECS: "0",
  GIT_NOGLOB_PATHSPECS: "0",
  GIT_ICASE_PATHSPECS: "0",
};
//@ chunk-s61vbvea.js:214898-214960 placement
/**
 * 把路径用双引号包裹并转义引号/反斜杠。
 */
function annotateStderr(borrowedObjects) {
  return `"${borrowedObjects.replace(/["\\]/g, (n) => `\\${n}`)}"`;
}
//@ chunk-s61vbvea.js:214960-214973 placement
var MAX_ARG_SLICE_BYTES = 16384;
//@ chunk-s61vbvea.js:214973-215233 placement
/**
 * 按字节上限把参数分批。
 */
function chunkArgsByBytes(e) {
  return e.reduce(
    (acc, r) => {
      let s = Buffer.byteLength(r) + 1;
      let last = acc.slices.at(-1);
      if (last !== undefined && last.length > 0 && acc.bytes + s <= MAX_ARG_SLICE_BYTES) {
        last.push(r);
        return {
          slices: acc.slices,
          bytes: acc.bytes + s,
        };
      }
      acc.slices.push([r]);
      return {
        slices: acc.slices,
        bytes: s,
      };
    },
    {
      slices: [],
      bytes: 0,
    },
  ).slices;
}
//@ chunk-s61vbvea.js:215233-215387 placement
/**
 * 按 1 MiB 分块读取文件并回调。
 */
async function readFileChunks(e, n) {
  let r = Buffer.alloc(1048576);
  for (let s = 0; ;) {
    let { bytesRead } = await e.read(r, 0, r.length, s);
    if (bytesRead === 0) return;
    n(r.subarray(0, bytesRead));
    s += bytesRead;
  }
}
//@ chunk-s61vbvea.js:215387-215432 placement
/**
 * 判断索引条目是否为 stage 0 且唯一。
 */
function splitArgsIntoSlices(e) {
  return e.stage === "0" && e.sole;
}
//@ chunk-s61vbvea.js:215432-215514 placement
/**
 * git 输出捕获用文件打开 flags（读写/只写，含 O_EXCL 与边界读取标志）。
 */
var GIT_STDOUT_CAPTURE_FLAGS = constants.O_RDWR | constants.O_CREAT | constants.O_EXCL | READ_LIMITS;
var GIT_STDERR_CAPTURE_FLAGS = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | READ_LIMITS;
//@ chunk-s61vbvea.js:215514-216287 placement
async function listIndexEntriesNamed(e, n, r, s) {
  let h = join(s, `named-${randomBytes(6).toString("hex")}.ls`);
  let y = await open(h, GIT_STDOUT_CAPTURE_FLAGS, 384);
  try {
    for (let x of chunkArgsByBytes([...r])) {
      let P = await e(
        ["-c", "core.precomposeUnicode=false", "ls-files", "-s", "-z", "--", ...x],
        {
          GIT_INDEX_FILE: n,
          ...LITERAL_PATHSPEC_ENV,
        },
        undefined,
        undefined,
        y.fd,
      );
      if (P.code !== 0) {
        logForDebugging(`[indexEntriesNamed] ls-files exited ${String(P.code)}`);
        return null;
      }
    }
    let S = new Map();
    let w = "";
    let R = (x) => {
      let index = x.indexOf("\t");
      let str = Buffer.from(x.slice(index + 1), "latin1").toString("utf8");
      if (r.has(str)) {
        let [G = "", L = "", q = ""] = x.slice(0, index).split(" ");
        let Q = S.get(str);
        let sole = Q === undefined || (Q.sole && Q.mode === G && Q.id === L && Q.stage === q);
        S.set(str, {
          mode: G,
          id: L,
          stage: q,
          sole,
        });
      }
    };
    await readFileChunks(y, (x) => {
      let parts = (w + x.toString("latin1")).split("\x00");
      w = parts.pop() ?? "";
      parts.forEach(R);
    });
    return w === "" ? S : null;
  } finally {
    await y.close();
    await unlink(h).catch(() => {});
  }
}
//@ chunk-s61vbvea.js:216287-216599 placement
/**
 * 影响 git 配置位置的变量与需保留的变量集合。
 */
var GIT_LOCATION_ENV_VARS = [
  "GIT_CONFIG_GLOBAL",
  "GIT_CONFIG_SYSTEM",
  "GIT_CONFIG_NOSYSTEM",
  "HOME",
  "XDG_CONFIG_HOME",
  "HOMEDRIVE",
  "HOMEPATH",
  "USERPROFILE",
  "PROGRAMDATA",
  "PATH",
];
var PRESERVED_ENV_VARS = new Set(
  [
    ...GIT_LOCATION_ENV_VARS,
    ...PROTECTED_ENV_VARS,
    ...DIRECTORY_ENV_NAMES,
    ...caCertEnvVars,
    "NO_PROXY",
    "GNUPGHOME",
    "SSH_AUTH_SOCK",
    "NoDefaultCurrentDirectoryInExePath",
  ].map((e) => e.toUpperCase()),
);
var ACTION_INPUT_RE = /^INPUT_|-/i;
//@ chunk-s61vbvea.js:216599-216828 placement
/**
 * 只保留受保护或与子进程环境不同的变量。
 */
function pickPreservedEnv(preSettingsEnv) {
  let n = subprocessEnv();
  let mapped = [
    preSettingsEnv,
    {
      CLAUDE_CODE_HOST_AUTH_ENV_VAR: env.CLAUDE_CODE_HOST_AUTH_ENV_VAR,
    },
  ].map((s) => getHostAuthEnvVar(s)?.toUpperCase());
  return pickByHelper(
    preSettingsEnv,
    (s, h) =>
      (PRESERVED_ENV_VARS.has(h.toUpperCase()) && !mapped.includes(h.toUpperCase())) ||
      (!ACTION_INPUT_RE.test(h) && getEnvCaseInsensitive(n, h) === s),
  );
}
//@ chunk-s61vbvea.js:216828-216853 placement
/**
 * 原样返回（失败分类器的默认实现）。
 */
function GIT_FAILURE_CLASSIFIERS(preSettingsEnv) {
  return preSettingsEnv;
}
//@ chunk-s61vbvea.js:216853-217451 placement
var GIT_REFUSAL_PATTERNS = [
  ["fatal: detected dubious ownership in repository at ", "git_refused_dubious_ownership"],
  ["fatal: unsafe repository (", "git_refused_dubious_ownership"],
  ["fatal: not a git repository", "git_refused_not_a_repository"],
  ["fatal: bad config ", "git_refused_bad_config"],
  ["fatal: bad numeric config value ", "git_refused_bad_config"],
  ["fatal: bad boolean config value ", "git_refused_bad_config"],
  ["fatal: unable to access ", "git_refused_config_unreadable"],
  ["fatal: unknown repository extension", "git_refused_unknown_extension"],
  ["fatal: Expected git repo version ", "git_refused_unknown_extension"],
];
//@ chunk-s61vbvea.js:217451-217511 placement
/**
 * 按前缀匹配给出首条 git 失败分类。
 */
function firstGitFailureClass(e) {
  return GIT_REFUSAL_PATTERNS.find(([n]) => e.startsWith(n))?.[1];
}
export {
  LITERAL_PATHSPEC_ENV,
  GIT_FAILURE_CLASSIFIERS,
  pickPreservedEnv,
  seenStderr,
  listIndexEntriesNamed,
  splitArgsIntoSlices,
  chunkArgsByBytes,
  readFileChunks,
  GIT_STDOUT_CAPTURE_FLAGS,
  GIT_STDERR_CAPTURE_FLAGS,
  firstGitFailureClass,
  WITHHELD_STDERR_NOTICE,
  annotateStderr,
  withholdGitStderr,
};
