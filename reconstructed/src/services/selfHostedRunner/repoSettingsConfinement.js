/**
 * services/selfHostedRunner/repoSettingsConfinement.ts
 *
 * 2.1.316 新增：自托管 runner 检查仓库提交的 .claude 设置，拒绝越权的写入范围条目（SELF_HOSTED_RUNNER_CONFINE_REPO_SETTINGS）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hm0ce8vc.js (6)
 * attribution: placement 6
 */
import {
  realpath,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
} from "fs/promises";
import {
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  sep,
  sep as sep_2,
  sep as sep_3,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
} from "path";
import { tagFailureStage } from "./launcherHooks.js";
import {
  getErrnoCode,
  errorMessage,
  isENOENT,
  isEISDIR,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { Qg } from "../../utils/networkPaths.js";
import { gb, Qn } from "../../utils/pathClassification.js";
import { z_, withBoundedTimeout, Hln } from "../../utils/boundedTimeout.js";
import { examineEntryChain } from "../../utils/fsOperations.js";
import { uy } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
import { expandPath } from "../../utils/path.js";
import { readFileChecked, Cj } from "../../utils/fileRead.js";
import { MAX_SETTINGS_JSON_BYTES } from "../../utils/settings/settings.js";
import { safeParseJSON } from "../../utils/json.js";
import { permissionRuleValueFromString } from "../../utils/permissions/permissionRuleParser.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { patternWithRootFor } from "../../utils/permissions/filesystem.js";
import {
  resolvePathPatternForSandboxAt,
  parseRuleForSandbox,
  resolveSandboxFilesystemPathAt,
} from "../../utils/sandbox/sandbox-adapter.js";

//@ chunk-hm0ce8vc.js:195214-195571 placement
class RepoSettingsRejectedError extends Error {
  entry;
  detail;
  constructor(e, n) {
    super(
      `[runner:session] repo-committed ${e.kind} entry '${e.raw}' in ${e.sourceFile} ${n} \u2014 refusing to spawn. Host-specific write-scope entries belong in the operator's user-level settings.json (userSettings source, not trust-gated \u2014 see --trust-workspace docs).`,
    );
    this.entry = e;
    this.detail = n;
  }
}
/**
 * 扫描仓库 .claude/settings*.json 等，发现主机特定写入范围条目则拒绝启动（SETUP_FAILURE_KIND_REPO_SETTINGS_REJECTED）。
 */
//@ chunk-hm0ce8vc.js:195571-203425 placement
async function checkRepoCommittedSettings(e, n, r) {
  let s = [],
    a = (A) => tagFailureStage(A, "SETUP_FAILURE_KIND_REPO_SETTINGS_REJECTED"),
    o = (A, G, K) => (L) => {
      let D = getErrnoCode(L);
      if (D === "ENOENT" || D === "ENOTDIR") return;
      throw new RepoSettingsRejectedError(
        { ...G, path: A, kind: "scan-fs-error" },
        `could not be probed (${K} failed: ${L instanceof Error ? L.message : String(L)}) \u2014 refusing rather than fold a non-ENOENT error into "does not exist" (fail-closed)`,
      );
    },
    l = (A) => Qg(A) || gb(A),
    u = 4096,
    h,
    p = () =>
      (h ??= z_(
        realpath(e).catch(() => null),
        `realpath ${e}`,
      )),
    S = new Map(),
    T = async (A) => {
      let G = await p(),
        K = S.get(A);
      if (K === void 0) {
        let abortController = new AbortController();
        ((K = {
          verdict: examineEntryChain(A, G, { signal: abortController.signal }),
          walk: abortController,
        }),
          S.set(A, K));
      }
      try {
        return await withBoundedTimeout(K.verdict, Hln, `network-path screen of ${A}`);
      } catch (error) {
        throw (K.walk.abort(), error);
      }
    },
    y = async (A, G) => {
      if (Qn(A) || l(A)) return;
      if (Buffer.byteLength(A) > 4096)
        throw new RepoSettingsRejectedError(
          { ...G, path: A, kind: "scan-fs-error" },
          `could not be probed (its resolved path is ${Buffer.byteLength(A)} bytes; this scan examines paths up to ${"4096"} bytes) \u2014 refusing rather than examine it (fail-closed)`,
        );
      let K = await T(A).catch((oe) => {
        throw new RepoSettingsRejectedError(
          { ...G, path: A, kind: "scan-fs-error" },
          `could not be probed (${errorMessage(oe)} \u2014 a hung mount on that path, or a symlink chain in the checkout too long to examine in time) \u2014 refusing rather than resolve through an unexamined path (fail-closed)`,
        );
      });
      if (K.verdict === "unverified")
        throw new RepoSettingsRejectedError(
          { ...G, path: A, kind: "scan-fs-error" },
          `could not be probed (its resolved path '${A}' could not be inspected without following links \u2014 a permission, I/O or resource error on a directory or link on it, a link whose target could not be read, or too many symlinks on the path; check that path on the runner host) \u2014 refusing rather than resolve through it (fail-closed)`,
        );
      if (K.verdict !== "clean")
        throw new RepoSettingsRejectedError(
          { ...G, path: A },
          `resolves to '${A}', where a symlink on the path leads to the network path '${K.reaches}' \u2014 resolving it would reach the network before any trust decision; refused without resolving (fail-closed)`,
        );
      let L = await z_(realpath(A).catch(o(A, G, "realpath")), `realpath ${A}`);
      if (L !== void 0) return L;
      let D = A;
      for (let oe = 0; oe < 64; oe++) {
        let ge = await z_(lstat_3(D).catch(o(A, G, "lstat")), `lstat ${D}`);
        if (ge?.isSymbolicLink())
          throw new RepoSettingsRejectedError(
            { ...G, path: A },
            `traverses a symlink at ${D} whose target path cannot be realpath'd \u2014 a repo-shipped link (dangling, or pointing outside the workspace with a nonexistent leaf) can be retargeted at use time`,
          );
        if (ge !== void 0) return;
        let Ne = dirname_4(D);
        if (Ne === D) return;
        D = Ne;
      }
      throw new RepoSettingsRejectedError(
        { ...G, path: A },
        "has too many nonexistent path components (ancestor-walk hop bound exhausted) \u2014 refusing rather than skip the symlink probe",
      );
    },
    v = async (A, G) => {
      if (!isAbsolute_3(A)) return;
      let filtered = A.split(sep_3).filter((D) => D.length > 0);
      if (!filtered.includes("..")) return;
      if (l(A))
        throw new RepoSettingsRejectedError(
          { ...G, path: A },
          "names an automount/NT-namespace-transiting spelling with '..' \u2014 the kernel-divergence probe cannot run without performing the automount lookup itself; refusing (fail-closed)",
        );
      let L = A.startsWith(sep_3) ? sep_3 : "";
      for (let D of filtered) {
        if (D === ".") continue;
        if (D === "..") {
          L = dirname_4(L);
          continue;
        }
        L = L === sep_3 ? sep_3 + D : join_4(L, D);
        let oe = await z_(lstat_3(L).catch(o(A, G, "lstat")), `lstat ${L}`);
        if (oe?.isSymbolicLink())
          throw new RepoSettingsRejectedError(
            { ...G, path: A },
            `contains a '..' after symlink ${L} \u2014 the kernel resolves the symlink before the '..' at bind time, diverging from the lexically-collapsed form the confine check saw`,
          );
        if (oe === void 0) return;
      }
    },
    w = (A) => {
      let G = uy(A) || sep_3;
      return expandPath(G, e);
    },
    E = (A) => uy(A) || sep_3;
  for (let A of new Set([e, ...n])) {
    let G = join_4(A, ".claude"),
      K = await z_(
        lstat_3(G).catch((L) => {
          if (isENOENT(L)) return;
          throw L;
        }),
        `lstat ${G}`,
      );
    if (K === void 0) continue;
    if (K.isSymbolicLink())
      throw new RepoSettingsRejectedError(
        { path: G, sourceFile: G, raw: ".claude", kind: "permissions.additionalDirectories" },
        "is a symlink \u2014 refusing to follow (the settings read below would escape the workspace)",
      );
    for (let L of ["settings.json", "settings.local.json"]) {
      let D = join_4(G, L),
        oe = await z_(
          lstat_3(D).catch((ae) => {
            if (isENOENT(ae)) return;
            let fe = new RepoSettingsRejectedError(
              { path: D, sourceFile: D, raw: L, kind: "scan-fs-error" },
              `could not be lstat'd (${ae instanceof Error ? ae.message : String(ae)}) \u2014 refusing rather than skip the scan`,
            );
            throw getErrnoCode(ae) === "ENOTDIR" ? a(fe) : fe;
          }),
          `lstat ${D}`,
        );
      if (oe === void 0) continue;
      if (oe.isSymbolicLink())
        throw new RepoSettingsRejectedError(
          { path: D, sourceFile: D, raw: L, kind: "permissions.additionalDirectories" },
          "is a symlink \u2014 refusing to follow (the settings read below would escape the workspace; same posture as the .claude-dir lstat guard)",
        );
      let ge;
      try {
        ge = await z_(
          readFileChecked(D, MAX_SETTINGS_JSON_BYTES).then((ae) => ae.content),
          `readFile ${D}`,
        );
      } catch (error) {
        if (isENOENT(error)) continue;
        let fe = new RepoSettingsRejectedError(
          { path: D, sourceFile: D, raw: L, kind: "scan-fs-error" },
          `could not be read (${error instanceof Error ? error.message : String(error)}) \u2014 refusing rather than skip the scan`,
        );
        throw isEISDIR(error) || Cj(error) ? a(fe) : fe;
      }
      let me = safeParseJSON(ge, !1);
      if (r && (A === e || e.startsWith(A + sep_3)) && me?.disableAllHooks === !0)
        r.repoDisablesAllHooks = !0;
      if (
        me?.env !== void 0 &&
        me?.env !== null &&
        typeof me.env === "object" &&
        Object.keys(me.env).length > 0
      )
        throw new RepoSettingsRejectedError(
          {
            path: D,
            sourceFile: D,
            raw: `env: {${Object.keys(me.env).slice(0, 3).join(", ")}${Object.keys(me.env).length > 3 ? ", \u2026" : ""}}`,
            kind: "operator-posture override",
          },
          "sets env vars that reach every child subprocess (BASH_ENV/LD_PRELOAD/NODE_OPTIONS/GIT_* are unsandboxed-exec inlets). Runner-level env belongs in the operator wrapper script or runner env, not repo settings",
        );
      for (let [ae, fe, $e] of [
        ["sandbox.enabled", me?.sandbox?.enabled, !1],
        ["disableAllHooks", me?.disableAllHooks, !1],
        ["sandbox.allowUnsandboxedCommands", me?.sandbox?.allowUnsandboxedCommands, !0],
        ["sandbox.failIfUnavailable", me?.sandbox?.failIfUnavailable, !1],
      ])
        if (fe === $e)
          throw new RepoSettingsRejectedError(
            { path: D, sourceFile: D, raw: `${ae}: ${String($e)}`, kind: "operator-posture override" },
            `negates the operator's ${ae} posture (projectSettings overrides userSettings in the merged read). Remove it from the repo settings; operator posture belongs in the user-level settings.json`,
          );
      let Te = me?.permissions,
        Ye = Array.isArray(Te?.allow) ? Te.allow : [];
      for (let ae of Ye) {
        if (typeof ae !== "string") continue;
        let fe = permissionRuleValueFromString(ae);
        if (![FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME, NOTEBOOK_EDIT_TOOL_NAME].includes(fe.toolName))
          continue;
        if (fe.ruleContent === void 0) {
          s.push({ path: sep_3, sourceFile: D, raw: ae, kind: "permissions.allow (bare write-tool rule)" });
          continue;
        }
        let { root: root } = patternWithRootFor(fe.ruleContent, A);
        {
          let Fe = { sourceFile: D, raw: ae, kind: "permissions.allow (sandbox-arm projection)" },
            ve,
            Ae;
          try {
            ((ve = resolvePathPatternForSandboxAt(parseRuleForSandbox(ae).ruleContent ?? fe.ruleContent, A)),
              (Ae = w(ve)));
          } catch (error) {
            throw new RepoSettingsRejectedError(
              { ...Fe, path: fe.ruleContent },
              `could not be resolved (${error instanceof Error ? error.message : String(error)}) \u2014 refusing rather than trust an entry the confine check cannot project`,
            );
          }
          s.push({ ...Fe, path: Ae });
          let Ht = await y(Ae, Fe);
          if (Ht !== void 0 && Ht !== Ae) s.push({ ...Fe, path: Ht });
          await v(E(ve), Fe);
        }
        if (root === null) continue;
        let Ve = { sourceFile: D, raw: ae, kind: "permissions.allow" };
        s.push({ ...Ve, path: root });
        let Be = await y(root, Ve);
        if (Be !== void 0 && Be !== root) s.push({ ...Ve, path: Be });
      }
      for (let [ae, fe] of [
        ["allowWrite", me?.sandbox?.filesystem?.allowWrite],
        ["allowRead", me?.sandbox?.filesystem?.allowRead],
      ]) {
        if (!Array.isArray(fe)) continue;
        for (let $e of fe) {
          if (typeof $e !== "string") continue;
          let Ve = { sourceFile: D, raw: $e, kind: `sandbox.filesystem.${ae}` },
            Be,
            Fe;
          try {
            ((Fe = resolveSandboxFilesystemPathAt($e, A)), (Be = w(Fe)));
          } catch (error) {
            throw new RepoSettingsRejectedError(
              { ...Ve, path: $e },
              `could not be resolved (${error instanceof Error ? error.message : String(error)}) \u2014 refusing rather than trust an entry the confine check cannot project`,
            );
          }
          s.push({ ...Ve, path: Be });
          let ve = await y(Be, Ve);
          if (ve !== void 0 && ve !== Be) s.push({ ...Ve, path: ve });
          await v(E(Fe), Ve);
        }
      }
      let He = Te?.additionalDirectories;
      if (!Array.isArray(He)) continue;
      for (let ae of He) {
        if (typeof ae !== "string") continue;
        let fe = { sourceFile: D, raw: ae, kind: "permissions.additionalDirectories" },
          $e;
        try {
          $e = resolve_3(expandPath(ae, e));
        } catch (error) {
          throw new RepoSettingsRejectedError(
            { ...fe, path: String(ae) },
            `could not be resolved (${error instanceof Error ? error.message : String(error)}) \u2014 refusing rather than trust an entry the confine check cannot project`,
          );
        }
        s.push({ ...fe, path: $e });
        let Ve = await y($e, fe);
        if (Ve !== void 0 && Ve !== $e) s.push({ ...fe, path: Ve });
        await v(E(ae), fe);
      }
    }
  }
  return s;
}
/**
 * 会话目录与子进程自动允许写入范围重叠时拒绝启动。
 */
//@ chunk-hm0ce8vc.js:203425-203810 placement
function checkSessionDirOutsideWriteScope(e, n, r, s) {
  let lower = e.toLowerCase(),
    o = (l) => (l.endsWith(sep_3) ? l : l + sep_3);
  for (let l of [r, ...s]) {
    let lower_2 = l.toLowerCase();
    if (lower === lower_2 || lower.startsWith(o(lower_2)) || lower_2.startsWith(o(lower)))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `[runner:session] per-session ${n} ${e} overlaps the child's auto-allowed write scope (${l}) \u2014 refusing to spawn`,
        "per-session dir overlaps the child auto-allowed write scope \u2014 refusing to spawn",
      );
  }
}
//@ chunk-hm0ce8vc.js:203810-203922 placement
function resolveInside(e, n) {
  let r = resolve_3(e),
    s = isAbsolute_3(n) ? resolve_3(n) : resolve_3(r, n);
  if (s === r) return s;
  if (s.startsWith(r + sep_3)) return s;
  return null;
}
//@ chunk-hm0ce8vc.js:203922-204220 placement
async function ensureDirsNoSymlinks(e, n) {
  let r = resolve_3(e),
    s = resolve_3(n);
  if (s !== r && !s.startsWith(r + sep_3)) return !1;
  let filtered = s.slice(r.length).split(sep_3).filter(Boolean);
  for (let o of filtered) {
    r = join_4(r, o);
    try {
      let l = await lstat_3(r);
      if (l.isSymbolicLink() || !l.isDirectory()) return !1;
    } catch (error) {
      if (!isENOENT(error)) return !1;
      try {
        await mkdir_4(r);
      } catch {
        return !1;
      }
    }
  }
  return !0;
}
//@ chunk-hm0ce8vc.js:204220-204328 placement
async function isRealpathInside(e, n) {
  try {
    let r = await realpath(e),
      s = await realpath(n);
    return s === r || s.startsWith(r + sep_3);
  } catch {
    return !1;
  }
}

export {
  resolveInside,
  ensureDirsNoSymlinks,
  isRealpathInside,
  checkSessionDirOutsideWriteScope,
  checkRepoCommittedSettings,
  RepoSettingsRejectedError,
};
