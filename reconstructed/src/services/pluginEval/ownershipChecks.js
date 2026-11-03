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
import {
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
  readFile,
  readFile as readFile_2,
} from "fs/promises";
import { ua } from "./caseDiscovery.js";
import { toEvalPathError } from "./evalDir.js";
import { Rwr, env } from "../../utils/env.js";
import { getPlatform } from "../../utils/platform.js";
import { getErrnoCode } from "../../utils/errors.js";
import { execFileNoThrowWithCwd } from "../../utils/execFileNoThrow.js";
import { uniq } from "../../utils/collections.js";
import { Rm } from "../../cli/handlers/pluginEval/mockGuards.js";
import { logForDebugging } from "../../utils/debug.js";
import { escapeNonAscii } from "../../utils/resultError.js";

//@ chunk-qchp9vrd.js:68707-68824 placement
var UNTRUSTED_FOLDER_REASON =
  "is not owned by you, is writable by other users, is a symlink, or could not be fully examined (see --debug)";
//@ chunk-qchp9vrd.js:68824-69137 placement
function checkTreeTrust(e) {
  return {
    treeMaxEntries: Math.min(e?.treeMaxEntries ?? ua, ua),
    groups: e?.groups,
    groupsLoading: e?.groups === void 0 ? void 0 : Promise.resolve(),
    groupsUnverifiableWhy: void 0,
    modesByDevice: new Map(),
    verdicts: new Map(),
    consentRoot: e?.consentRoot ?? null,
    reasons: new Map(),
    skillFolderProbes: new Map(),
    rootRealpaths: new Map(),
  };
}
//@ chunk-qchp9vrd.js:69137-69208 placement
function fa(e, n) {
  let consentRoot = e.consentRoot;
  return consentRoot !== null && (n === consentRoot || toEvalPathError(consentRoot, n));
}
//@ chunk-qchp9vrd.js:69208-69263 placement
function gi(e) {
  return Rwr() || e?.containerEvidence === !0;
}
//@ chunk-qchp9vrd.js:69263-69467 placement
function isOwnedByUser(e, n) {
  if (typeof process.getuid !== "function") return !0;
  let getuid = process.getuid();
  if (getuid !== 0) return e === getuid;
  let a = getVerifiedSudoUser(n);
  if (a !== null) return e === 0 || e === a.uid;
  return e === 0 || (gi(n) && n?.localUids?.has(e) === !1);
}
//@ chunk-qchp9vrd.js:69467-69706 placement
function getVerifiedSudoUser(e) {
  if (typeof process.getuid !== "function" || process.getuid() !== 0) return null;
  let SUDO_UID = env.SUDO_UID,
    SUDO_GID = env.SUDO_GID,
    SUDO_USER = env.SUDO_USER;
  return SUDO_UID !== void 0 && SUDO_GID !== void 0 && SUDO_USER !== void 0 && e?.sudoVerified === !0
    ? { uid: SUDO_UID, gid: e.sudoPrimaryGid ?? SUDO_GID, user: SUDO_USER }
    : null;
}
//@ chunk-qchp9vrd.js:69706-69802 placement
function Fu(e) {
  if (typeof process.getgid !== "function") return;
  return getVerifiedSudoUser(e)?.gid ?? process.getgid();
}
/**
 * 判断文件属组是否为当前用户组：无 getgid 视为是，macOS 视为否，root 时按目标用户的 gid 判断。
 */
//@ chunk-qchp9vrd.js:69802-70127 placement
function isOwnedByUserGroup(e, n) {
  if (typeof process.getgid !== "function") return !0;
  if (getPlatform() === "macos") return !1;
  if (typeof process.getuid === "function" && process.getuid() === 0) {
    let r = getVerifiedSudoUser(n);
    if (r === null) return e === 0 || (gi(n) && n?.localGids?.has(e) === !1);
    return e === r.gid && isPrivateUserGroup(n, r.gid, r.uid, r.user);
  }
  return e === process.getgid() && isPrivateUserGroup(n, e, process.getuid(), getCachedUsername(n));
}
//@ chunk-qchp9vrd.js:70127-70305 placement
function isPrivateUserGroup(e, n, r, a) {
  if (n !== r || a === void 0 || a === "") return !1;
  let s = e?.groups?.get(n);
  return (
    s !== void 0 &&
    s.name === a &&
    s.members.every((member) => member === a) &&
    s.primaryMembers.every((primaryMember) => primaryMember === a)
  );
}
//@ chunk-qchp9vrd.js:70305-70453 placement
function getCachedUsername(e) {
  if (e?.username !== void 0) return e.username ?? void 0;
  let n;
  try {
    n = userInfo().username;
  } catch {
    n = void 0;
  }
  if (e !== void 0) e.username = n ?? null;
  return n;
}
//@ chunk-qchp9vrd.js:70453-70691 placement
var USERDB_DIRS = [
    "/etc/userdb",
    "/run/userdb",
    "/run/host/userdb",
    "/usr/local/lib/userdb",
    "/usr/lib/userdb",
  ],
  Bu = "/run/systemd/userdb",
  Wu = new Set([
    "io.systemd.NameServiceSwitch",
    "io.systemd.Multiplexer",
    "io.systemd.DynamicUser",
    "io.systemd.DropIn",
  ]);
