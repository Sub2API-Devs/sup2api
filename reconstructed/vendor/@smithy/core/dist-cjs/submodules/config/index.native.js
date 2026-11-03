/**
 * @smithy/core/dist-cjs/submodules/config/index.native.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/core@3.30.0
 * pieces: chunk-a3vzsfpr.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { v } from "../../../../../unresolved-cjs/index.js";
import { bD } from "../../../../util-middleware/dist-cjs/index.js";
import { YJ } from "../endpoints/index.browser.js";

//@ chunk-a3vzsfpr.js:7701-11897 cjs-fingerprint
var dR = x(function (Be) {
  var f = v(),
    _ = bD(),
    De = YJ(),
    W = "AWS_USE_DUALSTACK_ENDPOINT",
    K = "use_dualstack_endpoint",
    be = !1,
    Ce = {
      environmentVariableSelector: (e) => f.booleanSelector(e, W, f.SelectorType.ENV),
      configFileSelector: (e) => f.booleanSelector(e, K, f.SelectorType.CONFIG),
      default: !1,
    },
    j = "AWS_USE_FIPS_ENDPOINT",
    M = "use_fips_endpoint",
    Fe = !1,
    ye = {
      environmentVariableSelector: (e) => f.booleanSelector(e, j, f.SelectorType.ENV),
      configFileSelector: (e) => f.booleanSelector(e, M, f.SelectorType.CONFIG),
      default: !1,
    },
    Le = (e) => {
      let {
        tls: tls,
        endpoint: endpoint,
        urlParser: urlParser,
        useDualstackEndpoint: useDualstackEndpoint,
      } = e;
      return Object.assign(e, {
        tls: tls ?? !0,
        endpoint: _.normalizeProvider(typeof endpoint === "string" ? urlParser(endpoint) : endpoint),
        isCustomEndpoint: !0,
        useDualstackEndpoint: _.normalizeProvider(useDualstackEndpoint ?? !1),
      });
    },
    Ge = async (e) => {
      let { tls: tls = !0 } = e,
        region = await e.region();
      if (!new RegExp(/^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])$/).test(region))
        throw Error("Invalid region in client config");
      let useDualstackEndpoint = await e.useDualstackEndpoint(),
        useFipsEndpoint = await e.useFipsEndpoint(),
        { hostname: hostname } =
          (await e.regionInfoProvider(region, {
            useDualstackEndpoint: useDualstackEndpoint,
            useFipsEndpoint: useFipsEndpoint,
          })) ?? {};
      if (!hostname) throw Error("Cannot resolve hostname from client config");
      return e.urlParser(`${tls ? "https:" : "http:"}//${hostname}`);
    },
    Ve = (e) => {
      let normalizeProvider = _.normalizeProvider(e.useDualstackEndpoint ?? !1),
        { endpoint: endpoint, useFipsEndpoint: useFipsEndpoint, urlParser: urlParser, tls: tls } = e;
      return Object.assign(e, {
        tls: tls ?? !0,
        endpoint: endpoint
          ? _.normalizeProvider(typeof endpoint === "string" ? urlParser(endpoint) : endpoint)
          : () => Ge({ ...e, useDualstackEndpoint: normalizeProvider, useFipsEndpoint: useFipsEndpoint }),
        isCustomEndpoint: !!endpoint,
        useDualstackEndpoint: normalizeProvider,
      });
    },
    H = "AWS_REGION",
    Z = "region",
    ze = {
      environmentVariableSelector: (e) => e[H],
      configFileSelector: (e) => e[Z],
      default: () => {
        throw Error("Region is missing");
      },
    },
    ke = { preferredFile: "credentials" },
    k = new Set(),
    qe = (e, n = De.isValidHostLabel) => {
      if (!k.has(e) && !n(e))
        if (e === "*")
          console.warn(
            '@smithy/config-resolver WARN - Please use the caller region instead of "*". See "sigv4a" in https://github.com/aws/aws-sdk-js-v3/blob/main/supplemental-docs/CLIENTS.md.',
          );
        else throw Error(`Region not accepted: region="${e}" is not a valid hostname component.`);
      else k.add(e);
    },
    B = (e) => typeof e === "string" && (e.startsWith("fips-") || e.endsWith("-fips")),
    We = (e) =>
      B(e)
        ? ["fips-aws-global", "aws-fips"].includes(e)
          ? "us-east-1"
          : e.replace(/fips-(dkr-|prod-)?|-fips/, "")
        : e,
    Ke = (e) => {
      let { region: region, useFipsEndpoint: useFipsEndpoint } = e;
      if (!region) throw Error("Region is missing");
      return Object.assign(e, {
        region: async () => {
          let r = typeof region === "function" ? await region() : region,
            s = We(r);
          return (qe(s), s);
        },
        useFipsEndpoint: async () => {
          let r = typeof region === "string" ? region : await region();
          if (B(r)) return !0;
          return typeof useFipsEndpoint !== "function"
            ? Promise.resolve(!!useFipsEndpoint)
            : useFipsEndpoint();
        },
      });
    },
    q = (e = [], { useFipsEndpoint: useFipsEndpoint, useDualstackEndpoint: useDualstackEndpoint }) =>
      e.find(
        ({ tags: tags }) =>
          useFipsEndpoint === tags.includes("fips") && useDualstackEndpoint === tags.includes("dualstack"),
      )?.hostname,
    je = (e, { regionHostname: regionHostname, partitionHostname: partitionHostname }) =>
      regionHostname ? regionHostname : partitionHostname ? partitionHostname.replace("{region}", e) : void 0,
    Me = (e, { partitionHash: partitionHash }) =>
      Object.keys(partitionHash || {}).find((t) => partitionHash[t].regions.includes(e)) ?? "aws",
    He = (
      e,
      { signingRegion: signingRegion, regionRegex: regionRegex, useFipsEndpoint: useFipsEndpoint },
    ) => {
      if (signingRegion) return signingRegion;
      else if (useFipsEndpoint) {
        let replaced = regionRegex.replace("\\\\", "\\").replace(/^\^/g, "\\.").replace(/\$$/g, "\\."),
          match = e.match(replaced);
        if (match) return match[0].slice(1, -1);
      }
    },
    Ze = (
      e,
      {
        useFipsEndpoint: useFipsEndpoint = !1,
        useDualstackEndpoint: useDualstackEndpoint = !1,
        signingService: signingService,
        regionHash: regionHash,
        partitionHash: partitionHash,
      },
    ) => {
      let i = Me(e, { partitionHash: partitionHash }),
        a = e in regionHash ? e : (partitionHash[i]?.endpoint ?? e),
        l = { useFipsEndpoint: useFipsEndpoint, useDualstackEndpoint: useDualstackEndpoint },
        c = q(regionHash[a]?.variants, l),
        g = q(partitionHash[i]?.variants, l),
        p = je(a, { regionHostname: c, partitionHostname: g });
      if (p === void 0)
        throw Error(
          `Endpoint resolution failed for: ${{ resolvedRegion: a, useFipsEndpoint: useFipsEndpoint, useDualstackEndpoint: useDualstackEndpoint }}`,
        );
      let E = He(p, {
        signingRegion: regionHash[a]?.signingRegion,
        regionRegex: partitionHash[i].regionRegex,
        useFipsEndpoint: useFipsEndpoint,
      });
      return {
        partition: i,
        signingService: signingService,
        hostname: p,
        ...(E && { signingRegion: E }),
        ...(regionHash[a]?.signingService && { signingService: regionHash[a].signingService }),
      };
    };
  Be.CONFIG_USE_DUALSTACK_ENDPOINT = K;
  Be.CONFIG_USE_FIPS_ENDPOINT = M;
  Be.DEFAULT_USE_DUALSTACK_ENDPOINT = be;
  Be.DEFAULT_USE_FIPS_ENDPOINT = Fe;
  Be.ENV_USE_DUALSTACK_ENDPOINT = W;
  Be.ENV_USE_FIPS_ENDPOINT = j;
  Be.NODE_REGION_CONFIG_FILE_OPTIONS = ke;
  Be.NODE_REGION_CONFIG_OPTIONS = ze;
  Be.NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS = Ce;
  Be.NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS = ye;
  Be.REGION_ENV_NAME = H;
  Be.REGION_INI_NAME = Z;
  Be.getRegionInfo = Ze;
  Be.resolveCustomEndpointsConfig = Le;
  Be.resolveEndpointsConfig = Ve;
  Be.resolveRegionConfig = Ke;
});

export { dR };
