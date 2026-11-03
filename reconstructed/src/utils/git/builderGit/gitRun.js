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
import {
  constants,
  constants as constants_2,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
} from "fs";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
} from "path";
import { randomBytes } from "crypto";
import {
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  unlink,
  unlink as unlink_2,
} from "fs/promises";
import { READ_LIMITS } from "../../fsBoundRead.js";
import { logForDebugging } from "../../debug.js";
import { PROTECTED_ENV_VARS } from "../../permissions/protectedEnvAndGitPaths.js";
import { id } from "./gitEnv.js";
import { Gle } from "../../settings/managedSettingsKeys.js";
import { subprocessEnv } from "../../subprocessEnv.js";
import { env } from "../../env.js";
import { getHostAuthEnvVar } from "../../managedEnvConstants.js";
import { Do } from "../gitSafeEnv.js";
import { getEnvCaseInsensitive } from "../../plugins/securityDefaultPlugin.js";

//@ chunk-s61vbvea.js:214361-214438 placement
var EZs = "git's own message is not shown, because it can quote private files";
//@ chunk-s61vbvea.js:214438-214492 placement
function txe(e) {
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
/**
 * 让 git 把路径参数当字面量的环境变量。
 */
//@ chunk-s61vbvea.js:214790-214898 placement
var LITERAL_PATHSPEC_ENV = {
  GIT_LITERAL_PATHSPECS: "1",
  GIT_GLOB_PATHSPECS: "0",
  GIT_NOGLOB_PATHSPECS: "0",
  GIT_ICASE_PATHSPECS: "0",
};
//@ chunk-s61vbvea.js:214898-214960 placement
function uy(e) {
  return `"${e.replace(/["\\]/g, (n) => `\\${n}`)}"`;
}
//@ chunk-s61vbvea.js:214960-214973 placement
var sP = 16384;
/**
 * 按字节上限把参数分批。
 */
//@ chunk-s61vbvea.js:214973-215233 placement
function chunkArgsByBytes(e) {
  return e.reduce(
    (n, r) => {
      let s = Buffer.byteLength(r) + 1,
        at = n.slices.at(-1);
      if (at !== void 0 && at.length > 0 && n.bytes + s <= sP)
        return (at.push(r), { slices: n.slices, bytes: n.bytes + s });
      return (n.slices.push([r]), { slices: n.slices, bytes: s });
    },
    { slices: [], bytes: 0 },
  ).slices;
}
/**
 * 按 1 MiB 分块读取文件并回调。
 */
//@ chunk-s61vbvea.js:215233-215387 placement
async function readFileChunks(e, n) {
  let alloc = Buffer.alloc(1048576);
  for (let s = 0; ;) {
    let { bytesRead: bytesRead } = await e.read(alloc, 0, alloc.length, s);
    if (bytesRead === 0) return;
    (n(alloc.subarray(0, bytesRead)), (s += bytesRead));
  }
}
//@ chunk-s61vbvea.js:215387-215432 placement
function Cqr(e) {
  return e.stage === "0" && e.sole;
}
//@ chunk-s61vbvea.js:215432-215514 placement
var YZn = constants_5.O_RDWR | constants_5.O_CREAT | constants_5.O_EXCL | READ_LIMITS,
  Rqr = constants_5.O_WRONLY | constants_5.O_CREAT | constants_5.O_EXCL | READ_LIMITS;
//@ chunk-s61vbvea.js:215514-216287 placement
async function listIndexEntriesNamed(e, n, r, s) {
  let h = join_8(s, `named-${randomBytes(6).toString("hex")}.ls`),
    y = await open_5(h, YZn, 384);
  try {
    for (let x of chunkArgsByBytes([...r])) {
      let P = await e(
        ["-c", "core.precomposeUnicode=false", "ls-files", "-s", "-z", "--", ...x],
        { GIT_INDEX_FILE: n, ...LITERAL_PATHSPEC_ENV },
        void 0,
        void 0,
        y.fd,
      );
      if (P.code !== 0)
        return (logForDebugging(`[indexEntriesNamed] ls-files exited ${String(P.code)}`), null);
    }
    let S = new Map(),
      w = "",
      R = (x) => {
        let index = x.indexOf("\t"),
          str = Buffer.from(x.slice(index + 1), "latin1").toString("utf8");
        if (r.has(str)) {
          let [G = "", L = "", q = ""] = x.slice(0, index).split(" "),
            Q = S.get(str),
            Z = Q === void 0 || (Q.sole && Q.mode === G && Q.id === L && Q.stage === q);
          S.set(str, { mode: G, id: L, stage: q, sole: Z });
        }
      };
    return (
      await readFileChunks(y, (x) => {
        let parts = (w + x.toString("latin1")).split("\x00");
        ((w = parts.pop() ?? ""), parts.forEach(R));
      }),
      w === "" ? S : null
    );
  } finally {
    (await y.close(), await unlink_2(h).catch(() => {}));
  }
}
/**
 * 影响 git 配置位置的变量与需保留的变量集合。
 */
//@ chunk-s61vbvea.js:216287-216599 placement
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
  ],
  PRESERVED_ENV_VARS = new Set(
    [
      ...GIT_LOCATION_ENV_VARS,
      ...PROTECTED_ENV_VARS,
      ...id,
      ...Gle,
      "NO_PROXY",
      "GNUPGHOME",
      "SSH_AUTH_SOCK",
      "NoDefaultCurrentDirectoryInExePath",
    ].map((e) => e.toUpperCase()),
  ),
  ACTION_INPUT_RE = /^INPUT_|-/i;
/**
 * 只保留受保护或与子进程环境不同的变量。
 */
//@ chunk-s61vbvea.js:216599-216828 placement
function pickPreservedEnv(e) {
  let n = subprocessEnv(),
    mapped = [e, { CLAUDE_CODE_HOST_AUTH_ENV_VAR: env.CLAUDE_CODE_HOST_AUTH_ENV_VAR }].map((s) =>
      getHostAuthEnvVar(s)?.toUpperCase(),
    );
  return Do(
    e,
    (s, h) =>
      (PRESERVED_ENV_VARS.has(h.toUpperCase()) && !mapped.includes(h.toUpperCase())) ||
      (!ACTION_INPUT_RE.test(h) && getEnvCaseInsensitive(n, h) === s),
  );
}
//@ chunk-s61vbvea.js:216828-216853 placement
function Pqr(e) {
  return e;
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
function RVo(e) {
  return GIT_REFUSAL_PATTERNS.find(([n]) => e.startsWith(n))?.[1];
}

export {
  LITERAL_PATHSPEC_ENV,
  Pqr,
  pickPreservedEnv,
  txe,
  listIndexEntriesNamed,
  Cqr,
  chunkArgsByBytes,
  readFileChunks,
  YZn,
  Rqr,
  RVo,
  EZs,
  uy,
  withholdGitStderr,
};
