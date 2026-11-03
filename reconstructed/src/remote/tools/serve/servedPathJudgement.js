/**
 * remote/tools/serve/servedPathJudgement.ts
 *
 * 2.1.316 新增：服务端调用涉及路径的判定（设置文件、点目录、规范化）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tr0s0d0k.js (19)
 * attribution: placement 19
 */
import { dirname, basename, basename as basename_2, join, join as join_2, join as join_3 } from "path";
import { homedir, homedir as homedir_2, hostname } from "os";
import { trimEndChars, countCharInString } from "../../../utils/stringUtils.js";
import { getPlatform } from "../../../utils/platform.js";
import {
  keychainCommands,
  isServedEyeEnabled,
  HOST_CREDENTIAL_RULE_SOURCE,
  isCredentialBasename,
  classifyCredentialPath,
  readsCredentialStore,
  credentialCommandIn,
  joinLineContinuations,
  unquoteShellWord,
} from "./credentialPathGuards.js";
import { readServedBackgroundOverride } from "./backgroundCommands.js";
import { normalizeCaseForComparison, matchingRuleForInput } from "../../../utils/permissions/filesystem.js";
import { normalizeCommandForPlatform } from "../../../utils/git.js";
import {
  withPathAliases,
  getClaudeConfigDirs,
  O4e,
  claudeStateGlobs,
} from "../../../utils/permissions/claudeStatePaths.js";
import { uniq, count } from "../../../utils/collections.js";
import { env } from "../../../utils/env.js";
import { FILE_READ_TOOL_NAME } from "../../../tools/FileReadTool/constants.js";
import { getPathsForPermissionCheck } from "../../../utils/fsOperations.js";
import { Dst } from "../../../utils/wslMounts.js";
import { isSystemVolumePath } from "../../../utils/permissions/protectedDirs.js";
import { getProjectConfigRoot, getProjectRootOrNull } from "../../../bootstrap/state.js";
import { getAnnouncedDirectories, szs } from "../../../utils/announcedDirectories.js";
import { pluginToolStagingRoot } from "../../../utils/tempDir.js";
import { ck } from "../../../utils/pathResolution.js";
import { classifyHomeMount } from "../../../utils/networkPaths.js";
import { isLocalHostname, matchesHostPattern, isLoopbackHost } from "../../../utils/localHostnames.js";
import { logError } from "../../../utils/log.js";
import { expandPath } from "../../../utils/path.js";
import { Ndt } from "../../../utils/bash/bashParserFlags.js";
import { parseShellCommand } from "../../../tools/BashTool/readOnlyShellCheck.js";
import {
  SHELL_PROGRAM_NAMES,
  POSIX_SHELL_NAMES,
  TRANSPARENT_LAUNCHER_NAMES,
} from "../../../utils/bash/ast.js";
import { unwrapCommandArgv } from "../../../tools/BashTool/bashPermissions.js";
import { BAt } from "../../../utils/bash/parser.js";
import { safeParseToolInput } from "../../../Tool.js";
import { Yg } from "../../remoteMode.js";

