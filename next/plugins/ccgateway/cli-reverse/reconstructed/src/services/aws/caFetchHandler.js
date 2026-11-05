/**
 * services/aws/caFetchHandler.ts
 *
 * 2.1.316 新增：带自定义 CA 的 AWS SDK fetch 处理器。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (2)
 * attribution: placement 2
 */
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_fetch_http_handler } from "../../../vendor/@smithy/fetch-http-handler/dist-cjs/index.js";
import { require_protocol_http } from "../../../vendor/@smithy/protocol-http/dist-cjs/index.js";
import { require_querystring_builder } from "../../../vendor/@smithy/querystring-builder/dist-cjs/index.js";

//@ chunk-exfmq47h.js:498405-498453 placement
/**
 * 懒加载的 @smithy/querystring-builder 模块（拼接请求查询串）。
 */
var fetchHttpHandlerModule = __toESM(require_fetch_http_handler(), 1);
var protocolHttpModule = __toESM(require_protocol_http(), 1);
var querystringBuilderModule = __toESM(require_querystring_builder(), 1);
//@ chunk-exfmq47h.js:498453-499253 placement
/**
 * 带自定义 CA 的 AWS SDK fetch 处理器。
 */
class CaFetchHttpHandler extends fetchHttpHandlerModule.FetchHttpHandler {
  caList;
  constructor(caList) {
    super();
    this.caList = caList;
  }
  async handle(request, { abortSignal, requestTimeout } = {}) {
    let queryString = querystringBuilderModule.buildQueryString(request.query || {});
    let userinfo =
      request.username != null || request.password != null
        ? `${request.username ?? ""}:${request.password ?? ""}@`
        : "";
    let body = request.method === "GET" || request.method === "HEAD" ? undefined : request.body;
    let response = await fetch(
      new Request(
        `${request.protocol}//${userinfo}${request.hostname}${request.port ? `:${request.port}` : ""}${request.path}${queryString && `?${queryString}`}${request.fragment ? `#${request.fragment}` : ""}`,
        {
          body,
          headers: new Headers(request.headers),
          method: request.method,
          ...(body && {
            duplex: "half",
          }),
          signal: AbortSignal.any([
            ...(abortSignal instanceof AbortSignal ? [abortSignal] : []),
            ...(requestTimeout ? [AbortSignal.timeout(requestTimeout)] : []),
          ]),
        },
      ),
      {
        tls: {
          ca: this.caList(),
        },
      },
    );
    return {
      response: new protocolHttpModule.HttpResponse({
        headers: Object.fromEntries(response.headers.entries()),
        reason: response.statusText,
        statusCode: response.status,
        body: response.body ?? (await response.blob()),
      }),
    };
  }
}
export { CaFetchHttpHandler };
