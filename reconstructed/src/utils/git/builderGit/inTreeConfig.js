/**
 * utils/git/builderGit/inTreeConfig.ts
 *
 * builderGit：检出内配置读取（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (15)
 * attribution: placement 15
 */
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
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
} from "path";
import {
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
  homedir as homedir_6,
  homedir as homedir_7,
} from "os";
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
} from "fs/promises";
import {
  constants,
  constants as constants_2,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
} from "fs";
import {
  Za,
  resolvePathSpellings,
  collectRepoSettingsReachRoots,
  xyn,
  Cvt,
  resolveRealPathLoose,
  findHeldCheckout,
  eI,
} from "./sandboxReach.js";
import { uniq } from "../../collections.js";
import {
  resolveForeignSpellingAsync,
  classifyPathSpelling_2,
  spellingsToCheck,
  isPathInside as isPathInside_2,
  isWindowsNonDrivePath,
  getGitConfigPaths,
  Jii,
} from "../../permissions/protectedEnvAndGitPaths.js";
import { protectedHomeRoots } from "../../permissions/protectedSettingsPaths.js";
import { checkSessionTempRoot } from "./gitDirIdentity.js";
import { Eh } from "../../pathClassification.js";
import { buildGitEnv } from "./gitEnv.js";
import { resolveIncludePaths, QZn } from "./gitConfigAudit.js";
import { getEnvCaseInsensitive } from "../../plugins/securityDefaultPlugin.js";
import { getPlatform as getPlatform_2 } from "../../platform.js";
import { $c } from "../../platformTargets.js";
import { getErrnoCode } from "../../errors.js";
import { hasNulByte, parseGitConfig } from "../gitConfigParser.js";
import { firstLineOf } from "../../stringUtils.js";

/**
 * 读取检出内的 git 配置与 config.worktree，判断能否安全使用
 */
