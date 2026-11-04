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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:214361-214438 placement
/**
 * stderr 被隐去时展示给用户的说明文字。
 */
var WITHHELD_STDERR_NOTICE = "git's own message is not shown, because it can quote private files";
//@ chunk-s61vbvea.js:214438-214492 placement
/**
 * 取 git 输出的 stderr（可能带隐去标注）。
 */
function seenStderr(result) {
  return result.withheldStderr?.() ?? result.stderr;
}
//@ chunk-s61vbvea.js:214492-214642 placement
function withholdGitStderr(result) {
  let stderr = result.stderr;
  return stderr === ""
    ? result
    : {
        ...result,
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
  return `"${borrowedObjects.replace(/["\\]/g, (char) => `\\${char}`)}"`;
}
//@ chunk-s61vbvea.js:214960-214973 placement
var MAX_ARG_SLICE_BYTES = 16384;
//@ chunk-s61vbvea.js:214973-215233 placement
/**
 * 按字节上限把参数分批。
 */
function chunkArgsByBytes(args) {
  return args.reduce(
    (acc, arg) => {
      let argBytes = Buffer.byteLength(arg) + 1;
      let last = acc.slices.at(-1);
      if (last !== undefined && last.length > 0 && acc.bytes + argBytes <= MAX_ARG_SLICE_BYTES) {
        last.push(arg);
        return {
          slices: acc.slices,
          bytes: acc.bytes + argBytes,
        };
      }
      acc.slices.push([arg]);
      return {
        slices: acc.slices,
        bytes: argBytes,
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
async function readFileChunks(handle, onChunk) {
  let buffer = Buffer.alloc(1048576);
  for (let offset = 0; ;) {
    let { bytesRead } = await handle.read(buffer, 0, buffer.length, offset);
    if (bytesRead === 0) return;
    onChunk(buffer.subarray(0, bytesRead));
    offset += bytesRead;
  }
}
//@ chunk-s61vbvea.js:215387-215432 placement
/**
 * 判断索引条目是否为 stage 0 且唯一。
 */
function splitArgsIntoSlices(entry) {
  return entry.stage === "0" && entry.sole;
}
//@ chunk-s61vbvea.js:215432-215514 placement
/**
 * git 输出捕获用文件打开 flags（读写/只写，含 O_EXCL 与边界读取标志）。
 */
var GIT_STDOUT_CAPTURE_FLAGS; // deferred: uses READ_LIMITS (../../fsBoundRead.js) of its import cycle while loading; runs once the cycle is complete
var GIT_STDERR_CAPTURE_FLAGS;
deferInit("chunk-s61vbvea.js:215432", () => {
  GIT_STDOUT_CAPTURE_FLAGS = constants.O_RDWR | constants.O_CREAT | constants.O_EXCL | READ_LIMITS;
  GIT_STDERR_CAPTURE_FLAGS = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | READ_LIMITS;
});
//@ chunk-s61vbvea.js:215514-216287 placement
async function listIndexEntriesNamed(runGit, indexFile, paths, dir) {
  let listFilePath = join(dir, `named-${randomBytes(6).toString("hex")}.ls`);
  let handle = await open(listFilePath, GIT_STDOUT_CAPTURE_FLAGS, 384);
  try {
    for (let argSlice of chunkArgsByBytes([...paths])) {
      let result = await runGit(
        ["-c", "core.precomposeUnicode=false", "ls-files", "-s", "-z", "--", ...argSlice],
        {
          GIT_INDEX_FILE: indexFile,
          ...LITERAL_PATHSPEC_ENV,
        },
        undefined,
        undefined,
        handle.fd,
      );
      if (result.code !== 0) {
        logForDebugging(`[indexEntriesNamed] ls-files exited ${String(result.code)}`);
        return null;
      }
    }
    let entries = new Map();
    let partial = "";
    let handleRecord = (record) => {
      let index = record.indexOf("\t");
      let str = Buffer.from(record.slice(index + 1), "latin1").toString("utf8");
      if (paths.has(str)) {
        let [mode = "", id = "", stage = ""] = record.slice(0, index).split(" ");
        let entry = entries.get(str);
        let sole =
          entry === undefined ||
          (entry.sole && entry.mode === mode && entry.id === id && entry.stage === stage);
        entries.set(str, {
          mode,
          id,
          stage,
          sole,
        });
      }
    };
    await readFileChunks(handle, (chunk) => {
      let parts = (partial + chunk.toString("latin1")).split("\x00");
      partial = parts.pop() ?? "";
      parts.forEach(handleRecord);
    });
    return partial === "" ? entries : null;
  } finally {
    await handle.close();
    await unlink(listFilePath).catch(() => {});
  }
}
//@ chunk-s61vbvea.js:216287-216599 placement
/**
 * 影响 git 配置位置的变量与需保留的变量集合。
 */
var GIT_LOCATION_ENV_VARS; // deferred: uses PROTECTED_ENV_VARS (../../permissions/protectedEnvAndGitPaths.js) of its import cycle while loading; runs once the cycle is complete
var PRESERVED_ENV_VARS;
var ACTION_INPUT_RE;
deferInit("chunk-s61vbvea.js:216287", () => {
  GIT_LOCATION_ENV_VARS = [
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
  PRESERVED_ENV_VARS = new Set(
    [
      ...GIT_LOCATION_ENV_VARS,
      ...PROTECTED_ENV_VARS,
      ...DIRECTORY_ENV_NAMES,
      ...caCertEnvVars,
      "NO_PROXY",
      "GNUPGHOME",
      "SSH_AUTH_SOCK",
      "NoDefaultCurrentDirectoryInExePath",
    ].map((name) => name.toUpperCase()),
  );
  ACTION_INPUT_RE = /^INPUT_|-/i;
});
//@ chunk-s61vbvea.js:216599-216828 placement
/**
 * 只保留受保护或与子进程环境不同的变量。
 */
function pickPreservedEnv(preSettingsEnv) {
  let env_2 = subprocessEnv();
  let mapped = [
    preSettingsEnv,
    {
      CLAUDE_CODE_HOST_AUTH_ENV_VAR: env.CLAUDE_CODE_HOST_AUTH_ENV_VAR,
    },
  ].map((hostAuthVar) => getHostAuthEnvVar(hostAuthVar)?.toUpperCase());
  return pickByHelper(
    preSettingsEnv,
    (value, key) =>
      (PRESERVED_ENV_VARS.has(key.toUpperCase()) && !mapped.includes(key.toUpperCase())) ||
      (!ACTION_INPUT_RE.test(key) && getEnvCaseInsensitive(env_2, key) === value),
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
function firstGitFailureClass(stderr) {
  return GIT_REFUSAL_PATTERNS.find(([prefix]) => stderr.startsWith(prefix))?.[1];
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
