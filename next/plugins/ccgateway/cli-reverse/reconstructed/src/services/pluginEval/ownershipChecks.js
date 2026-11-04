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
function checkTreeTrust(options) {
  return {
    treeMaxEntries: Math.min(options?.treeMaxEntries ?? MAX_WALK_DIRECTORIES, MAX_WALK_DIRECTORIES),
    groups: options?.groups,
    groupsLoading: options?.groups === undefined ? undefined : Promise.resolve(),
    groupsUnverifiableWhy: undefined,
    modesByDevice: new Map(),
    verdicts: new Map(),
    consentRoot: options?.consentRoot ?? null,
    reasons: new Map(),
    skillFolderProbes: new Map(),
    rootRealpaths: new Map(),
  };
}
//@ chunk-qchp9vrd.js:69137-69208 placement
/**
 * 判断路径是否在已同意的根目录内。
 */
function isInsideConsentRoot(path, candidate) {
  let consentRoot = path.consentRoot;
  return consentRoot !== null && (candidate === consentRoot || toEvalPathError(consentRoot, candidate));
}
//@ chunk-qchp9vrd.js:69208-69263 placement
/**
 * 是否处于容器或 root 环境（用户库不再可靠）。
 */
function isContainerOrRoot(evidence) {
  return isDockerenvPresent() || evidence?.containerEvidence === true;
}
//@ chunk-qchp9vrd.js:69263-69467 placement
function isOwnedByUser(uid, ctx) {
  if (typeof process.getuid !== "function") return true;
  let currentUid = process.getuid();
  if (currentUid !== 0) return uid === currentUid;
  let verifiedSudoUser = getVerifiedSudoUser(ctx);
  if (verifiedSudoUser !== null) return uid === 0 || uid === verifiedSudoUser.uid;
  return uid === 0 || (isContainerOrRoot(ctx) && ctx?.localUids?.has(uid) === false);
}
//@ chunk-qchp9vrd.js:69467-69706 placement
function getVerifiedSudoUser(about) {
  if (typeof process.getuid !== "function" || process.getuid() !== 0) return null;
  let SUDO_UID = env.SUDO_UID;
  let SUDO_GID = env.SUDO_GID;
  let SUDO_USER = env.SUDO_USER;
  return SUDO_UID !== undefined &&
    SUDO_GID !== undefined &&
    SUDO_USER !== undefined &&
    about?.sudoVerified === true
    ? {
        uid: SUDO_UID,
        gid: about.sudoPrimaryGid ?? SUDO_GID,
        user: SUDO_USER,
      }
    : null;
}
//@ chunk-qchp9vrd.js:69706-69802 placement
/**
 * 计算应当匹配的 gid（root 下取目标用户的 gid）。
 */
function expectedGid(about) {
  if (typeof process.getgid !== "function") return;
  return getVerifiedSudoUser(about)?.gid ?? process.getgid();
}
//@ chunk-qchp9vrd.js:69802-70127 placement
/**
 * 判断文件属组是否为当前用户组：无 getgid 视为是，macOS 视为否，root 时按目标用户的 gid 判断。
 */
