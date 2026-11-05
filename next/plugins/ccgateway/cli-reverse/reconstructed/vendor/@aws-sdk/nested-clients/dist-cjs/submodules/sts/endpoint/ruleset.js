/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sts/endpoint/ruleset.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-539esr4f.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-539esr4f.js:5419-10036 esm-fingerprint
var stringParamSchema = {
  ["required"]: false,
  ["type"]: "string",
};
var booleanParamSchema = {
  ["required"]: true,
  default: false,
  ["type"]: "boolean",
};
var endpointRef = {
  ["ref"]: "Endpoint",
};
var isSetRegionCondition = {
  ["fn"]: "isSet",
  ["argv"]: [
    {
      ["ref"]: "Region",
    },
  ],
};
var regionRef = {
  ["ref"]: "Region",
};
var awsPartitionCondition = {
  ["fn"]: "aws.partition",
  ["argv"]: [regionRef],
  assign: "PartitionResult",
};
var useFipsRef = {
  ["ref"]: "UseFIPS",
};
var useDualStackRef = {
  ["ref"]: "UseDualStack",
};
var globalStsEndpoint = {
  url: "https://sts.amazonaws.com",
  properties: {
    authSchemes: [
      {
        name: "sigv4",
        signingName: "sts",
        signingRegion: "us-east-1",
      },
    ],
  },
  headers: {},
};
var v = {};
var awsGlobalEndpointRule = {
  conditions: [
    {
      ["fn"]: "stringEquals",
      ["argv"]: [regionRef, "aws-global"],
    },
  ],
  ["endpoint"]: globalStsEndpoint,
  ["type"]: "endpoint",
};
var booleanEqualsCondition = {
  ["fn"]: "booleanEquals",
  ["argv"]: [useFipsRef, true],
};
var booleanEqualsCondition2 = {
  ["fn"]: "booleanEquals",
  ["argv"]: [useDualStackRef, true],
};
var partitionSupportsFips = {
  ["fn"]: "getAttr",
  ["argv"]: [
    {
      ["ref"]: "PartitionResult",
    },
    "supportsFIPS",
  ],
};
var partitionResultRef = {
  ["ref"]: "PartitionResult",
};
var booleanEqualsCondition3 = {
  ["fn"]: "booleanEquals",
  ["argv"]: [
    true,
    {
      ["fn"]: "getAttr",
      ["argv"]: [partitionResultRef, "supportsDualStack"],
    },
  ],
};
var isSetConditionList = [
  {
    ["fn"]: "isSet",
    ["argv"]: [endpointRef],
  },
];
var useFipsEqualsTrueList = [booleanEqualsCondition];
var useDualStackEqualsTrueList = [booleanEqualsCondition2];
var ruleSetData = {
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
          ["fn"]: "booleanEquals",
          ["argv"]: [
            {
              ["ref"]: "UseGlobalEndpoint",
            },
            true,
          ],
        },
        {
          ["fn"]: "not",
          ["argv"]: isSetConditionList,
        },
        isSetRegionCondition,
        awsPartitionCondition,
        {
          ["fn"]: "booleanEquals",
          ["argv"]: [useFipsRef, false],
        },
        {
          ["fn"]: "booleanEquals",
          ["argv"]: [useDualStackRef, false],
        },
      ],
      rules: [
        {
          conditions: [
            {
              ["fn"]: "stringEquals",
              ["argv"]: [regionRef, "ap-northeast-1"],
            },
          ],
          endpoint: globalStsEndpoint,
          ["type"]: "endpoint",
        },
        {
          conditions: [
            {
              ["fn"]: "stringEquals",
              ["argv"]: [regionRef, "ap-south-1"],
            },
          ],
          endpoint: globalStsEndpoint,
          ["type"]: "endpoint",
        },
        {
          conditions: [
            {
              ["fn"]: "stringEquals",
              ["argv"]: [regionRef, "ap-southeast-1"],
            },
          ],
          endpoint: globalStsEndpoint,
          ["type"]: "endpoint",
        },
        {
          conditions: [
            {
              ["fn"]: "stringEquals",
              ["argv"]: [regionRef, "ap-southeast-2"],
            },
          ],
          endpoint: globalStsEndpoint,
          ["type"]: "endpoint",
        },
        awsGlobalEndpointRule,
        {
          conditions: [
            {
              ["fn"]: "stringEquals",
              ["argv"]: [regionRef, "ca-central-1"],
            },
          ],
          endpoint: globalStsEndpoint,
          ["type"]: "endpoint",
        },
        {
          conditions: [
            {
              ["fn"]: "stringEquals",
              ["argv"]: [regionRef, "eu-central-1"],
            },
          ],
          endpoint: globalStsEndpoint,
          ["type"]: "endpoint",
        },
        {
          conditions: [
            {
              ["fn"]: "stringEquals",
              ["argv"]: [regionRef, "eu-north-1"],
            },
          ],
          endpoint: globalStsEndpoint,
          ["type"]: "endpoint",
        },
        {
          conditions: [
            {
              ["fn"]: "stringEquals",
              ["argv"]: [regionRef, "eu-west-1"],
            },
          ],
          endpoint: globalStsEndpoint,
          ["type"]: "endpoint",
        },
        {
          conditions: [
            {
              ["fn"]: "stringEquals",
              ["argv"]: [regionRef, "eu-west-2"],
            },
          ],
          endpoint: globalStsEndpoint,
          ["type"]: "endpoint",
        },
        {
          conditions: [
            {
              ["fn"]: "stringEquals",
              ["argv"]: [regionRef, "eu-west-3"],
            },
          ],
          endpoint: globalStsEndpoint,
          ["type"]: "endpoint",
        },
        {
          conditions: [
            {
              ["fn"]: "stringEquals",
              ["argv"]: [regionRef, "sa-east-1"],
            },
          ],
          endpoint: globalStsEndpoint,
          ["type"]: "endpoint",
        },
        {
          conditions: [
            {
              ["fn"]: "stringEquals",
              ["argv"]: [regionRef, "us-east-1"],
            },
          ],
          endpoint: globalStsEndpoint,
          ["type"]: "endpoint",
        },
        {
          conditions: [
            {
              ["fn"]: "stringEquals",
              ["argv"]: [regionRef, "us-east-2"],
            },
          ],
          endpoint: globalStsEndpoint,
          ["type"]: "endpoint",
        },
        {
          conditions: [
            {
              ["fn"]: "stringEquals",
              ["argv"]: [regionRef, "us-west-1"],
            },
          ],
          endpoint: globalStsEndpoint,
          ["type"]: "endpoint",
        },
        {
          conditions: [
            {
              ["fn"]: "stringEquals",
              ["argv"]: [regionRef, "us-west-2"],
            },
          ],
          endpoint: globalStsEndpoint,
          ["type"]: "endpoint",
        },
        {
          endpoint: {
            url: "https://sts.{Region}.{PartitionResult#dnsSuffix}",
            properties: {
              authSchemes: [
                {
                  name: "sigv4",
                  signingName: "sts",
                  signingRegion: "{Region}",
                },
              ],
            },
            headers: v,
          },
          ["type"]: "endpoint",
        },
      ],
      ["type"]: "tree",
    },
    {
      conditions: isSetConditionList,
      rules: [
        {
          conditions: useFipsEqualsTrueList,
          error: "Invalid Configuration: FIPS and custom endpoint are not supported",
          ["type"]: "error",
        },
        {
          conditions: useDualStackEqualsTrueList,
          error: "Invalid Configuration: Dualstack and custom endpoint are not supported",
          ["type"]: "error",
        },
        {
          endpoint: {
            url: endpointRef,
            properties: v,
            headers: v,
          },
          ["type"]: "endpoint",
        },
      ],
      ["type"]: "tree",
    },
    {
      conditions: [isSetRegionCondition],
      rules: [
        {
          conditions: [awsPartitionCondition],
          rules: [
            {
              conditions: [booleanEqualsCondition, booleanEqualsCondition2],
              rules: [
                {
                  conditions: [
                    {
                      ["fn"]: "booleanEquals",
                      ["argv"]: [true, partitionSupportsFips],
                    },
                    booleanEqualsCondition3,
                  ],
                  rules: [
                    {
                      endpoint: {
                        url: "https://sts-fips.{Region}.{PartitionResult#dualStackDnsSuffix}",
                        properties: v,
                        headers: v,
                      },
                      ["type"]: "endpoint",
                    },
                  ],
                  ["type"]: "tree",
                },
                {
                  error: "FIPS and DualStack are enabled, but this partition does not support one or both",
                  ["type"]: "error",
                },
              ],
              ["type"]: "tree",
            },
            {
              conditions: useFipsEqualsTrueList,
              rules: [
                {
                  conditions: [
                    {
                      ["fn"]: "booleanEquals",
                      ["argv"]: [partitionSupportsFips, true],
                    },
                  ],
                  rules: [
                    {
                      conditions: [
                        {
                          ["fn"]: "stringEquals",
                          ["argv"]: [
                            {
                              ["fn"]: "getAttr",
                              ["argv"]: [partitionResultRef, "name"],
                            },
                            "aws-us-gov",
                          ],
                        },
                      ],
                      endpoint: {
                        url: "https://sts.{Region}.amazonaws.com",
                        properties: v,
                        headers: v,
                      },
                      ["type"]: "endpoint",
                    },
                    {
                      endpoint: {
                        url: "https://sts-fips.{Region}.{PartitionResult#dnsSuffix}",
                        properties: v,
                        headers: v,
                      },
                      ["type"]: "endpoint",
                    },
                  ],
                  ["type"]: "tree",
                },
                {
                  error: "FIPS is enabled but this partition does not support FIPS",
                  ["type"]: "error",
                },
              ],
              ["type"]: "tree",
            },
            {
              conditions: useDualStackEqualsTrueList,
              rules: [
                {
                  conditions: [booleanEqualsCondition3],
                  rules: [
                    {
                      endpoint: {
                        url: "https://sts.{Region}.{PartitionResult#dualStackDnsSuffix}",
                        properties: v,
                        headers: v,
                      },
                      ["type"]: "endpoint",
                    },
                  ],
                  ["type"]: "tree",
                },
                {
                  error: "DualStack is enabled but this partition does not support DualStack",
                  ["type"]: "error",
                },
              ],
              ["type"]: "tree",
            },
            awsGlobalEndpointRule,
            {
              endpoint: {
                url: "https://sts.{Region}.{PartitionResult#dnsSuffix}",
                properties: v,
                headers: v,
              },
              ["type"]: "endpoint",
            },
          ],
          ["type"]: "tree",
        },
      ],
      ["type"]: "tree",
    },
    {
      error: "Invalid Configuration: Missing Region",
      ["type"]: "error",
    },
  ],
};
var ruleSet = ruleSetData;
export { ruleSet };
