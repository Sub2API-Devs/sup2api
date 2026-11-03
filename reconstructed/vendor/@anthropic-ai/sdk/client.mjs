/**
 * @anthropic-ai/sdk/client.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-layout 1
 */
import { cS } from "./internal/utils/env.mjs";
import { bbi, jur } from "./internal/detect-platform.mjs";
import { pr, Ot, Lf, fT, ef, V9e, X7t, Q7t, q7t, K9e, Z7t, Y7t, J7t } from "./core/error.mjs";
import { WARN, jo, Tb, wt } from "./internal/utils/log.mjs";
import { Do, ql, Ui, Uo } from "./internal/utils/values.mjs";
import { Kl, Vl, $o } from "./internal/shims.mjs";
import { Kn, ke } from "./internal/tslib.mjs";
import { Xl } from "./internal/request-options.mjs";
import { resolveCredentialsFromConfig, wbi } from "./lib/credentials/credential-chain.mjs";
import { wrapFetchWithMiddleware, bu, Vi } from "./core/middleware.mjs";
import { TokenCache } from "./lib/credentials/token-cache.mjs";
import { T } from "./internal/headers.mjs";
import { iu } from "./internal/utils/query.mjs";
import { Cx } from "./version.mjs";
import { OAUTH_2025_04_20 } from "./lib/credentials/types.mjs";
import { Jo } from "./core/api-promise.mjs";
import { V7t, Kje } from "./internal/errors.mjs";
import {
  releaseAbortListener,
  registerFinalizerCleanup,
  registerAbortListenerCleanup,
} from "./internal/request-signal.mjs";
import { yu } from "./core/pagination.mjs";
import { sleepUnlessAborted } from "./tools/agent-toolset/memories.mjs";
import { ra } from "./internal/to-file.mjs";
import { nAt } from "./resources/completions.mjs";
import { $ie } from "./resources/messages/messages.mjs";
import { Gn } from "./resources/models.mjs";
import { qn } from "./resources/files.mjs";
import { xo } from "./resources/skills/skills.mjs";
import { Nie } from "./resources/beta/beta.mjs";