function isOwnedByUserGroup(gid, ctx) {
  if (typeof process.getgid !== "function") return true;
  if (getPlatform() === "macos") return false;
  if (typeof process.getuid === "function" && process.getuid() === 0) {
    let verifiedSudoUser = getVerifiedSudoUser(ctx);
    if (verifiedSudoUser === null)
      return gid === 0 || (isContainerOrRoot(ctx) && ctx?.localGids?.has(gid) === false);
    return (
      gid === verifiedSudoUser.gid &&
      isPrivateUserGroup(ctx, verifiedSudoUser.gid, verifiedSudoUser.uid, verifiedSudoUser.user)
    );
  }
  return gid === process.getgid() && isPrivateUserGroup(ctx, gid, process.getuid(), getCachedUsername(ctx));
}
//@ chunk-qchp9vrd.js:70127-70305 placement
function isPrivateUserGroup(ctx, gid, uid, username) {
  if (gid !== uid || username === undefined || username === "") return false;
  let groupInfo = ctx?.groups?.get(gid);
  return (
    groupInfo !== undefined &&
    groupInfo.name === username &&
    groupInfo.members.every((member) => member === username) &&
    groupInfo.primaryMembers.every((primaryMember) => primaryMember === username)
  );
}
//@ chunk-qchp9vrd.js:70305-70453 placement
function getCachedUsername(ctx) {
  if (ctx?.username !== undefined) return ctx.username ?? undefined;
  let username;
  try {
    username = userInfo().username;
  } catch {
    username = undefined;
  }
  if (ctx !== undefined) ctx.username = username ?? null;
  return username;
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
    if ((await readdir(SYSTEMD_USERDB_DIR)).some((entryName) => !SYSTEMD_USERDB_VENDORS.has(entryName)))
      return true;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR") return true;
  }
  for (let dir of USERDB_DIRS)
    try {
      if ((await readdir(dir)).some((entryName) => entryName.endsWith(".membership"))) return true;
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
function groupNamespaceInfo(info) {
  info.groupsLoading ??= getGroupMembers(info).then(() => detectContainerUserNamespace(info));
  return info.groupsLoading;
}
//@ chunk-qchp9vrd.js:71054-71823 placement
async function getGroupMembers(ctx) {
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
    ctx.sudoVerified = false;
    return;
  }
  let parts = (await passwdText(ctx))
    ?.split(
      `
`,
    )
    .find((line) => line.startsWith(`${SUDO_USER}:`))
    ?.split(":");
  let uidMatches;
  let primaryGid;
  if (parts !== undefined) {
    uidMatches = Number(parts[2]) === env.SUDO_UID;
    primaryGid = Number(parts[3]);
  } else {
    let [uidResult, gidResult] = await Promise.all([
      runIdCommand(["-u", "--", SUDO_USER]),
      runIdCommand(["-g", "--", SUDO_USER]),
    ]);
    uidMatches = uidResult.code === 0 && Number(uidResult.stdout.trim()) === env.SUDO_UID;
    primaryGid = gidResult.code === 0 ? Number(gidResult.stdout.trim()) : null;
  }
  if (!uidMatches) {
    ctx.sudoVerified = false;
    return;
  }
  ctx.sudoPrimaryGid = primaryGid ?? undefined;
  if (primaryGid === env.SUDO_GID) {
    ctx.sudoVerified = true;
    return;
  }
  let groupsResult = await runIdCommand(["-G", "--", SUDO_USER]);
  ctx.sudoVerified =
    groupsResult.code === 0 &&
    groupsResult.stdout
      .trim()
      .split(/\s+/)
      .some((gid) => Number(gid) === env.SUDO_GID);
}
//@ chunk-qchp9vrd.js:71823-72110 placement
async function runIdCommand(args) {
  for (let idPath of ["/usr/bin/id", "/bin/id"]) {
    let result = await execFileNoThrowWithCwd(idPath, args, {
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
    if (result.code === 0 || result.stderr !== "" || result.stdout !== "") return result;
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
function passwdText(info) {
  info.passwdText ??= readFile("/etc/passwd", "utf8").catch(() => null);
  return info.passwdText;
}
//@ chunk-qchp9vrd.js:72201-74312 placement
function detectContainerUserNamespace(ctx) {
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
    ]).then(([containerEnvPresent, cgroupSaysContainer]) => {
      ctx.containerEvidence = containerEnvPresent || cgroupSaysContainer;
    }),
    readUserdbMembership(),
    readFile("/etc/group", "utf8").catch((error) => (getErrnoCode(error) === "ENOENT" ? "" : null)),
    passwdText(ctx),
    readFile("/etc/nsswitch.conf", "utf8").catch((error) => (getErrnoCode(error) === "ENOENT" ? "" : null)),
  ])
    .then(([, userdbMembership, groupText, passwdText_2, nsswitchText]) => {
      if (groupText === null) {
        ctx.groups = new Map();
        ctx.groupsUnverifiableWhy = "/etc/group could not be read";
        return;
      }
      let groupLines = groupText;
      if (nsswitchText === null) {
        ctx.groups = new Map();
        ctx.groupsUnverifiableWhy = "/etc/nsswitch.conf could not be read";
        return;
      }
      let compatUsable = !/^[+-]/m.test(groupLines) && !/^[+-]/m.test(passwdText_2 ?? "+");
      let readNssSources = (database) => {
        let sourcesField = new RegExp(`^[ \\t]*${database}[ \\t]*:[ \\t]*([^#\\n]*)`, "m").exec(
          nsswitchText,
        )?.[1];
        return sourcesField === undefined
          ? []
          : sourcesField
              .replace(/\[[^\]]*\]/g, " ")
              .split(/\s+/)
              .filter(
                (sourceName) =>
                  sourceName !== "" &&
                  sourceName !== "files" &&
                  !(sourceName === "compat" && compatUsable) &&
                  !(sourceName === "systemd" && !userdbMembership),
              );
      };
      let groupSources = [...readNssSources("group"), ...readNssSources("initgroups")];
      if (groupSources.length > 0) {
        ctx.groups = new Map();
        ctx.groupsUnverifiableWhy = `nsswitch group sources: ${uniq(groupSources).join(" ")}`;
        return;
      }
      let passwdSources = readNssSources("passwd");
      if (passwdSources.length > 0)
        ctx.groupsUnverifiableWhy = `nsswitch passwd sources: ${uniq(passwdSources).join(" ")}`;
      let localPasswdText = passwdSources.length > 0 ? null : passwdText_2;
      if (passwdText_2 === null && ctx.groupsUnverifiableWhy === undefined)
        ctx.groupsUnverifiableWhy = "/etc/passwd could not be read";
      let groups = new Map();
      for (let line of groupLines.split(`
`)) {
        let [groupName, , gidField, membersField] = line.split(":");
        let gid = gidField === undefined ? NaN : Number.parseInt(gidField, 10);
        if (!groupName || !Number.isInteger(gid)) continue;
        let filtered = (membersField ?? "")
          .trim()
          .split(",")
          .map((member) => member.trim())
          .filter((member) => member !== "");
        let groupEntry = groups.get(gid);
        if (groupEntry === undefined)
          groups.set(gid, {
            name: groupName,
            members: filtered,
            primaryMembers: localPasswdText === null ? ["?"] : [],
          });
        else {
          groupEntry.members.push(...filtered);
          if (groupName !== groupEntry.name) groupEntry.members.push(`(alias ${groupName})`);
        }
      }
      for (let line of (localPasswdText ?? "").split(`
`)) {
        let [userName, , , gidField] = line.split(":");
        let primaryGid = gidField === undefined ? NaN : Number.parseInt(gidField, 10);
        let groupEntry = Number.isInteger(primaryGid) ? groups.get(primaryGid) : undefined;
        if (userName && groupEntry !== undefined) groupEntry.primaryMembers.push(userName);
      }
      ctx.groups ??= groups;
      if (localPasswdText !== null) {
        let filtered = localPasswdText
          .split(
            `
`,
          )
          .map((line) => line.split(":"))
          .filter((fields) => fields.length >= 4);
        ctx.localUids = new Set(filtered.map((fields) => Number(fields[2])).filter(Number.isInteger));
        ctx.localGids = new Set([
          ...groups.keys(),
          ...filtered.map((fields) => Number(fields[3])).filter(Number.isInteger),
        ]);
      }
    })
    .then(() => {
      return;
    });
}
//@ chunk-qchp9vrd.js:74312-74598 placement
function describeForeignOwner(ctx, defaultMessage = "is not owned by you") {
  return typeof process.getuid === "function" &&
    process.getuid() === 0 &&
    env.SUDO_USER !== undefined &&
    getVerifiedSudoUser(ctx) === null &&
    !isContainerOrRoot(ctx)
    ? `is not owned by root, and the sudo invoker ${formatGuardValueJson(env.SUDO_USER)} could not be confirmed on this system (run it as yourself, without sudo)`
    : defaultMessage;
}
//@ chunk-qchp9vrd.js:74598-75170 placement
function checkEntryOwnership(stats, ctx) {
  if (stats.isSymbolicLink())
    return {
      code: "symlink",
      message: "is a symlink",
    };
  if (!isOwnedByUser(stats.uid, ctx))
    return {
      code: "foreign_owner",
      message: describeForeignOwner(ctx),
    };
  if (typeof process.getuid !== "function") return;
  if ((stats.mode & 2) !== 0)
    return {
      code: "other_writable",
      message: "is writable by other users",
    };
  if ((stats.mode & 16) !== 0 && !isOwnedByUserGroup(stats.gid, ctx))
    return ctx?.groupsUnverifiableWhy !== undefined && stats.gid === expectedGid(ctx)
      ? {
          code: "group_unverifiable",
          message: `is group-writable, and group membership cannot be verified on this system (${ctx.groupsUnverifiableWhy})`,
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
function reasonFor(folderPath, trust) {
  return trust.reasons.get(folderPath) ?? UNTRUSTED_FOLDER_REASON;
}
//@ chunk-qchp9vrd.js:75215-75370 placement
function logManifestNotConsulted(folderPath, trust, reason) {
  if (!trust.reasons.has(folderPath)) trust.reasons.set(folderPath, reason);
  logForDebugging(
    `plugin eval: not consulting the plugin manifest in ${escapeNonAscii(folderPath)}: ${reason}`,
    {
      level: "warn",
    },
  );
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
