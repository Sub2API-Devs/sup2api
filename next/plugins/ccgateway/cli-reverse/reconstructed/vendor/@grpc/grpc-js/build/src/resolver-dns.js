/**
 * @grpc/grpc-js/build/src/resolver-dns.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";
import { require_resolver } from "./resolver.js";
import { require_service_config } from "./service-config.js";
import { require_constants } from "./constants.js";
import { require_call_interface } from "./call-interface.js";
import { require_metadata } from "./metadata.js";
import { require_logging } from "./logging.js";
import { require_uri_parser } from "./uri-parser.js";
import { require_backoff_timeout } from "./backoff-timeout.js";
import { require_environment } from "./environment.js";

//@ chunk-3k21nfa0.js:205375-211555 cjs-fingerprint
var require_resolver_dns = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.DEFAULT_PORT = undefined;
  cjsExports.setup = setup;
  var resolver_1 = require_resolver();
  var dns_1 = importMetaRequire("dns");
  var service_config_1 = require_service_config();
  var constants_1 = require_constants();
  var call_interface_1 = require_call_interface();
  var metadata_1 = require_metadata();
  var logging = require_logging();
  var constants_2 = require_constants();
  var uri_parser_1 = require_uri_parser();
  var net_1 = importMetaRequire("net");
  var backoff_timeout_1 = require_backoff_timeout();
  var environment_1 = require_environment();
  var TRACER_NAME = "dns_resolver";
  function trace(text) {
    logging.trace(constants_2.LogVerbosity.DEBUG, TRACER_NAME, text);
  }
  cjsExports.DEFAULT_PORT = 443;
  var DEFAULT_MIN_TIME_BETWEEN_RESOLUTIONS_MS = 30000;
  class DnsResolver {
    constructor(target, listener, channelOptions) {
      var _a;
      var _b;
      var _c;
      this.target = target;
      this.listener = listener;
      this.pendingLookupPromise = null;
      this.pendingTxtPromise = null;
      this.latestLookupResult = null;
      this.latestServiceConfigResult = null;
      this.continueResolving = false;
      this.isNextResolutionTimerRunning = false;
      this.isServiceConfigEnabled = true;
      this.returnedIpResult = false;
      this.alternativeResolver = new dns_1.promises.Resolver();
      trace("Resolver constructed for target " + uri_parser_1.uriToString(target));
      if (target.authority) this.alternativeResolver.setServers([target.authority]);
      let hostPort = uri_parser_1.splitHostPort(target.path);
      if (hostPort === null) {
        this.ipResult = null;
        this.dnsHostname = null;
        this.port = null;
      } else if (net_1.isIPv4(hostPort.host) || net_1.isIPv6(hostPort.host)) {
        this.ipResult = [
          {
            addresses: [
              {
                host: hostPort.host,
                port: (_a = hostPort.port) !== null && _a !== undefined ? _a : cjsExports.DEFAULT_PORT,
              },
            ],
          },
        ];
        this.dnsHostname = null;
        this.port = null;
      } else {
        this.ipResult = null;
        this.dnsHostname = hostPort.host;
        this.port = (_b = hostPort.port) !== null && _b !== undefined ? _b : cjsExports.DEFAULT_PORT;
      }
      this.percentage = Math.random() * 100;
      if (channelOptions["grpc.service_config_disable_resolution"] === 1) this.isServiceConfigEnabled = false;
      this.defaultResolutionError = {
        code: constants_1.Status.UNAVAILABLE,
        details: `Name resolution failed for target ${uri_parser_1.uriToString(this.target)}`,
        metadata: new metadata_1.Metadata(),
      };
      let backoffOptions = {
        initialDelay: channelOptions["grpc.initial_reconnect_backoff_ms"],
        maxDelay: channelOptions["grpc.max_reconnect_backoff_ms"],
      };
      this.backoff = new backoff_timeout_1.BackoffTimeout(() => {
        if (this.continueResolving) this.startResolutionWithBackoff();
      }, backoffOptions);
      this.backoff.unref();
      this.minTimeBetweenResolutionsMs =
        (_c = channelOptions["grpc.dns_min_time_between_resolutions_ms"]) !== null && _c !== undefined
          ? _c
          : DEFAULT_MIN_TIME_BETWEEN_RESOLUTIONS_MS;
      this.nextResolutionTimer = setTimeout(() => {}, 0);
      clearTimeout(this.nextResolutionTimer);
    }
    startResolution() {
      if (this.ipResult !== null) {
        if (!this.returnedIpResult) {
          trace("Returning IP address for target " + uri_parser_1.uriToString(this.target));
          setImmediate(() => {
            this.listener(call_interface_1.statusOrFromValue(this.ipResult), {}, null, "");
          });
          this.returnedIpResult = true;
        }
        this.backoff.stop();
        this.backoff.reset();
        this.stopNextResolutionTimer();
        return;
      }
      if (this.dnsHostname === null) {
        trace("Failed to parse DNS address " + uri_parser_1.uriToString(this.target));
        setImmediate(() => {
          this.listener(
            call_interface_1.statusOrFromError({
              code: constants_1.Status.UNAVAILABLE,
              details: `Failed to parse DNS address ${uri_parser_1.uriToString(this.target)}`,
            }),
            {},
            null,
            "",
          );
        });
        this.stopNextResolutionTimer();
      } else {
        if (this.pendingLookupPromise !== null) return;
        trace("Looking up DNS hostname " + this.dnsHostname);
        this.latestLookupResult = null;
        let hostname = this.dnsHostname;
        this.pendingLookupPromise = this.lookup(hostname);
        this.pendingLookupPromise.then(
          (addressList) => {
            if (this.pendingLookupPromise === null) return;
            this.pendingLookupPromise = null;
            this.latestLookupResult = call_interface_1.statusOrFromValue(
              addressList.map((address) => ({
                addresses: [address],
              })),
            );
            let allAddressesString =
              "[" + addressList.map((addr) => addr.host + ":" + addr.port).join(",") + "]";
            trace(
              "Resolved addresses for target " +
                uri_parser_1.uriToString(this.target) +
                ": " +
                allAddressesString,
            );
            let healthStatus = this.listener(this.latestLookupResult, {}, this.latestServiceConfigResult, "");
            this.handleHealthStatus(healthStatus);
          },
          (err) => {
            if (this.pendingLookupPromise === null) return;
            trace(
              "Resolution error for target " + uri_parser_1.uriToString(this.target) + ": " + err.message,
            );
            this.pendingLookupPromise = null;
            this.stopNextResolutionTimer();
            this.listener(
              call_interface_1.statusOrFromError(this.defaultResolutionError),
              {},
              this.latestServiceConfigResult,
              "",
            );
          },
        );
        if (this.isServiceConfigEnabled && this.pendingTxtPromise === null) {
          this.pendingTxtPromise = this.resolveTxt(hostname);
          this.pendingTxtPromise.then(
            (txtRecord) => {
              if (this.pendingTxtPromise === null) return;
              this.pendingTxtPromise = null;
              let serviceConfig;
              try {
                serviceConfig = service_config_1.extractAndSelectServiceConfig(txtRecord, this.percentage);
                if (serviceConfig)
                  this.latestServiceConfigResult = call_interface_1.statusOrFromValue(serviceConfig);
                else this.latestServiceConfigResult = null;
              } catch (err) {
                this.latestServiceConfigResult = call_interface_1.statusOrFromError({
                  code: constants_1.Status.UNAVAILABLE,
                  details: `Parsing service config failed with error ${err.message}`,
                });
              }
              if (this.latestLookupResult !== null)
                this.listener(this.latestLookupResult, {}, this.latestServiceConfigResult, "");
            },
            (err) => {},
          );
        }
      }
    }
    handleHealthStatus(healthStatus) {
      if (healthStatus) {
        this.backoff.stop();
        this.backoff.reset();
      } else this.continueResolving = true;
    }
    async lookup(hostname) {
      if (environment_1.GRPC_NODE_USE_ALTERNATIVE_RESOLVER) {
        trace("Using alternative DNS resolver.");
        let records = await Promise.allSettled([
          this.alternativeResolver.resolve4(hostname),
          this.alternativeResolver.resolve6(hostname),
        ]);
        if (records.every((result) => result.status === "rejected")) throw Error(records[0].reason);
        return records
          .reduce((acc, result) => (result.status === "fulfilled" ? [...acc, ...result.value] : acc), [])
          .map((addr) => ({
            host: addr,
            port: +this.port,
          }));
      }
      return (
        await dns_1.promises.lookup(hostname, {
          all: true,
        })
      ).map((addr) => ({
        host: addr.address,
        port: +this.port,
      }));
    }
    async resolveTxt(hostname) {
      if (environment_1.GRPC_NODE_USE_ALTERNATIVE_RESOLVER) {
        trace("Using alternative DNS resolver.");
        return this.alternativeResolver.resolveTxt(hostname);
      }
      return dns_1.promises.resolveTxt(hostname);
    }
    startNextResolutionTimer() {
      var _a;
      var _b;
      clearTimeout(this.nextResolutionTimer);
      this.nextResolutionTimer = setTimeout(() => {
        this.stopNextResolutionTimer();
        if (this.continueResolving) this.startResolutionWithBackoff();
      }, this.minTimeBetweenResolutionsMs);
      if (!((_b = (_a = this.nextResolutionTimer).unref) === null || _b === undefined)) _b.call(_a);
      this.isNextResolutionTimerRunning = true;
    }
    stopNextResolutionTimer() {
      clearTimeout(this.nextResolutionTimer);
      this.isNextResolutionTimerRunning = false;
    }
    startResolutionWithBackoff() {
      if (this.pendingLookupPromise === null) {
        this.continueResolving = false;
        this.backoff.runOnce();
        this.startNextResolutionTimer();
        this.startResolution();
      }
    }
    updateResolution() {
      if (this.pendingLookupPromise === null)
        if (this.isNextResolutionTimerRunning || this.backoff.isRunning()) {
          if (this.isNextResolutionTimerRunning)
            trace('resolution update delayed by "min time between resolutions" rate limit');
          else
            trace(
              "resolution update delayed by backoff timer until " + this.backoff.getEndTime().toISOString(),
            );
          this.continueResolving = true;
        } else this.startResolutionWithBackoff();
    }
    destroy() {
      this.continueResolving = false;
      this.backoff.reset();
      this.backoff.stop();
      this.stopNextResolutionTimer();
      this.pendingLookupPromise = null;
      this.pendingTxtPromise = null;
      this.latestLookupResult = null;
      this.latestServiceConfigResult = null;
      this.returnedIpResult = false;
    }
    static getDefaultAuthority(target) {
      return target.path;
    }
  }
  function setup() {
    resolver_1.registerResolver("dns", DnsResolver);
    resolver_1.registerDefaultScheme("dns");
  }
});
export { require_resolver_dns };
