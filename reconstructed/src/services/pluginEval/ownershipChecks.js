/**
 * services/pluginEval/ownershipChecks.ts
 *
 * 2.1.316 新增：plugin eval 对插件/用例目录的属主与可写性检查（非本人、组/他人可写、符号链接时拒绝）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (21)
 * attribution: placement 21
 */
import { userInfo } from "os";
import { readdir, readFile } from "fs/promises";
import { MAX_WALK_DIRECTORIES } from "./caseDiscovery.js";
import { toEvalPathError } from "./evalDir.js";
import { isDockerenvPresent, env } from "../../utils/env.js";
import { getPlatform } from "../../utils/platform.js";
import { getErrnoCode } from "../../utils/errors.js";
import { execFileNoThrowWithCwd } from "../../utils/execFileNoThrow.js";
import { uniq } from "../../utils/collections.js";
import { formatGuardValueJson } from "../../cli/handlers/pluginEval/mockGuards.js";
import { logForDebugging } from "../../utils/debug.js";
import { escapeNonAscii } from "../../utils/resultError.js";

//@ chunk-qchp9vrd.js:68707-68824 placement
var UNTRUSTED_FOLDER_REASON =
  "is not owned by you, is writable by other users, is a symlink, or could not be fully examined (see --debug)";
//@ chunk-qchp9vrd.js:68824-69137 placement
function checkTreeTrust(e) {
  return {
    treeMaxEntries: Math.min(e?.treeMaxEntries ?? MAX_WALK_DIRECTORIES, MAX_WALK_DIRECTORIES),
    groups: e?.groups,
    groupsLoading: e?.groups === undefined ? undefined : Promise.resolve(),
    groupsUnverifiableWhy: undefined,
    modesByDevice: new Map(),
    verdicts: new Map(),
    consentRoot: e?.consentRoot ?? null,
    reasons: new Map(),
    skillFolderProbes: new Map(),
    rootRealpaths: new Map(),
  };
}
//@ chunk-qchp9vrd.js:69137-69208 placement
/**
 * 判断路径是否在已同意的根目录内。
 */
function isInsideConsentRoot(e, n) {
  let consentRoot = e.consentRoot;
  return consentRoot !== null && (n === consentRoot || toEvalPathError(consentRoot, n));
}
//@ chunk-qchp9vrd.js:69208-69263 placement
/**
 * 是否处于容器或 root 环境（用户库不再可靠）。
 */
function isContainerOrRoot(e) {
  return isDockerenvPresent() || e?.containerEvidence === true;
}
//@ chunk-qchp9vrd.js:69263-69467 placement
function isOwnedByUser(uid, n) {
  if (typeof process.getuid !== "function") return true;
  let r = process.getuid();
  if (r !== 0) return uid === r;
  let verifiedSudoUser = getVerifiedSudoUser(n);
  if (verifiedSudoUser !== null) return uid === 0 || uid === verifiedSudoUser.uid;
  return uid === 0 || (isContainerOrRoot(n) && n?.localUids?.has(uid) === false);
}
//@ chunk-qchp9vrd.js:69467-69706 placement
function getVerifiedSudoUser(e) {
  if (typeof process.getuid !== "function" || process.getuid() !== 0) return null;
  let SUDO_UID = env.SUDO_UID;
  let SUDO_GID = env.SUDO_GID;
  let SUDO_USER = env.SUDO_USER;
  return SUDO_UID !== undefined &&
    SUDO_GID !== undefined &&
    SUDO_USER !== undefined &&
    e?.sudoVerified === true
    ? {
        uid: SUDO_UID,
        gid: e.sudoPrimaryGid ?? SUDO_GID,
        user: SUDO_USER,
      }
    : null;
}
//@ chunk-qchp9vrd.js:69706-69802 placement
/**
 * 计算应当匹配的 gid（root 下取目标用户的 gid）。
 */
