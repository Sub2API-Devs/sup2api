/**
 * services/aws/caFetchHandler.ts
 *
 * 2.1.316 新增：带自定义 CA 的 AWS SDK fetch 处理器。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (2)
 * attribution: placement 2
 */
import { Re } from "../../../runtime/bun-runtime.js";
import { require_fetch_http_handler } from "../../../vendor/@smithy/fetch-http-handler/dist-cjs/index.js";
import { require_protocol_http } from "../../../vendor/@smithy/protocol-http/dist-cjs/index.js";
import { require_querystring_builder } from "../../../vendor/@smithy/querystring-builder/dist-cjs/index.js";

//@ chunk-aepeg2w5.js:486517-486565 placement
/**
 * 懒加载的 @smithy/querystring-builder 模块（拼接请求查询串）。
 */
var fetchHttpHandlerModule = Re(require_fetch_http_handler(), 1);
var protocolHttpModule = Re(require_protocol_http(), 1);
var querystringBuilderModule = Re(require_querystring_builder(), 1);
//@ chunk-aepeg2w5.js:486565-487365 placement
/**
 * 带自定义 CA 的 AWS SDK fetch 处理器。
 */
class CaFetchHttpHandler extends fetchHttpHandlerModule.FetchHttpHandler {
  caList;
  constructor(caList) {
    super();
    this.caList = caList;
  }
  async handle(e, { abortSignal: n, requestTimeout: r } = {}) {
    let s = querystringBuilderModule.buildQueryString(e.query || {});
    let h = e.username != null || e.password != null ? `${e.username ?? ""}:${e.password ?? ""}@` : "";
    let body = e.method === "GET" || e.method === "HEAD" ? undefined : e.body;
    let response = await fetch(
      new Request(
        `${e.protocol}//${h}${e.hostname}${e.port ? `:${e.port}` : ""}${e.path}${s && `?${s}`}${e.fragment ? `#${e.fragment}` : ""}`,
        {
          body,
          headers: new Headers(e.headers),
          method: e.method,
          ...(body && {
            duplex: "half",
          }),
          signal: AbortSignal.any([
            ...(n instanceof AbortSignal ? [n] : []),
            ...(r ? [AbortSignal.timeout(r)] : []),
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
