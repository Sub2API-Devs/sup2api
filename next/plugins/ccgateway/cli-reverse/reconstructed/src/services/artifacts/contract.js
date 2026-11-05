/**
 * services/artifacts/contract.ts
 *
 * 2.1.316 新增：获取 frame 契约与定义
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-51jy8ztq.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  array,
  booleanSchema,
  record,
  union,
  unknown,
  literal,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { CONTRACT_VERSION_REGEX, CAPABILITY_NAME_REGEX } from "./capabilityDeclaration.js";
import { frameApi } from "./frameRelay.js";
import { buildFrameHeaders } from "./frameApi.js";
import { errorMessage } from "../../utils/errors.js";
import { logProxyDenial } from "../../utils/sandbox/proxyDenial.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-51jy8ztq.js:44699-45083 placement
/**
 * artifact 页面契约 schema（版本、能力列表、claude/core 能力与 features 映射）与读取参数。
 */
var contractSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var LATEST_CONTRACT_PATH_CONTRACT;
var MAX_CONTRACT_DEFS_BYTES;
var MAX_CONTRACT_PROMPT_BYTES;
var CONTRACT_FETCH_TIMEOUT_MS;
var X_CONTRACT_MISSING_CAPS;
var MAX_CONTRACT_VERSION_BYTES;
deferInit("chunk-51jy8ztq.js:44699", () => {
  contractSchema = DoctorLazy(() =>
    objectSchema({
      version: stringSchema().regex(CONTRACT_VERSION_REGEX),
      capabilities: array(stringSchema().regex(CAPABILITY_NAME_REGEX)).max(256),
      claude: booleanSchema().optional().catch(undefined),
      core: array(stringSchema().regex(CAPABILITY_NAME_REGEX)).max(256).optional().catch(undefined),
      features: record(
        stringSchema().regex(CAPABILITY_NAME_REGEX),
        record(
          stringSchema().regex(CAPABILITY_NAME_REGEX),
          union([record(stringSchema(), unknown()), literal(true).transform(() => ({}))]),
        ),
      )
        .optional()
        .catch(undefined),
    }),
  );
  LATEST_CONTRACT_PATH_CONTRACT = "/api/frame/contract/latest";
  MAX_CONTRACT_DEFS_BYTES = 262144;
  MAX_CONTRACT_PROMPT_BYTES = 65536;
  CONTRACT_FETCH_TIMEOUT_MS = 5000;
  X_CONTRACT_MISSING_CAPS = "x-contract-missing-caps";
  MAX_CONTRACT_VERSION_BYTES = 16384;
});
//@ chunk-51jy8ztq.js:45083-45980 placement
/**
 * 读取 /api/frame/contract/latest 或指定版本的 artifact 页面契约（版本与能力名），区分传输/认证/客户端策略错误。
 */
async function getFrameContract(path, options, overrides) {
  let result;
  try {
    result = await frameApi.get(path, {
      refreshOAuth: true,
      ...(options.recoverOAuth401 && {
        recoverOAuth401: true,
        storageV5: options.storageV5,
      }),
      headers: buildFrameHeaders(),
      maxContentLength: MAX_CONTRACT_VERSION_BYTES,
      ...overrides,
      ...(options.timeoutMs !== undefined && {
        timeout: options.timeoutMs,
      }),
      ...(options.signal && {
        signal: options.signal,
      }),
      credentials: options.credentials,
    });
  } catch (error) {
    return {
      err: errorMessage(error),
      cause: "transport",
    };
  }
  if (!result.ok)
    return {
      err: `unavailable: ${result.reason}`,
      cause: result.reason === "no-auth" ? "no_auth" : "client_policy",
    };
  if (!result.fromFrame)
    return {
      err: `relay HTTP ${result.status}`,
      cause: "relay",
      status: result.status,
    };
  if (result.status < 200 || result.status >= 300) {
    let proxyDeny = logProxyDenial({
      status: result.status,
      headers: result.response?.headers,
      data: result.data,
      redact: (text) => text,
      label: "[artifact] contract fetch",
    });
    return {
      err: `HTTP ${result.status}`,
      cause: result.status === 404 ? "http_404" : result.status >= 500 ? "http_5xx" : "http_4xx",
      status: result.status,
      ...(proxyDeny !== undefined && {
        proxyDeny,
      }),
    };
  }
  let missingCaps = result.response?.headers?.[X_CONTRACT_MISSING_CAPS];
  return {
    body: result.data,
    ...(typeof missingCaps === "string" && {
      missingCapsHeader: missingCaps,
    }),
  };
}
//@ chunk-51jy8ztq.js:45980-46316 placement
async function resolveContract(request) {
  if (request.version !== undefined && !CONTRACT_VERSION_REGEX.test(request.version))
    return {
      err: "invalid contract version",
      cause: "malformed",
    };
  let frameContract = await getFrameContract(
    request.version !== undefined ? `/api/frame/contract/${request.version}` : LATEST_CONTRACT_PATH_CONTRACT,
    request,
  );
  if ("err" in frameContract) return frameContract;
  let parsed = contractSchema().safeParse(frameContract.body);
  if (!parsed.success)
    return {
      err: "malformed contract response",
      cause: "malformed",
    };
  return parsed.data;
}
//@ chunk-51jy8ztq.js:46316-46692 placement
async function fetchContractDefs(request, options, overrides) {
  if (!CONTRACT_VERSION_REGEX.test(request) || !CAPABILITY_NAME_REGEX.test(options))
    return {
      err: "invalid contract version or capability name",
      cause: "malformed",
    };
  let frameContract = await getFrameContract(`/api/frame/contract/${request}/${options}.d.ts`, overrides, {
    responseType: "text",
    maxContentLength: MAX_CONTRACT_DEFS_BYTES,
  });
  if ("err" in frameContract) return frameContract;
  if (typeof frameContract.body !== "string" || frameContract.body.trim() === "")
    return {
      err: "empty or non-text defs body",
      cause: "malformed",
    };
  return {
    dts: frameContract.body,
  };
}
//@ chunk-51jy8ztq.js:46692-47178 placement
async function fetchContractPrompt(version, options) {
  if (!CONTRACT_VERSION_REGEX.test(version))
    return {
      err: "invalid contract version",
      cause: "malformed",
    };
  let frameContract = await getFrameContract(`/api/frame/contract/${version}/prompt`, options, {
    responseType: "text",
    maxContentLength: MAX_CONTRACT_PROMPT_BYTES,
  });
  if ("err" in frameContract) return frameContract;
  if (typeof frameContract.body !== "string" || frameContract.body.trim() === "")
    return {
      err: "empty or non-text prompt body",
      cause: "malformed",
    };
  let missingCaps =
    frameContract.missingCapsHeader === undefined
      ? []
      : frameContract.missingCapsHeader
          .slice(0, 4096)
          .split(",")
          .map((line) => line.trim())
          .filter((line) => CAPABILITY_NAME_REGEX.test(line));
  return {
    promptMd: frameContract.body,
    missingCaps,
  };
}
export { resolveContract, CONTRACT_FETCH_TIMEOUT_MS, fetchContractDefs, fetchContractPrompt };