//@ chunk-s61vbvea.js:267395-270729 placement
async function readInTreeGitConfig(e, n, r) {
  for (let se of ["config", "config.worktree"]) {
    let re = join_7(e, se),
      he = await readGitConfigFile(re, !1);
    if (he.kind === "unread") return { kind: "unread", file: re };
    if (he.kind === "shared") return { kind: "second_name", file: re };
    if (he.kind === "read" && he.hasInclude) return { kind: "includes", file: re };
    if (he.kind === "read" && he.coreWorktree) return { kind: "work_tree", file: re };
    if (he.kind === "read" && r && he.worktreeConfigOn) return { kind: "worktree_config", file: re };
  }
  let s = Za(n),
    h = s.length === 0 ? [] : uniq([homedir(), ...s].flatMap((se) => [se, ...resolvePathSpellings(se, n)])),
    y = collectRepoSettingsReachRoots(n);
  if (y === "unreadable") return { kind: "settings_unreadable", file: join_7(n, ".claude") };
  let flat = (
      await Promise.all(
        uniq([...xyn(n), ...y]).map(async (se) => {
          let re = await resolveForeignSpellingAsync(
            await classifyPathSpelling_2(se, n),
            n,
            protectedHomeRoots(),
          );
          return re.verdict === "local"
            ? await dropSpecialFiles(uniq([se, re.spelling, ...resolvePathSpellings(re.spelling, n)]))
            : spellingsToCheck(re.verdict === "foreign" ? { ...re, verdict: "opaque" } : re, n);
        }),
      )
    ).flat(),
    w = uniq([
      ...[n, e, Cvt(e)].flatMap((se) => [se, ...resolvePathSpellings(se, n)]),
      ...flat,
      ...(await orderLocalRootsFirst(await checkSessionTempRoot(n), n)),
      ...h,
    ]),
    R = async (se, re) => {
      if (Eh(re)) return !0;
      let he = await resolveForeignSpellingAsync(
        await classifyPathSpelling_2(re, n),
        n,
        protectedHomeRoots(),
      );
      if (he.verdict !== "local") return !0;
      let Se = resolveRealPathLoose(he.spelling, n);
      return Se === null || se.some((ce) => isPathInside_2(ce, re) || isPathInside_2(ce, Se));
    },
    x = (se) => R(w, se),
    P = (se) => findHeldCheckout(se, n),
    j = async (se) => {
      for (let re of se) if (await x(re)) return re;
      return;
    },
    G = buildGitEnv(void 0),
    L = 0,
    q = async (se, re, he) => {
      for (let Se of se) {
        let match = /^%\(prefix\)\/(.*)$/s.exec(Se);
        if (match !== null && !isAbsolute_6(match[1] ?? "") && Se.split(/[/\\]/).includes(".."))
          return "includes";
        let we = match !== null && isAbsolute_6(match[1] ?? "") ? (match[1] ?? Se) : Se,
          ie = resolveIncludePaths(we, re, n);
        if (ie.some((Ee) => Ee.includes("\uFFFD") || isWindowsNonDrivePath(Ee))) return "unread";
        if ((await j(ie)) !== void 0) return "includes";
        for (let Ee of ie) {
          let Ie = await P(Ee);
          if (Ie?.kind === "unvouched") return "unread";
          if (Ie !== null) return { kind: "config_in_checkout", checkout: Ie.checkout };
        }
        for (let Ee of ie) {
          if ((L++, he >= nI || L > QZn)) return "unread";
          let Ie = await readGitConfigFile(Ee, !0);
          if (Ie.kind === "unread") return "unread";
          if (Ie.kind === "shared") return "second_name";
          if (Ie.kind === "read") {
            let ke = Z(Ie);
            if (ke !== "clear") return ke;
            let Me = await q(Ie.includes, `file:${Ee}`, he + 1);
            if (Me !== "clear") return Me;
          }
        }
      }
      return "clear";
    },
    Q = (se, re) =>
      typeof se === "string"
        ? { kind: se, file: re }
        : { kind: "config_in_checkout", file: re, checkout: se.checkout },
    Z = (se) => (se.coreWorktree ? "work_tree" : r && se.worktreeConfigOn ? "worktree_config" : "clear"),
    ee = readGitConfigFromEnv(G);
  if (ee === null) return { kind: "unread", file: Dyn };
  for (let { key: key, value: re } of ee) {
    let lower = key.toLowerCase();
    if (lower === "core.worktree") return { kind: "work_tree", file: Dyn };
    if (r && lower === "extensions.worktreeconfig" && (re === void 0 || isEnvDefinedFalsy(re)))
      return { kind: "worktree_config", file: Dyn };
    if (uS(lower) && re !== void 0) {
      let Se = await q([re], "command line:", 0);
      if (Se !== "clear") return Q(Se, Dyn);
    }
  }
  let ae = uniq(getGitConfigPaths([], n, null, G));
  for (let se of ae) {
    if (se.includes("\uFFFD") || isWindowsNonDrivePath(se)) return { kind: "unread", file: se };
    if (s.length > 0 && (await R(h, se))) return { kind: "home_checkout", file: se, checkout: s[0] };
    if (await x(se)) return { kind: "includes", file: se };
    let re = await P(se);
    if (re?.kind === "unvouched") return { kind: "unread", file: se };
    if (re !== null) return { kind: "config_in_checkout", file: se, checkout: re.checkout };
    if (resolveRealPathLoose(se, n) === se && (await iI(se))) continue;
    let he = await readGitConfigFile(se, !0);
    if (he.kind === "device") continue;
    if (he.kind === "unread") return { kind: "unread", file: se };
    if (he.kind === "shared") return { kind: "second_name", file: se };
    if (he.kind === "read") {
      let Se = Z(he);
      if (Se !== "clear") return { kind: Se, file: se };
      let ce = await q(he.includes, `file:${se}`, 0);
      if (ce !== "clear") return Q(ce, se);
    }
  }
  return { kind: "clear" };
}
//@ chunk-s61vbvea.js:270729-270782 placement
var Dyn = "the launch environment (GIT_CONFIG_*)",
  nI = 4;
