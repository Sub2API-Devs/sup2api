/**
 * plugins/functionHooks/fsApi.ts
 *
 * 2.1.316 新增：插件 $.fs 接口（受限文件访问、祖先目录查找）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (14)
 * attribution: placement 14
 */
import { sep, parse, dirname, join, isAbsolute, resolve as resolve_2 } from "path";
import { open, mkdir, writeFile, stat, lstat, readlink, realpath, readdir } from "fs/promises";
import { constants } from "fs";
import { getOriginalCwd, getRootSession } from "../../bootstrap/state.js";
import { isClaudeMdLoadingDisabled } from "../../utils/settings/customizationDisabled.js";
import {
  isInstructionSourceEnabled,
  createHeldPathTracker,
  getWorktreeRoots,
  isInMainRepoOutsideWorktree,
  isInstructionsMemoryType_3,
} from "../../utils/claudemd.js";
import { logForDebugging } from "../../utils/debug.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { getCurrentProjectConfig, getMemoryPath } from "../../utils/config.js";
import { normalizePathForCompare } from "../../utils/file.js";
import {
  clearOwedInstructionFiles,
  recordWithheldInstructionFiles,
  isInstructionReadRestricted,
  instructionReadText,
  DEFAULT_INSTRUCTION_READ_TIMEOUT_MS,
} from "../../utils/instructionFileAccess.js";
import { getCwd } from "../../utils/cwd.js";
import { HooksError } from "./hooksErrors.js";
import { isNetworkOrDevicePath } from "./ui/imageSource.js";
import { getPlatform } from "../../utils/platform.js";
import { getErrnoCode, errorMessage } from "../../utils/errors.js";
import { MAX_IMAGE_BYTES_ALIAS, MAX_IMAGE_BYTES } from "../../utils/attachmentMedia.js";
import { mergePersistedDenyRules } from "../../utils/permissions/permissions.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { requireBoundSession } from "./sessionApi.js";
import { isRestrictedReadBlocked } from "../../utils/claudeInChrome/fileUpload.js";
import { validateNamesArg, checkPathArg, checkFsReadArgs, checkFsStatArgs } from "./panes.js";
import { getErrnoPath } from "./apiDispatch.js";

//@ chunk-e6aww6q8.js:3725242-3725299 placement
var zxe = Object.freeze(["AGENTS.md", ".claude/AGENTS.md"]);
//@ chunk-e6aww6q8.js:3725299-3726779 placement
/**
 * 插件 $.fs.ancestors：列出项目、用户、托管设置的祖先目录；项目记忆关闭或工作区在远端时拒绝。
 */
async function fsAncestors(e, n, { start: r = getOriginalCwd(), below: s, held: h, session: y } = {}) {
  if (isClaudeMdLoadingDisabled() || !isInstructionSourceEnabled("projectSettings")) {
    logForDebugging(`$.fs.ancestors (${n}): project memory is off`);
    return [];
  }
  if (isRemoteSessionAvailable()) {
    logForDebugging(`$.fs.ancestors (${n}): the workspace is remote`);
    return [];
  }
  let w = s === undefined ? undefined : s.endsWith(sep) ? s : `${s}${sep}`;
  let L = [];
  let G = r;
  while (G !== parse(G).root) {
    if (w !== undefined && !G.startsWith(w)) break;
    L.push(G);
    G = dirname(G);
  }
  let originalCwd = getOriginalCwd();
  let Z = new Set(
    s === undefined ? L.filter((Et) => Et !== originalCwd && !originalCwd.startsWith(`${Et}${sep}`)) : L,
  );
  let Se = new Set(e.filter((Et) => !/^(\.claude[\\/])?[^\\/]+$/.test(Et)));
  let ke = e.length > 0 && (Z.size > 0 || (Se.size > 0 && L.length > 0));
  let we = y !== undefined && e.some((Et) => !Se.has(Et)) && L.length > Z.size;
  let Ee = we && e.some((Et) => zxe.includes(Et));
  let Ae = we && e.some((Et) => !Se.has(Et) && !zxe.includes(Et));
  let Ie = ke ? h?.() : undefined;
  let Me = Ee ? createHeldPathTracker(y) : undefined;
  let held = Me?.held;
  let held_2 = Ae ? createHeldPathTracker(y).held : undefined;
  let worktreeRoots = getWorktreeRoots(originalCwd);
  let hasClaudeMdExternalIncludesApproved =
    getCurrentProjectConfig().hasClaudeMdExternalIncludesApproved ?? false;
  let nt = new Set([getMemoryPath("Managed"), getMemoryPath("User")].map(normalizePathForCompare));
  let pt = [];
  for (let Et of L.reverse()) {
    if (isInMainRepoOutsideWorktree(Et, worktreeRoots)) continue;
    let yt = Et === originalCwd ? held_2?.within : held_2?.above(Et);
    let gt = Et === originalCwd ? held?.within : held?.above(Et);
    for (let At of e) {
      let It = zxe.includes(At) ? gt : yt;
      let Yt = await isInstructionsMemoryType_3(
        join(Et, At),
        "Project",
        nt,
        hasClaudeMdExternalIncludesApproved,
        0,
        undefined,
        undefined,
        undefined,
        Z.has(Et) || Se.has(At) ? Ie : It,
      );
      if (Yt.length > 0)
        pt.push({
          dir: Et,
          name: At,
          content: Yt.map((qt) => qt.content).join(`

`),
          parts: Yt.map((qt) => ({
            path: qt.path,
            content: qt.content,
          })),
        });
    }
  }
  logForDebugging(`$.fs.ancestors (${n}): ${e.join(", ")} found ${pt.length} of ${L.length} directories`);
  if (Me !== undefined && y !== undefined) {
    clearOwedInstructionFiles(y, Me.loaded());
    recordWithheldInstructionFiles(y, Me.withheld());
  }
  return pt;
}
//@ chunk-e6aww6q8.js:3726779-3726840 placement
/**
 * file/dir/other
 */