function expectedGid(e) {
  if (typeof process.getgid !== "function") return;
  return getVerifiedSudoUser(e)?.gid ?? process.getgid();
}
//@ chunk-qchp9vrd.js:69802-70127 placement
/**
 * 判断文件属组是否为当前用户组：无 getgid 视为是，macOS 视为否，root 时按目标用户的 gid 判断。
 */
function isOwnedByUserGroup(e, n) {
  if (typeof process.getgid !== "function") return true;
  if (getPlatform() === "macos") return false;
  if (typeof process.getuid === "function" && process.getuid() === 0) {
    let verifiedSudoUser = getVerifiedSudoUser(n);
    if (verifiedSudoUser === null) return e === 0 || (isContainerOrRoot(n) && n?.localGids?.has(e) === false);
    return (
      e === verifiedSudoUser.gid &&
      isPrivateUserGroup(n, verifiedSudoUser.gid, verifiedSudoUser.uid, verifiedSudoUser.user)
    );
  }
  return e === process.getgid() && isPrivateUserGroup(n, e, process.getuid(), getCachedUsername(n));
}
//@ chunk-qchp9vrd.js:70127-70305 placement
function isPrivateUserGroup(e, n, r, a) {
  if (n !== r || a === undefined || a === "") return false;
  let s = e?.groups?.get(n);
  return (
    s !== undefined &&
    s.name === a &&
    s.members.every((member) => member === a) &&
    s.primaryMembers.every((primaryMember) => primaryMember === a)
  );
}
//@ chunk-qchp9vrd.js:70305-70453 placement
function getCachedUsername(e) {
  if (e?.username !== undefined) return e.username ?? undefined;
  let n;
  try {
    n = userInfo().username;
  } catch {
    n = undefined;
  }
  if (e !== undefined) e.username = n ?? null;
  return n;
}
//@ chunk-qchp9vrd.js:70453-70691 placement
/**
 * systemd userdb 的内置提供者名（不算自定义）。
 */
var USERDB_DIRS = [
  "/etc/userdb",
  "/run/userdb",
  "/run/host/userdb",
  "/usr/local/lib/userdb",
  "/usr/lib/userdb",
];
var SYSTEMD_USERDB_DIR = "/run/systemd/userdb";
var SYSTEMD_USERDB_VENDORS = new Set([
  "io.systemd.NameServiceSwitch",
  "io.systemd.Multiplexer",
  "io.systemd.DynamicUser",
  "io.systemd.DropIn",
]);
//@ chunk-qchp9vrd.js:70691-70976 placement
async function readUserdbMembership() {
  try {
    if ((await readdir(SYSTEMD_USERDB_DIR)).some((n) => !SYSTEMD_USERDB_VENDORS.has(n))) return true;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR") return true;
  }
  for (let e of USERDB_DIRS)
    try {
      if ((await readdir(e)).some((n) => n.endsWith(".membership"))) return true;
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR") return true;
    }
  return false;
}
//@ chunk-qchp9vrd.js:70976-71054 placement
/**
 * 读取组信息并检测容器用户命名空间。
 */
