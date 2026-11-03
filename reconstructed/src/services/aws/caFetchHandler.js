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
import { nke } from "../../../vendor/@smithy/fetch-http-handler/dist-cjs/index.js";
import { Kg } from "../../../vendor/@smithy/protocol-http/dist-cjs/index.js";
import { uSr } from "../../../vendor/@smithy/querystring-builder/dist-cjs/index.js";

//@ chunk-aepeg2w5.js:486517-486565 placement
var dA = Re(nke(), 1),
  cA = Re(Kg(), 1),
  pA = Re(uSr(), 1);
/**
 * 带自定义 CA 的 AWS SDK fetch 处理器。
 */
//@ chunk-aepeg2w5.js:486565-487365 placement
class CaFetchHttpHandler extends dA.FetchHttpHandler {
  caList;
  constructor(e) {
    super();
    this.caList = e;
  }
  async handle(e, { abortSignal: n, requestTimeout: r } = {}) {
    let queryString = pA.buildQueryString(e.query || {}),
      h = e.username != null || e.password != null ? `${e.username ?? ""}:${e.password ?? ""}@` : "",
      y = e.method === "GET" || e.method === "HEAD" ? void 0 : e.body,
      S = await fetch(
        new Request(
          `${e.protocol}//${h}${e.hostname}${e.port ? `:${e.port}` : ""}${e.path}${queryString && `?${queryString}`}${e.fragment ? `#${e.fragment}` : ""}`,
          {
            body: y,
            headers: new Headers(e.headers),
            method: e.method,
            ...(y && { duplex: "half" }),
            signal: AbortSignal.any([
              ...(n instanceof AbortSignal ? [n] : []),
              ...(r ? [AbortSignal.timeout(r)] : []),
            ]),
          },
        ),
        { tls: { ca: this.caList() } },
      );
    return {
      response: new cA.HttpResponse({
        headers: Object.fromEntries(S.headers.entries()),
        reason: S.statusText,
        statusCode: S.status,
        body: S.body ?? (await S.blob()),
      }),
    };
  }
}

export { CaFetchHttpHandler };
