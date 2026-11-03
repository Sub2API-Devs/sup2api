/**
 * @aws-sdk/util-endpoints/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/util-endpoints@3.936.0..3.953.0
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { YJ } from "../../../@smithy/core/dist-cjs/submodules/endpoints/index.browser.js";
import { P4 } from "../../../@smithy/url-parser/dist-cjs/index.js";

//@ chunk-edce4vxq.js:5421-12143 cjs-fingerprint
var Iae = x(function (We) {
  var Ce = YJ(),
    _o = P4(),
    Wr = (e, t = !1) => {
      if (t) {
        for (let r of e.split(".")) if (!Wr(r)) return !1;
        return !0;
      }
      if (!Ce.isValidHostLabel(e)) return !1;
      if (e.length < 3 || e.length > 63) return !1;
      if (e !== e.toLowerCase()) return !1;
      if (Ce.isIpAddress(e)) return !1;
      return !0;
    },
    Xr = ":",
    Co = "/",
    Ao = (e) => {
      let parts = e.split(Xr);
      if (parts.length < 6) return null;
      let [r, s, o, a, c, ...d] = parts;
      if (r !== "arn" || s === "" || o === "" || d.join(Xr) === "") return null;
      let flat = d.map((m) => m.split(Co)).flat();
      return { partition: s, service: o, region: a, accountId: c, resourceId: flat };
    },
    Ro = [
      {
        id: "aws",
        outputs: {
          dnsSuffix: "amazonaws.com",
          dualStackDnsSuffix: "api.aws",
          implicitGlobalRegion: "us-east-1",
          name: "aws",
          supportsDualStack: !0,
          supportsFIPS: !0,
        },
        regionRegex: "^(us|eu|ap|sa|ca|me|af|il|mx)\\-\\w+\\-\\d+$",
        regions: {
          "af-south-1": { description: "Africa (Cape Town)" },
          "ap-east-1": { description: "Asia Pacific (Hong Kong)" },
          "ap-east-2": { description: "Asia Pacific (Taipei)" },
          "ap-northeast-1": { description: "Asia Pacific (Tokyo)" },
          "ap-northeast-2": { description: "Asia Pacific (Seoul)" },
          "ap-northeast-3": { description: "Asia Pacific (Osaka)" },
          "ap-south-1": { description: "Asia Pacific (Mumbai)" },
          "ap-south-2": { description: "Asia Pacific (Hyderabad)" },
          "ap-southeast-1": { description: "Asia Pacific (Singapore)" },
          "ap-southeast-2": { description: "Asia Pacific (Sydney)" },
          "ap-southeast-3": { description: "Asia Pacific (Jakarta)" },
          "ap-southeast-4": { description: "Asia Pacific (Melbourne)" },
          "ap-southeast-5": { description: "Asia Pacific (Malaysia)" },
          "ap-southeast-6": { description: "Asia Pacific (New Zealand)" },
          "ap-southeast-7": { description: "Asia Pacific (Thailand)" },
          "aws-global": { description: "aws global region" },
          "ca-central-1": { description: "Canada (Central)" },
          "ca-west-1": { description: "Canada West (Calgary)" },
          "eu-central-1": { description: "Europe (Frankfurt)" },
          "eu-central-2": { description: "Europe (Zurich)" },
          "eu-north-1": { description: "Europe (Stockholm)" },
          "eu-south-1": { description: "Europe (Milan)" },
          "eu-south-2": { description: "Europe (Spain)" },
          "eu-west-1": { description: "Europe (Ireland)" },
          "eu-west-2": { description: "Europe (London)" },
          "eu-west-3": { description: "Europe (Paris)" },
          "il-central-1": { description: "Israel (Tel Aviv)" },
          "me-central-1": { description: "Middle East (UAE)" },
          "me-south-1": { description: "Middle East (Bahrain)" },
          "mx-central-1": { description: "Mexico (Central)" },
          "sa-east-1": { description: "South America (Sao Paulo)" },
          "us-east-1": { description: "US East (N. Virginia)" },
          "us-east-2": { description: "US East (Ohio)" },
          "us-west-1": { description: "US West (N. California)" },
          "us-west-2": { description: "US West (Oregon)" },
        },
      },
      {
        id: "aws-cn",
        outputs: {
          dnsSuffix: "amazonaws.com.cn",
          dualStackDnsSuffix: "api.amazonwebservices.com.cn",
          implicitGlobalRegion: "cn-northwest-1",
          name: "aws-cn",
          supportsDualStack: !0,
          supportsFIPS: !0,
        },
        regionRegex: "^cn\\-\\w+\\-\\d+$",
        regions: {
          "aws-cn-global": { description: "aws-cn global region" },
          "cn-north-1": { description: "China (Beijing)" },
          "cn-northwest-1": { description: "China (Ningxia)" },
        },
      },
      {
        id: "aws-eusc",
        outputs: {
          dnsSuffix: "amazonaws.eu",
          dualStackDnsSuffix: "api.amazonwebservices.eu",
          implicitGlobalRegion: "eusc-de-east-1",
          name: "aws-eusc",
          supportsDualStack: !0,
          supportsFIPS: !0,
        },
        regionRegex: "^eusc\\-(de)\\-\\w+\\-\\d+$",
        regions: { "eusc-de-east-1": { description: "EU (Germany)" } },
      },
      {
        id: "aws-iso",
        outputs: {
          dnsSuffix: "c2s.ic.gov",
          dualStackDnsSuffix: "api.aws.ic.gov",
          implicitGlobalRegion: "us-iso-east-1",
          name: "aws-iso",
          supportsDualStack: !0,
          supportsFIPS: !0,
        },
        regionRegex: "^us\\-iso\\-\\w+\\-\\d+$",
        regions: {
          "aws-iso-global": { description: "aws-iso global region" },
          "us-iso-east-1": { description: "US ISO East" },
          "us-iso-west-1": { description: "US ISO WEST" },
        },
      },
      {
        id: "aws-iso-b",
        outputs: {
          dnsSuffix: "sc2s.sgov.gov",
          dualStackDnsSuffix: "api.aws.scloud",
          implicitGlobalRegion: "us-isob-east-1",
          name: "aws-iso-b",
          supportsDualStack: !0,
          supportsFIPS: !0,
        },
        regionRegex: "^us\\-isob\\-\\w+\\-\\d+$",
        regions: {
          "aws-iso-b-global": { description: "aws-iso-b global region" },
          "us-isob-east-1": { description: "US ISOB East (Ohio)" },
          "us-isob-west-1": { description: "US ISOB West" },
        },
      },
      {
        id: "aws-iso-e",
        outputs: {
          dnsSuffix: "cloud.adc-e.uk",
          dualStackDnsSuffix: "api.cloud-aws.adc-e.uk",
          implicitGlobalRegion: "eu-isoe-west-1",
          name: "aws-iso-e",
          supportsDualStack: !0,
          supportsFIPS: !0,
        },
        regionRegex: "^eu\\-isoe\\-\\w+\\-\\d+$",
        regions: {
          "aws-iso-e-global": { description: "aws-iso-e global region" },
          "eu-isoe-west-1": { description: "EU ISOE West" },
        },
      },
      {
        id: "aws-iso-f",
        outputs: {
          dnsSuffix: "csp.hci.ic.gov",
          dualStackDnsSuffix: "api.aws.hci.ic.gov",
          implicitGlobalRegion: "us-isof-south-1",
          name: "aws-iso-f",
          supportsDualStack: !0,
          supportsFIPS: !0,
        },
        regionRegex: "^us\\-isof\\-\\w+\\-\\d+$",
        regions: {
          "aws-iso-f-global": { description: "aws-iso-f global region" },
          "us-isof-east-1": { description: "US ISOF EAST" },
          "us-isof-south-1": { description: "US ISOF SOUTH" },
        },
      },
      {
        id: "aws-us-gov",
        outputs: {
          dnsSuffix: "amazonaws.com",
          dualStackDnsSuffix: "api.aws",
          implicitGlobalRegion: "us-gov-west-1",
          name: "aws-us-gov",
          supportsDualStack: !0,
          supportsFIPS: !0,
        },
        regionRegex: "^us\\-gov\\-\\w+\\-\\d+$",
        regions: {
          "aws-us-gov-global": { description: "aws-us-gov global region" },
          "us-gov-east-1": { description: "AWS GovCloud (US-East)" },
          "us-gov-west-1": { description: "AWS GovCloud (US-West)" },
        },
      },
    ],
    Io = "1.1",
    Kr = { partitions: Ro, version: Io },
    Qr = Kr,
    Yr = "",
    Jr = (e) => {
      let { partitions: partitions } = Qr;
      for (let s of partitions) {
        let { regions: regions, outputs: outputs } = s;
        for (let [c, d] of Object.entries(regions)) if (c === e) return { ...outputs, ...d };
      }
      for (let s of partitions) {
        let { regionRegex: regionRegex, outputs: outputs } = s;
        if (new RegExp(regionRegex).test(e)) return { ...outputs };
      }
      let found = partitions.find((s) => s.id === "aws");
      if (!found)
        throw Error(
          "Provided region was not found in the partition array or regex, and default partition with id 'aws' doesn't exist.",
        );
      return { ...found.outputs };
    },
    Zr = (e, t = "") => {
      ((Qr = e), (Yr = t));
    },
    Oo = () => {
      Zr(Kr, "");
    },
    Mo = () => Yr,
    es = { isVirtualHostableS3Bucket: Wr, parseArn: Ao, partition: Jr };
  Ce.customEndpointFunctions.aws = es;
  var Do = (e) => {
      if (typeof e.endpointProvider !== "function")
        throw Error(
          "@aws-sdk/util-endpoint - endpointProvider and endpoint missing in config for this client.",
        );
      let { endpoint: endpoint } = e;
      if (endpoint === void 0)
        e.endpoint = async () =>
          ts(
            e.endpointProvider(
              {
                Region: typeof e.region === "function" ? await e.region() : e.region,
                UseDualStack:
                  typeof e.useDualstackEndpoint === "function"
                    ? await e.useDualstackEndpoint()
                    : e.useDualstackEndpoint,
                UseFIPS:
                  typeof e.useFipsEndpoint === "function" ? await e.useFipsEndpoint() : e.useFipsEndpoint,
                Endpoint: void 0,
              },
              { logger: e.logger },
            ),
          );
      return e;
    },
    ts = (e) => _o.parseUrl(e.url);
  Object.defineProperty(We, "EndpointError", {
    enumerable: !0,
    get: function () {
      return Ce.EndpointError;
    },
  });
  Object.defineProperty(We, "isIpAddress", {
    enumerable: !0,
    get: function () {
      return Ce.isIpAddress;
    },
  });
  Object.defineProperty(We, "resolveEndpoint", {
    enumerable: !0,
    get: function () {
      return Ce.resolveEndpoint;
    },
  });
  We.awsEndpointFunctions = es;
  We.getUserAgentPrefix = Mo;
  We.partition = Jr;
  We.resolveDefaultAwsRegionalEndpointsConfig = Do;
  We.setPartitionInfo = Zr;
  We.toEndpointV1 = ts;
  We.useDefaultPartitionInfo = Oo;
});

export { Iae };
