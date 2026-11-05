/**
 * @aws-sdk/util-endpoints/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/util-endpoints@3.936.0..3.953.0
 * pieces: chunk-3p78mpxm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_index_browser as require_index_browser_3 } from "../../../@smithy/core/dist-cjs/submodules/endpoints/index.browser.js";
import { require_url_parser } from "../../../@smithy/url-parser/dist-cjs/index.js";

//@ chunk-3p78mpxm.js:5421-12143 cjs-fingerprint
var require_util_endpoints = __commonJS(function (cjsExports) {
  var utilEndpoints = require_index_browser_3();
  var urlParser = require_url_parser();
  var isVirtualHostableS3Bucket = (value, allowSubDomains = false) => {
    if (allowSubDomains) {
      for (let label of value.split(".")) if (!isVirtualHostableS3Bucket(label)) return false;
      return true;
    }
    if (!utilEndpoints.isValidHostLabel(value)) return false;
    if (value.length < 3 || value.length > 63) return false;
    if (value !== value.toLowerCase()) return false;
    if (utilEndpoints.isIpAddress(value)) return false;
    return true;
  };
  var ARN_DELIMITER = ":";
  var RESOURCE_DELIMITER = "/";
  var parseArn = (value) => {
    let segments = value.split(ARN_DELIMITER);
    if (segments.length < 6) return null;
    let [arn, partition, service, region, accountId, ...resourcePath] = segments;
    if (arn !== "arn" || partition === "" || service === "" || resourcePath.join(ARN_DELIMITER) === "")
      return null;
    let resourceId = resourcePath.map((resource) => resource.split(RESOURCE_DELIMITER)).flat();
    return {
      partition,
      service,
      region,
      accountId,
      resourceId,
    };
  };
  var partitions = [
    {
      id: "aws",
      outputs: {
        dnsSuffix: "amazonaws.com",
        dualStackDnsSuffix: "api.aws",
        implicitGlobalRegion: "us-east-1",
        name: "aws",
        supportsDualStack: true,
        supportsFIPS: true,
      },
      regionRegex: "^(us|eu|ap|sa|ca|me|af|il|mx)\\-\\w+\\-\\d+$",
      regions: {
        "af-south-1": {
          description: "Africa (Cape Town)",
        },
        "ap-east-1": {
          description: "Asia Pacific (Hong Kong)",
        },
        "ap-east-2": {
          description: "Asia Pacific (Taipei)",
        },
        "ap-northeast-1": {
          description: "Asia Pacific (Tokyo)",
        },
        "ap-northeast-2": {
          description: "Asia Pacific (Seoul)",
        },
        "ap-northeast-3": {
          description: "Asia Pacific (Osaka)",
        },
        "ap-south-1": {
          description: "Asia Pacific (Mumbai)",
        },
        "ap-south-2": {
          description: "Asia Pacific (Hyderabad)",
        },
        "ap-southeast-1": {
          description: "Asia Pacific (Singapore)",
        },
        "ap-southeast-2": {
          description: "Asia Pacific (Sydney)",
        },
        "ap-southeast-3": {
          description: "Asia Pacific (Jakarta)",
        },
        "ap-southeast-4": {
          description: "Asia Pacific (Melbourne)",
        },
        "ap-southeast-5": {
          description: "Asia Pacific (Malaysia)",
        },
        "ap-southeast-6": {
          description: "Asia Pacific (New Zealand)",
        },
        "ap-southeast-7": {
          description: "Asia Pacific (Thailand)",
        },
        "aws-global": {
          description: "aws global region",
        },
        "ca-central-1": {
          description: "Canada (Central)",
        },
        "ca-west-1": {
          description: "Canada West (Calgary)",
        },
        "eu-central-1": {
          description: "Europe (Frankfurt)",
        },
        "eu-central-2": {
          description: "Europe (Zurich)",
        },
        "eu-north-1": {
          description: "Europe (Stockholm)",
        },
        "eu-south-1": {
          description: "Europe (Milan)",
        },
        "eu-south-2": {
          description: "Europe (Spain)",
        },
        "eu-west-1": {
          description: "Europe (Ireland)",
        },
        "eu-west-2": {
          description: "Europe (London)",
        },
        "eu-west-3": {
          description: "Europe (Paris)",
        },
        "il-central-1": {
          description: "Israel (Tel Aviv)",
        },
        "me-central-1": {
          description: "Middle East (UAE)",
        },
        "me-south-1": {
          description: "Middle East (Bahrain)",
        },
        "mx-central-1": {
          description: "Mexico (Central)",
        },
        "sa-east-1": {
          description: "South America (Sao Paulo)",
        },
        "us-east-1": {
          description: "US East (N. Virginia)",
        },
        "us-east-2": {
          description: "US East (Ohio)",
        },
        "us-west-1": {
          description: "US West (N. California)",
        },
        "us-west-2": {
          description: "US West (Oregon)",
        },
      },
    },
    {
      id: "aws-cn",
      outputs: {
        dnsSuffix: "amazonaws.com.cn",
        dualStackDnsSuffix: "api.amazonwebservices.com.cn",
        implicitGlobalRegion: "cn-northwest-1",
        name: "aws-cn",
        supportsDualStack: true,
        supportsFIPS: true,
      },
      regionRegex: "^cn\\-\\w+\\-\\d+$",
      regions: {
        "aws-cn-global": {
          description: "aws-cn global region",
        },
        "cn-north-1": {
          description: "China (Beijing)",
        },
        "cn-northwest-1": {
          description: "China (Ningxia)",
        },
      },
    },
    {
      id: "aws-eusc",
      outputs: {
        dnsSuffix: "amazonaws.eu",
        dualStackDnsSuffix: "api.amazonwebservices.eu",
        implicitGlobalRegion: "eusc-de-east-1",
        name: "aws-eusc",
        supportsDualStack: true,
        supportsFIPS: true,
      },
      regionRegex: "^eusc\\-(de)\\-\\w+\\-\\d+$",
      regions: {
        "eusc-de-east-1": {
          description: "EU (Germany)",
        },
      },
    },
    {
      id: "aws-iso",
      outputs: {
        dnsSuffix: "c2s.ic.gov",
        dualStackDnsSuffix: "api.aws.ic.gov",
        implicitGlobalRegion: "us-iso-east-1",
        name: "aws-iso",
        supportsDualStack: true,
        supportsFIPS: true,
      },
      regionRegex: "^us\\-iso\\-\\w+\\-\\d+$",
      regions: {
        "aws-iso-global": {
          description: "aws-iso global region",
        },
        "us-iso-east-1": {
          description: "US ISO East",
        },
        "us-iso-west-1": {
          description: "US ISO WEST",
        },
      },
    },
    {
      id: "aws-iso-b",
      outputs: {
        dnsSuffix: "sc2s.sgov.gov",
        dualStackDnsSuffix: "api.aws.scloud",
        implicitGlobalRegion: "us-isob-east-1",
        name: "aws-iso-b",
        supportsDualStack: true,
        supportsFIPS: true,
      },
      regionRegex: "^us\\-isob\\-\\w+\\-\\d+$",
      regions: {
        "aws-iso-b-global": {
          description: "aws-iso-b global region",
        },
        "us-isob-east-1": {
          description: "US ISOB East (Ohio)",
        },
        "us-isob-west-1": {
          description: "US ISOB West",
        },
      },
    },
    {
      id: "aws-iso-e",
      outputs: {
        dnsSuffix: "cloud.adc-e.uk",
        dualStackDnsSuffix: "api.cloud-aws.adc-e.uk",
        implicitGlobalRegion: "eu-isoe-west-1",
        name: "aws-iso-e",
        supportsDualStack: true,
        supportsFIPS: true,
      },
      regionRegex: "^eu\\-isoe\\-\\w+\\-\\d+$",
      regions: {
        "aws-iso-e-global": {
          description: "aws-iso-e global region",
        },
        "eu-isoe-west-1": {
          description: "EU ISOE West",
        },
      },
    },
    {
      id: "aws-iso-f",
      outputs: {
        dnsSuffix: "csp.hci.ic.gov",
        dualStackDnsSuffix: "api.aws.hci.ic.gov",
        implicitGlobalRegion: "us-isof-south-1",
        name: "aws-iso-f",
        supportsDualStack: true,
        supportsFIPS: true,
      },
      regionRegex: "^us\\-isof\\-\\w+\\-\\d+$",
      regions: {
        "aws-iso-f-global": {
          description: "aws-iso-f global region",
        },
        "us-isof-east-1": {
          description: "US ISOF EAST",
        },
        "us-isof-south-1": {
          description: "US ISOF SOUTH",
        },
      },
    },
    {
      id: "aws-us-gov",
      outputs: {
        dnsSuffix: "amazonaws.com",
        dualStackDnsSuffix: "api.aws",
        implicitGlobalRegion: "us-gov-west-1",
        name: "aws-us-gov",
        supportsDualStack: true,
        supportsFIPS: true,
      },
      regionRegex: "^us\\-gov\\-\\w+\\-\\d+$",
      regions: {
        "aws-us-gov-global": {
          description: "aws-us-gov global region",
        },
        "us-gov-east-1": {
          description: "AWS GovCloud (US-East)",
        },
        "us-gov-west-1": {
          description: "AWS GovCloud (US-West)",
        },
      },
    },
  ];
  var version = "1.1";
  var partitionsInfo = {
    partitions,
    version,
  };
  var selectedPartitionsInfo = partitionsInfo;
  var selectedUserAgentPrefix = "";
  var partition = (value) => {
    let { partitions } = selectedPartitionsInfo;
    for (let partition of partitions) {
      let { regions, outputs } = partition;
      for (let [region, regionData] of Object.entries(regions))
        if (region === value)
          return {
            ...outputs,
            ...regionData,
          };
    }
    for (let partition of partitions) {
      let { regionRegex, outputs } = partition;
      if (new RegExp(regionRegex).test(value))
        return {
          ...outputs,
        };
    }
    let DEFAULT_PARTITION = partitions.find((partition) => partition.id === "aws");
    if (!DEFAULT_PARTITION)
      throw Error(
        "Provided region was not found in the partition array or regex, and default partition with id 'aws' doesn't exist.",
      );
    return {
      ...DEFAULT_PARTITION.outputs,
    };
  };
  var setPartitionInfo = (partitionsInfo, userAgentPrefix = "") => {
    selectedPartitionsInfo = partitionsInfo;
    selectedUserAgentPrefix = userAgentPrefix;
  };
  var useDefaultPartitionInfo = () => {
    setPartitionInfo(partitionsInfo, "");
  };
  var getUserAgentPrefix = () => selectedUserAgentPrefix;
  var awsEndpointFunctions = {
    isVirtualHostableS3Bucket,
    parseArn,
    partition,
  };
  utilEndpoints.customEndpointFunctions.aws = awsEndpointFunctions;
  var resolveDefaultAwsRegionalEndpointsConfig = (input) => {
    if (typeof input.endpointProvider !== "function")
      throw Error(
        "@aws-sdk/util-endpoint - endpointProvider and endpoint missing in config for this client.",
      );
    let { endpoint } = input;
    if (endpoint === undefined)
      input.endpoint = async () =>
        toEndpointV1(
          input.endpointProvider(
            {
              Region: typeof input.region === "function" ? await input.region() : input.region,
              UseDualStack:
                typeof input.useDualstackEndpoint === "function"
                  ? await input.useDualstackEndpoint()
                  : input.useDualstackEndpoint,
              UseFIPS:
                typeof input.useFipsEndpoint === "function"
                  ? await input.useFipsEndpoint()
                  : input.useFipsEndpoint,
              Endpoint: undefined,
            },
            {
              logger: input.logger,
            },
          ),
        );
    return input;
  };
  var toEndpointV1 = (endpoint) => urlParser.parseUrl(endpoint.url);
  Object.defineProperty(cjsExports, "EndpointError", {
    enumerable: true,
    get: function () {
      return utilEndpoints.EndpointError;
    },
  });
  Object.defineProperty(cjsExports, "isIpAddress", {
    enumerable: true,
    get: function () {
      return utilEndpoints.isIpAddress;
    },
  });
  Object.defineProperty(cjsExports, "resolveEndpoint", {
    enumerable: true,
    get: function () {
      return utilEndpoints.resolveEndpoint;
    },
  });
  cjsExports.awsEndpointFunctions = awsEndpointFunctions;
  cjsExports.getUserAgentPrefix = getUserAgentPrefix;
  cjsExports.partition = partition;
  cjsExports.resolveDefaultAwsRegionalEndpointsConfig = resolveDefaultAwsRegionalEndpointsConfig;
  cjsExports.setPartitionInfo = setPartitionInfo;
  cjsExports.toEndpointV1 = toEndpointV1;
  cjsExports.useDefaultPartitionInfo = useDefaultPartitionInfo;
});
export { require_util_endpoints };