//@ chunk-s61vbvea.js:270782-270872 placement
function uS(e) {
  return e === "include.path" || (e.startsWith("includeif.") && e.endsWith(".path"));
}
/**
 * 解析 GIT_CONFIG_COUNT/KEY_n/VALUE_n 与 GIT_CONFIG_PARAMETERS。
 */
//@ chunk-s61vbvea.js:270872-271267 placement
function readGitConfigFromEnv(e) {
  let n = [],
    r = getEnvCaseInsensitive(e, "GIT_CONFIG_COUNT");
  if (r !== void 0 && r !== "") {
    if (!/^\d+$/.test(r.trim())) return null;
    for (let h = 0; h < Number(r); h++) {
      let y = getEnvCaseInsensitive(e, `GIT_CONFIG_KEY_${h}`),
        S = getEnvCaseInsensitive(e, `GIT_CONFIG_VALUE_${h}`);
      if (y === void 0 || S === void 0) return null;
      n.push({ key: y, value: S });
    }
  }
  let s = getEnvCaseInsensitive(e, "GIT_CONFIG_PARAMETERS");
  if (s !== void 0 && s.trim() !== "") {
    let h = parseGitConfigParameters(s);
    if (h === null) return null;
    n.push(...h);
  }
  return n;
}
//@ chunk-s61vbvea.js:271267-271516 placement
async function orderLocalRootsFirst(e, n) {
  let results = await Promise.all(
    e.map(async (s) => ({
      root: s,
      local:
        (await resolveForeignSpellingAsync(await classifyPathSpelling_2(s, n), n, protectedHomeRoots()))
          .verdict === "local",
    })),
  );
  return [
    ...(await dropSpecialFiles(results.filter(({ local: local }) => local).map(({ root: root }) => root))),
    ...results.filter(({ local: local }) => !local).map(({ root: root }) => root),
  ];
}
//@ chunk-s61vbvea.js:271516-271727 placement
async function dropSpecialFiles(e) {
  return (
    await Promise.all(
      e.map(async (r) => {
        if (!isAbsolute_6(r)) return null;
        try {
          let s = await lstat_2(r);
          return s.isCharacterDevice() || s.isFIFO() || s.isSocket() ? null : r;
        } catch {
          return r;
        }
      }),
    )
  ).filter((r) => r !== null);
}
//@ chunk-s61vbvea.js:271727-271746 placement
var ud = /[ \t\n\r]/;
/**
 * 解析 GIT_CONFIG_PARAMETERS 的单引号键值列表。
 */
