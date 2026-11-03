/**
 * @anthropic-ai/mcpb/dist/schemas.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/mcpb@1.1.2..2.0.1
 * pieces: chunk-64s30qnv.js (1)
 * attribution: esm-layout 1
 */
import {
  strictCreate,
  create_2,
  create_15,
  create_20,
  create_26,
  create_6,
  create_16,
  create_3,
} from "../../../zod/lib/index.mjs";

//@ chunk-64s30qnv.js:248-2213 esm-layout
var m = strictCreate({
    command: create_2(),
    args: create_15(create_2()).optional(),
    env: create_20(create_2(), create_2()).optional(),
  }),
  b = strictCreate({
    name: create_2(),
    email: create_2().email().optional(),
    url: create_2().url().optional(),
  }),
  y = strictCreate({ type: create_2(), url: create_2().url() }),
  partial = m.partial(),
  extend = m.extend({ platform_overrides: create_20(create_2(), partial).optional() }),
  x = strictCreate({
    type: create_26(["python", "node", "binary"]),
    entry_point: create_2(),
    mcp_config: extend,
  }),
  passthrough = strictCreate({
    claude_desktop: create_2().optional(),
    platforms: create_15(create_26(["darwin", "win32", "linux"])).optional(),
    runtimes: strictCreate({ python: create_2().optional(), node: create_2().optional() }).optional(),
  }).passthrough(),
  O = strictCreate({ name: create_2(), description: create_2().optional() }),
  S = strictCreate({
    name: create_2(),
    description: create_2().optional(),
    arguments: create_15(create_2()).optional(),
    text: create_2(),
  }),
  v = strictCreate({
    type: create_26(["string", "number", "boolean", "directory", "file"]),
    title: create_2(),
    description: create_2(),
    required: create_6().optional(),
    default: create_16([create_2(), create_3(), create_6(), create_15(create_2())]).optional(),
    multiple: create_6().optional(),
    sensitive: create_6().optional(),
    min: create_3().optional(),
    max: create_3().optional(),
  }),
  A = create_20(create_2(), create_16([create_2(), create_3(), create_6(), create_15(create_2())])),
  refine = strictCreate({
    $schema: create_2().optional(),
    dxt_version: create_2().optional().describe("@deprecated Use manifest_version instead"),
    manifest_version: create_2().optional(),
    name: create_2(),
    display_name: create_2().optional(),
    version: create_2(),
    description: create_2(),
    long_description: create_2().optional(),
    author: b,
    repository: y.optional(),
    homepage: create_2().url().optional(),
    documentation: create_2().url().optional(),
    support: create_2().url().optional(),
    icon: create_2().optional(),
    screenshots: create_15(create_2()).optional(),
    server: x,
    tools: create_15(O).optional(),
    tools_generated: create_6().optional(),
    prompts: create_15(S).optional(),
    prompts_generated: create_6().optional(),
    keywords: create_15(create_2()).optional(),
    license: create_2().optional(),
    privacy_policies: create_15(create_2()).optional(),
    compatibility: passthrough.optional(),
    user_config: create_20(create_2(), v).optional(),
  }).refine((t) => !!(t.dxt_version || t.manifest_version), {
    message: "Either 'dxt_version' (deprecated) or 'manifest_version' must be provided",
  }),
  w = strictCreate({
    status: create_26(["signed", "unsigned", "self-signed"]),
    publisher: create_2().optional(),
    issuer: create_2().optional(),
    valid_from: create_2().optional(),
    valid_to: create_2().optional(),
    fingerprint: create_2().optional(),
  });
