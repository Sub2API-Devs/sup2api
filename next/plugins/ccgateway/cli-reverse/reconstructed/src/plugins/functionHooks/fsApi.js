/**
 * plugins/functionHooks/fsApi.ts
 *
 * 2.1.316 新增：插件 $.fs 接口（受限文件访问、祖先目录查找）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (14)
 * attribution: placement 14
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3820968-3821025 placement
var AGENTS_FILE_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3820968", () => {
  AGENTS_FILE_NAMES = Object.freeze(["AGENTS.md", ".claude/AGENTS.md"]);
});
//@ chunk-5xgkngpb.js:3821025-3822511 placement
/**
 * 插件 $.fs.ancestors：列出项目、用户、托管设置的祖先目录；项目记忆关闭或工作区在远端时拒绝。
 */
async function fsAncestors(args, caller, { start = getOriginalCwd(), below, held, session } = {}) {
  if (isClaudeMdLoadingDisabled() || !isInstructionSourceEnabled("projectSettings")) {
    logForDebugging(`$.fs.ancestors (${caller}): project memory is off`);
    return [];
  }
  if (isRemoteSessionAvailable()) {
    logForDebugging(`$.fs.ancestors (${caller}): the workspace is remote`);
    return [];
  }
  let names = below === undefined ? undefined : below.endsWith(sep) ? below : `${below}${sep}`;
  let name = [];
  let dir = start;
  while (dir !== parse(dir).root) {
    if (names !== undefined && !dir.startsWith(names)) break;
    name.push(dir);
    dir = dirname(dir);
  }
  let originalCwd = getOriginalCwd();
  let dirs = new Set(
    below === undefined
      ? name.filter((dir) => dir !== originalCwd && !originalCwd.startsWith(`${dir}${sep}`))
      : name,
  );
  let denied = new Set(args.filter((secondName) => !/^(\.claude[\\/])?[^\\/]+$/.test(secondName)));
  let secondName = args.length > 0 && (dirs.size > 0 || (denied.size > 0 && name.length > 0));
  let secondDir =
    session !== undefined && args.some((secondDir) => !denied.has(secondDir)) && name.length > dirs.size;
  let hit = secondDir && args.some((secondHit) => AGENTS_FILE_NAMES.includes(secondHit));
  let thirdDir =
    secondDir && args.some((thirdDir) => !denied.has(thirdDir) && !AGENTS_FILE_NAMES.includes(thirdDir));
  let listing = secondName ? held?.() : undefined;
  let entry = hit ? createHeldPathTracker(session) : undefined;
  let held_2 = entry?.held;
  let held_3 = thirdDir ? createHeldPathTracker(session).held : undefined;
  let worktreeRoots = getWorktreeRoots(originalCwd);
  let hasClaudeMdExternalIncludesApproved =
    getCurrentProjectConfig().hasClaudeMdExternalIncludesApproved ?? false;
  let secondEntry = new Set([getMemoryPath("Managed"), getMemoryPath("User")].map(normalizePathForCompare));
  let path = [];
  for (let out of name.reverse()) {
    if (isInMainRepoOutsideWorktree(out, worktreeRoots)) continue;
    let key = out === originalCwd ? held_3?.within : held_3?.above(out);
    let value = out === originalCwd ? held_2?.within : held_2?.above(out);
    for (let rows of args) {
      let row = AGENTS_FILE_NAMES.includes(rows) ? value : key;
      let name = await isInstructionsMemoryType_3(
        join(out, rows),
        "Project",
        secondEntry,
        hasClaudeMdExternalIncludesApproved,
        0,
        undefined,
        undefined,
        undefined,
        dirs.has(out) || denied.has(rows) ? listing : row,
      );
      if (name.length > 0)
        path.push({
          dir: out,
          name: rows,
          content: name.map((result) => result.content).join(`

`),
          parts: name.map((secondResult) => ({
            path: secondResult.path,
            content: secondResult.content,
          })),
        });
    }
  }
  logForDebugging(
    `$.fs.ancestors (${caller}): ${args.join(", ")} found ${path.length} of ${name.length} directories`,
  );
  if (entry !== undefined && session !== undefined) {
    clearOwedInstructionFiles(session, entry.loaded());
    recordWithheldInstructionFiles(session, entry.withheld());
  }
  return path;
}
//@ chunk-5xgkngpb.js:3822511-3822572 placement
/**
 * file/dir/other
 */
