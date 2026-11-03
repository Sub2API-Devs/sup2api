/**
 * services/claudeGateway/network.ts
 *
 * 2.1.316 新增：网关网络配置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (9)
 * attribution: placement 9
 */
import * as tlsModule from "tls";
import { getCACertificates, plo, phs } from "../../utils/caCerts.js";
import { qa } from "./auth/tokens.js";
import { gatewayLog } from "../gateway/gatewayBanner.js";
import { env } from "../../utils/env.js";
import { getUsableProxyUrl, getNoProxy_2, getProxyFetchOptions } from "../../utils/proxy.js";
import { withTimeout } from "../../utils/sleep.js";
import { ssrfSafeFetch } from "./ssrfGuard.js";

/**
 * 没有可用 CA 证书的错误。
 */
//@ chunk-1ny7cxrt.js:1312313-1312506 placement
function noCaCertificatesError() {
  return Error(
    "network: no CA certificate could be loaded, so the gateway cannot verify the servers it connects to. Check CLAUDE_CODE_CERT_STORE and the NODE_EXTRA_CA_CERTS file",
  );
}
//@ chunk-1ny7cxrt.js:1312578-1312654 placement
function GB(e) {
  try {
    return (tlsModule.createSecureContext({ ca: e }), !0);
  } catch {
    return !1;
  }
}
/**
 * 系统 CA 证书块（缓存）。
 */
//@ chunk-1ny7cxrt.js:1312654-1312793 placement
function nativeCaBlocks() {
  let e = getCACertificates();
  if (!qa.nativeCAs || qa.nativeCAs.from !== e) qa.nativeCAs = { from: e, blocks: plo(e).filter(GB) };
  return qa.nativeCAs.blocks;
}
//@ chunk-1ny7cxrt.js:1312793-1312854 placement
function js() {
  let e = nativeCaBlocks();
  if (e.length === 0) throw noCaCertificatesError();
  return e;
}
//@ chunk-1ny7cxrt.js:1312854-1312918 placement
function Rf(e, t) {
  return fetch(e, { ...t, tls: { ...t?.tls, ca: js() } });
}
//@ chunk-1ny7cxrt.js:1312918-1312996 placement
function $u() {
  return { transporterOptions: { fetchImplementation: Rf, timeout: 1e4 } };
}
/**
 * 设置默认 CA；CLAUDE_GATEWAY_PROXY_IS_EGRESS_BOUNDARY 时在条件满足（有代理、无回环、NO_PROXY 为空）后启用代理作为出口边界。
 */
//@ chunk-1ny7cxrt.js:1312996-1314641 placement
function configureGatewayNetwork() {
  let e = plo(getCACertificates()),
    filtered = e.filter(phs);
  if (filtered.length === 0) throw noCaCertificatesError();
  tlsModule.setDefaultCACertificates(filtered);
  let n = e.length - nativeCaBlocks().length;
  if (n > 0)
    gatewayLog(
      "warn",
      `network: ${n} certificate block(s) in the CA list cannot be read and are skipped. Check the NODE_EXTRA_CA_CERTS file, or the OS certificate store, for a damaged or cut-off certificate`,
    );
  if (((qa.enabled = !1), !env.CLAUDE_GATEWAY_PROXY_IS_EGRESS_BOUNDARY)) return;
  let o = getUsableProxyUrl();
  if (!o) {
    gatewayLog(
      "warn",
      "CLAUDE_GATEWAY_PROXY_IS_EGRESS_BOUNDARY is set but no usable HTTPS_PROXY/HTTP_PROXY is set on the gateway, so it is NOT active and hostnames are still resolved and checked locally; set HTTPS_PROXY to your forward proxy",
    );
    return;
  }
  if (env.CLAUDE_GATEWAY_ALLOW_LOOPBACK) {
    gatewayLog(
      "warn",
      "CLAUDE_GATEWAY_PROXY_IS_EGRESS_BOUNDARY is set but so is CLAUDE_GATEWAY_ALLOW_LOOPBACK, so it is NOT active and hostnames are still resolved and checked locally; a loopback sidecar cannot be combined with proxy-only egress \u2014 give the collector or IdP an address the proxy can reach and unset CLAUDE_GATEWAY_ALLOW_LOOPBACK",
    );
    return;
  }
  let r = getNoProxy_2();
  if (r) {
    gatewayLog(
      "warn",
      `CLAUDE_GATEWAY_PROXY_IS_EGRESS_BOUNDARY is set but NO_PROXY="${r}", so it is NOT active and hostnames are still resolved and checked locally; with this setting every destination, internal ones included, goes through the proxy: set NO_PROXY and no_proxy to an empty value on the gateway pod (that overrides one your platform injects) and allow those hosts in the proxy instead`,
    );
    return;
  }
  ((qa.enabled = !0),
    gatewayLog(
      "info",
      `network: proxy ${new URL(o).host} is the egress boundary; outbound requests hand it hostnames and rely on its allowlist instead of the gateway's own address check`,
    ));
}
//@ chunk-1ny7cxrt.js:1314641-1314722 placement
function Rl() {
  return qa.enabled && !!getUsableProxyUrl() && !getNoProxy_2() && !env.CLAUDE_GATEWAY_ALLOW_LOOPBACK;
}
/**
 * 带代理选项与超时的 fetch。
 */
//@ chunk-1ny7cxrt.js:1320363-1320472 placement
function fetchWithTimeout(e, t, n, o) {
  return withTimeout(
    ssrfSafeFetch(e, {
      ...t,
      ...getProxyFetchOptions({ url: e }),
      timeout: !1,
      signal: AbortSignal.timeout(n),
    }),
    n + 500,
    o,
  );
}

export { Rf, js, Rl, fetchWithTimeout, $u, configureGatewayNetwork };
