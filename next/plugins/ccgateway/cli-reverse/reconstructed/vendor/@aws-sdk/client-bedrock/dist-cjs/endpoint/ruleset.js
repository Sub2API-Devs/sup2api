/**
 * @aws-sdk/client-bedrock/dist-cjs/endpoint/ruleset.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock@3.936.0..3.938.0
 * pieces: chunk-gkj73j15.js (1)
 * attribution: esm-fingerprint 1
 */
//@ chunk-gkj73j15.js:5471-7771 esm-fingerprint
var h_2 = {
  ["required"]: false,
  type: "string",
};
var i_2 = {
  ["required"]: true,
  default: false,
  type: "boolean",
};
var j = {
  ["ref"]: "Endpoint",
};
var k_2 = {
  ["fn"]: "booleanEquals",
  ["argv"]: [
    {
      ["ref"]: "UseFIPS",
    },
    true,
  ],
};
var l = {
  ["fn"]: "booleanEquals",
  ["argv"]: [
    {
      ["ref"]: "UseDualStack",
    },
    true,
  ],
};
var m = {};
var n = {
  ["fn"]: "getAttr",
  ["argv"]: [
    {
      ["ref"]: "PartitionResult",
    },
    "supportsFIPS",
  ],
};
var o = {
  ["fn"]: "booleanEquals",
  ["argv"]: [
    true,
    {
      ["fn"]: "getAttr",
      ["argv"]: [
        {
          ["ref"]: "PartitionResult",
        },
        "supportsDualStack",
      ],
    },
  ],
};
var p = [k_2];
var q = [l];
var r = [
  {
    ["ref"]: "Region",
  },
];
var ruleSetData = {
  version: "1.0",
  parameters: {
    Region: h_2,
    UseDualStack: i_2,
    UseFIPS: i_2,
    Endpoint: h_2,
  },
  rules: [
    {
      conditions: [
        {
          ["fn"]: "isSet",
          ["argv"]: [j],
        },
      ],
      rules: [
        {
          conditions: p,
          error: "Invalid Configuration: FIPS and custom endpoint are not supported",
          type: "error",
        },
        {
          rules: [
            {
              conditions: q,
              error: "Invalid Configuration: Dualstack and custom endpoint are not supported",
              type: "error",
            },
            {
              endpoint: {
                url: j,
                properties: m,
                headers: m,
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
      rules: [
        {
          conditions: [
            {
              ["fn"]: "isSet",
              ["argv"]: r,
            },
          ],
          rules: [
            {
              conditions: [
                {
                  ["fn"]: "aws.partition",
                  ["argv"]: r,
                  assign: "PartitionResult",
                },
              ],
              rules: [
                {
                  conditions: [k_2, l],
                  rules: [
                    {
                      conditions: [
                        {
                          ["fn"]: "booleanEquals",
                          ["argv"]: [true, n],
                        },
                        o,
                      ],
                      rules: [
                        {
                          rules: [
                            {
                              endpoint: {
                                url: "https://bedrock-fips.{Region}.{PartitionResult#dualStackDnsSuffix}",
                                properties: m,
                                headers: m,
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
                      error:
                        "FIPS and DualStack are enabled, but this partition does not support one or both",
                      type: "error",
                    },
                  ],
                  type: "tree",
                },
                {
                  conditions: p,
                  rules: [
                    {
                      conditions: [
                        {
                          ["fn"]: "booleanEquals",
                          ["argv"]: [n, true],
                        },
                      ],
                      rules: [
                        {
                          rules: [
                            {
                              endpoint: {
                                url: "https://bedrock-fips.{Region}.{PartitionResult#dnsSuffix}",
                                properties: m,
                                headers: m,
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
                      error: "FIPS is enabled but this partition does not support FIPS",
                      type: "error",
                    },
                  ],
                  type: "tree",
                },
                {
                  conditions: q,
                  rules: [
                    {
                      conditions: [o],
                      rules: [
                        {
                          rules: [
                            {
                              endpoint: {
                                url: "https://bedrock.{Region}.{PartitionResult#dualStackDnsSuffix}",
                                properties: m,
                                headers: m,
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
                      error: "DualStack is enabled but this partition does not support DualStack",
                      type: "error",
                    },
                  ],
                  type: "tree",
                },
                {
                  rules: [
                    {
                      endpoint: {
                        url: "https://bedrock.{Region}.{PartitionResult#dnsSuffix}",
                        properties: m,
                        headers: m,
                      },
                      type: "endpoint",
                    },
                  ],
                  type: "tree",
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
      type: "tree",
    },
  ],
};
var ruleSet = ruleSetData;
export { ruleSet };