//@ chunk-hwmsct5x.js:162129-177706 esm-layout
var qa,
  Wa,
  ci,
  Rd,
  $g = "\\n\\nHuman:",
  qg = "\\n\\nAssistant:",
  rAt = (() => {
    class e {
      get credentials() {
        return this._authState.provider;
      }
      constructor({
        baseURL: n = cS("ANTHROPIC_BASE_URL"),
        apiKey: r,
        authToken: s,
        webhookKey: h = cS("ANTHROPIC_WEBHOOK_SIGNING_KEY") ?? null,
        ...y
      } = {}) {
        if ((qa.add(this), (this._requestAuthFlags = new WeakMap()), ci.set(this, void 0), r === void 0))
          r = y.profile != null ? null : (cS("ANTHROPIC_API_KEY") ?? null);
        if (s === void 0) s = y.profile != null ? null : (cS("ANTHROPIC_AUTH_TOKEN") ?? null);
        if (y.profile != null && (y.credentials != null || y.config != null))
          throw TypeError("Pass at most one of `profile`, `credentials`, or `config`.");
        let w = { apiKey: r, authToken: s, webhookKey: h, ...y, baseURL: n || "https://api.anthropic.com" };
        if (!w.dangerouslyAllowBrowser && bbi())
          throw new pr(`It looks like you're running in a browser-like environment.

This is disabled by default, as it risks exposing your secret API credentials to attackers.
If you understand the risks and have appropriate mitigations in place,
you can set the \`dangerouslyAllowBrowser\` option to \`true\`, e.g.,

new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
`);
        ((this.baseURL = w.baseURL),
          (this._baseURLIsExplicit = y.__baseURLIsExplicit ?? !!n),
          (this.timeout = w.timeout ?? Wa.DEFAULT_TIMEOUT),
          (this.logger = w.logger ?? console),
          (this.logLevel = WARN),
          (this.logLevel =
            jo(w.logLevel, "ClientOptions.logLevel", Tb(this)) ??
            jo(cS("ANTHROPIC_LOG"), "process.env['ANTHROPIC_LOG']", Tb(this)) ??
            WARN),
          (this.fetchOptions = w.fetchOptions),
          (this.maxRetries = Do("maxRetries", w.maxRetries ?? 2)),
          (this.fetch = w.fetch ?? Kl()),
          Kn(this, ci, Xl, "f"),
          (this.middleware = [...(w.middleware ?? [])]));
        let S = cS("ANTHROPIC_CUSTOM_HEADERS");
        if (S) {
          let R = {};
          for (let L of S.split(`
`)) {
            let index = L.indexOf(":");
            if (index >= 0) R[L.substring(0, index).trim()] = L.substring(index + 1).trim();
          }
          w.defaultHeaders = { ...R, ...w.defaultHeaders };
        }
        let __auth = y.__auth;
        if (
          (delete w.__auth,
          delete w.__baseURLIsExplicit,
          (this._options = w),
          (this.apiKey = typeof r === "string" ? r : null),
          (this.authToken = s),
          (this.webhookKey = h),
          __auth)
        ) {
          if (((this._authState = __auth), !this._baseURLIsExplicit && __auth.baseURL))
            this.baseURL = __auth.baseURL;
        } else if (
          ((this._authState = {
            provider: null,
            tokenCache: null,
            resolution: null,
            error: null,
            extraHeaders: {},
          }),
          this.apiKey == null && this.authToken == null)
        ) {
          let R = w.credentials ?? null;
          if (R) ((this._authState.provider = R), (this._authState.tokenCache = this._makeTokenCache(R)));
          else if (w.config != null) {
            let L = resolveCredentialsFromConfig(w.config, this._credentialResolverOptions());
            ((this._authState.provider = L.provider),
              (this._authState.tokenCache = this._makeTokenCache(L.provider)),
              (this._authState.extraHeaders = L.extraHeaders),
              this._applyCredentialBaseURL(L.baseURL));
          } else if (w.profile != null)
            this._authState.resolution = this._resolveDefaultCredentials(w.profile);
          else if (this._shouldResolveDefaultCredentials())
            this._authState.resolution = this._resolveDefaultCredentials();
        }
      }
      _shouldResolveDefaultCredentials() {
        return !0;
      }
      _applyCredentialBaseURL(n) {
        if (!n) return;
        let replaced = n.replace(/\/+$/, "");
        if (((this._authState.baseURL = replaced), !this._baseURLIsExplicit)) this.baseURL = replaced;
      }
      _credentialResolverOptions() {
        return {
          baseURL: this.baseURL,
          fetch: this._credentialsFetch(),
          userAgent: this.getUserAgent(),
          onCacheWriteError: (n) => {
            Tb(this).debug("credential cache write failed (best-effort)", n);
          },
          onSafetyWarning: (n) => {
            Tb(this).warn(n);
          },
        };
      }
      _credentialsFetch() {
        return wrapFetchWithMiddleware(this.fetch, this.middleware, void 0, this);
      }
      _makeTokenCache(n) {
        return new TokenCache(n, (r) => {
          Tb(this).debug("advisory token refresh failed; serving cached token", r);
        });
      }
      withOptions(n) {
        let r = "credentials" in n || "config" in n || "profile" in n,
          s = "apiKey" in n || "authToken" in n || r,
          h = {
            ...this._options,
            ...(this._baseURLIsExplicit ? { baseURL: this.baseURL } : {}),
            maxRetries: this.maxRetries,
            timeout: this.timeout,
            logger: this.logger,
            logLevel: this.logLevel,
            fetch: this.fetch,
            fetchOptions: this.fetchOptions,
            middleware: this.middleware,
            apiKey: this.apiKey,
            authToken: this.authToken,
            webhookKey: this.webhookKey,
            credentials: this.credentials,
            ...(r ? { credentials: void 0, config: void 0, profile: void 0 } : {}),
            ...n,
            __auth: s ? void 0 : this._authState,
            __baseURLIsExplicit: "baseURL" in n ? !0 : this._baseURLIsExplicit,
          };
        return new this.constructor(h);
      }
      async _resolveDefaultCredentials(n) {
        try {
          let r = await wbi(this._credentialResolverOptions(), n);
          if (r)
            ((this._authState.provider = r.provider),
              (this._authState.tokenCache = this._makeTokenCache(r.provider)),
              (this._authState.extraHeaders = r.extraHeaders),
              this._applyCredentialBaseURL(r.baseURL));
          else if (n != null)
            throw new pr(`Profile "${n}" could not be resolved (no <config_dir>/configs/${n}.json found).`);
        } catch (error) {
          this._authState.error = error;
        } finally {
          this._authState.resolution = null;
        }
      }
      defaultQuery() {
        return this._options.defaultQuery;
      }
      validateHeaders({ values: n, nulls: r }) {
        if (n.get("x-api-key") || n.get("authorization")) return;
        if (this._authState.error) throw this._authState.error;
        if (this._authState.tokenCache || this._authState.resolution) return;
        if (this.apiKey && n.get("x-api-key")) return;
        if (r.has("x-api-key")) return;
        if (this.authToken && n.get("authorization")) return;
        if (r.has("authorization")) return;
        throw Error(
          'Could not resolve authentication method. Expected one of apiKey, authToken, credentials, config, or profile to be set. Or for one of the "X-Api-Key" or "Authorization" headers to be explicitly omitted',
        );
      }
      _authFlags(n) {
        let r = this._requestAuthFlags.get(n);
        if (!r) ((r = { usedTokenCache: !1, didRefreshFor401: !1 }), this._requestAuthFlags.set(n, r));
        return r;
      }
      async authHeaders(n) {
        if (this._authState.resolution) await this._authState.resolution;
        if (this._authState.error) return;
        if (this._authState.tokenCache && this.apiKey == null) {
          let token = await this._authState.tokenCache.getToken();
          return ((this._authFlags(n).usedTokenCache = !0), T([{ Authorization: `Bearer ${token}` }]));
        }
        return T([await this.apiKeyAuth(n), await this.bearerAuth(n)]);
      }
      async apiKeyAuth(n) {
        if (this.apiKey == null) return;
        return T([{ "X-Api-Key": this.apiKey }]);
      }
      async bearerAuth(n) {
        if (this.authToken == null) return;
        return T([{ Authorization: `Bearer ${this.authToken}` }]);
      }
      stringifyQuery(n) {
        return iu(n);
      }
      getUserAgent() {
        return `Anthropic/JS ${Cx}`;
      }
      makeStatusError(n, r, s, h) {
        return Ot.generate(n, r, s, h);
      }
      buildURL(n, r, s) {
        let h = (!ke(this, qa, "m", Rd).call(this) && s) || this.baseURL,
          y = ql(n) ? new URL(n) : new URL(h + (h.endsWith("/") && n.startsWith("/") ? n.slice(1) : n)),
          defaultQuery = this.defaultQuery(),
          fromEntries = Object.fromEntries(y.searchParams);
        if (!Ui(defaultQuery) || !Ui(fromEntries)) r = { ...fromEntries, ...defaultQuery, ...r };
        if (typeof r === "object" && r && !Array.isArray(r)) y.search = this.stringifyQuery(r);
        return y.toString();
      }
      _calculateNonstreamingTimeout(n) {
        if ((3600 * n) / 128000 > 600)
          throw new pr(
            "Streaming is required for operations that may take longer than 10 minutes. See https://github.com/anthropics/anthropic-sdk-typescript#streaming-responses for more details",
          );
        return 600000;
      }
      async prepareOptions(n) {}
      async prepareRequest(n, { url: r, options: s }) {
        if (this._authState.tokenCache && this.apiKey == null) {
          let h = n.headers instanceof Headers ? n.headers : new Headers(n.headers);
          for (let [w, S] of Object.entries(this._authState.extraHeaders)) if (!h.has(w)) h.set(w, S);
          let y = h
            .get("anthropic-beta")
            ?.split(",")
            .map((w) => w.trim());
          if (!y?.includes(OAUTH_2025_04_20))
            h.set("anthropic-beta", [...(y ?? []), OAUTH_2025_04_20].join(","));
          n.headers = h;
        }
      }
      backendMiddleware() {
        return [];
      }
      get(n, r) {
        return this.methodRequest("get", n, r);
      }
      post(n, r) {
        return this.methodRequest("post", n, r);
      }
      patch(n, r) {
        return this.methodRequest("patch", n, r);
      }
      put(n, r) {
        return this.methodRequest("put", n, r);
      }
      delete(n, r) {
        return this.methodRequest("delete", n, r);
      }
      methodRequest(n, r, s) {
        return this.request(Promise.resolve(s).then((h) => ({ method: n, path: r, ...h })));
      }
      request(n, r = null) {
        return new Jo(this, this.makeRequest(n, r, void 0));
      }
      async makeRequest(n, r, s) {
        let h = await n,
          y = Do("maxRetries", h.maxRetries ?? this.maxRetries);
        if (this.isStreamBody(h.body)) y = 0;
        if (r == null) ((r = y), this._requestAuthFlags.delete(h));
        await this.prepareOptions(h);
        let { req: req, url: url, timeout: timeout } = await this.buildRequest(h, { retryCount: y - r }),
          R = "log_" + ((Math.random() * 16777216) | 0).toString(16).padStart(6, "0"),
          L = s === void 0 ? "" : `, retryOf: ${s}`,
          now = Date.now();
        if (h.signal?.aborted) throw new Lf();
        let abortController = new AbortController(),
          P = await this.fetchWithTimeout(url, req, timeout, abortController, h, {
            requestLogID: R,
            retryOfRequestLogID: s,
          }).catch(V7t),
          now_2 = Date.now();
        if (P instanceof globalThis.Error) {
          releaseAbortListener(abortController);
          let G = `retrying, ${r} attempts remaining`;
          if (h.signal?.aborted) throw new Lf();
          let q = Kje(P) || /timed? ?out/i.test(String(P) + ("cause" in P ? String(P.cause) : "")),
            J = this.middleware.length > 0 || !!h.middleware?.length || this.backendMiddleware().length > 0;
          if (J && !q && !bu(P))
            throw (
              Tb(this).info(`[${R}] middleware error (not retryable)`),
              wt(Tb(this), `[${R}] middleware error (not retryable)`, {
                retryOfRequestLogID: s,
                url: url,
                durationMs: now_2 - now,
                message: P.message,
              }),
              P
            );
          if (r)
            return (
              Tb(this).info(`[${R}] connection ${q ? "timed out" : "failed"} - ${G}`),
              wt(Tb(this), `[${R}] connection ${q ? "timed out" : "failed"} (${G})`, {
                retryOfRequestLogID: s,
                url: url,
                durationMs: now_2 - now,
                message: P.message,
              }),
              this.retryRequest(h, r, s ?? R)
            );
          if (
            (Tb(this).info(`[${R}] connection ${q ? "timed out" : "failed"} - error; no more retries left`),
            wt(Tb(this), `[${R}] connection ${q ? "timed out" : "failed"} (error; no more retries left)`, {
              retryOfRequestLogID: s,
              url: url,
              durationMs: now_2 - now,
              message: P.message,
            }),
            q)
          )
            throw new fT();
          if (J && !Vi(P)) throw P;
          throw new ef({ cause: P });
        }
        let joined = [...P.headers.entries()]
            .filter(([G]) => G === "request-id" || G === "anthropic-workspace-id")
            .map(([G, q]) => ", " + G + ": " + JSON.stringify(q))
            .join(""),
          z = `[${R}${L}${joined}] ${req.method} ${url} ${P.ok ? "succeeded" : "failed"} with status ${P.status} in ${now_2 - now}ms`;
        if (!P.ok) {
          let shouldRetry = await this.shouldRetry(P, h);
          if (r && shouldRetry) {
            let te = `retrying, ${r} attempts remaining`;
            return (
              await Vl(P.body),
              releaseAbortListener(abortController),
              Tb(this).info(`${z} - ${te}`),
              wt(Tb(this), `[${R}] response error (${te})`, {
                retryOfRequestLogID: s,
                url: P.url,
                status: P.status,
                headers: P.headers,
                durationMs: now_2 - now,
              }),
              this.retryRequest(h, r, s ?? R, P.headers)
            );
          }
          let q = shouldRetry ? "error; no more retries left" : "error; not retryable";
          Tb(this).info(`${z} - ${q}`);
          let J = await P.text().catch((te) => V7t(te).message),
            Z = Uo(J),
            Q = Z ? void 0 : J;
          throw (
            wt(Tb(this), `[${R}] response error (${q})`, {
              retryOfRequestLogID: s,
              url: P.url,
              status: P.status,
              headers: P.headers,
              message: Q,
              durationMs: Date.now() - now,
            }),
            releaseAbortListener(abortController),
            this.makeStatusError(P.status, Z, Q, P.headers)
          );
        }
        return (
          Tb(this).info(z),
          wt(Tb(this), `[${R}] response start`, {
            retryOfRequestLogID: s,
            url: P.url,
            status: P.status,
            headers: P.headers,
            durationMs: now_2 - now,
          }),
          registerFinalizerCleanup(P.body ?? P, abortController),
          {
            response: P,
            options: h,
            controller: abortController,
            requestLogID: R,
            retryOfRequestLogID: s,
            startTime: now,
          }
        );
      }
      getAPIList(n, r, s) {
        return this.requestAPIList(
          r,
          s && "then" in s
            ? s.then((h) => ({ method: "get", path: n, ...h }))
            : { method: "get", path: n, ...s },
        );
      }
      requestAPIList(n, r) {
        let request = this.makeRequest(r, null, void 0);
        return new yu(this, request, n);
      }
      async fetchWithTimeout(n, r, s, h, y, w) {
        let { signal: signal, method: method, ...R } = r || {},
          _makeAbort = this._makeAbort(h);
        if (signal)
          (signal.addEventListener("abort", _makeAbort, { once: !0 }),
            registerAbortListenerCleanup(h, signal, _makeAbort));
        let O =
            (globalThis.ReadableStream && R.body instanceof globalThis.ReadableStream) ||
            (typeof R.body === "object" && R.body !== null && Symbol.asyncIterator in R.body),
          M = { signal: h.signal, ...(O ? { duplex: "half" } : {}), method: "GET", ...R };
        if (method) M.method = method.toUpperCase();
        let P = this.fetch,
          H = async (J, Z) => {
            let Q = setTimeout(_makeAbort, s);
            try {
              return await P.call(void 0, J, Z);
            } finally {
              clearTimeout(Q);
            }
          },
          j =
            y === void 0
              ? H
              : async (J, Z = {}) => {
                  let Q = typeof J === "string" ? J : J instanceof URL ? J.href : J.url;
                  if (
                    ((Z.headers = Z.headers instanceof Headers ? Z.headers : new Headers(Z.headers)),
                    await this.prepareRequest(Z, { url: Q, options: y }),
                    w)
                  )
                    wt(Tb(this), `[${w.requestLogID}] sending request`, {
                      retryOfRequestLogID: w.retryOfRequestLogID,
                      method: Z.method,
                      url: Q,
                      options: y,
                      headers: Z.headers,
                    });
                  return H(J, Z);
                },
          z = y?.middleware,
          backendMiddleware = this.backendMiddleware(),
          q =
            z?.length || backendMiddleware.length
              ? [...this.middleware, ...(z ?? []), ...backendMiddleware]
              : this.middleware;
        return await wrapFetchWithMiddleware(j, q, y, this)(n, M);
      }
      async shouldRetry(n, r) {
        let _authFlags = this._authFlags(r);
        if (
          n.status === 401 &&
          this._authState.tokenCache &&
          _authFlags.usedTokenCache &&
          !_authFlags.didRefreshFor401
        )
          return ((_authFlags.didRefreshFor401 = !0), this._authState.tokenCache.invalidate(), !0);
        let h = n.headers.get("x-should-retry");
        if (h === "true") return !0;
        if (h === "false") return !1;
        if (n.status === 408) return !0;
        if (n.status === 409) return !0;
        if (n.status === 429) return !0;
        if (n.status >= 500) return !0;
        return !1;
      }
      async retryRequest(n, r, s, h) {
        let y,
          w = h?.get("retry-after-ms");
        if (w) {
          let E = parseFloat(w);
          if (!Number.isNaN(E)) y = E;
        }
        let S = h?.get("retry-after");
        if (S && !y) {
          let E = parseFloat(S);
          if (!Number.isNaN(E)) y = E * 1000;
          else y = Date.parse(S) - Date.now();
        }
        if (y === void 0 || !(y > 0 && y <= 2147483647)) {
          let E = n.maxRetries ?? this.maxRetries;
          y = this.calculateDefaultRetryTimeoutMillis(r, E);
        }
        return (await sleepUnlessAborted(y, n.signal ?? void 0), this.makeRequest(n, r - 1, s));
      }
      calculateDefaultRetryTimeoutMillis(n, r) {
        let y = r - n,
          min = Math.min(0.5 * Math.pow(2, y), 8),
          S = 1 - Math.random() * 0.25;
        return min * S * 1000;
      }
      calculateNonstreamingTimeout(n, r) {
        if ((3600000 * n) / 128000 > 600000 || (r != null && n > r))
          throw new pr(
            "Streaming is required for operations that may take longer than 10 minutes. See https://github.com/anthropics/anthropic-sdk-typescript#long-requests for more details",
          );
        return 600000;
      }
      async buildRequest(n, { retryCount: r = 0 } = {}) {
        let s = { ...n },
          { method: method, path: path, query: query, defaultBaseURL: defaultBaseURL } = s;
        if (this._authState.resolution) await this._authState.resolution;
        if (!this._baseURLIsExplicit && this._authState.baseURL && this.baseURL !== this._authState.baseURL)
          this.baseURL = this._authState.baseURL;
        let uRL = this.buildURL(path, query, defaultBaseURL);
        if ("timeout" in s) Do("timeout", s.timeout);
        s.timeout = s.timeout ?? this.timeout;
        let { bodyHeaders: bodyHeaders, body: body } = this.buildBody({ options: s }),
          headers = await this.buildHeaders({
            options: n,
            method: method,
            bodyHeaders: bodyHeaders,
            retryCount: r,
          });
        return {
          req: {
            method: method,
            headers: headers,
            ...(s.signal && { signal: s.signal }),
            ...(globalThis.ReadableStream && body instanceof globalThis.ReadableStream && { duplex: "half" }),
            ...(body && { body: body }),
            ...(this.fetchOptions ?? {}),
            ...(s.fetchOptions ?? {}),
          },
          url: uRL,
          timeout: s.timeout,
        };
      }
      async buildHeaders({ options: n, method: r, bodyHeaders: s, retryCount: h }) {
        let y = T([
          {
            Accept: "application/json",
            "User-Agent": this.getUserAgent(),
            "X-Stainless-Retry-Count": String(h),
            ...(n.timeout ? { "X-Stainless-Timeout": String(Math.trunc(n.timeout / 1000)) } : {}),
            ...jur(),
            ...(this._options.dangerouslyAllowBrowser
              ? { "anthropic-dangerous-direct-browser-access": "true" }
              : void 0),
            "anthropic-version": "2023-06-01",
          },
          await this.authHeaders(n),
          this._options.defaultHeaders,
          s,
          n.headers,
        ]);
        return (this.validateHeaders(y), y.values);
      }
      _makeAbort(n) {
        return () => n.abort();
      }
      buildBody({ options: { body: n, headers: r } }) {
        if (!n) return { bodyHeaders: void 0, body: void 0 };
        let s = T([r]);
        if (
          ArrayBuffer.isView(n) ||
          n instanceof ArrayBuffer ||
          n instanceof DataView ||
          (typeof n === "string" && s.values.has("content-type")) ||
          (globalThis.Blob && n instanceof globalThis.Blob) ||
          n instanceof FormData ||
          n instanceof URLSearchParams ||
          (globalThis.ReadableStream && n instanceof globalThis.ReadableStream)
        )
          return { bodyHeaders: void 0, body: n };
        else if (this.isStreamBody(n)) return { bodyHeaders: void 0, body: $o(n) };
        else if (
          typeof n === "object" &&
          s.values.get("content-type") === "application/x-www-form-urlencoded"
        )
          return {
            bodyHeaders: { "content-type": "application/x-www-form-urlencoded" },
            body: this.stringifyQuery(n),
          };
        else return ke(this, ci, "f").call(this, { body: n, headers: s });
      }
      isStreamBody(n) {
        if (globalThis.ReadableStream && n instanceof globalThis.ReadableStream) return !0;
        return (
          typeof n === "object" &&
          n !== null &&
          (Symbol.asyncIterator in n || (Symbol.iterator in n && "next" in n && typeof n.next === "function"))
        );
      }
    }
    return (
      (Wa = e),
      (ci = new WeakMap()),
      (qa = new WeakSet()),
      (Rd = function () {
        return this.baseURL !== "https://api.anthropic.com";
      }),
      (e.Anthropic = Wa),
      (e.HUMAN_PROMPT = $g),
      (e.AI_PROMPT = qg),
      (e.DEFAULT_TIMEOUT = 600000),
      (e.AnthropicError = pr),
      (e.APIError = Ot),
      (e.APIConnectionError = ef),
      (e.APIConnectionTimeoutError = fT),
      (e.APIUserAbortError = Lf),
      (e.NotFoundError = V9e),
      (e.ConflictError = X7t),
      (e.RateLimitError = Q7t),
      (e.BadRequestError = q7t),
      (e.AuthenticationError = K9e),
      (e.InternalServerError = Z7t),
      (e.PermissionDeniedError = Y7t),
      (e.UnprocessableEntityError = J7t),
      (e.toFile = ra),
      e
    );
  })(),
  uPe = (() => {
    class e extends rAt {
      constructor() {
        super(...arguments);
        ((this.completions = new nAt(this)),
          (this.messages = new $ie(this)),
          (this.models = new Gn(this)),
          (this.files = new qn(this)),
          (this.skills = new xo(this)),
          (this.beta = new Nie(this)));
      }
    }
    return (
      (e.Completions = nAt),
      (e.Messages = $ie),
      (e.Models = Gn),
      (e.Files = qn),
      (e.Skills = xo),
      (e.Beta = Nie),
      e
    );
  })();

export { uPe, rAt };
