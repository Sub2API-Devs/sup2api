/**
 * utils/hooks/deviceHooks/_new/classifyDeviceHookReach.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mthxbav8.js (3)
 * attribution: sole-consumer-new 3
 */
import { sanitizeDisplayText } from "../../../resultError.js";
import { getContentFieldValue } from "../../../../components/hooks/ViewHookMode.js";
import { pathWithinReach, commandReachesPath } from "../commandReach.js";
import { analyzeHookCommand, classifyScriptLocation, checkScriptFile } from "../../hookCommandAnalysis.js";

//@ chunk-mthxbav8.js:4469-4520 sole-consumer-new
function He(e) {
  return sanitizeDisplayText(getContentFieldValue(e), { maxCodeUnits: 200 });
}
/**
 * 判断一个设备钩子能否转发给云会话运行：钩子配置文件或插件根目录处于云会话可写范围内时拒绝；非 command 类型、无法分析的命令分别标注；脚本型命令再检查脚本位置与摘要。
 */
//@ chunk-mthxbav8.js:4520-6517 sole-consumer-new
async function classifyDeviceHookReach(hook, context, fs, options = {}) {
  let u = [
    ...(options.sourceFile !== void 0 ? [options.sourceFile] : []),
    ...(options.pluginRoot !== void 0 ? [options.pluginRoot] : []),
  ];
  for (let O of u) {
    let x = await fs.realpath(O).catch(() => null);
    if (
      x === null ||
      pathWithinReach([O, x], context) ||
      (O === options.pluginRoot && commandReachesPath([O, x], context))
    )
      return {
        kind: "source_in_reach",
        notice: `"${He(hook)}" is configured in a place the cloud session can write on this machine (${sanitizeDisplayText(O, { maxCodeUnits: 200 })}), so it is not run for the cloud session from this machine.`,
      };
  }
  if (hook.type !== "command") return { kind: "not_command", hookType: hook.type };
  let S = analyzeHookCommand(hook, {
    home: fs.home,
    projectDir: context.projectDir,
    hookCwd: context.projectDirReal,
    defaultShell: fs.defaultShell,
    shellPrefix: fs.shellPrefix,
    ...(options.pluginRoot !== void 0 && { pluginRoot: options.pluginRoot }),
  });
  if (S.kind !== "script")
    return {
      kind: "opaque",
      reason: S.reason,
      notice: `"${He(hook)}" is not a single script this machine can pin, so it is not run for the cloud session from this machine: it would run whatever it names in the checkout, which the session may have written. Point it at one script outside the checkout (under ~/.claude, say).`,
    };
  let w = sanitizeDisplayText(S.rawPath, { maxCodeUnits: 200 }),
    { located: located, digest: digest } = await locateScriptCached(
      S.resolvedPath,
      context,
      fs,
      options.resolved,
    );
  if (located.realPath === null || digest === null || !digest.ok)
    return {
      kind: "unverifiable",
      rawPath: w,
      missing: located.realPath === null && located.missing,
      notice: `${w} could not be read and pinned (missing, too large, not a regular file, more than one hard link, or it resolves to a file this machine does not read as a hook script), so its hook is not run for the cloud session from this machine.`,
    };
  let C = {
    pinnedTarget: { path: S.resolvedPath, realPath: located.realPath, sha256: digest.sha256 },
    bytes: digest.bytes,
    rawPath: w,
    interpreter: S.interpreter,
    site: S.site,
  };
  if (pathWithinReach([S.resolvedPath, located.realPath], context))
    return {
      kind: "script_in_reach",
      ...C,
      notice: `"${He(hook)}" sits where the cloud session can write on this machine (the checkout, the synced directory or a sandbox write inlet), so it is not run for the cloud session from this machine. Move the script outside the checkout (under ~/.claude, say).`,
    };
  return { kind: "script_outside_reach", ...C };
}
//@ chunk-mthxbav8.js:6517-6715 sole-consumer-new
async function locateScriptCached(e, n, r, s) {
  let u = s?.get(e);
  if (u) return u;
  let S = (async () => {
    let w = await classifyScriptLocation(e, n, r),
      h = w.realPath === null ? null : await checkScriptFile(w.realPath, r);
    return { located: w, digest: h };
  })();
  return (s?.set(e, S), S);
}

export { He, classifyDeviceHookReach };
