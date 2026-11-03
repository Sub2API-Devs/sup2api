/**
 * services/artifacts/contract.ts
 *
 * 2.1.316 新增：获取 frame 契约与定义
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-06y4szbn.js (5)
 * attribution: placement 5
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  u,
  string,
  array,
  M,
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

//@ chunk-06y4szbn.js:42449-42833 placement
/**
 * artifact 页面契约 schema（版本、能力列表、claude/core 能力与 features 映射）与读取参数。
 */
var contractSchema = DoctorLazy(() =>
  u({
    version: string().regex(CONTRACT_VERSION_REGEX),
    capabilities: array(string().regex(CAPABILITY_NAME_REGEX)).max(256),
    claude: M().optional().catch(undefined),
    core: array(string().regex(CAPABILITY_NAME_REGEX)).max(256).optional().catch(undefined),
    features: record(
      string().regex(CAPABILITY_NAME_REGEX),
      record(
        string().regex(CAPABILITY_NAME_REGEX),
        union([record(string(), unknown()), literal(true).transform(() => ({}))]),
      ),
    )
      .optional()
      .catch(undefined),
  }),
);
var LATEST_CONTRACT_PATH_CONTRACT = "/api/frame/contract/latest";
var MAX_CONTRACT_DEFS_BYTES = 262144;
var MAX_CONTRACT_PROMPT_BYTES = 65536;
var CONTRACT_FETCH_TIMEOUT_MS = 5000;
var X_CONTRACT_MISSING_CAPS = "x-contract-missing-caps";
var MAX_CONTRACT_VERSION_BYTES = 16384;
//@ chunk-06y4szbn.js:42833-43730 placement
/**
 * 读取 /api/frame/contract/latest 或指定版本的 artifact 页面契约（版本与能力名），区分传输/认证/客户端策略错误。
 */
async function getFrameContract(e, n, r) {
  let s;
  try {
    s = await frameApi.get(e, {
      refreshOAuth: true,
      ...(n.recoverOAuth401 && {
        recoverOAuth401: true,
        storageV5: n.storageV5,
      }),
      headers: buildFrameHeaders(),
      maxContentLength: MAX_CONTRACT_VERSION_BYTES,
      ...r,
      ...(n.timeoutMs !== undefined && {
        timeout: n.timeoutMs,
      }),
      ...(n.signal && {
        signal: n.signal,
      }),
      credentials: n.credentials,
    });
  } catch (error) {
    return {
      err: errorMessage(error),
      cause: "transport",
    };
  }
  if (!s.ok)
    return {
      err: `unavailable: ${s.reason}`,
      cause: s.reason === "no-auth" ? "no_auth" : "client_policy",
    };
  if (!s.fromFrame)
    return {
      err: `relay HTTP ${s.status}`,
      cause: "relay",
      status: s.status,
    };
  if (s.status < 200 || s.status >= 300) {
    let b = logProxyDenial({
      status: s.status,
      headers: s.response?.headers,
      data: s.data,
      redact: (y) => y,
      label: "[artifact] contract fetch",
    });
    return {
      err: `HTTP ${s.status}`,
      cause: s.status === 404 ? "http_404" : s.status >= 500 ? "http_5xx" : "http_4xx",
      status: s.status,
      ...(b !== undefined && {
        proxyDeny: b,
      }),
    };
  }
  let h = s.response?.headers?.[X_CONTRACT_MISSING_CAPS];
  return {
    body: s.data,
    ...(typeof h === "string" && {
      missingCapsHeader: h,
    }),
  };
}
//@ chunk-06y4szbn.js:43730-44066 placement
async function resolveContract(e) {
  if (e.version !== undefined && !CONTRACT_VERSION_REGEX.test(e.version))
    return {
      err: "invalid contract version",
      cause: "malformed",
    };
  let frameContract = await getFrameContract(
    e.version !== undefined ? `/api/frame/contract/${e.version}` : LATEST_CONTRACT_PATH_CONTRACT,
    e,
  );
  if ("err" in frameContract) return frameContract;
  let r = contractSchema().safeParse(frameContract.body);
  if (!r.success)
    return {
      err: "malformed contract response",
      cause: "malformed",
    };
  return r.data;
}
//@ chunk-06y4szbn.js:44066-44442 placement
async function fetchContractDefs(e, n, r) {
  if (!CONTRACT_VERSION_REGEX.test(e) || !CAPABILITY_NAME_REGEX.test(n))
    return {
      err: "invalid contract version or capability name",
      cause: "malformed",
    };
  let frameContract = await getFrameContract(`/api/frame/contract/${e}/${n}.d.ts`, r, {
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
//@ chunk-06y4szbn.js:44442-44928 placement
async function fetchContractPrompt(version, n) {
  if (!CONTRACT_VERSION_REGEX.test(version))
    return {
      err: "invalid contract version",
      cause: "malformed",
    };
  let frameContract = await getFrameContract(`/api/frame/contract/${version}/prompt`, n, {
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
          .map((h) => h.trim())
          .filter((h) => CAPABILITY_NAME_REGEX.test(h));
  return {
    promptMd: frameContract.body,
    missingCaps,
  };
}
export { resolveContract, CONTRACT_FETCH_TIMEOUT_MS, fetchContractDefs, fetchContractPrompt };
