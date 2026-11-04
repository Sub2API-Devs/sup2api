/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sso/endpoint/ruleset.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-kejz1rpb.js (1)
 * attribution: esm-fingerprint 1
 */
//@ chunk-kejz1rpb.js:5071-7442 esm-fingerprint
var stringParamSchema = {
  ["required"]: false,
  type: "string",
};
var booleanParamSchema = {
  ["required"]: true,
  default: false,
  type: "boolean",
};
var endpointRef = {
  ["ref"]: "Endpoint",
};
var useFipsEqualsTrue = {
  ["fn"]: "booleanEquals",
  ["argv"]: [
    {
      ["ref"]: "UseFIPS",
    },
    true,
  ],
};
var useDualStackEqualsTrue = {
  ["fn"]: "booleanEquals",
  ["argv"]: [
    {
      ["ref"]: "UseDualStack",
    },
    true,
  ],
};
var n = {};
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
var booleanEqualsCondition = {
  ["fn"]: "booleanEquals",
  ["argv"]: [
    true,
    {
      ["fn"]: "getAttr",
      ["argv"]: [partitionResultRef, "supportsDualStack"],
    },
  ],
};
var useFipsEqualsTrueList = [useFipsEqualsTrue];
var useDualStackEqualsTrueList = [useDualStackEqualsTrue];
var conditionList = [
  {
    ["ref"]: "Region",
  },
];
var ruleSetData = {
  version: "1.0",
  parameters: {
    Region: stringParamSchema,
    UseDualStack: booleanParamSchema,
    UseFIPS: booleanParamSchema,
    Endpoint: stringParamSchema,
  },
  rules: [
    {
      conditions: [
        {
          ["fn"]: "isSet",
          ["argv"]: [endpointRef],
        },
      ],
      rules: [
        {
          conditions: useFipsEqualsTrueList,
          error: "Invalid Configuration: FIPS and custom endpoint are not supported",
          type: "error",
        },
        {
          conditions: useDualStackEqualsTrueList,
          error: "Invalid Configuration: Dualstack and custom endpoint are not supported",
          type: "error",
        },
        {
          endpoint: {
            url: endpointRef,
            properties: n,
            headers: n,
          },
          type: "endpoint",
        },
      ],
      type: "tree",
    },
    {
      conditions: [
        {
          ["fn"]: "isSet",
          ["argv"]: conditionList,
        },
      ],
      rules: [
        {
          conditions: [
            {
              ["fn"]: "aws.partition",
              ["argv"]: conditionList,
              assign: "PartitionResult",
            },
          ],
          rules: [
            {
              conditions: [useFipsEqualsTrue, useDualStackEqualsTrue],
              rules: [
                {
                  conditions: [
                    {
                      ["fn"]: "booleanEquals",
                      ["argv"]: [true, partitionSupportsFips],
                    },
                    booleanEqualsCondition,
                  ],
                  rules: [
                    {
                      endpoint: {
                        url: "https://portal.sso-fips.{Region}.{PartitionResult#dualStackDnsSuffix}",
                        properties: n,
                        headers: n,
                      },
                      type: "endpoint",
                    },
                  ],
                  type: "tree",
                },
                {
                  error: "FIPS and DualStack are enabled, but this partition does not support one or both",
                  type: "error",
                },
              ],
              type: "tree",
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
                        url: "https://portal.sso.{Region}.amazonaws.com",
                        properties: n,
                        headers: n,
                      },
                      type: "endpoint",
                    },
                    {
                      endpoint: {
                        url: "https://portal.sso-fips.{Region}.{PartitionResult#dnsSuffix}",
                        properties: n,
                        headers: n,
                      },
                      type: "endpoint",
                    },
                  ],
                  type: "tree",
                },
                {
                  error: "FIPS is enabled but this partition does not support FIPS",
                  type: "error",
                },
              ],
              type: "tree",
            },
            {
              conditions: useDualStackEqualsTrueList,
              rules: [
                {
                  conditions: [booleanEqualsCondition],
                  rules: [
                    {
                      endpoint: {
                        url: "https://portal.sso.{Region}.{PartitionResult#dualStackDnsSuffix}",
                        properties: n,
                        headers: n,
                      },
                      type: "endpoint",
                    },
                  ],
                  type: "tree",
                },
                {
                  error: "DualStack is enabled but this partition does not support DualStack",
                  type: "error",
                },
              ],
              type: "tree",
            },
            {
              endpoint: {
                url: "https://portal.sso.{Region}.{PartitionResult#dnsSuffix}",
                properties: n,
                headers: n,
              },
              type: "endpoint",
            },
          ],
          type: "tree",
        },
      ],
      type: "tree",
    },
    {
      error: "Invalid Configuration: Missing Region",
      type: "error",
    },
  ],
};
var ruleSet = ruleSetData;
export { ruleSet };