var statKind = (stat) => (stat.isFile() ? "file" : stat.isDirectory() ? "dir" : "other");
//@ chunk-5xgkngpb.js:3822869-3823033 placement
function candidatePaths(base, rawPath) {
  let replaced = rawPath.replace(/^\\\\\?\\(?=[A-Za-z]:[\\/])/, "");
  if (isAbsolute(replaced)) return [replaced];
  let dir = dirname(base);
  let prefix = dir.endsWith(sep) ? dir : `${dir}${sep}`;
  return [replaced, `${prefix}${replaced}`, resolve_2(dir, replaced)];
}
//@ chunk-5xgkngpb.js:3823033-3823047 placement
/**
 * 65536
 */
var MAX_FS_READ_BYTES = 65536;
//@ chunk-5xgkngpb.js:3823047-3824876 placement
/**
 * 插件 $.fs.* 的统一拒绝出口：说明为何不可访问（网络位置、Windows 限制、资源繁忙）。
 */
async function refuseFsAccess(request, plugin, cwd) {
  let resolved = resolve_2(cwd ?? getCwd(), request.path);
  function fail(reason) {
    logForDebugging(`$.fs.${request.event} (${plugin}): ${resolved} refused: ${reason}`);
    return new HooksError(`${plugin}: $.fs.${request.event}: ${request.path} refused: ` + reason);
  }
  if (isNetworkOrDevicePath(request.path) || isNetworkOrDevicePath(resolved))
    throw fail("a network location is not reached from here");
  try {
    switch (request.event) {
      case "read": {
        let isWindows = getPlatform() === "windows";
        let handle = await open(resolved, isWindows ? "r" : constants.O_RDONLY | constants.O_NONBLOCK);
        try {
          let chunks = [];
          let total = 0;
          for (;;) {
            let buf = Buffer.allocUnsafe(MAX_FS_READ_BYTES);
            let bytesRead;
            try {
              bytesRead = (await handle.read(buf, 0, buf.length, null)).bytesRead;
            } catch (error) {
              let errnoCode = getErrnoCode(error);
              if (errnoCode === "EAGAIN" || errnoCode === "EWOULDBLOCK") break;
              throw error;
            }
            if (bytesRead === 0) break;
            total += bytesRead;
            if (total > MAX_IMAGE_BYTES_ALIAS)
              throw fail(`the file is over the ${MAX_IMAGE_BYTES_ALIAS}-byte limit`);
            chunks.push(buf.subarray(0, bytesRead));
          }
          let buffer = Buffer.concat(chunks);
          return request.as === "bytes"
            ? {
                base64: buffer.toString("base64"),
              }
            : buffer.toString("utf8");
        } finally {
          await handle.close();
        }
      }
      case "write": {
        let byteLength = Buffer.byteLength(request.text, "utf8");
        if (byteLength > MAX_IMAGE_BYTES)
          throw fail(`${byteLength} bytes is over the ${MAX_IMAGE_BYTES}-byte limit`);
        await mkdir(dirname(resolved), {
          recursive: true,
        });
        await writeFile(resolved, request.text, "utf8");
        logForDebugging(`$.fs.write (${plugin}): ${resolved} (${byteLength} bytes)`);
        return;
      }
      case "exists":
        return await stat(resolved).then(
          () => true,
          () => false,
        );
      case "stat": {
        let linkStat = await lstat(resolved);
        let isLink = linkStat.isSymbolicLink();
        let isSafeLink =
          isLink && !candidatePaths(resolved, await readlink(resolved)).some(isNetworkOrDevicePath);
        let targetStat = !isLink
          ? linkStat
          : isSafeLink
            ? await stat(resolved).catch((error) => {
                let errnoCode = getErrnoCode(error);
                if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR" || errnoCode === "ELOOP") return;
                throw error;
              })
            : undefined;
        let chosen = targetStat ?? linkStat;
        let withRealPath = request.resolve && targetStat !== undefined;
        return {
          kind: statKind(chosen),
          size: chosen.size,
          mtimeMs: chosen.mtimeMs,
          isLink,
          ...(withRealPath && {
            realPath: await realpath(resolved),
          }),
        };
      }
      case "list": {
        let entries = await readdir(resolved, {
          withFileTypes: true,
        });
        let rows = [];
        for (let entry of entries) {
          let fileStat = entry.isFile()
            ? await stat(resolve_2(resolved, entry.name)).catch(() => {
                return;
              })
            : undefined;
          rows.push({
            name: entry.name,
            kind: statKind(entry),
            size: fileStat?.size ?? 0,
            mtimeMs: fileStat?.mtimeMs ?? 0,
            isLink: entry.isSymbolicLink(),
          });
        }
        rows.sort((a, b) => a.name.localeCompare(b.name));
        return rows;
      }
    }
  } catch (error) {
    if (error instanceof HooksError) throw error;
    logForDebugging(`$.fs.${request.event} (${plugin}): ${resolved} failed: ` + errorMessage(error));
    throw new HooksError(
      `${plugin}: $.fs.${request.event}(${request.path}) failed: ` + (getErrnoCode(error) ?? "no errno"),
    );
  }
}
//@ chunk-5xgkngpb.js:3824876-3825042 placement
function readDenyRulesForAncestors(plugin) {
  let denyRules = mergePersistedDenyRules(
    getToolPermissionContext(
      requireBoundSession(plugin, "$.fs.ancestors off the start-up walk").toolContext(new AbortController()),
    ),
  );
  return isInstructionReadRestricted(denyRules)
    ? instructionReadText(
        {
          context: denyRules,
          isHeldOutside: isRestrictedReadBlocked,
        },
        DEFAULT_INSTRUCTION_READ_TIMEOUT_MS,
      )
    : undefined;
}
//@ chunk-5xgkngpb.js:3825042-3825096 placement
/**
 * 网络位置不可达
 */
