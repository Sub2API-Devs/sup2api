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
import { realpath, lstat, mkdir } from "fs/promises";
import { dirname, isAbsolute, sep, join, resolve } from "path";
import { tagFailureStage } from "./launcherHooks.js";
import {
  getErrnoCode,
  errorMessage,
  isENOENT,
  isEISDIR,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { isNetworkRelatedPath } from "../../utils/networkPaths.js";
import { isDevicePrefixPath, isUncOrDevicePath } from "../../utils/pathClassification.js";
import { withFsOpTimeout, withBoundedTimeout, FS_OP_TIMEOUT_MS } from "../../utils/boundedTimeout.js";
import { examineEntryChain } from "../../utils/fsOperations.js";
import { removeTrailingGlobSuffix } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
import { expandPath } from "../../utils/path.js";
import { readFileChecked, isFileTooLargeError } from "../../utils/fileRead.js";
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
//@ chunk-hm0ce8vc.js:195571-203425 placement
/**
 * 扫描仓库 .claude/settings*.json 等，发现主机特定写入范围条目则拒绝启动（SETUP_FAILURE_KIND_REPO_SETTINGS_REJECTED）。
 */
async function checkRepoCommittedSettings(e, n, r) {
  let s = [];
  let a = (A) => tagFailureStage(A, "SETUP_FAILURE_KIND_REPO_SETTINGS_REJECTED");
  let o = (path, G, K) => (L) => {
    let errnoCode = getErrnoCode(L);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return;
    throw new RepoSettingsRejectedError(
      {
        ...G,
        path,
        kind: "scan-fs-error",
      },
      `could not be probed (${K} failed: ${L instanceof Error ? L.message : String(L)}) \u2014 refusing rather than fold a non-ENOENT error into "does not exist" (fail-closed)`,
    );
  };
  let l = (A) => isNetworkRelatedPath(A) || isDevicePrefixPath(A);
  let u = 4096;
  let h;
  let p = () =>
    (h ??= withFsOpTimeout(
      realpath(e).catch(() => null),
      `realpath ${e}`,
    ));
  let S = new Map();
  let T = async (A) => {
    let G = await p();
    let K = S.get(A);
    if (K === undefined) {
      let abortController = new AbortController();
      K = {
        verdict: examineEntryChain(A, G, {
          signal: abortController.signal,
        }),
        walk: abortController,
      };
      S.set(A, K);
    }
    try {
      return await withBoundedTimeout(K.verdict, FS_OP_TIMEOUT_MS, `network-path screen of ${A}`);
    } catch (error) {
      K.walk.abort();
      throw error;
    }
  };
  let y = async (path, G) => {
    if (isUncOrDevicePath(path) || l(path)) return;
    if (Buffer.byteLength(path) > 4096)
      throw new RepoSettingsRejectedError(
        {
          ...G,
          path,
          kind: "scan-fs-error",
        },
        `could not be probed (its resolved path is ${Buffer.byteLength(path)} bytes; this scan examines paths up to ${"4096"} bytes) \u2014 refusing rather than examine it (fail-closed)`,
      );
    let K = await T(path).catch((error) => {
      throw new RepoSettingsRejectedError(
        {
          ...G,
          path,
          kind: "scan-fs-error",
        },
        `could not be probed (${errorMessage(error)} \u2014 a hung mount on that path, or a symlink chain in the checkout too long to examine in time) \u2014 refusing rather than resolve through an unexamined path (fail-closed)`,
      );
    });
    if (K.verdict === "unverified")
      throw new RepoSettingsRejectedError(
        {
          ...G,
          path,
          kind: "scan-fs-error",
        },
        `could not be probed (its resolved path '${path}' could not be inspected without following links \u2014 a permission, I/O or resource error on a directory or link on it, a link whose target could not be read, or too many symlinks on the path; check that path on the runner host) \u2014 refusing rather than resolve through it (fail-closed)`,
      );
    if (K.verdict !== "clean")
      throw new RepoSettingsRejectedError(
        {
          ...G,
          path,
        },
        `resolves to '${path}', where a symlink on the path leads to the network path '${K.reaches}' \u2014 resolving it would reach the network before any trust decision; refused without resolving (fail-closed)`,
      );
    let L = await withFsOpTimeout(realpath(path).catch(o(path, G, "realpath")), `realpath ${path}`);
    if (L !== undefined) return L;
    let D = path;
    for (let j = 0; j < 64; j++) {
      let ge = await withFsOpTimeout(lstat(D).catch(o(path, G, "lstat")), `lstat ${D}`);
      if (ge?.isSymbolicLink())
        throw new RepoSettingsRejectedError(
          {
            ...G,
            path,
          },
          `traverses a symlink at ${D} whose target path cannot be realpath'd \u2014 a repo-shipped link (dangling, or pointing outside the workspace with a nonexistent leaf) can be retargeted at use time`,
        );
      if (ge !== undefined) return;
      let Ne = dirname(D);
      if (Ne === D) return;
      D = Ne;
    }
    throw new RepoSettingsRejectedError(
      {
        ...G,
        path,
      },
      "has too many nonexistent path components (ancestor-walk hop bound exhausted) \u2014 refusing rather than skip the symlink probe",
    );
  };
  let v = async (path, G) => {
    if (!isAbsolute(path)) return;
    let filtered = path.split(sep).filter((D) => D.length > 0);
    if (!filtered.includes("..")) return;
    if (l(path))
      throw new RepoSettingsRejectedError(
        {
          ...G,
          path,
        },
        "names an automount/NT-namespace-transiting spelling with '..' \u2014 the kernel-divergence probe cannot run without performing the automount lookup itself; refusing (fail-closed)",
      );
    let L = path.startsWith(sep) ? sep : "";
    for (let D of filtered) {
      if (D === ".") continue;
      if (D === "..") {
        L = dirname(L);
        continue;
      }
      L = L === sep ? sep + D : join(L, D);
      let oe = await withFsOpTimeout(lstat(L).catch(o(path, G, "lstat")), `lstat ${L}`);
      if (oe?.isSymbolicLink())
        throw new RepoSettingsRejectedError(
          {
            ...G,
            path,
          },
          `contains a '..' after symlink ${L} \u2014 the kernel resolves the symlink before the '..' at bind time, diverging from the lexically-collapsed form the confine check saw`,
        );
      if (oe === undefined) return;
    }
  };
  let w = (A) => {
    let G = removeTrailingGlobSuffix(A) || sep;
    return expandPath(G, e);
  };
  let E = (A) => removeTrailingGlobSuffix(A) || sep;
  for (let A of new Set([e, ...n])) {
    let G = join(A, ".claude");
    let K = await withFsOpTimeout(
      lstat(G).catch((error) => {
        if (isENOENT(error)) return;
        throw error;
      }),
      `lstat ${G}`,
    );
    if (K === undefined) continue;
    if (K.isSymbolicLink())
      throw new RepoSettingsRejectedError(
        {
          path: G,
          sourceFile: G,
          raw: ".claude",
          kind: "permissions.additionalDirectories",
        },
        "is a symlink \u2014 refusing to follow (the settings read below would escape the workspace)",
      );
    for (let L of ["settings.json", "settings.local.json"]) {
      let D = join(G, L);
      let oe = await withFsOpTimeout(
        lstat(D).catch((error) => {
          if (isENOENT(error)) return;
          let fe = new RepoSettingsRejectedError(
            {
              path: D,
              sourceFile: D,
              raw: L,
              kind: "scan-fs-error",
            },
            `could not be lstat'd (${error instanceof Error ? error.message : String(error)}) \u2014 refusing rather than skip the scan`,
          );
          throw getErrnoCode(error) === "ENOTDIR" ? a(fe) : fe;
        }),
        `lstat ${D}`,
      );
      if (oe === undefined) continue;
      if (oe.isSymbolicLink())
        throw new RepoSettingsRejectedError(
          {
            path: D,
            sourceFile: D,
            raw: L,
            kind: "permissions.additionalDirectories",
          },
          "is a symlink \u2014 refusing to follow (the settings read below would escape the workspace; same posture as the .claude-dir lstat guard)",
        );
      let ge;
      try {
        ge = await withFsOpTimeout(
          readFileChecked(D, MAX_SETTINGS_JSON_BYTES).then((fileChecked) => fileChecked.content),
          `readFile ${D}`,
        );
      } catch (error) {
        if (isENOENT(error)) continue;
        let fe = new RepoSettingsRejectedError(
          {
            path: D,
            sourceFile: D,
            raw: L,
            kind: "scan-fs-error",
          },
          `could not be read (${error instanceof Error ? error.message : String(error)}) \u2014 refusing rather than skip the scan`,
        );
        throw isEISDIR(error) || isFileTooLargeError(error) ? a(fe) : fe;
      }
      let me = safeParseJSON(ge, false);
      if (r && (A === e || e.startsWith(A + sep)) && me?.disableAllHooks === true)
        r.repoDisablesAllHooks = true;
      if (
        me?.env !== undefined &&
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
        ["sandbox.enabled", me?.sandbox?.enabled, false],
        ["disableAllHooks", me?.disableAllHooks, false],
        ["sandbox.allowUnsandboxedCommands", me?.sandbox?.allowUnsandboxedCommands, true],
        ["sandbox.failIfUnavailable", me?.sandbox?.failIfUnavailable, false],
      ])
        if (fe === $e)
          throw new RepoSettingsRejectedError(
            {
              path: D,
              sourceFile: D,
              raw: `${ae}: ${String($e)}`,
              kind: "operator-posture override",
            },
            `negates the operator's ${ae} posture (projectSettings overrides userSettings in the merged read). Remove it from the repo settings; operator posture belongs in the user-level settings.json`,
          );
      let permissions = me?.permissions;
      let allow = Array.isArray(permissions?.allow) ? permissions.allow : [];
      for (let ae of allow) {
        if (typeof ae !== "string") continue;
        let fe = permissionRuleValueFromString(ae);
        if (![FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME, NOTEBOOK_EDIT_TOOL_NAME].includes(fe.toolName))
          continue;
        if (fe.ruleContent === undefined) {
          s.push({
            path: sep,
            sourceFile: D,
            raw: ae,
            kind: "permissions.allow (bare write-tool rule)",
          });
          continue;
        }
        let { root } = patternWithRootFor(fe.ruleContent, A);
        {
          let Fe = {
            sourceFile: D,
            raw: ae,
            kind: "permissions.allow (sandbox-arm projection)",
          };
          let ve;
          let Ae;
          try {
            ve = resolvePathPatternForSandboxAt(parseRuleForSandbox(ae).ruleContent ?? fe.ruleContent, A);
            Ae = w(ve);
          } catch (error) {
            throw new RepoSettingsRejectedError(
              {
                ...Fe,
                path: fe.ruleContent,
              },
              `could not be resolved (${error instanceof Error ? error.message : String(error)}) \u2014 refusing rather than trust an entry the confine check cannot project`,
            );
          }
          s.push({
            ...Fe,
            path: Ae,
          });
          let Ht = await y(Ae, Fe);
          if (Ht !== undefined && Ht !== Ae)
            s.push({
              ...Fe,
              path: Ht,
            });
          await v(E(ve), Fe);
        }
        if (root === null) continue;
        let Ve = {
          sourceFile: D,
          raw: ae,
          kind: "permissions.allow",
        };
        s.push({
          ...Ve,
          path: root,
        });
        let Be = await y(root, Ve);
        if (Be !== undefined && Be !== root)
          s.push({
            ...Ve,
            path: Be,
          });
      }
      for (let [ae, fe] of [
        ["allowWrite", me?.sandbox?.filesystem?.allowWrite],
        ["allowRead", me?.sandbox?.filesystem?.allowRead],
      ]) {
        if (!Array.isArray(fe)) continue;
        for (let $e of fe) {
          if (typeof $e !== "string") continue;
          let Ve = {
            sourceFile: D,
            raw: $e,
            kind: `sandbox.filesystem.${ae}`,
          };
          let Be;
          let Fe;
          try {
            Fe = resolveSandboxFilesystemPathAt($e, A);
            Be = w(Fe);
          } catch (error) {
            throw new RepoSettingsRejectedError(
              {
                ...Ve,
                path: $e,
              },
              `could not be resolved (${error instanceof Error ? error.message : String(error)}) \u2014 refusing rather than trust an entry the confine check cannot project`,
            );
          }
          s.push({
            ...Ve,
            path: Be,
          });
          let ve = await y(Be, Ve);
          if (ve !== undefined && ve !== Be)
            s.push({
              ...Ve,
              path: ve,
            });
          await v(E(Fe), Ve);
        }
      }
      let additionalDirectories = permissions?.additionalDirectories;
      if (!Array.isArray(additionalDirectories)) continue;
      for (let additionalDirectory of additionalDirectories) {
        if (typeof additionalDirectory !== "string") continue;
        let fe = {
          sourceFile: D,
          raw: additionalDirectory,
          kind: "permissions.additionalDirectories",
        };
        let $e;
        try {
          $e = resolve(expandPath(additionalDirectory, e));
        } catch (error) {
          throw new RepoSettingsRejectedError(
            {
              ...fe,
              path: String(additionalDirectory),
            },
            `could not be resolved (${error instanceof Error ? error.message : String(error)}) \u2014 refusing rather than trust an entry the confine check cannot project`,
          );
        }
        s.push({
          ...fe,
          path: $e,
        });
        let Ve = await y($e, fe);
        if (Ve !== undefined && Ve !== $e)
          s.push({
            ...fe,
            path: Ve,
          });
        await v(E(additionalDirectory), fe);
      }
    }
  }
  return s;
}
//@ chunk-hm0ce8vc.js:203425-203810 placement
/**
 * 会话目录与子进程自动允许写入范围重叠时拒绝启动。
 */
