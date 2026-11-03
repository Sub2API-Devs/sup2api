/**
 * @smithy/core/dist-cjs/submodules/config/index.native.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/core@3.30.0
 * pieces: chunk-a3vzsfpr.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { v } from "../../../../../unresolved-cjs/index.js";
import { require_util_middleware } from "../../../../util-middleware/dist-cjs/index.js";
import { require_index_browser } from "../endpoints/index.browser.js";

//@ chunk-a3vzsfpr.js:7701-11897 cjs-fingerprint
var require_index_native = x(function (cjsExports) {
  var f = v();
  var normalizeProvider = require_util_middleware();
  var isValidHostLabel = require_index_browser();
  var W = "AWS_USE_DUALSTACK_ENDPOINT";
  var K = "use_dualstack_endpoint";
  var DEFAULT_USE_DUALSTACK_ENDPOINT = false;
  var NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS = {
    environmentVariableSelector: (e) => f.booleanSelector(e, W, f.SelectorType.ENV),
    configFileSelector: (e) => f.booleanSelector(e, K, f.SelectorType.CONFIG),
    default: false,
  };
  var j = "AWS_USE_FIPS_ENDPOINT";
  var M = "use_fips_endpoint";
  var DEFAULT_USE_FIPS_ENDPOINT = false;
  var NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS = {
    environmentVariableSelector: (e) => f.booleanSelector(e, j, f.SelectorType.ENV),
    configFileSelector: (e) => f.booleanSelector(e, M, f.SelectorType.CONFIG),
    default: false,
  };
  var resolveDefaultsModeConfig = (input) => {
    let { tls, endpoint, urlParser, useDualstackEndpoint } = input;
    return Object.assign(input, {
      tls: tls ?? true,
      endpoint: normalizeProvider.normalizeProvider(
        typeof endpoint === "string" ? urlParser(endpoint) : endpoint,
      ),
      isCustomEndpoint: true,
      useDualstackEndpoint: normalizeProvider.normalizeProvider(useDualstackEndpoint ?? false),
    });
  };
  var getEndpointFromRegion = async (input) => {
    let { tls = true } = input;
    let region = await input.region();
    if (!new RegExp(/^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])$/).test(region))
      throw Error("Invalid region in client config");
    let useDualstackEndpoint = await input.useDualstackEndpoint();
    let useFipsEndpoint = await input.useFipsEndpoint();
    let { hostname } =
      (await input.regionInfoProvider(region, {
        useDualstackEndpoint,
        useFipsEndpoint,
      })) ?? {};
    if (!hostname) throw Error("Cannot resolve hostname from client config");
    return input.urlParser(`${tls ? "https:" : "http:"}//${hostname}`);
  };
  var resolveEndpointsConfig = (input) => {
    let useDualstackEndpoint = normalizeProvider.normalizeProvider(input.useDualstackEndpoint ?? false);
    let { endpoint, useFipsEndpoint, urlParser, tls } = input;
    return Object.assign(input, {
      tls: tls ?? true,
      endpoint: endpoint
        ? normalizeProvider.normalizeProvider(typeof endpoint === "string" ? urlParser(endpoint) : endpoint)
        : () =>
            getEndpointFromRegion({
              ...input,
              useDualstackEndpoint,
              useFipsEndpoint,
            }),
      isCustomEndpoint: !!endpoint,
      useDualstackEndpoint,
    });
  };
  var H = "AWS_REGION";
  var Z = "region";
  var NODE_REGION_CONFIG_OPTIONS = {
    environmentVariableSelector: (e) => e[H],
    configFileSelector: (e) => e[Z],
    default: () => {
      throw Error("Region is missing");
    },
  };
  var NODE_REGION_CONFIG_FILE_OPTIONS = {
    preferredFile: "credentials",
  };
  var validRegions = new Set();
  var checkRegion = (region, check = isValidHostLabel.isValidHostLabel) => {
    if (!validRegions.has(region) && !check(region)) {
      if (region === "*")
        console.warn(
          '@smithy/config-resolver WARN - Please use the caller region instead of "*". See "sigv4a" in https://github.com/aws/aws-sdk-js-v3/blob/main/supplemental-docs/CLIENTS.md.',
        );
      else throw Error(`Region not accepted: region="${region}" is not a valid hostname component.`);
    } else validRegions.add(region);
  };
  var isFipsRegion = (region) =>
    typeof region === "string" && (region.startsWith("fips-") || region.endsWith("-fips"));
  var getRealRegion = (region) =>
    isFipsRegion(region)
      ? ["fips-aws-global", "aws-fips"].includes(region)
        ? "us-east-1"
        : region.replace(/fips-(dkr-|prod-)?|-fips/, "")
      : region;
  var resolveRegionConfig = (input) => {
    let { region, useFipsEndpoint } = input;
    if (!region) throw Error("Region is missing");
    return Object.assign(input, {
      region: async () => {
        let providedRegion = typeof region === "function" ? await region() : region;
        let realRegion = getRealRegion(providedRegion);
        checkRegion(realRegion);
        return realRegion;
      },
      useFipsEndpoint: async () => {
        let providedRegion = typeof region === "string" ? region : await region();
        if (isFipsRegion(providedRegion)) return true;
        return typeof useFipsEndpoint !== "function" ? Promise.resolve(!!useFipsEndpoint) : useFipsEndpoint();
      },
    });
  };
  var getHostnameFromVariants = (variants = [], { useFipsEndpoint, useDualstackEndpoint }) =>
    variants.find(
      ({ tags }) =>
        useFipsEndpoint === tags.includes("fips") && useDualstackEndpoint === tags.includes("dualstack"),
    )?.hostname;
  var getResolvedHostname = (resolvedRegion, { regionHostname, partitionHostname }) =>
    regionHostname
      ? regionHostname
      : partitionHostname
        ? partitionHostname.replace("{region}", resolvedRegion)
        : undefined;
  var getResolvedPartition = (region, { partitionHash }) =>
    Object.keys(partitionHash || {}).find((key) => partitionHash[key].regions.includes(region)) ?? "aws";
  var getResolvedSigningRegion = (hostname, { signingRegion, regionRegex, useFipsEndpoint }) => {
    if (signingRegion) return signingRegion;
    else if (useFipsEndpoint) {
      let regionRegexJs = regionRegex.replace("\\\\", "\\").replace(/^\^/g, "\\.").replace(/\$$/g, "\\.");
      let regionRegexmatchArray = hostname.match(regionRegexJs);
      if (regionRegexmatchArray) return regionRegexmatchArray[0].slice(1, -1);
    }
  };
  var getRegionInfo = (
    region,
    { useFipsEndpoint = false, useDualstackEndpoint = false, signingService, regionHash, partitionHash },
  ) => {
    let partition = getResolvedPartition(region, {
      partitionHash,
    });
    let resolvedRegion = region in regionHash ? region : (partitionHash[partition]?.endpoint ?? region);
    let hostnameOptions = {
      useFipsEndpoint,
      useDualstackEndpoint,
    };
    let regionHostname = getHostnameFromVariants(regionHash[resolvedRegion]?.variants, hostnameOptions);
    let partitionHostname = getHostnameFromVariants(partitionHash[partition]?.variants, hostnameOptions);
    let hostname = getResolvedHostname(resolvedRegion, {
      regionHostname,
      partitionHostname,
    });
    if (hostname === undefined)
      throw Error(
        `Endpoint resolution failed for: ${{
          resolvedRegion,
          useFipsEndpoint,
          useDualstackEndpoint,
        }}`,
      );
    let signingRegion = getResolvedSigningRegion(hostname, {
      signingRegion: regionHash[resolvedRegion]?.signingRegion,
      regionRegex: partitionHash[partition].regionRegex,
      useFipsEndpoint,
    });
    return {
      partition,
      signingService,
      hostname,
      ...(signingRegion && {
        signingRegion,
      }),
      ...(regionHash[resolvedRegion]?.signingService && {
        signingService: regionHash[resolvedRegion].signingService,
      }),
    };
  };
  cjsExports.CONFIG_USE_DUALSTACK_ENDPOINT = K;
  cjsExports.CONFIG_USE_FIPS_ENDPOINT = M;
  cjsExports.DEFAULT_USE_DUALSTACK_ENDPOINT = DEFAULT_USE_DUALSTACK_ENDPOINT;
  cjsExports.DEFAULT_USE_FIPS_ENDPOINT = DEFAULT_USE_FIPS_ENDPOINT;
  cjsExports.ENV_USE_DUALSTACK_ENDPOINT = W;
  cjsExports.ENV_USE_FIPS_ENDPOINT = j;
  cjsExports.NODE_REGION_CONFIG_FILE_OPTIONS = NODE_REGION_CONFIG_FILE_OPTIONS;
  cjsExports.NODE_REGION_CONFIG_OPTIONS = NODE_REGION_CONFIG_OPTIONS;
  cjsExports.NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS = NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS;
  cjsExports.NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS = NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS;
  cjsExports.REGION_ENV_NAME = H;
  cjsExports.REGION_INI_NAME = Z;
  cjsExports.getRegionInfo = getRegionInfo;
  cjsExports.resolveCustomEndpointsConfig = resolveDefaultsModeConfig;
  cjsExports.resolveEndpointsConfig = resolveEndpointsConfig;
  cjsExports.resolveRegionConfig = resolveRegionConfig;
});
export { require_index_native };