var NETWORK_LOCATION_TEXT = "a network location is not reached from here";
//@ chunk-5xgkngpb.js:3825096-3825122 placement
/**
 * 取根会话
 */
function rootSession() {
  return getRootSession();
}
//@ chunk-5xgkngpb.js:3825122-3825581 placement
/**
 * $.fs.ancestors 表项：拒绝网络位置，从 of（默认原始 cwd）向上查找给定文件名，可用 below 限定上界，受拒绝规则约束。
 */
var FS_ANCESTORS_API = {
  check: validateNamesArg,
  raise: () => ({
    field: "of",
    at: getOriginalCwd(),
  }),
  run: async (args, caller) => {
    let originalCwd = getOriginalCwd();
    let found = [args.of, args.below].find(
      (cwd) =>
        cwd !== undefined &&
        (isNetworkOrDevicePath(cwd) || isNetworkOrDevicePath(resolve_2(originalCwd, cwd))),
    );
    if (found !== undefined) {
      logForDebugging(
        `$.fs.ancestors (${caller.plugin}): ${resolve_2(originalCwd, found)} refused: ${NETWORK_LOCATION_TEXT}`,
      );
      throw new HooksError(`${caller.plugin}: $.fs.ancestors: ${found} refused: ` + NETWORK_LOCATION_TEXT);
    }
    let rules = args.of === undefined ? originalCwd : resolve_2(originalCwd, args.of);
    let below = args.below === undefined ? undefined : resolve_2(originalCwd, args.below);
    return fsAncestors(args.names, caller.plugin, {
      start: rules === originalCwd ? originalCwd : dirname(rules),
      below,
      held: () => readDenyRulesForAncestors(caller.plugin),
      session: rootSession(),
    });
  },
};
//@ chunk-5xgkngpb.js:3825581-3825667 placement
/**
 * $.fs.list 实现
 */
var FS_LIST_OP = {
  check: checkPathArg,
  raise: getErrnoPath,
  run: (args, caller) =>
    refuseFsAccess(
      {
        event: "list",
        path: args.path,
      },
      caller.plugin,
      caller.cwd,
    ),
};
//@ chunk-5xgkngpb.js:3825667-3825761 placement
/**
 * $.fs.read 实现
 */
var FS_READ_OP = {
  check: checkFsReadArgs,
  raise: getErrnoPath,
  run: (args, caller) =>
    refuseFsAccess(
      {
        event: "read",
        path: args.path,
        as: args.as,
      },
      caller.plugin,
      caller.cwd,
    ),
};
//@ chunk-5xgkngpb.js:3825761-3825865 placement
/**
 * $.fs.stat 表项：校验参数后以插件身份执行 stat。
 */
var FS_STAT_API = {
  check: checkFsStatArgs,
  raise: getErrnoPath,
  run: (args, caller) =>
    refuseFsAccess(
      {
        event: "stat",
        path: args.path,
        resolve: args.resolve,
      },
      caller.plugin,
      caller.cwd,
    ),
};
//@ chunk-5xgkngpb.js:3825865-3826053 placement
/**
 * $.fs.write 表项：校验路径与文本后以插件身份写文件。
 */
var FS_WRITE_API = {
  check: (args) =>
    checkPathArg(args) ?? (typeof args?.text === "string" ? undefined : "takes the text to write"),
  raise: getErrnoPath,
  run: (args, caller) =>
    refuseFsAccess(
      {
        event: "write",
        path: args.path,
        text: args.text,
      },
      caller.plugin,
      caller.cwd,
    ).then(() => {
      return;
    }),
};
export { FS_READ_OP, FS_WRITE_API, FS_LIST_OP, refuseFsAccess, FS_STAT_API, FS_ANCESTORS_API, fsAncestors };