function groupNamespaceInfo(e) {
  e.groupsLoading ??= getGroupMembers(e).then(() => detectContainerUserNamespace(e));
  return e.groupsLoading;
}
//@ chunk-qchp9vrd.js:71054-71823 placement
async function getGroupMembers(e) {
  if (
    typeof process.getuid !== "function" ||
    process.getuid() !== 0 ||
    env.SUDO_USER === undefined ||
    env.SUDO_UID === undefined ||
    env.SUDO_GID === undefined
  )
    return;
  let SUDO_USER = env.SUDO_USER;
  if (!/^[A-Za-z0-9._][A-Za-z0-9._-]*\$?$/.test(SUDO_USER)) {
    e.sudoVerified = false;
    return;
  }
  let parts = (await passwdText(e))
    ?.split(
      `
`,
    )
    .find((line) => line.startsWith(`${SUDO_USER}:`))
    ?.split(":");
  let s;
  let h;
  if (parts !== undefined) {
    s = Number(parts[2]) === env.SUDO_UID;
    h = Number(parts[3]);
  } else {
    let [b, y] = await Promise.all([
      runIdCommand(["-u", "--", SUDO_USER]),
      runIdCommand(["-g", "--", SUDO_USER]),
    ]);
    s = b.code === 0 && Number(b.stdout.trim()) === env.SUDO_UID;
    h = y.code === 0 ? Number(y.stdout.trim()) : null;
  }
  if (!s) {
    e.sudoVerified = false;
    return;
  }
  e.sudoPrimaryGid = h ?? undefined;
  if (h === env.SUDO_GID) {
    e.sudoVerified = true;
    return;
  }
  let w = await runIdCommand(["-G", "--", SUDO_USER]);
  e.sudoVerified =
    w.code === 0 &&
    w.stdout
      .trim()
      .split(/\s+/)
      .some((b) => Number(b) === env.SUDO_GID);
}
//@ chunk-qchp9vrd.js:71823-72110 placement
async function runIdCommand(e) {
  for (let n of ["/usr/bin/id", "/bin/id"]) {
    let r = await execFileNoThrowWithCwd(n, e, {
      preserveOutputOnError: true,
      env: {
        PATH: "/usr/bin:/bin",
        LC_ALL: "C",
        USER_TYPE: "external",
        NODE_ENV: "production",
      },
      extendEnv: false,
      cwd: "/",
    });
    if (r.code === 0 || r.stderr !== "" || r.stdout !== "") return r;
  }
  return {
    code: 1,
    stdout: "",
  };
}
//@ chunk-qchp9vrd.js:72110-72201 placement
/**
 * 读取 /etc/passwd 文本（失败为 null）。
 */