//@ chunk-s61vbvea.js:271746-272399 placement
function parseGitConfigParameters(e) {
  let n = [],
    r = 0,
    s = () => {
      if (e[r] !== "'") return null;
      let h = "";
      r++;
      for (;;) {
        let index = e.indexOf("'", r);
        if (index === -1) return null;
        if (
          ((h += e.slice(r, index)), (r = index + 1), e[r] === "\\" && r + 2 < e.length && e[r + 2] === "'")
        ) {
          ((h += e[r + 1]), (r += 3));
          continue;
        }
        return h;
      }
    };
  while (r < e.length) {
    while (r < e.length && ud.test(e[r] ?? "")) r++;
    if (r >= e.length) break;
    let h = s();
    if (h === null) return null;
    if (e[r] === "=") {
      if ((r++, r >= e.length || ud.test(e[r] ?? ""))) {
        n.push({ key: h, value: void 0 });
        continue;
      }
      let y = s();
      if (y === null) return null;
      n.push({ key: h, value: y });
    } else {
      let index = h.indexOf("=");
      n.push(
        index === -1
          ? { key: h, value: void 0 }
          : { key: h.slice(0, index).trim(), value: h.slice(index + 1) },
      );
    }
    if (r < e.length && !ud.test(e[r] ?? "")) return null;
  }
  return n;
}
//@ chunk-s61vbvea.js:272399-272480 placement
async function iI(e) {
  try {
    return (await lstat_2(e)).isCharacterDevice();
  } catch {
    return !1;
  }
}
//@ chunk-s61vbvea.js:272480-273100 placement
async function readGitConfigFile(e, n) {
  let r;
  try {
    if (!n && getPlatform_2() === "windows" && !(await lstat_2(e)).isFile()) return { kind: "unread" };
    r = await open_4(e, n ? constants_4.O_RDONLY | aI() : $c());
  } catch (error) {
    let h = getErrnoCode(error);
    return h === "ENOENT" || h === "ENOTDIR" ? { kind: "absent" } : { kind: "unread" };
  }
  try {
    let stats = await r.stat();
    if (stats.isCharacterDevice()) return { kind: "device" };
    if (!stats.isFile() || stats.size > eI) return { kind: "unread" };
    if (await Jii(e, stats)) return { kind: "shared" };
    let alloc = Buffer.alloc(stats.size),
      { bytesRead: bytesRead } = await r.read(alloc, 0, stats.size, 0);
    if (bytesRead !== stats.size) return { kind: "unread" };
    let str = alloc.toString("utf8");
    return hasNulByte(str) ? { kind: "unread" } : auditWorktreeConfigKeys(str);
  } catch {
    return { kind: "unread" };
  } finally {
    await r.close().catch(() => {});
  }
}
//@ chunk-s61vbvea.js:273100-273153 placement
function aI() {
  return getPlatform_2() === "windows" ? 0 : constants_4.O_NONBLOCK;
}
//@ chunk-s61vbvea.js:273153-273767 placement
function auditWorktreeConfigKeys(e) {
  let n = [],
    r = !1,
    s = !1,
    h = !1,
    y = !1,
    S = !0,
    w = !1;
  return (
    parseGitConfig(
      e,
      {
        header(R) {
          ((r ||= ky(R.name)), (S &&= R.name === "core" && !R.quoted));
        },
        entry(R, x, P) {
          if (((S &&= R?.name === "core" && !R.quoted && uI.has(x)), R === null)) return;
          if (ky(R.name) && x === "path")
            if (P === void 0) w = !0;
            else n.push(P);
          if (R.name === "core" && !R.quoted && x === "worktree") s = !0;
          if (R.name === "extensions" && !R.quoted && x === "worktreeconfig")
            h = P === void 0 || isEnvDefinedFalsy(P);
          if (R.name === "core" && !R.quoted && x === "bare") y ||= P === void 0 || isEnvDefinedFalsy(P);
        },
        malformed() {
          w = !0;
        },
      },
      { maxLines: 1 / 0 },
    ),
    w
      ? { kind: "unread" }
      : {
          kind: "read",
          includes: n,
          hasInclude: r,
          coreWorktree: s,
          worktreeConfigOn: h,
          saysBare: y,
          inertWorktreeKeysOnly: S,
        }
  );
}
//@ chunk-s61vbvea.js:273767-273826 placement
var uI = new Set(["hookspath", "untrackedcache", "longpaths"]);
//@ chunk-s61vbvea.js:273826-273947 placement = isEnvDefinedFalsy (1)
function isEnvDefinedFalsy(envVar) {
  let lower = envVar.trim().toLowerCase();
  return !(["false", "no", "off", ""].includes(lower) || /^[-+]?(0x)?0+[kmg]?$/.test(lower));
}
//@ chunk-s61vbvea.js:273947-274016 placement
function ky(e) {
  let n = firstLineOf(e, ".");
  return n === "include" || n === "includeif";
}

export { readInTreeGitConfig, Dyn, readGitConfigFromEnv, uS, readGitConfigFile };