//@ chunk-tr0s0d0k.js:24209-24524 placement
var SERVED_PATH_LIMITS = 8,
  kr = 512,
  Cr = 131072,
  Ar = /^(?:\/|~(?:\/|$)|\.{1,2}(?:\/|$)|\$\{?HOME\}?(?:\/|$)|file:)/i,
  wr = /(^|[/\\])\.\.?([/\\]|$)/,
  an =
    /[/\\~*?[\]{}<>|;&`\x00-\x1f\x7f-\x9f\p{Cf}]|^\.|%(?=[0-9a-f]{2}|u[0-9a-f]{4})|\$(?=[\p{L}_{('"])|[@!+](?=\()|\+(?=[.~])|^[a-z][a-z0-9+.-]*:(?=\S)/iu,
  br = /^["'(<[{]+/,
  Rr = `"')>]}`,
  Er = ".,;:!?";
//@ chunk-tr0s0d0k.js:24524-24571 placement
function Pr(e) {
  return trimEndChars(e.replace(br, ""), Rr);
}
//@ chunk-tr0s0d0k.js:24571-24635 placement
function Tr(e) {
  return /^[-+][a-zA-Z]+$/.test(e) && e.includes("c");
}
//@ chunk-tr0s0d0k.js:24635-24689 placement
function Mr(e) {
  return e.slice(0, e.lastIndexOf("/") + 1);
}
//@ chunk-tr0s0d0k.js:24689-25608 placement
var SERVED_PATH_PATTERNS = /[,:=]+/,
  vt = /[*?[\]{}()@+!\\]/,
  Or = /[\x00-\x1f\x7f-\x9f\p{Cf}\s"'`%#|<>;&,:=]/u,
  Pe = /[\t\n\v\f\r\x85\u2028\u2029]+/g,
  Nr = /[\n\v\f\r\x85\u2028\u2029;&|]+/,
  Ir = /^\$(?=['"])|['"\\]/g,
  xr = /^file:\/\/(?:localhost)?(?=\/)/i,
  Dr =
    /^(https?):\/\/((?:[a-z0-9-]{1,63}\.)+[a-z][a-z0-9-]{0,62})(?::([1-9]\d{0,4}))?(\/(?:[\w-]+(?:\.[\w-]+)*(?:\/[\w-]+(?:\.[\w-]+)*)*\/?)?(?:\?[\w\-.=&]*)?(?:#[\w\-.]*)?)?$/i,
  Jn = /^[A-Za-z_][\w-]*(?:\/[A-Za-z0-9_][\w-]*(?:\.[\w-]+)*)+$/,
  dn = /^(?![/~$]|[A-Za-z][A-Za-z0-9+.-]*:)\S*[/\\]\S*$/,
  Lr = 512,
  $r = 16,
  Wr = 16,
  Br = /(?:^|\/)proc\/\d+(?:\/|$)/,
  et = /^(?:(?:System\/)?Volumes\/)?Data(?:\/|$)/i,
  Fr = /^(?:System\/)?Volumes\/Data(?:\/|$)/i,
  Hr = /\/(?:System(?:\/Volumes)?|Volumes)$/i,
  Ur =
    /\.(?:lan|home|corp|private|intranet|test|onion|arpa)$|(?:^|\.)(?:ts\.net|fritz\.box|xip\.io|rbndr\.us|1u\.ms|rebind\.it)$/,
  Vr = /(?:^|\.)\d+(?:\.|$)|(?:^|[.-])(?:0x|[0-9a-f]{8}(?:[.-]|$))|(?:^|[^0-9])\d+(?:[.-]\d+){2}/,
  jr = 2048;
/**
 * 对云会话调用的 MCP 工具参数里的路径做本机判定：守护位置、相对路径、主机样式、/proc /dev/fd 等。
 */
//@ chunk-tr0s0d0k.js:25608-31008 placement
function judgeServedMcpPaths(e, n, o) {
  if (e.isMcp !== !0) return;
  let r = getPlatform(),
    s = r === "macos",
    d = r === "linux" || r === "wsl",
    u = keychainCommands(),
    p = isServedEyeEnabled(),
    h = readServedBackgroundOverride(),
    _ = (y) =>
      s
        ? normalizeCaseForComparison(y.normalize("NFC"))
        : r === "windows"
          ? normalizeCommandForPlatform(y).replaceAll("\\", "/")
          : y,
    mapped = withPathAliases(
      uniq([
        ...getClaudeConfigDirs(),
        ...O4e()
          .filter(({ tail: tail }) => tail === "/**")
          .map(({ literal: literal }) => literal),
        ...(env.CLAUDE_CODE_HOST_CREDS_FILE ? [dirname(env.CLAUDE_CODE_HOST_CREDS_FILE)] : []),
      ]).map((y) => y.replace(/[\\/]+$/, "")),
    ).map(_),
    R = (y) => ({
      kind: "deny",
      rule: {
        source: HOST_CREDENTIAL_RULE_SOURCE,
        ruleBehavior: "deny",
        ruleValue: { toolName: FILE_READ_TOOL_NAME, ruleContent: y },
      },
    }),
    mapped_2 = O4e()
      .filter(({ tail: tail }) => tail.startsWith("/"))
      .map(({ literal: literal, tail: tail }) => ({
        dir: _(literal.replace(/[\\/]+$/, "")),
        segments: tail
          .split("/")
          .slice(1)
          .map(
            (P) =>
              new RegExp(
                `^${P.replace(/[.+^${}()|[\]\\]/g, "\\$&")
                  .replace(/\*+/g, "[^/]*")
                  .replace(/\?/g, "[^/]")}$`,
                s ? "i" : "",
              ),
          ),
      })),
    L = (y) => {
      let E = !1,
        P = getPathsForPermissionCheck(y),
        w = Dst(),
        D = new Map(
          w.flatMap(({ mountPoint: mountPoint }) =>
            P.filter((q) => q === mountPoint || q.startsWith(`${mountPoint}/`)).map((q) => [
              q.slice(mountPoint.length) || "/",
              q,
            ]),
          ),
        ),
        T = uniq([...P, ...(s ? [isSystemVolumePath(y)] : []), ...D.keys()]);
      for (let W of T) {
        let q = _(W);
        if (
          isCredentialBasename(W) ||
          ((s || r === "windows") && isCredentialBasename(q)) ||
          (d && /^\/proc\/.+\/environ$/.test(W)) ||
          mapped.some((te) => q === te || q.startsWith(`${te}/`))
        )
          return { under: D.get(W) ?? W };
        let replaced = q.replace(/\/+$/, "");
        if (
          replaced === "" ||
          mapped.some((te) => te.startsWith(`${replaced}/`)) ||
          w.some(({ mountPoint: mountPoint }) => mountPoint.startsWith(`${replaced}/`)) ||
          mapped_2.some(
            ({ dir: dir, segments: segments }) =>
              dir.startsWith(`${replaced}/`) ||
              replaced === dir ||
              (replaced.startsWith(`${dir}/`) &&
                replaced
                  .slice(dir.length + 1)
                  .split("/")
                  .every((pe, ge) => ge < segments.length && segments[ge].test(pe))),
          ) ||
          (d && /^\/proc(?:\/|$)/.test(replaced)) ||
          (s && /^\/(?:system(?:\/volumes(?:\/data)?)?|volumes)$/.test(replaced)) ||
          /^\/dev(?:\/fd(?:\/|$)|$)/.test(replaced)
        )
          E = !0;
      }
      return E ? "above" : "clear";
    },
    V =
      r === "windows"
        ? uniq(
            [...mapped, ...mapped_2.map(({ dir: dir }) => dir)].flatMap(
              (y) => /^([a-z]):\//.exec(y)?.slice(1) ?? [],
            ),
          )
        : [],
    A = (y) => {
      let E = normalizeServedPath(y);
      if (E !== void 0) {
        let w =
            /^[\\/](?![\\/])/.test(E) && !/^\/[a-z]\//i.test(E)
              ? [E, ...V.map((T) => `${T.toUpperCase()}:${E.replace(/\//g, "\\")}`)]
              : [E],
          D;
        for (let T of w) {
          let W = L(T);
          if (W === "above") D = "ask";
          else if (W !== "clear") return { deny: W.under };
        }
        return D;
      }
      let search = y.search(vt);
      if (search > 0) {
        let w = Mr(y.slice(0, search)),
          D = w === "" ? void 0 : normalizeServedPath(w);
        if (D !== void 0) {
          let T = L(D);
          if (T !== "clear" && T !== "above") return { deny: `${T.under} (${y.slice(0, 128)})` };
        }
      }
      return "ask";
    },
    O = (y) => {
      let E = y;
      for (let P = 0; P < 3; P++) {
        let w = Pr(E),
          D = trimEndChars(w, Er);
        if (D === "") return w || E;
        if (D === E) break;
        E = D;
      }
      return E;
    },
    X = (y) => {
      let E = O(y);
      return [E, ...E.split(SERVED_PATH_PATTERNS), ...y.split(SERVED_PATH_PATTERNS)].some(
        (P) => P !== "" && P !== y && an.test(O(P)),
      );
    },
    J,
    K = () =>
      (J ??= [
        ...mapped.map((y) => ({ dir: y, segments: [] })),
        ...mapped_2,
        { dir: "/dev/fd", segments: [] },
        ...(d ? [{ dir: "/proc", segments: [/^(?:self|thread-self)$/] }] : []),
        ...O4e()
          .filter(({ tail: tail }) => !tail.startsWith("/"))
          .map(({ literal: literal, tail: tail }) =>
            tail === ""
              ? { dir: _(literal), segments: [] }
              : {
                  dir: _(dirname(literal)),
                  segments: [
                    new RegExp(
                      `^${basename(literal).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.[^/]*$`,
                      s ? "i" : "",
                    ),
                  ],
                },
          ),
      ]),
    j,
    G = new Map(),
    M = (y) => {
      let E = getProjectConfigRoot() ?? getProjectRootOrNull();
      return uniq([
        ...(E === null ? [] : [E]),
        ...getAnnouncedDirectories(),
        ...szs(),
        ...y.additionalWorkingDirectories.keys(),
        pluginToolStagingRoot(),
      ]);
    },
    Z = (y, E) => {
      let P = M(E),
        parts = y.split("/"),
        D = [y];
      if (s)
        for (let T = 0; T < parts.length; T++) {
          let joined = parts.slice(T).join("/");
          if (T > 0 && !Fr.test(joined)) continue;
          while (et.test(joined)) ((joined = joined.replace(et, "")), D.push(joined));
        }
      if (
        [
          ...D.map((T) => `/${T}`),
          ...parts.map((T, W) => `/${parts.slice(W).join("/")}`),
          ...P.map((T) => join(T, y)),
        ].some((T) => ck(T) || classifyHomeMount(T, s ? "darwin" : "linux"))
      )
        return "unreadable";
      if (
        (s && Hr.test(y)) ||
        D.some(
          (T) =>
            L(`/${T}`) !== "clear" ||
            L(join(homedir(), T)) !== "clear" ||
            matchesDirSegments(_(T), K()) ||
            matchesDotDirSegments(_(T), K()) ||
            (d && Br.test(T)),
        )
      )
        return "guarded_place";
      for (let T of P) {
        let W = join(T, y),
          q = L(W) === "clear" ? classifyCredentialPath(W, E, T) : "guarded_place";
        if (q !== void 0) return q;
      }
      return;
    },
    ce = (y) => {
      if (!dn.test(y)) return;
      try {
        if (y.length > Lr || !Jn.test(y) || countCharInString(y, "/") + 1 > Wr) return "not_plain_name";
        let E = G.get(y);
        if (E !== void 0) return E;
        let lower = y.slice(0, y.indexOf("/")).toLowerCase();
        if (isLocalHostname(lower) || matchesHostPattern(lower, hostname())) return "host_like";
        if (r !== "macos" && r !== "linux") return "platform";
        if (o === void 0) return "unreadable";
        if (G.size >= $r) return "too_many";
        let w = Z(y, o) ?? "relative_path";
        return (G.set(y, w), w);
      } catch (error) {
        return (
          logError(Error("a served MCP relative name could not be judged", { cause: error })),
          "unreadable"
        );
      }
    },
    ue = (y, E) => {
      if (((j = void 0), y === "")) return;
      if (!/\s/.test(y)) {
        let P = an.test(y) ? A(y) : X(y) ? "ask" : void 0;
        if (P !== "ask") return P;
        if (p && isWebAddress(y)) {
          let D = URL.parse(y)?.pathname;
          return D === "/" || (D !== void 0 && A(D) === void 0 && A(`~${D}`) === void 0)
            ? "web_address"
            : "ask";
        }
        let w = !h ? void 0 : y === E ? ce(y) : dn.test(y) ? "not_plain_name" : void 0;
        if (w === "relative_path") return "relative_path";
        return ((j = w), "ask");
      }
      if (Ar.test(y)) return "ask";
      for (let P of y.split(/\s+/)) {
        let w = O(P);
        if (an.test(w) ? A(w) !== void 0 : X(P))
          return (
            (j = !h ? void 0 : Jn.test(P) ? "in_sentence" : dn.test(P) ? "not_plain_name" : void 0),
            "ask"
          );
      }
      return;
    },
    x,
    re = !1,
    U = !1,
    Y = 0,
    ie = 0;
  for (let y of iterateStringsDeep(n, SERVED_PATH_LIMITS)) {
    if (y === kt || ++Y > kr) return R("(nested input this machine could not inspect)");
    let normalized = y.normalize("NFKC");
    for (let P of uniq(
      [y, normalized].flatMap((w) => [w.replace(Pe, " ").trim(), w.replace(Pe, "").trim()]),
    )) {
      let w = ue(P, y);
      if (w === "ask") {
        if (x === void 0) x = { kind: "ask", spelling: P.slice(0, 256), ...(j !== void 0 && { why: j }) };
      } else if (w === "relative_path") U = !0;
      else if (w === "web_address") re = !0;
      else if (w !== void 0) return R(w.deny);
    }
    if (
      r === "windows" &&
      x === void 0 &&
      ((ie += Math.max(y.length, normalized.length)) > Cr ||
        uniq([y, normalized].flatMap((P) => [P.replace(Pe, " "), P.replace(Pe, "")])).some((P) =>
          readsCredentialStore(P).some((w) => credentialCommandIn(w) !== void 0),
        ))
    )
      x = { kind: "ask", spelling: normalized.slice(0, 256) };
    if (u.length > 0 && x === void 0)
      for (let P of normalized.split(Nr)) {
        let mapped = P.trim()
            .split(/\s+/)
            .filter(Boolean)
            .map((T) => O(T).replace(Ir, "")),
          D = mapped.length < 2 ? mapped : normalizeArgv(mapped);
        if (D === void 0 || (D.length >= 2 && u.includes(D[0]))) {
          x = { kind: "ask", spelling: P.trim().slice(0, 256) };
          break;
        }
      }
  }
  return x ?? (U ? { kind: "relative_path" } : re ? { kind: "web_address" } : void 0);
}
//@ chunk-tr0s0d0k.js:31008-31328 placement
function matchesDirSegments(e, n) {
  let parts = e.split("/");
  return n.some(({ dir: dir, segments: segments }) => {
    let filtered = dir.split("/").filter(Boolean),
      u = filtered.length + segments.length,
      p = (_, S) => (_ < filtered.length ? filtered[_] === S : segments[_ - filtered.length].test(S)),
      h = (_) => _ < filtered.length || !p(_, "");
    for (let _ = 0; _ < u; _++) {
      let sliced = parts.slice(0, u - _);
      if (sliced.some((R, B) => h(_ + B)) && sliced.every((R, B) => p(_ + B, R))) return !0;
    }
    return !1;
  });
}
//@ chunk-tr0s0d0k.js:31328-31770 placement
function matchesDotDirSegments(e, n) {
  let parts = e.split("/");
  return n.some(({ dir: dir, segments: segments }) => {
    let filtered = dir.split("/").filter(Boolean),
      u = filtered.findLastIndex((S) => S.startsWith(".")) + 1,
      p = filtered.length + segments.length,
      h = (S, R) => (S < filtered.length ? filtered[S] === R : segments[S - filtered.length].test(R)),
      _ = (S) => S < filtered.length || !h(S, "");
    for (let S = 1; S < parts.length; S++)
      for (let R = 0; R < p; R++) {
        let sliced = parts.slice(S, S + p - R),
          L = R + sliced.length < u;
        if (
          (R >= u || L) &&
          count([...sliced.keys()], (V) => _(R + V)) >= (u === 0 || L ? 1 : 2) &&
          sliced.every((V, A) => h(R + A, V))
        )
          return !0;
      }
    return !1;
  });
}
//@ chunk-tr0s0d0k.js:31770-32593 placement
function normalizeServedPath(e) {
  let n = e;
  if (/^file:/i.test(n)) {
    let match = xr.exec(n);
    if (match === null) return;
    n = n.slice(match[0].length);
  }
  if (((n = n.replace(/^\$\{?HOME\}?(?=\/|$)/, "~")), n === "~")) n = "~/";
  if (getPlatform() === "windows") {
    if (
      ((n = (n[0] ?? "") + n.slice(1).replace(/[\\/]{2,}/g, "/")),
      (n = n
        .replace(/^([A-Za-z]):[\\/]/, (o, r) => `/${r.toLowerCase()}/`)
        .replace(/^\/(?:proc\/cygdrive|cygdrive|mnt)\/(?=[a-z](?:\/|$))/i, "/")
        .replace(/^\/([A-Za-z])$/, "/$1/")
        .replace(/^\/([A-Z])\//, (o, r) => `/${r.toLowerCase()}/`)),
      /^\/[a-z]\//.test(n))
    )
      n = n.replaceAll("\\", "/");
    if (/^[\\/]{2}/.test(n) || /^\/(?:mnt|cygdrive)\/?$/i.test(n) || /^\/proc(?:\/|$)/i.test(n)) return;
  }
  if (
    ((n =
      getPlatform() === "windows" && /^\/[a-z]\/+$/i.test(n)
        ? n.replace(/\/+$/, "/")
        : n.replace(/(?<=[^/])\/+$/, "")),
    !/^(?:\/|~\/)/.test(n) ||
      Or.test(n) ||
      vt.test(n) ||
      n.includes("$") ||
      n.includes("~", 1) ||
      wr.test(n.slice(1)))
  )
    return;
  return expandPath(n, homedir());
}
//@ chunk-tr0s0d0k.js:32593-32938 placement
function isWebAddress(e) {
  let n = e.length > jr ? null : Dr.exec(e);
  if (n === null) return !1;
  let lower = n[1].toLowerCase(),
    lower_2 = n[2].toLowerCase(),
    s = n[4] ?? "/";
  if (
    isLoopbackHost(lower_2) ||
    isLocalHostname(lower_2) ||
    Ur.test(lower_2) ||
    Vr.test(lower_2) ||
    /[?#&=]\./.test(s)
  )
    return !1;
  let d = n[3] === void 0 || n[3] === (lower === "https" ? "443" : "80") ? "" : `:${n[3]}`,
    parse = URL.parse(e);
  return parse !== null && parse.href === `${lower}://${lower_2}${d}${s}` && parse.hostname === lower_2;
}
//@ chunk-tr0s0d0k.js:32938-32971 placement
var kt = Symbol("depth-exhausted");
//@ chunk-tr0s0d0k.js:32971-33219 placement
function* iterateStringsDeep(e, n) {
  if (typeof e === "string") {
    yield e;
    return;
  }
  if (e === null || typeof e !== "object") return;
  let o = Array.isArray(e) ? e.map((r) => ["", r]) : Object.entries(e);
  if (n <= 0) {
    if (o.length > 0) yield kt;
    return;
  }
  for (let [r, s] of o) {
    if (r !== "") yield r;
    yield* iterateStringsDeep(s, n - 1);
  }
}
//@ chunk-tr0s0d0k.js:33219-33709 placement
async function commandReachesSettings(e, n) {
  let o = await Ndt(() => parseShellCommand(e));
  if (o.kind !== "simple") return !1;
  for (let command of o.commands) {
    let s = normalizeArgv(command.argv);
    if (s === void 0) return !0;
    let [d = "", ...u] = s;
    if (keychainCommands().includes(d)) return !0;
    let replaced = d.replace(/\.exe$/, "");
    if (!SHELL_PROGRAM_NAMES.has(replaced)) continue;
    if (!POSIX_SHELL_NAMES.has(replaced)) {
      if (
        u.some((h) => {
          let _ = joinLineContinuations(unquoteShellWord(h)),
            S = getPlatform() === "macos" ? _.toUpperCase().toLowerCase() : _;
          return keychainCommands().some((R) => S.includes(R));
        })
      )
        return !0;
      continue;
    }
    if (!u.some(Tr)) continue;
    if (n <= 1) return !0;
    for (let h of u) if (await commandReachesSettings(h, n - 1)) return !0;
  }
  return !1;
}
//@ chunk-tr0s0d0k.js:33709-34192 placement
function normalizeArgv(e) {
  let n = getPlatform(),
    o = n === "macos" || n === "windows",
    r = [...e];
  for (let s = 0; s < 32; s++) {
    let d = basename(r[0] ?? "");
    r[0] = o ? d.toUpperCase().toLowerCase() : d;
    let u = r[0] === "env" ? splitStringArgs(r) : void 0;
    if (u !== void 0) {
      r = u;
      continue;
    }
    let p = unwrapCommandArgv(r),
      h = p.length !== r.length || p[0] !== r[0];
    if (h && !/^[-+\d]/.test(p[0] ?? "")) {
      r = p;
      continue;
    }
    if (!TRANSPARENT_LAUNCHER_NAMES.has(r[0]) || (r[0] === "command" && r.some(BAt))) return h ? p : r;
    let index = r.findIndex((S, R) => R > 0 && !/^(?:[-+]|\d+(?:\.\d+)?[smhd]?$|[A-Za-z_]\w*=)/.test(S));
    if (index < 1) return r;
    r = r.slice(index);
  }
  return;
}
//@ chunk-tr0s0d0k.js:34192-34592 placement
function splitStringArgs(e) {
  for (let n = 1; n < e.length; n++) {
    let o = e[n],
      r = o.startsWith("--split-string=")
        ? o.slice(15)
        : /^-[^-]*S/.test(o)
          ? o.slice(o.indexOf("S") + 1)
          : void 0,
      s = o === "--split-string" || r === "",
      d = s ? (e[n + 1] ?? "") : r;
    if (d !== void 0) return [...d.trim().split(/\s+/).filter(Boolean), ...e.slice(n + (s ? 2 : 1))];
    if (["-u", "-C", "--unset", "--chdir"].includes(o)) n++;
    else if (o === "--" || !/^(?:-|[A-Za-z_]\w*=)/.test(o)) return;
  }
  return;
}
//@ chunk-tr0s0d0k.js:34592-34791 placement
function hostCredentialRuleOf(e) {
  if (e?.type === "rule") return e.rule.source === HOST_CREDENTIAL_RULE_SOURCE ? e.rule : void 0;
  if (e?.type === "subcommandResults")
    for (let n of e.reasons.values()) {
      let o = hostCredentialRuleOf(n.decisionReason);
      if (o !== void 0) return o;
    }
  return;
}
//@ chunk-tr0s0d0k.js:34791-35157 placement
function servedToolPath(e, n, o, r) {
  if (e.getPath === void 0) return;
  let s = safeParseToolInput(e, n);
  if (!s.success) return;
  let d = Yg(r, () => e.getPath?.(s.data));
  if (typeof d !== "string" || d === "") return;
  let u = e.isReadOnly(s.data) ? ["read", "edit"] : ["edit", "read"],
    p = getPathsForPermissionCheck(expandPath(d, r)),
    h = getPlatform() === "macos" ? p.flatMap((_) => [_, normalizeCaseForComparison(_)]) : p;
  for (let _ of h)
    for (let S of u) {
      let R = matchingRuleForInput(_, o, S, "deny");
      if (R?.source === HOST_CREDENTIAL_RULE_SOURCE) return R;
    }
  return;
}
//@ chunk-tr0s0d0k.js:35157-35246 placement = getDenyRuleForAgent (1)
function stripDoubleSlashPrefix(e) {
  let n = e.ruleValue.ruleContent ?? "";
  return n.startsWith("//") ? n.slice(1) : n;
}
//@ chunk-tr0s0d0k.js:35246-35380 placement
function isMountPointRule(e) {
  let n = stripDoubleSlashPrefix(e);
  return claudeStateGlobs(
    Dst().map(({ mountPoint: mountPoint }) => ({ literal: mountPoint, tail: "" })),
  ).some((o) => n.startsWith(`${o.slice(1)}/`));
}

export {
  commandReachesSettings,
  servedToolPath,
  isMountPointRule,
  stripDoubleSlashPrefix,
  judgeServedMcpPaths,
  hostCredentialRuleOf,
};
