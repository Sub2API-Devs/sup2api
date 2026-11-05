/**
 * utils/nativeInstaller/lockDir.ts
 *
 * 原生安装器的锁目录路径（<config>/claude/locks）（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-p3km1ynr.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join } from "path";
import { getXDGStateHome } from "../xdg.js";

//@ chunk-p3km1ynr.js:505-553 placement
/**
 * 原生安装器的锁目录路径（<config>/claude/locks）。
 */
function getLocksDir() {
  return join(getXDGStateHome(), "claude", "locks");
}
export { getLocksDir };
