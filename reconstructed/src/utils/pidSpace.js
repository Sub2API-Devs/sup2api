/**
 * utils/pidSpace.ts
 *
 * 2.1.316 新增：判断 PID 命名空间（Linux/WSL /proc/self/ns/pid）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g4mgfvqt.js (5)
 * attribution: placement 5
 */
import { hostname, hostname as hostname_2 } from "os";
import { readFile, readFile as readFile_2, readlink } from "fs/promises";
import { readlinkSync } from "fs";
import { ge } from "./identity.js";
import { getPlatform } from "./platform.js";

//@ chunk-g4mgfvqt.js:1454-1712 placement
async function computePidDomain(n) {
  if (n === "windows") return `linux:${hostname().toLowerCase()}`;
  if (n !== "linux" && n !== "wsl") return "linux";
  let [t, e] = await Promise.all([
    readFile("/etc/machine-id", "utf8").then(
      (r) => r.trim(),
      () => "",
    ),
    readlink("/proc/self/ns/pid").catch(() => ""),
  ]);
  return `linux:${t}:${e}`;
}
//@ chunk-g4mgfvqt.js:1776-1833 placement
class i {
  pidSpace = null;
  pidDomain = void 0;
  uidsCollapse = null;
}
//@ chunk-g4mgfvqt.js:1833-1877 placement
var processIdentity = ge(new i(), (n) => {
  n.pidDomain = void 0;
});
//@ chunk-g4mgfvqt.js:1877-2024 placement
function ownPidSpace() {
  if (processIdentity.pidSpace === null) {
    let n = "";
    try {
      n = readlinkSync("/proc/self/ns/pid");
    } catch {
      n = "";
    }
    processIdentity.pidSpace = `${hostname_2()}${n === "" ? "" : "#" + n}`;
  }
  return processIdentity.pidSpace;
}
//@ chunk-g4mgfvqt.js:2024-2138 placement
function ownPidDomain() {
  return (
    (processIdentity.pidDomain ??= (async () => computePidDomain(getPlatform()))().catch((n) => {
      throw ((processIdentity.pidDomain = void 0), n);
    })),
    processIdentity.pidDomain
  );
}

export { ownPidSpace, ownPidDomain, processIdentity };