//@ chunk-qchp9vrd.js:70691-70976 placement
async function readUserdbMembership() {
  try {
    if ((await readdir_6(Bu)).some((n) => !Wu.has(n))) return !0;
  } catch (error) {
    let n = getErrnoCode(error);
    if (n !== "ENOENT" && n !== "ENOTDIR") return !0;
  }
  for (let e of USERDB_DIRS)
    try {
      if ((await readdir_6(e)).some((n) => n.endsWith(".membership"))) return !0;
    } catch (error) {
      let r = getErrnoCode(error);
      if (r !== "ENOENT" && r !== "ENOTDIR") return !0;
    }
  return !1;
}
//@ chunk-qchp9vrd.js:70976-71054 placement
function pa(e) {
  return (
    (e.groupsLoading ??= getGroupMembers(e).then(() => detectContainerUserNamespace(e))),
    e.groupsLoading
  );
}
//@ chunk-qchp9vrd.js:71054-71823 placement
async function getGroupMembers(e) {
  if (
    typeof process.getuid !== "function" ||
    process.getuid() !== 0 ||
    env.SUDO_USER === void 0 ||
    env.SUDO_UID === void 0 ||
    env.SUDO_GID === void 0
  )
    return;
  let SUDO_USER = env.SUDO_USER;
  if (!/^[A-Za-z0-9._][A-Za-z0-9._-]*\$?$/.test(SUDO_USER)) {
    e.sudoVerified = !1;
    return;
  }
  let a = (await ma(e))
      ?.split(
        `
`,
      )
      .find((b) => b.startsWith(`${SUDO_USER}:`))
      ?.split(":"),
    s,
    h;
  if (a !== void 0) ((s = Number(a[2]) === env.SUDO_UID), (h = Number(a[3])));
  else {
    let [b, y] = await Promise.all([
      runIdCommand(["-u", "--", SUDO_USER]),
      runIdCommand(["-g", "--", SUDO_USER]),
    ]);
    ((s = b.code === 0 && Number(b.stdout.trim()) === env.SUDO_UID),
      (h = y.code === 0 ? Number(y.stdout.trim()) : null));
  }
  if (!s) {
    e.sudoVerified = !1;
    return;
  }
  if (((e.sudoPrimaryGid = h ?? void 0), h === env.SUDO_GID)) {
    e.sudoVerified = !0;
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
      preserveOutputOnError: !0,
      env: { PATH: "/usr/bin:/bin", LC_ALL: "C", USER_TYPE: "external", NODE_ENV: "production" },
      extendEnv: !1,
      cwd: "/",
    });
    if (r.code === 0 || r.stderr !== "" || r.stdout !== "") return r;
  }
  return { code: 1, stdout: "" };
}
//@ chunk-qchp9vrd.js:72110-72201 placement
function ma(e) {
  return ((e.passwdText ??= readFile("/etc/passwd", "utf8").catch(() => null)), e.passwdText);
}
//@ chunk-qchp9vrd.js:72201-74312 placement
function detectContainerUserNamespace(e) {
  if (getPlatform() !== "linux" && getPlatform() !== "wsl") return Promise.resolve();
  return Promise.all([
    Promise.all([
      readFile("/run/.containerenv", "utf8").then(
        () => !0,
        () => !1,
      ),
      readFile("/proc/1/cgroup", "utf8").then(
        (n) => /docker|kubepods|containerd|libpod/i.test(n),
        () => !1,
      ),
    ]).then(([n, r]) => {
      e.containerEvidence = n || r;
    }),
    readUserdbMembership(),
    readFile("/etc/group", "utf8").catch((n) => (getErrnoCode(n) === "ENOENT" ? "" : null)),
    ma(e),
    readFile("/etc/nsswitch.conf", "utf8").catch((n) => (getErrnoCode(n) === "ENOENT" ? "" : null)),
  ])
    .then(([, n, r, a, s]) => {
      if (r === null) {
        ((e.groups = new Map()), (e.groupsUnverifiableWhy = "/etc/group could not be read"));
        return;
      }
      let h = r;
      if (s === null) {
        ((e.groups = new Map()), (e.groupsUnverifiableWhy = "/etc/nsswitch.conf could not be read"));
        return;
      }
      let w = !/^[+-]/m.test(h) && !/^[+-]/m.test(a ?? "+"),
        b = (N) => {
          let x = new RegExp(`^[ \\t]*${N}[ \\t]*:[ \\t]*([^#\\n]*)`, "m").exec(s)?.[1];
          return x === void 0
            ? []
            : x
                .replace(/\[[^\]]*\]/g, " ")
                .split(/\s+/)
                .filter(
                  (j) => j !== "" && j !== "files" && !(j === "compat" && w) && !(j === "systemd" && !n),
                );
        },
        y = [...b("group"), ...b("initgroups")];
      if (y.length > 0) {
        ((e.groups = new Map()), (e.groupsUnverifiableWhy = `nsswitch group sources: ${uniq(y).join(" ")}`));
        return;
      }
      let R = b("passwd");
      if (R.length > 0) e.groupsUnverifiableWhy = `nsswitch passwd sources: ${uniq(R).join(" ")}`;
      let S = R.length > 0 ? null : a;
      if (a === null && e.groupsUnverifiableWhy === void 0)
        e.groupsUnverifiableWhy = "/etc/passwd could not be read";
      let T = new Map();
      for (let N of h.split(`
`)) {
        let [x, , j, K] = N.split(":"),
          X = j === void 0 ? NaN : Number.parseInt(j, 10);
        if (!x || !Number.isInteger(X)) continue;
        let filtered = (K ?? "")
            .trim()
            .split(",")
            .map((J) => J.trim())
            .filter((J) => J !== ""),
          G = T.get(X);
        if (G === void 0) T.set(X, { name: x, members: filtered, primaryMembers: S === null ? ["?"] : [] });
        else if ((G.members.push(...filtered), x !== G.name)) G.members.push(`(alias ${x})`);
      }
      for (let N of (S ?? "").split(`
`)) {
        let [x, , , j] = N.split(":"),
          K = j === void 0 ? NaN : Number.parseInt(j, 10),
          X = Number.isInteger(K) ? T.get(K) : void 0;
        if (x && X !== void 0) X.primaryMembers.push(x);
      }
      if (((e.groups ??= T), S !== null)) {
        let filtered = S.split(
          `
`,
        )
          .map((x) => x.split(":"))
          .filter((x) => x.length >= 4);
        ((e.localUids = new Set(filtered.map((x) => Number(x[2])).filter(Number.isInteger))),
          (e.localGids = new Set([
            ...T.keys(),
            ...filtered.map((x) => Number(x[3])).filter(Number.isInteger),
          ])));
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
    env.SUDO_USER !== void 0 &&
    getVerifiedSudoUser(e) === null &&
    !gi(e)
    ? `is not owned by root, and the sudo invoker ${Rm(env.SUDO_USER)} could not be confirmed on this system (run it as yourself, without sudo)`
    : n;
}
//@ chunk-qchp9vrd.js:74598-75170 placement
function checkEntryOwnership(e, n) {
  if (e.isSymbolicLink()) return { code: "symlink", message: "is a symlink" };
  if (!isOwnedByUser(e.uid, n)) return { code: "foreign_owner", message: describeForeignOwner(n) };
  if (typeof process.getuid !== "function") return;
  if ((e.mode & 2) !== 0) return { code: "other_writable", message: "is writable by other users" };
  if ((e.mode & 16) !== 0 && !isOwnedByUserGroup(e.gid, n))
    return n?.groupsUnverifiableWhy !== void 0 && e.gid === Fu(n)
      ? {
          code: "group_unverifiable",
          message: `is group-writable, and group membership cannot be verified on this system (${n.groupsUnverifiableWhy})`,
        }
      : { code: "other_writable", message: "is writable by other users" };
  return;
}
//@ chunk-qchp9vrd.js:75170-75215 placement
function Un(e, n) {
  return n.reasons.get(e) ?? UNTRUSTED_FOLDER_REASON;
}
//@ chunk-qchp9vrd.js:75215-75370 placement
function logManifestNotConsulted(e, n, r) {
  if (!n.reasons.has(e)) n.reasons.set(e, r);
  return (
    logForDebugging(`plugin eval: not consulting the plugin manifest in ${escapeNonAscii(e)}: ${r}`, {
      level: "warn",
    }),
    !1
  );
}

export { fa, pa, logManifestNotConsulted, checkEntryOwnership, checkTreeTrust, Un, UNTRUSTED_FOLDER_REASON };