function checkSessionDirOutsideWriteScope(e, n, r, s) {
  let lower = e.toLowerCase();
  let o = (l) => (l.endsWith(sep) ? l : l + sep);
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
  let r = resolve(e);
  let s = isAbsolute(n) ? resolve(n) : resolve(r, n);
  if (s === r) return s;
  if (s.startsWith(r + sep)) return s;
  return null;
}
//@ chunk-hm0ce8vc.js:203922-204220 placement
async function ensureDirsNoSymlinks(e, inside) {
  let r = resolve(e);
  let s = resolve(inside);
  if (s !== r && !s.startsWith(r + sep)) return false;
  let filtered = s.slice(r.length).split(sep).filter(Boolean);
  for (let o of filtered) {
    r = join(r, o);
    try {
      let l = await lstat(r);
      if (l.isSymbolicLink() || !l.isDirectory()) return false;
    } catch (error) {
      if (!isENOENT(error)) return false;
      try {
        await mkdir(r);
      } catch {
        return false;
      }
    }
  }
  return true;
}
//@ chunk-hm0ce8vc.js:204220-204328 placement
async function isRealpathInside(e, inside) {
  try {
    let r = await realpath(e);
    let s = await realpath(inside);
    return s === r || s.startsWith(r + sep);
  } catch {
    return false;
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
