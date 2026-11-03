/**
 * utils/computerUse/executor.ts
 *
 * CLI 侧 computer-use 执行器辅助：剪贴板输入、修饰键、动画移动、应用 unhide；linux 构建中执行器本体只抛 macOS-only。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/computerUse/executor.ts
 * pieces: chunk-hrs3dad1.js (11)
 * attribution: fingerprint 8, callgraph-witnessed 1, layout 2
 */
import { execFileNoThrow } from "../execFileNoThrow.js";
import { sleep } from "../sleep.js";
import { logForDebugging } from "../debug.js";
import { requireComputerUseSwift } from "./swiftLoader.js";

/**
 * 用 pbpaste 读剪贴板。
 */
//@ chunk-hrs3dad1.js:7102-7240 fingerprint = readClipboardViaPbpaste (1)
async function readClipboardViaPbpaste() {
  let { stdout: stdout, code: code } = await execFileNoThrow("pbpaste", [], { useCwd: !1 });
  if (code !== 0) throw Error(`pbpaste exited with code ${code}`);
  return stdout;
}
/**
 * 用 pbcopy 写剪贴板。
 */
//@ chunk-hrs3dad1.js:7240-7367 fingerprint = writeClipboardViaPbcopy (1)
async function writeClipboardViaPbcopy(text) {
  let { code: code } = await execFileNoThrow("pbcopy", [], { input: text, useCwd: !1 });
  if (code !== 0) throw Error(`pbcopy exited with code ${code}`);
}
/**
 * 按键序列是否只是单个 Escape。
 */
//@ chunk-hrs3dad1.js:7367-7462 fingerprint = isBareEscape (1)
function isBareEscape(parts) {
  if (parts.length !== 1) return !1;
  let lower = parts[0].toLowerCase();
  return lower === "escape" || lower === "esc";
}
/**
 * 鼠标移动/点击后的稳定等待（各 50ms）。
 */
//@ chunk-hrs3dad1.js:7462-7476 callgraph-witnessed = MOVE_SETTLE_MS (0)
var MOVE_SETTLE_MS = 50,
  CLICK_SETTLE_MS = 50;
/**
 * 移动鼠标后等待 50ms 让系统稳定。
 */
//@ chunk-hrs3dad1.js:7476-7537 fingerprint = moveAndSettle (1)
async function moveAndSettle(input, x, y) {
  (await input.moveMouse(x, y, !1), await sleep(MOVE_SETTLE_MS));
}
/**
 * 逆序释放已按下的键。
 */
//@ chunk-hrs3dad1.js:7537-7629 fingerprint = releasePressed (1)
async function releasePressed(input, pressed) {
  let key;
  while ((key = pressed.pop()) !== void 0)
    try {
      await input.key(key, "release");
    } catch {}
}
/**
 * 按下一组修饰键执行回调，结束后逆序释放。
 */
//@ chunk-hrs3dad1.js:7629-7753 layout = withModifiers (1)
async function withModifiers(input, mods, fn) {
  let pressed = [];
  try {
    for (let mod of mods) (await input.key(mod, "press"), pressed.push(mod));
    return await fn();
  } finally {
    await releasePressed(input, pressed);
  }
}
/**
 * 经剪贴板输入文本：保存原剪贴板 → 写入并校验回读 → Cmd+V → 恢复原剪贴板。
 */
//@ chunk-hrs3dad1.js:7753-8116 fingerprint = typeViaClipboard (1)
async function typeViaClipboard(input, text) {
  let saved;
  try {
    saved = await readClipboardViaPbpaste();
  } catch {
    logForDebugging("[computer-use] pbpaste before paste failed; proceeding without restore");
  }
  try {
    if ((await writeClipboardViaPbcopy(text), (await readClipboardViaPbpaste()) !== text))
      throw Error("Clipboard write did not round-trip.");
    (await input.keys(["command", "v"]), await sleep(100));
  } finally {
    if (typeof saved === "string")
      try {
        await writeClipboardViaPbcopy(saved);
      } catch {
        logForDebugging("[computer-use] clipboard restore after paste failed");
      }
  }
}
/**
 * 带缓动（ease-out cubic、60fps、最长 0.5s）的鼠标移动；关闭动画或距离很短时直接移动。
 */
//@ chunk-hrs3dad1.js:8116-8488 fingerprint = animatedMove (1)
async function animatedMove(input, targetX, targetY, mouseAnimationEnabled) {
  if (!mouseAnimationEnabled) {
    await moveAndSettle(input, targetX, targetY);
    return;
  }
  let start = await input.mouseLocation(),
    dx = targetX - start.x,
    dy = targetY - start.y,
    distance = Math.hypot(dx, dy);
  if (distance < 1) return;
  let durationSec = Math.min(distance / 2000, 0.5);
  if (durationSec < 0.03) {
    await moveAndSettle(input, targetX, targetY);
    return;
  }
  let frameRate = 60,
    i = 1000 / frameRate,
    totalFrames = Math.floor(durationSec * frameRate);
  for (let frame = 1; frame <= totalFrames; frame++) {
    let y = frame / totalFrames,
      eased = 1 - Math.pow(1 - y, 3);
    if (
      (await input.moveMouse(Math.round(start.x + dx * eased), Math.round(start.y + dy * eased), !1),
      frame < totalFrames)
    )
      await sleep(i);
  }
  await sleep(MOVE_SETTLE_MS);
}
/**
 * linux 构建里 CLI 的 computer-use 执行器只抛错：电脑控制仅限 macOS。
 */
//@ chunk-hrs3dad1.js:8488-8585 layout
function createCliExecutor(o) {
  throw Error("createCliExecutor called on linux. Computer control is macOS-only.");
}
/**
 * 通过 Swift 模块恢复（unhide）一组应用。
 */
//@ chunk-hrs3dad1.js:8585-8661 fingerprint = unhideComputerUseApps (1)
async function unhideComputerUseApps(bundleIds) {
  if (bundleIds.length === 0) return;
  await requireComputerUseSwift().apps.unhide([...bundleIds]);
}
