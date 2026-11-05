/**
 * @aws-sdk/client-sts/dist-cjs/endpoint/ruleset.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/client-sts@3.936.0..3.939.0
 * pieces: chunk-brqnbz3r.js (1)
 * attribution: cjs-require-graph 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-brqnbz3r.js:2573-6233 cjs-require-graph
var require_ruleset = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ruleSet = undefined;
  var required = "required";
  var type = "type";
  var fn = "fn";
  var argv = "argv";
  var ref = "ref";
  var FALSE = false;
  var TRUE = true;
  var booleanEquals = "booleanEquals";
  var stringEquals = "stringEquals";
  var name = "sigv4";
  var signingName = "sts";
  var usEast1 = "us-east-1";
  var endpoint = "endpoint";
  var url = "https://sts.{Region}.{PartitionResult#dnsSuffix}";
  var tree = "tree";
  var error = "error";
  var getAttr = "getAttr";
  var stringParamSchema = {
    [required]: false,
    [type]: "string",
  };
  var booleanParamSchema = {
    [required]: true,
    default: false,
    [type]: "boolean",
  };
  var endpointRef = {
    [ref]: "Endpoint",
  };
  var isSetRegionCondition = {
    [fn]: "isSet",
    [argv]: [
      {
        [ref]: "Region",
      },
    ],
  };
  var regionRef = {
    [ref]: "Region",
  };
  var awsPartitionCondition = {
    [fn]: "aws.partition",
    [argv]: [regionRef],
    assign: "PartitionResult",
  };
  var useFipsRef = {
    [ref]: "UseFIPS",
  };
  var useDualStackRef = {
    [ref]: "UseDualStack",
  };
  var globalStsEndpoint = {
    url: "https://sts.amazonaws.com",
    properties: {
      authSchemes: [
        {
          name,
          signingName,
          signingRegion: usEast1,
        },
      ],
    },
    headers: {},
  };
  var emptyObject = {};
  var awsGlobalEndpointRule = {
    conditions: [
      {
        [fn]: stringEquals,
        [argv]: [regionRef, "aws-global"],
      },
    ],
    [endpoint]: globalStsEndpoint,
    [type]: endpoint,
  };
  var useFipsEqualsTrue = {
    [fn]: booleanEquals,
    [argv]: [useFipsRef, true],
  };
  var useDualStackEqualsTrue = {
    [fn]: booleanEquals,
    [argv]: [useDualStackRef, true],
  };
  var partitionSupportsFips = {
    [fn]: getAttr,
    [argv]: [
      {
        [ref]: "PartitionResult",
      },
      "supportsFIPS",
    ],
  };
  var partitionResultRef = {
    [ref]: "PartitionResult",
  };
  var partitionSupportsDualStack = {
    [fn]: booleanEquals,
    [argv]: [
      true,
      {
        [fn]: getAttr,
        [argv]: [partitionResultRef, "supportsDualStack"],
      },
    ],
  };
  var conditionList = [
    {
      [fn]: "isSet",
      [argv]: [endpointRef],
    },
  ];
  var conditions = [useFipsEqualsTrue];
  var conditions_2 = [useDualStackEqualsTrue];
  var ruleSet = {
    version: "1.0",
    parameters: {
      Region: stringParamSchema,
      UseDualStack: booleanParamSchema,
      UseFIPS: booleanParamSchema,
      Endpoint: stringParamSchema,
      UseGlobalEndpoint: booleanParamSchema,
    },
    rules: [
      {
        conditions: [
          {
            [fn]: booleanEquals,
            [argv]: [
              {
                [ref]: "UseGlobalEndpoint",
              },
              TRUE,
            ],
          },
          {
            [fn]: "not",
            [argv]: conditionList,
          },
          isSetRegionCondition,
          awsPartitionCondition,
          {
            [fn]: booleanEquals,
            [argv]: [useFipsRef, FALSE],
          },
          {
            [fn]: booleanEquals,
            [argv]: [useDualStackRef, FALSE],
          },
        ],
        rules: [
          {
            conditions: [
              {
                [fn]: stringEquals,
                [argv]: [regionRef, "ap-northeast-1"],
              },
            ],
            endpoint: globalStsEndpoint,
            [type]: endpoint,
          },
          {
            conditions: [
              {
                [fn]: stringEquals,
                [argv]: [regionRef, "ap-south-1"],
              },
            ],
            endpoint: globalStsEndpoint,
            [type]: endpoint,
          },
          {
            conditions: [
              {
                [fn]: stringEquals,
                [argv]: [regionRef, "ap-southeast-1"],
              },
            ],
            endpoint: globalStsEndpoint,
            [type]: endpoint,
          },
          {
            conditions: [
              {
                [fn]: stringEquals,
                [argv]: [regionRef, "ap-southeast-2"],
              },
            ],
            endpoint: globalStsEndpoint,
            [type]: endpoint,
          },
          awsGlobalEndpointRule,
          {
            conditions: [
              {
                [fn]: stringEquals,
                [argv]: [regionRef, "ca-central-1"],
              },
            ],
            endpoint: globalStsEndpoint,
            [type]: endpoint,
          },
          {
            conditions: [
              {
                [fn]: stringEquals,
                [argv]: [regionRef, "eu-central-1"],
              },
            ],
            endpoint: globalStsEndpoint,
            [type]: endpoint,
          },
          {
            conditions: [
              {
                [fn]: stringEquals,
                [argv]: [regionRef, "eu-north-1"],
              },
            ],
            endpoint: globalStsEndpoint,
            [type]: endpoint,
          },
          {
            conditions: [
              {
                [fn]: stringEquals,
                [argv]: [regionRef, "eu-west-1"],
              },
            ],
            endpoint: globalStsEndpoint,
            [type]: endpoint,
          },
          {
            conditions: [
              {
                [fn]: stringEquals,
                [argv]: [regionRef, "eu-west-2"],
              },
            ],
            endpoint: globalStsEndpoint,
            [type]: endpoint,
          },
          {
            conditions: [
              {
                [fn]: stringEquals,
                [argv]: [regionRef, "eu-west-3"],
              },
            ],
            endpoint: globalStsEndpoint,
            [type]: endpoint,
          },
          {
            conditions: [
              {
                [fn]: stringEquals,
                [argv]: [regionRef, "sa-east-1"],
              },
            ],
            endpoint: globalStsEndpoint,
            [type]: endpoint,
          },
          {
            conditions: [
              {
                [fn]: stringEquals,
                [argv]: [regionRef, usEast1],
              },
            ],
            endpoint: globalStsEndpoint,
            [type]: endpoint,
          },
          {
            conditions: [
              {
                [fn]: stringEquals,
                [argv]: [regionRef, "us-east-2"],
              },
            ],
            endpoint: globalStsEndpoint,
            [type]: endpoint,
          },
          {
            conditions: [
              {
                [fn]: stringEquals,
                [argv]: [regionRef, "us-west-1"],
              },
            ],
            endpoint: globalStsEndpoint,
            [type]: endpoint,
          },
          {
            conditions: [
              {
                [fn]: stringEquals,
                [argv]: [regionRef, "us-west-2"],
              },
            ],
            endpoint: globalStsEndpoint,
            [type]: endpoint,
          },
          {
            endpoint: {
              url,
              properties: {
                authSchemes: [
                  {
                    name,
                    signingName,
                    signingRegion: "{Region}",
                  },
                ],
              },
              headers: emptyObject,
            },
            [type]: endpoint,
          },
        ],
        [type]: tree,
      },
      {
        conditions: conditionList,
        rules: [
          {
            conditions,
            error: "Invalid Configuration: FIPS and custom endpoint are not supported",
            [type]: error,
          },
          {
            conditions: conditions_2,
            error: "Invalid Configuration: Dualstack and custom endpoint are not supported",
            [type]: error,
          },
          {
            endpoint: {
              url: endpointRef,
              properties: emptyObject,
              headers: emptyObject,
            },
            [type]: endpoint,
          },
        ],
        [type]: tree,
      },
      {
        conditions: [isSetRegionCondition],
        rules: [
          {
            conditions: [awsPartitionCondition],
            rules: [
              {
                conditions: [useFipsEqualsTrue, useDualStackEqualsTrue],
                rules: [
                  {
                    conditions: [
                      {
                        [fn]: booleanEquals,
                        [argv]: [TRUE, partitionSupportsFips],
                      },
                      partitionSupportsDualStack,
                    ],
                    rules: [
                      {
                        endpoint: {
                          url: "https://sts-fips.{Region}.{PartitionResult#dualStackDnsSuffix}",
                          properties: emptyObject,
                          headers: emptyObject,
                        },
                        [type]: endpoint,
                      },
                    ],
                    [type]: tree,
                  },
                  {
                    error: "FIPS and DualStack are enabled, but this partition does not support one or both",
                    [type]: error,
                  },
                ],
                [type]: tree,
              },
              {
                conditions,
                rules: [
                  {
                    conditions: [
                      {
                        [fn]: booleanEquals,
                        [argv]: [partitionSupportsFips, TRUE],
                      },
                    ],
                    rules: [
                      {
                        conditions: [
                          {
                            [fn]: stringEquals,
                            [argv]: [
                              {
                                [fn]: getAttr,
                                [argv]: [partitionResultRef, "name"],
                              },
                              "aws-us-gov",
                            ],
                          },
                        ],
                        endpoint: {
                          url: "https://sts.{Region}.amazonaws.com",
                          properties: emptyObject,
                          headers: emptyObject,
                        },
                        [type]: endpoint,
                      },
                      {
                        endpoint: {
                          url: "https://sts-fips.{Region}.{PartitionResult#dnsSuffix}",
                          properties: emptyObject,
                          headers: emptyObject,
                        },
                        [type]: endpoint,
                      },
                    ],
                    [type]: tree,
                  },
                  {
                    error: "FIPS is enabled but this partition does not support FIPS",
                    [type]: error,
                  },
                ],
                [type]: tree,
              },
              {
                conditions: conditions_2,
                rules: [
                  {
                    conditions: [partitionSupportsDualStack],
                    rules: [
                      {
                        endpoint: {
                          url: "https://sts.{Region}.{PartitionResult#dualStackDnsSuffix}",
                          properties: emptyObject,
                          headers: emptyObject,
                        },
                        [type]: endpoint,
                      },
                    ],
                    [type]: tree,
                  },
                  {
                    error: "DualStack is enabled but this partition does not support DualStack",
                    [type]: error,
                  },
                ],
                [type]: tree,
              },
              awsGlobalEndpointRule,
              {
                endpoint: {
                  url,
                  properties: emptyObject,
                  headers: emptyObject,
                },
                [type]: endpoint,
              },
            ],
            [type]: tree,
          },
        ],
        [type]: tree,
      },
      {
        error: "Invalid Configuration: Missing Region",
        [type]: error,
      },
    ],
  };
  cjsExports.ruleSet = ruleSet;
});
export { require_ruleset };