var statKind = (e) => (e.isFile() ? "file" : e.isDirectory() ? "dir" : "other");
//@ chunk-e6aww6q8.js:3727137-3727301 placement
function candidatePaths(e, n) {
  let replaced = n.replace(/^\\\\\?\\(?=[A-Za-z]:[\\/])/, "");
  if (isAbsolute(replaced)) return [replaced];
  let s = dirname(e);
  let h = s.endsWith(sep) ? s : `${s}${sep}`;
  return [replaced, `${h}${replaced}`, resolve_2(s, replaced)];
}
//@ chunk-e6aww6q8.js:3727301-3727315 placement
/**
 * 65536
 */
var MAX_FS_READ_BYTES = 65536;
//@ chunk-e6aww6q8.js:3727315-3729142 placement
/**
 * 插件 $.fs.* 的统一拒绝出口：说明为何不可访问（网络位置、Windows 限制、资源繁忙）。
 */
async function refuseFsAccess(e, plugin, cwd) {
  let s = resolve_2(cwd ?? getCwd(), e.path);
  function h(S) {
    logForDebugging(`$.fs.${e.event} (${plugin}): ${s} refused: ${S}`);
    return new HooksError(`${plugin}: $.fs.${e.event}: ${e.path} refused: ` + S);
  }
  if (isNetworkOrDevicePath(e.path) || isNetworkOrDevicePath(s))
    throw h("a network location is not reached from here");
  try {
    switch (e.event) {
      case "read": {
        let S = getPlatform() === "windows";
        let w = await open(s, S ? "r" : constants.O_RDONLY | constants.O_NONBLOCK);
        try {
          let L = [];
          let G = 0;
          for (;;) {
            let Se = Buffer.allocUnsafe(MAX_FS_READ_BYTES);
            let ke;
            try {
              ke = (await w.read(Se, 0, Se.length, null)).bytesRead;
            } catch (error) {
              let errnoCode = getErrnoCode(error);
              if (errnoCode === "EAGAIN" || errnoCode === "EWOULDBLOCK") break;
              throw error;
            }
            if (ke === 0) break;
            G += ke;
            if (G > MAX_IMAGE_BYTES_ALIAS)
              throw h(`the file is over the ${MAX_IMAGE_BYTES_ALIAS}-byte limit`);
            L.push(Se.subarray(0, ke));
          }
          let buffer = Buffer.concat(L);
          return e.as === "bytes"
            ? {
                base64: buffer.toString("base64"),
              }
            : buffer.toString("utf8");
        } finally {
          await w.close();
        }
      }
      case "write": {
        let S = Buffer.byteLength(e.text, "utf8");
        if (S > MAX_IMAGE_BYTES) throw h(`${S} bytes is over the ${MAX_IMAGE_BYTES}-byte limit`);
        await mkdir(dirname(s), {
          recursive: true,
        });
        await writeFile(s, e.text, "utf8");
        logForDebugging(`$.fs.write (${plugin}): ${s} (${S} bytes)`);
        return;
      }
      case "exists":
        return await stat(s).then(
          () => true,
          () => false,
        );
      case "stat": {
        let S = await lstat(s);
        let w = S.isSymbolicLink();
        let L = w && !candidatePaths(s, await readlink(s)).some(isNetworkOrDevicePath);
        let G = !w
          ? S
          : L
            ? await stat(s).catch((error) => {
                let errnoCode = getErrnoCode(error);
                if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR" || errnoCode === "ELOOP") return;
                throw error;
              })
            : undefined;
        let q = G ?? S;
        let Z = e.resolve && G !== undefined;
        return {
          kind: statKind(q),
          size: q.size,
          mtimeMs: q.mtimeMs,
          isLink: w,
          ...(Z && {
            realPath: await realpath(s),
          }),
        };
      }
      case "list": {
        let S = await readdir(s, {
          withFileTypes: true,
        });
        let w = [];
        for (let L of S) {
          let q = L.isFile()
            ? await stat(resolve_2(s, L.name)).catch(() => {
                return;
              })
            : undefined;
          w.push({
            name: L.name,
            kind: statKind(L),
            size: q?.size ?? 0,
            mtimeMs: q?.mtimeMs ?? 0,
            isLink: L.isSymbolicLink(),
          });
        }
        w.sort((L, G) => L.name.localeCompare(G.name));
        return w;
      }
    }
  } catch (error) {
    if (error instanceof HooksError) throw error;
    logForDebugging(`$.fs.${e.event} (${plugin}): ${s} failed: ` + errorMessage(error));
    throw new HooksError(
      `${plugin}: $.fs.${e.event}(${e.path}) failed: ` + (getErrnoCode(error) ?? "no errno"),
    );
  }
}
//@ chunk-e6aww6q8.js:3729142-3729308 placement
function readDenyRulesForAncestors(plugin) {
  let n = mergePersistedDenyRules(
    getToolPermissionContext(
      requireBoundSession(plugin, "$.fs.ancestors off the start-up walk").toolContext(new AbortController()),
    ),
  );
  return isInstructionReadRestricted(n)
    ? instructionReadText(
        {
          context: n,
          isHeldOutside: isRestrictedReadBlocked,
        },
        DEFAULT_INSTRUCTION_READ_TIMEOUT_MS,
      )
    : undefined;
}
//@ chunk-e6aww6q8.js:3729308-3729362 placement
/**
 * 网络位置不可达
 */
