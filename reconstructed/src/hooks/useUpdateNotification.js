/**
 * hooks/useUpdateNotification.ts
 *
 * 新版本可用通知与 semver 片段比较。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useUpdateNotification.ts
 * pieces: chunk-hddjmtjj.js (1)
 * attribution: fingerprint 1
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, string, array, record, E } from "../../vendor/zod/v4/classic/schemas.js";

//@ chunk-hddjmtjj.js:53438-53634 fingerprint = getSemverPart (0.622)
var getSemverPart = DoctorLazy(() =>
  u({
    httpUrl: string().optional(),
    url: string().optional(),
    command: string().optional(),
    args: array(string()).optional(),
    env: record(string(), string()).optional(),
    headers: record(string(), string()).optional(),
    timeout: E().optional(),
  }).loose(),
);
export { getSemverPart };
