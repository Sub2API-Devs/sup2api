/**
 * server/types.ts
 *
 * 直连服务端类型：connect 响应 schema
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/server/types.ts
 * pieces: chunk-shkzs7rp.js (1)
 * attribution: fingerprint 1
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, stringSchema } from "../../vendor/zod/v4/classic/schemas.js";

//@ chunk-shkzs7rp.js:32801-32870 fingerprint = connectResponseSchema (0.8)
/**
 * connect 响应 {session_id, ws_url, work_dir?}。
 */
var connectResponseSchema = DoctorLazy(() =>
  objectSchema({
    session_id: stringSchema(),
    ws_url: stringSchema(),
    work_dir: stringSchema().optional(),
  }),
);