var NETWORK_LOCATION_TEXT = "a network location is not reached from here";
//@ chunk-e6aww6q8.js:3729362-3729388 placement
/**
 * 取根会话
 */
function rootSession() {
  return getRootSession();
}
//@ chunk-e6aww6q8.js:3729388-3729847 placement
/**
 * $.fs.ancestors 表项：拒绝网络位置，从 of（默认原始 cwd）向上查找给定文件名，可用 below 限定上界，受拒绝规则约束。
 */
var FS_ANCESTORS_API = {
  check: validateNamesArg,
  raise: () => ({
    field: "of",
    at: getOriginalCwd(),
  }),
  run: async (e, n) => {
    let originalCwd = getOriginalCwd();
    let found = [e.of, e.below].find(
      (S) =>
        S !== undefined && (isNetworkOrDevicePath(S) || isNetworkOrDevicePath(resolve_2(originalCwd, S))),
    );
    if (found !== undefined) {
      logForDebugging(
        `$.fs.ancestors (${n.plugin}): ${resolve_2(originalCwd, found)} refused: ${NETWORK_LOCATION_TEXT}`,
      );
      throw new HooksError(`${n.plugin}: $.fs.ancestors: ${found} refused: ` + NETWORK_LOCATION_TEXT);
    }
    let h = e.of === undefined ? originalCwd : resolve_2(originalCwd, e.of);
    let below = e.below === undefined ? undefined : resolve_2(originalCwd, e.below);
    return fsAncestors(e.names, n.plugin, {
      start: h === originalCwd ? originalCwd : dirname(h),
      below,
      held: () => readDenyRulesForAncestors(n.plugin),
      session: rootSession(),
    });
  },
};
//@ chunk-e6aww6q8.js:3729847-3729933 placement
/**
 * $.fs.list 实现
 */
var FS_LIST_OP = {
  check: checkPathArg,
  raise: getErrnoPath,
  run: (e, n) =>
    refuseFsAccess(
      {
        event: "list",
        path: e.path,
      },
      n.plugin,
      n.cwd,
    ),
};
//@ chunk-e6aww6q8.js:3729933-3730027 placement
/**
 * $.fs.read 实现
 */
var FS_READ_OP = {
  check: checkFsReadArgs,
  raise: getErrnoPath,
  run: (e, n) =>
    refuseFsAccess(
      {
        event: "read",
        path: e.path,
        as: e.as,
      },
      n.plugin,
      n.cwd,
    ),
};
//@ chunk-e6aww6q8.js:3730027-3730131 placement
/**
 * $.fs.stat 表项：校验参数后以插件身份执行 stat。
 */
var FS_STAT_API = {
  check: checkFsStatArgs,
  raise: getErrnoPath,
  run: (e, n) =>
    refuseFsAccess(
      {
        event: "stat",
        path: e.path,
        resolve: e.resolve,
      },
      n.plugin,
      n.cwd,
    ),
};
//@ chunk-e6aww6q8.js:3730131-3730319 placement
/**
 * $.fs.write 表项：校验路径与文本后以插件身份写文件。
 */
var FS_WRITE_API = {
  check: (e) => checkPathArg(e) ?? (typeof e?.text === "string" ? undefined : "takes the text to write"),
  raise: getErrnoPath,
  run: (e, n) =>
    refuseFsAccess(
      {
        event: "write",
        path: e.path,
        text: e.text,
      },
      n.plugin,
      n.cwd,
    ).then(() => {
      return;
    }),
};
export { FS_READ_OP, FS_WRITE_API, FS_LIST_OP, refuseFsAccess, FS_STAT_API, FS_ANCESTORS_API, fsAncestors };
