/**
 * utils/computerUse/executor.ts
 *
 * CLI 侧 computer-use 执行器辅助：剪贴板输入、修饰键、动画移动、应用 unhide；linux 构建中执行器本体只抛 macOS-only。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/computerUse/executor.ts
 * pieces: chunk-p57a7983.js (11)
 * attribution: fingerprint 8, callgraph-witnessed 1, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { execFileNoThrow } from "../execFileNoThrow.js";
import { sleep } from "../sleep.js";
import { logForDebugging } from "../debug.js";
import { requireComputerUseSwift } from "./swiftLoader.js";

//@ chunk-p57a7983.js:7326-7464 fingerprint (2.1.88 match: readClipboardViaPbpaste, 1)
/**
 * 用 pbpaste 读剪贴板。
 */
async function readClipboardViaPbpaste() {
  let { stdout, code } = await execFileNoThrow("pbpaste", [], {
    useCwd: false,
  });
  if (code !== 0) throw Error(`pbpaste exited with code ${code}`);
  return stdout;
}
//@ chunk-p57a7983.js:7464-7591 fingerprint (2.1.88 match: writeClipboardViaPbcopy, 1)
/**
 * 用 pbcopy 写剪贴板。
 */
async function writeClipboardViaPbcopy(text) {
  let { code } = await execFileNoThrow("pbcopy", [], {
    input: text,
    useCwd: false,
  });
  if (code !== 0) throw Error(`pbcopy exited with code ${code}`);
}
//@ chunk-p57a7983.js:7591-7686 fingerprint (2.1.88 match: isBareEscape, 1)
/**
 * 按键序列是否只是单个 Escape。
 */
function isBareEscape(parts) {
  if (parts.length !== 1) return false;
  let lower = parts[0].toLowerCase();
  return lower === "escape" || lower === "esc";
}
//@ chunk-p57a7983.js:7686-7700 callgraph-witnessed (2.1.88 match: MOVE_SETTLE_MS, 0)
/**
 * 鼠标移动/点击后的稳定等待（各 50ms）。
 */
var MOVE_SETTLE_MS = 50;
var CLICK_SETTLE_MS = 50;
//@ chunk-p57a7983.js:7700-7761 fingerprint (2.1.88 match: moveAndSettle, 1)
/**
 * 移动鼠标后等待 50ms 让系统稳定。
 */
async function moveAndSettle(input, x, y) {
  await input.moveMouse(x, y, false);
  await sleep(MOVE_SETTLE_MS);
}
//@ chunk-p57a7983.js:7761-7853 fingerprint (2.1.88 match: releasePressed, 1)
/**
 * 逆序释放已按下的键。
 */
async function releasePressed(input, pressed) {
  let key;
  while ((key = pressed.pop()) !== undefined)
    try {
      await input.key(key, "release");
    } catch {}
}
//@ chunk-p57a7983.js:7853-7977 layout (2.1.88 match: withModifiers, 1)
/**
 * 按下一组修饰键执行回调，结束后逆序释放。
 */
async function withModifiers(input, mods, fn) {
  let pressed = [];
  try {
    for (let mod of mods) {
      await input.key(mod, "press");
      pressed.push(mod);
    }
    return await fn();
  } finally {
    await releasePressed(input, pressed);
  }
}
//@ chunk-p57a7983.js:7977-8340 fingerprint (2.1.88 match: typeViaClipboard, 1)
/**
 * 经剪贴板输入文本：保存原剪贴板 → 写入并校验回读 → Cmd+V → 恢复原剪贴板。
 */
async function typeViaClipboard(input, text) {
  let saved;
  try {
    saved = await readClipboardViaPbpaste();
  } catch {
    logForDebugging("[computer-use] pbpaste before paste failed; proceeding without restore");
  }
  try {
    await writeClipboardViaPbcopy(text);
    if ((await readClipboardViaPbpaste()) !== text) throw Error("Clipboard write did not round-trip.");
    await input.keys(["command", "v"]);
    await sleep(100);
  } finally {
    if (typeof saved === "string")
      try {
        await writeClipboardViaPbcopy(saved);
      } catch {
        logForDebugging("[computer-use] clipboard restore after paste failed");
      }
  }
}
//@ chunk-p57a7983.js:8340-8712 fingerprint (2.1.88 match: animatedMove, 1)
/**
 * 带缓动（ease-out cubic、60fps、最长 0.5s）的鼠标移动；关闭动画或距离很短时直接移动。
 */
async function animatedMove(input, targetX, targetY, mouseAnimationEnabled) {
  if (!mouseAnimationEnabled) {
    await moveAndSettle(input, targetX, targetY);
    return;
  }
  let start = await input.mouseLocation();
  let dx = targetX - start.x;
  let dy = targetY - start.y;
  let distance = Math.hypot(dx, dy);
  if (distance < 1) return;
  let durationSec = Math.min(distance / 2000, 0.5);
  if (durationSec < 0.03) {
    await moveAndSettle(input, targetX, targetY);
    return;
  }
  let frameRate = 60;
  let frameIntervalMs = 1000 / frameRate;
  let totalFrames = Math.floor(durationSec * frameRate);
  for (let frame = 1; frame <= totalFrames; frame++) {
    let t = frame / totalFrames;
    let eased = 1 - Math.pow(1 - t, 3);
    await input.moveMouse(Math.round(start.x + dx * eased), Math.round(start.y + dy * eased), false);
    if (frame < totalFrames) await sleep(frameIntervalMs);
  }
  await sleep(MOVE_SETTLE_MS);
}
//@ chunk-p57a7983.js:8712-8809 layout
/**
 * linux 构建里 CLI 的 computer-use 执行器只抛错：电脑控制仅限 macOS。
 */
function createCliExecutor(options) {
  throw Error("createCliExecutor called on linux. Computer control is macOS-only.");
}
//@ chunk-p57a7983.js:8809-8885 fingerprint (2.1.88 match: unhideComputerUseApps, 1)
/**
 * 通过 Swift 模块恢复（unhide）一组应用。
 */
async function unhideComputerUseApps(bundleIds) {
  if (bundleIds.length === 0) return;
  await requireComputerUseSwift().apps.unhide([...bundleIds]);
}
export { createCliExecutor, unhideComputerUseApps };