function passwdText(e) {
  e.passwdText ??= readFile("/etc/passwd", "utf8").catch(() => null);
  return e.passwdText;
}
//@ chunk-qchp9vrd.js:72201-74312 placement
function detectContainerUserNamespace(e) {
  if (getPlatform() !== "linux" && getPlatform() !== "wsl") return Promise.resolve();
  return Promise.all([
    Promise.all([
      readFile("/run/.containerenv", "utf8").then(
        () => true,
        () => false,
      ),
      readFile("/proc/1/cgroup", "utf8").then(
        (file) => /docker|kubepods|containerd|libpod/i.test(file),
        () => false,
      ),
    ]).then(([n, r]) => {
      e.containerEvidence = n || r;
    }),
    readUserdbMembership(),
    readFile("/etc/group", "utf8").catch((error) => (getErrnoCode(error) === "ENOENT" ? "" : null)),
    passwdText(e),
    readFile("/etc/nsswitch.conf", "utf8").catch((error) => (getErrnoCode(error) === "ENOENT" ? "" : null)),
  ])
    .then(([, n, r, a, s]) => {
      if (r === null) {
        e.groups = new Map();
        e.groupsUnverifiableWhy = "/etc/group could not be read";
        return;
      }
      let h = r;
      if (s === null) {
        e.groups = new Map();
        e.groupsUnverifiableWhy = "/etc/nsswitch.conf could not be read";
        return;
      }
      let w = !/^[+-]/m.test(h) && !/^[+-]/m.test(a ?? "+");
      let b = (N) => {
        let x = new RegExp(`^[ \\t]*${N}[ \\t]*:[ \\t]*([^#\\n]*)`, "m").exec(s)?.[1];
        return x === undefined
          ? []
          : x
              .replace(/\[[^\]]*\]/g, " ")
              .split(/\s+/)
              .filter((j) => j !== "" && j !== "files" && !(j === "compat" && w) && !(j === "systemd" && !n));
      };
      let y = [...b("group"), ...b("initgroups")];
      if (y.length > 0) {
        e.groups = new Map();
        e.groupsUnverifiableWhy = `nsswitch group sources: ${uniq(y).join(" ")}`;
        return;
      }
      let R = b("passwd");
      if (R.length > 0) e.groupsUnverifiableWhy = `nsswitch passwd sources: ${uniq(R).join(" ")}`;
      let S = R.length > 0 ? null : a;
      if (a === null && e.groupsUnverifiableWhy === undefined)
        e.groupsUnverifiableWhy = "/etc/passwd could not be read";
      let T = new Map();
      for (let line of h.split(`
`)) {
        let [x, , j, K] = line.split(":");
        let X = j === undefined ? NaN : Number.parseInt(j, 10);
        if (!x || !Number.isInteger(X)) continue;
        let filtered = (K ?? "")
          .trim()
          .split(",")
          .map((J) => J.trim())
          .filter((J) => J !== "");
        let G = T.get(X);
        if (G === undefined)
          T.set(X, {
            name: x,
            members: filtered,
            primaryMembers: S === null ? ["?"] : [],
          });
        else {
          G.members.push(...filtered);
          if (x !== G.name) G.members.push(`(alias ${x})`);
        }
      }
      for (let line of (S ?? "").split(`
`)) {
        let [x, , , j] = line.split(":");
        let K = j === undefined ? NaN : Number.parseInt(j, 10);
        let X = Number.isInteger(K) ? T.get(K) : undefined;
        if (x && X !== undefined) X.primaryMembers.push(x);
      }
      e.groups ??= T;
      if (S !== null) {
        let filtered = S.split(
          `
`,
        )
          .map((line) => line.split(":"))
          .filter((x) => x.length >= 4);
        e.localUids = new Set(filtered.map((x) => Number(x[2])).filter(Number.isInteger));
        e.localGids = new Set([...T.keys(), ...filtered.map((x) => Number(x[3])).filter(Number.isInteger)]);
      }
    })
    .then(() => {
      return;
    });
}
//@ chunk-qchp9vrd.js:74312-74598 placement
function describeForeignOwner(e, n = "is not owned by you") {
  return typeof process.getuid === "function" &&
    process.getuid() === 0 &&
    env.SUDO_USER !== undefined &&
    getVerifiedSudoUser(e) === null &&
    !isContainerOrRoot(e)
    ? `is not owned by root, and the sudo invoker ${formatGuardValueJson(env.SUDO_USER)} could not be confirmed on this system (run it as yourself, without sudo)`
    : n;
}
//@ chunk-qchp9vrd.js:74598-75170 placement
function checkEntryOwnership(e, n) {
  if (e.isSymbolicLink())
    return {
      code: "symlink",
      message: "is a symlink",
    };
  if (!isOwnedByUser(e.uid, n))
    return {
      code: "foreign_owner",
      message: describeForeignOwner(n),
    };
  if (typeof process.getuid !== "function") return;
  if ((e.mode & 2) !== 0)
    return {
      code: "other_writable",
      message: "is writable by other users",
    };
  if ((e.mode & 16) !== 0 && !isOwnedByUserGroup(e.gid, n))
    return n?.groupsUnverifiableWhy !== undefined && e.gid === expectedGid(n)
      ? {
          code: "group_unverifiable",
          message: `is group-writable, and group membership cannot be verified on this system (${n.groupsUnverifiableWhy})`,
        }
      : {
          code: "other_writable",
          message: "is writable by other users",
        };
  return;
}
//@ chunk-qchp9vrd.js:75170-75215 placement
/**
 * 取某条目的不可信原因。
 */
function reasonFor(e, n) {
  return n.reasons.get(e) ?? UNTRUSTED_FOLDER_REASON;
}
//@ chunk-qchp9vrd.js:75215-75370 placement
function logManifestNotConsulted(e, n, r) {
  if (!n.reasons.has(e)) n.reasons.set(e, r);
  logForDebugging(`plugin eval: not consulting the plugin manifest in ${escapeNonAscii(e)}: ${r}`, {
    level: "warn",
  });
  return false;
}
export {
  isInsideConsentRoot,
  groupNamespaceInfo,
  logManifestNotConsulted,
  checkEntryOwnership,
  checkTreeTrust,
  reasonFor,
  UNTRUSTED_FOLDER_REASON,
};
