/**
 * @aws-sdk/client-bedrock-runtime/dist-cjs/endpoint/ruleset.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock-runtime@3.936.0..3.938.0
 * pieces: chunk-3cddmtk7.js (1)
 * attribution: esm-fingerprint 1
 */
//@ chunk-3cddmtk7.js:20831-23181 esm-fingerprint
var h = {
  ["required"]: false,
  type: "string",
};
var i = {
  ["required"]: true,
  default: false,
  type: "boolean",
};
var j_2 = {
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
var l_2 = {
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
var q_2 = [l_2];
var r = [
  {
    ["ref"]: "Region",
  },
];
var jt = {
  version: "1.0",
  parameters: {
    Region: h,
    UseDualStack: i,
    UseFIPS: i,
    Endpoint: h,
  },
  rules: [
    {
      conditions: [
        {
          ["fn"]: "isSet",
          ["argv"]: [j_2],
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
              conditions: q_2,
              error: "Invalid Configuration: Dualstack and custom endpoint are not supported",
              type: "error",
            },
            {
              endpoint: {
                url: j_2,
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
                  conditions: [k_2, l_2],
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
                                url: "https://bedrock-runtime-fips.{Region}.{PartitionResult#dualStackDnsSuffix}",
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
                                url: "https://bedrock-runtime-fips.{Region}.{PartitionResult#dnsSuffix}",
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
                  conditions: q_2,
                  rules: [
                    {
                      conditions: [o],
                      rules: [
                        {
                          rules: [
                            {
                              endpoint: {
                                url: "https://bedrock-runtime.{Region}.{PartitionResult#dualStackDnsSuffix}",
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
                        url: "https://bedrock-runtime.{Region}.{PartitionResult#dnsSuffix}",
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
var Ue = jt;
export { Ue };
