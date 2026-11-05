/**
 * services/mcpServe/toolHostIds.ts
 *
 * mcp serve 的会话工具宿主 id（W6n schema / G6n 按宿主缓存）存取，用于 ReadEnvironment 的 toolHost 与 runner 隧道提交（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-00bfvw19.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, uuidSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { HostScoped } from "../../utils/hostScoped.js";

//@ chunk-00bfvw19.js:300-374 placement
/**
 * tool_host 的形状（{ids}）与按宿主缓存的取值，ReadEnvironment 的 toolHost 与 runner 隧道提交用它。
 */
var diskStateSchema = DoctorLazy(() =>
  objectSchema({
    disk: uuidSchema(),
    launch: uuidSchema(),
  }),
);
var diskState = new HostScoped(() => ({
  ids: undefined,
}));
export { diskState, diskStateSchema };
