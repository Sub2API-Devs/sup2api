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
import { getCACertificates, splitPemBlocks, setDefaultCaFor } from "../../utils/caCerts.js";
import { nativeCaState } from "./auth/tokens.js";
import { gatewayLog } from "../gateway/gatewayBanner.js";
import { env } from "../../utils/env.js";
import { getUsableProxyUrl, getNoProxy_2, getProxyFetchOptions } from "../../utils/proxy.js";
import { withTimeout } from "../../utils/sleep.js";
import { ssrfSafeFetch } from "./ssrfGuard.js";

//@ chunk-1ny7cxrt.js:1312313-1312506 placement
/**
 * 没有可用 CA 证书的错误。
 */
function noCaCertificatesError() {
  return Error(
    "network: no CA certificate could be loaded, so the gateway cannot verify the servers it connects to. Check CLAUDE_CODE_CERT_STORE and the NODE_EXTRA_CA_CERTS file",
  );
}
//@ chunk-1ny7cxrt.js:1312578-1312654 placement
/**
 * 用 tls.createSecureContext 试建上下文，判断一段 CA 证书是否可用。
 */
function isValidCaCertificate(ca) {
  try {
    tlsModule.createSecureContext({
      ca,
    });
    return true;
  } catch {
    return false;
  }
}
//@ chunk-1ny7cxrt.js:1312654-1312793 placement
/**
 * 系统 CA 证书块（缓存）。
 */
function nativeCaBlocks() {
  let caCertificates = getCACertificates();
  if (!nativeCaState.nativeCAs || nativeCaState.nativeCAs.from !== caCertificates)
    nativeCaState.nativeCAs = {
      from: caCertificates,
      blocks: splitPemBlocks(caCertificates).filter(isValidCaCertificate),
    };
  return nativeCaState.nativeCAs.blocks;
}
//@ chunk-1ny7cxrt.js:1312793-1312854 placement
/**
 * 取系统原生 CA 证书块；一块都没有时报错（不能静默跳过校验）。
 */
function getNativeCaBlocks() {
  let e = nativeCaBlocks();
  if (e.length === 0) throw noCaCertificatesError();
  return e;
}
//@ chunk-1ny7cxrt.js:1312854-1312918 placement
/**
 * 带系统 CA 的 fetch 封装（透传 tls 选项）。
 */
function fetchWithCa(e, t) {
  return fetch(e, {
    ...t,
    tls: {
      ...t?.tls,
      ca: getNativeCaBlocks(),
    },
  });
}
//@ chunk-1ny7cxrt.js:1312918-1312996 placement
/**
 * 给 openai 风格客户端返回带自定义 CA fetch 的传输选项（超时 10 秒）。
 */
function createCaTransporterOptions() {
  return {
    transporterOptions: {
      fetchImplementation: fetchWithCa,
      timeout: 1e4,
    },
  };
}
//@ chunk-1ny7cxrt.js:1312996-1314641 placement
/**
 * 设置默认 CA；CLAUDE_GATEWAY_PROXY_IS_EGRESS_BOUNDARY 时在条件满足（有代理、无回环、NO_PROXY 为空）后启用代理作为出口边界。
 */
function configureGatewayNetwork() {
  let e = splitPemBlocks(getCACertificates());
  let filtered = e.filter(setDefaultCaFor);
  if (filtered.length === 0) throw noCaCertificatesError();
  tlsModule.setDefaultCACertificates(filtered);
  let n = e.length - nativeCaBlocks().length;
  if (n > 0)
    gatewayLog(
      "warn",
      `network: ${n} certificate block(s) in the CA list cannot be read and are skipped. Check the NODE_EXTRA_CA_CERTS file, or the OS certificate store, for a damaged or cut-off certificate`,
    );
  nativeCaState.enabled = false;
  if (!env.CLAUDE_GATEWAY_PROXY_IS_EGRESS_BOUNDARY) return;
  let usableProxyUrl = getUsableProxyUrl();
  if (!usableProxyUrl) {
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
  let noProxy = getNoProxy_2();
  if (noProxy) {
    gatewayLog(
      "warn",
      `CLAUDE_GATEWAY_PROXY_IS_EGRESS_BOUNDARY is set but NO_PROXY="${noProxy}", so it is NOT active and hostnames are still resolved and checked locally; with this setting every destination, internal ones included, goes through the proxy: set NO_PROXY and no_proxy to an empty value on the gateway pod (that overrides one your platform injects) and allow those hosts in the proxy instead`,
    );
    return;
  }
  nativeCaState.enabled = true;
  gatewayLog(
    "info",
    `network: proxy ${new URL(usableProxyUrl).host} is the egress boundary; outbound requests hand it hostnames and rely on its allowlist instead of the gateway's own address check`,
  );
}
//@ chunk-1ny7cxrt.js:1314641-1314722 placement
/**
 * 代理是否作为出口边界生效：启用且有代理、未配 NO_PROXY、未允许回环。
 */
function isEgressBoundaryActive() {
  return (
    nativeCaState.enabled && !!getUsableProxyUrl() && !getNoProxy_2() && !env.CLAUDE_GATEWAY_ALLOW_LOOPBACK
  );
}
//@ chunk-1ny7cxrt.js:1320363-1320472 placement
/**
 * 带代理选项与超时的 fetch。
 */
function fetchWithTimeout(e, t, n, o) {
  return withTimeout(
    ssrfSafeFetch(e, {
      ...t,
      ...getProxyFetchOptions({
        url: e,
      }),
      timeout: false,
      signal: AbortSignal.timeout(n),
    }),
    n + 500,
    o,
  );
}
export {
  fetchWithCa,
  getNativeCaBlocks,
  isEgressBoundaryActive,
  fetchWithTimeout,
  createCaTransporterOptions,
  configureGatewayNetwork,
};
