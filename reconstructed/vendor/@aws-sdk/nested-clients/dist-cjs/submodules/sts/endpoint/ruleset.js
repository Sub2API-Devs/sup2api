/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sts/endpoint/ruleset.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-heg39xxp.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-heg39xxp.js:5419-10036 esm-fingerprint
var X = { ["required"]: !1, ["type"]: "string" },
  U = { ["required"]: !0, default: !1, ["type"]: "boolean" },
  ae = { ["ref"]: "Endpoint" },
  Z = { ["fn"]: "isSet", ["argv"]: [{ ["ref"]: "Region" }] },
  n = { ["ref"]: "Region" },
  ee = { ["fn"]: "aws.partition", ["argv"]: [n], assign: "PartitionResult" },
  ce = { ["ref"]: "UseFIPS" },
  de = { ["ref"]: "UseDualStack" },
  r = {
    url: "https://sts.amazonaws.com",
    properties: { authSchemes: [{ name: "sigv4", signingName: "sts", signingRegion: "us-east-1" }] },
    headers: {},
  },
  c = {},
  te = {
    conditions: [{ ["fn"]: "stringEquals", ["argv"]: [n, "aws-global"] }],
    ["endpoint"]: r,
    ["type"]: "endpoint",
  },
  pe = { ["fn"]: "booleanEquals", ["argv"]: [ce, !0] },
  le = { ["fn"]: "booleanEquals", ["argv"]: [de, !0] },
  oe = { ["fn"]: "getAttr", ["argv"]: [{ ["ref"]: "PartitionResult" }, "supportsFIPS"] },
  ue = { ["ref"]: "PartitionResult" },
  ne = {
    ["fn"]: "booleanEquals",
    ["argv"]: [!0, { ["fn"]: "getAttr", ["argv"]: [ue, "supportsDualStack"] }],
  },
  se = [{ ["fn"]: "isSet", ["argv"]: [ae] }],
  re = [pe],
  ie = [le],
  Xe = {
    version: "1.0",
    parameters: { Region: X, UseDualStack: U, UseFIPS: U, Endpoint: X, UseGlobalEndpoint: U },
    rules: [
      {
        conditions: [
          { ["fn"]: "booleanEquals", ["argv"]: [{ ["ref"]: "UseGlobalEndpoint" }, !0] },
          { ["fn"]: "not", ["argv"]: se },
          Z,
          ee,
          { ["fn"]: "booleanEquals", ["argv"]: [ce, !1] },
          { ["fn"]: "booleanEquals", ["argv"]: [de, !1] },
        ],
        rules: [
          {
            conditions: [{ ["fn"]: "stringEquals", ["argv"]: [n, "ap-northeast-1"] }],
            endpoint: r,
            ["type"]: "endpoint",
          },
          {
            conditions: [{ ["fn"]: "stringEquals", ["argv"]: [n, "ap-south-1"] }],
            endpoint: r,
            ["type"]: "endpoint",
          },
          {
            conditions: [{ ["fn"]: "stringEquals", ["argv"]: [n, "ap-southeast-1"] }],
            endpoint: r,
            ["type"]: "endpoint",
          },
          {
            conditions: [{ ["fn"]: "stringEquals", ["argv"]: [n, "ap-southeast-2"] }],
            endpoint: r,
            ["type"]: "endpoint",
          },
          te,
          {
            conditions: [{ ["fn"]: "stringEquals", ["argv"]: [n, "ca-central-1"] }],
            endpoint: r,
            ["type"]: "endpoint",
          },
          {
            conditions: [{ ["fn"]: "stringEquals", ["argv"]: [n, "eu-central-1"] }],
            endpoint: r,
            ["type"]: "endpoint",
          },
          {
            conditions: [{ ["fn"]: "stringEquals", ["argv"]: [n, "eu-north-1"] }],
            endpoint: r,
            ["type"]: "endpoint",
          },
          {
            conditions: [{ ["fn"]: "stringEquals", ["argv"]: [n, "eu-west-1"] }],
            endpoint: r,
            ["type"]: "endpoint",
          },
          {
            conditions: [{ ["fn"]: "stringEquals", ["argv"]: [n, "eu-west-2"] }],
            endpoint: r,
            ["type"]: "endpoint",
          },
          {
            conditions: [{ ["fn"]: "stringEquals", ["argv"]: [n, "eu-west-3"] }],
            endpoint: r,
            ["type"]: "endpoint",
          },
          {
            conditions: [{ ["fn"]: "stringEquals", ["argv"]: [n, "sa-east-1"] }],
            endpoint: r,
            ["type"]: "endpoint",
          },
          {
            conditions: [{ ["fn"]: "stringEquals", ["argv"]: [n, "us-east-1"] }],
            endpoint: r,
            ["type"]: "endpoint",
          },
          {
            conditions: [{ ["fn"]: "stringEquals", ["argv"]: [n, "us-east-2"] }],
            endpoint: r,
            ["type"]: "endpoint",
          },
          {
            conditions: [{ ["fn"]: "stringEquals", ["argv"]: [n, "us-west-1"] }],
            endpoint: r,
            ["type"]: "endpoint",
          },
          {
            conditions: [{ ["fn"]: "stringEquals", ["argv"]: [n, "us-west-2"] }],
            endpoint: r,
            ["type"]: "endpoint",
          },
          {
            endpoint: {
              url: "https://sts.{Region}.{PartitionResult#dnsSuffix}",
              properties: { authSchemes: [{ name: "sigv4", signingName: "sts", signingRegion: "{Region}" }] },
              headers: c,
            },
            ["type"]: "endpoint",
          },
        ],
        ["type"]: "tree",
      },
      {
        conditions: se,
        rules: [
          {
            conditions: re,
            error: "Invalid Configuration: FIPS and custom endpoint are not supported",
            ["type"]: "error",
          },
          {
            conditions: ie,
            error: "Invalid Configuration: Dualstack and custom endpoint are not supported",
            ["type"]: "error",
          },
          { endpoint: { url: ae, properties: c, headers: c }, ["type"]: "endpoint" },
        ],
        ["type"]: "tree",
      },
      {
        conditions: [Z],
        rules: [
          {
            conditions: [ee],
            rules: [
              {
                conditions: [pe, le],
                rules: [
                  {
                    conditions: [{ ["fn"]: "booleanEquals", ["argv"]: [!0, oe] }, ne],
                    rules: [
                      {
                        endpoint: {
                          url: "https://sts-fips.{Region}.{PartitionResult#dualStackDnsSuffix}",
                          properties: c,
                          headers: c,
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
                conditions: re,
                rules: [
                  {
                    conditions: [{ ["fn"]: "booleanEquals", ["argv"]: [oe, !0] }],
                    rules: [
                      {
                        conditions: [
                          {
                            ["fn"]: "stringEquals",
                            ["argv"]: [{ ["fn"]: "getAttr", ["argv"]: [ue, "name"] }, "aws-us-gov"],
                          },
                        ],
                        endpoint: { url: "https://sts.{Region}.amazonaws.com", properties: c, headers: c },
                        ["type"]: "endpoint",
                      },
                      {
                        endpoint: {
                          url: "https://sts-fips.{Region}.{PartitionResult#dnsSuffix}",
                          properties: c,
                          headers: c,
                        },
                        ["type"]: "endpoint",
                      },
                    ],
                    ["type"]: "tree",
                  },
                  { error: "FIPS is enabled but this partition does not support FIPS", ["type"]: "error" },
                ],
                ["type"]: "tree",
              },
              {
                conditions: ie,
                rules: [
                  {
                    conditions: [ne],
                    rules: [
                      {
                        endpoint: {
                          url: "https://sts.{Region}.{PartitionResult#dualStackDnsSuffix}",
                          properties: c,
                          headers: c,
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
              te,
              {
                endpoint: {
                  url: "https://sts.{Region}.{PartitionResult#dnsSuffix}",
                  properties: c,
                  headers: c,
                },
                ["type"]: "endpoint",
              },
            ],
            ["type"]: "tree",
          },
        ],
        ["type"]: "tree",
      },
      { error: "Invalid Configuration: Missing Region", ["type"]: "error" },
    ],
  },
  me = Xe;

export { me };
