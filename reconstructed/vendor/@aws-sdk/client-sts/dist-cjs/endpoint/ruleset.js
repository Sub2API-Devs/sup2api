/**
 * @aws-sdk/client-sts/dist-cjs/endpoint/ruleset.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-sts@3.936.0..3.939.0
 * pieces: chunk-a8ee6x44.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-a8ee6x44.js:2573-6233 cjs-require-graph
var require_ruleset = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ruleSet = undefined;
  var Fe = "required";
  var o = "type";
  var i = "fn";
  var s = "argv";
  var E = "ref";
  var Te = false;
  var pe = true;
  var P = "booleanEquals";
  var d = "stringEquals";
  var name = "sigv4";
  var signingName = "sts";
  var Me = "us-east-1";
  var a = "endpoint";
  var url = "https://sts.{Region}.{PartitionResult#dnsSuffix}";
  var f = "tree";
  var O = "error";
  var me = "getAttr";
  var be = {
    [Fe]: false,
    [o]: "string",
  };
  var ge = {
    [Fe]: true,
    default: false,
    [o]: "boolean",
  };
  var $e = {
    [E]: "Endpoint",
  };
  var we = {
    [i]: "isSet",
    [s]: [
      {
        [E]: "Region",
      },
    ],
  };
  var p = {
    [E]: "Region",
  };
  var qe = {
    [i]: "aws.partition",
    [s]: [p],
    assign: "PartitionResult",
  };
  var Ke = {
    [E]: "UseFIPS",
  };
  var Ge = {
    [E]: "UseDualStack",
  };
  var m = {
    url: "https://sts.amazonaws.com",
    properties: {
      authSchemes: [
        {
          name,
          signingName,
          signingRegion: Me,
        },
      ],
    },
    headers: {},
  };
  var _ = {};
  var ke = {
    conditions: [
      {
        [i]: d,
        [s]: [p, "aws-global"],
      },
    ],
    [a]: m,
    [o]: a,
  };
  var ze = {
    [i]: P,
    [s]: [Ke, true],
  };
  var Ve = {
    [i]: P,
    [s]: [Ge, true],
  };
  var Oe = {
    [i]: me,
    [s]: [
      {
        [E]: "PartitionResult",
      },
      "supportsFIPS",
    ],
  };
  var Be = {
    [E]: "PartitionResult",
  };
  var He = {
    [i]: P,
    [s]: [
      true,
      {
        [i]: me,
        [s]: [Be, "supportsDualStack"],
      },
    ],
  };
  var Ne = [
    {
      [i]: "isSet",
      [s]: [$e],
    },
  ];
  var conditions = [ze];
  var conditions_2 = [Ve];
  var ruleSet = {
    version: "1.0",
    parameters: {
      Region: be,
      UseDualStack: ge,
      UseFIPS: ge,
      Endpoint: be,
      UseGlobalEndpoint: ge,
    },
    rules: [
      {
        conditions: [
          {
            [i]: P,
            [s]: [
              {
                [E]: "UseGlobalEndpoint",
              },
              pe,
            ],
          },
          {
            [i]: "not",
            [s]: Ne,
          },
          we,
          qe,
          {
            [i]: P,
            [s]: [Ke, Te],
          },
          {
            [i]: P,
            [s]: [Ge, Te],
          },
        ],
        rules: [
          {
            conditions: [
              {
                [i]: d,
                [s]: [p, "ap-northeast-1"],
              },
            ],
            endpoint: m,
            [o]: a,
          },
          {
            conditions: [
              {
                [i]: d,
                [s]: [p, "ap-south-1"],
              },
            ],
            endpoint: m,
            [o]: a,
          },
          {
            conditions: [
              {
                [i]: d,
                [s]: [p, "ap-southeast-1"],
              },
            ],
            endpoint: m,
            [o]: a,
          },
          {
            conditions: [
              {
                [i]: d,
                [s]: [p, "ap-southeast-2"],
              },
            ],
            endpoint: m,
            [o]: a,
          },
          ke,
          {
            conditions: [
              {
                [i]: d,
                [s]: [p, "ca-central-1"],
              },
            ],
            endpoint: m,
            [o]: a,
          },
          {
            conditions: [
              {
                [i]: d,
                [s]: [p, "eu-central-1"],
              },
            ],
            endpoint: m,
            [o]: a,
          },
          {
            conditions: [
              {
                [i]: d,
                [s]: [p, "eu-north-1"],
              },
            ],
            endpoint: m,
            [o]: a,
          },
          {
            conditions: [
              {
                [i]: d,
                [s]: [p, "eu-west-1"],
              },
            ],
            endpoint: m,
            [o]: a,
          },
          {
            conditions: [
              {
                [i]: d,
                [s]: [p, "eu-west-2"],
              },
            ],
            endpoint: m,
            [o]: a,
          },
          {
            conditions: [
              {
                [i]: d,
                [s]: [p, "eu-west-3"],
              },
            ],
            endpoint: m,
            [o]: a,
          },
          {
            conditions: [
              {
                [i]: d,
                [s]: [p, "sa-east-1"],
              },
            ],
            endpoint: m,
            [o]: a,
          },
          {
            conditions: [
              {
                [i]: d,
                [s]: [p, Me],
              },
            ],
            endpoint: m,
            [o]: a,
          },
          {
            conditions: [
              {
                [i]: d,
                [s]: [p, "us-east-2"],
              },
            ],
            endpoint: m,
            [o]: a,
          },
          {
            conditions: [
              {
                [i]: d,
                [s]: [p, "us-west-1"],
              },
            ],
            endpoint: m,
            [o]: a,
          },
          {
            conditions: [
              {
                [i]: d,
                [s]: [p, "us-west-2"],
              },
            ],
            endpoint: m,
            [o]: a,
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
              headers: _,
            },
            [o]: a,
          },
        ],
        [o]: f,
      },
      {
        conditions: Ne,
        rules: [
          {
            conditions,
            error: "Invalid Configuration: FIPS and custom endpoint are not supported",
            [o]: O,
          },
          {
            conditions: conditions_2,
            error: "Invalid Configuration: Dualstack and custom endpoint are not supported",
            [o]: O,
          },
          {
            endpoint: {
              url: $e,
              properties: _,
              headers: _,
            },
            [o]: a,
          },
        ],
        [o]: f,
      },
      {
        conditions: [we],
        rules: [
          {
            conditions: [qe],
            rules: [
              {
                conditions: [ze, Ve],
                rules: [
                  {
                    conditions: [
                      {
                        [i]: P,
                        [s]: [pe, Oe],
                      },
                      He,
                    ],
                    rules: [
                      {
                        endpoint: {
                          url: "https://sts-fips.{Region}.{PartitionResult#dualStackDnsSuffix}",
                          properties: _,
                          headers: _,
                        },
                        [o]: a,
                      },
                    ],
                    [o]: f,
                  },
                  {
                    error: "FIPS and DualStack are enabled, but this partition does not support one or both",
                    [o]: O,
                  },
                ],
                [o]: f,
              },
              {
                conditions,
                rules: [
                  {
                    conditions: [
                      {
                        [i]: P,
                        [s]: [Oe, pe],
                      },
                    ],
                    rules: [
                      {
                        conditions: [
                          {
                            [i]: d,
                            [s]: [
                              {
                                [i]: me,
                                [s]: [Be, "name"],
                              },
                              "aws-us-gov",
                            ],
                          },
                        ],
                        endpoint: {
                          url: "https://sts.{Region}.amazonaws.com",
                          properties: _,
                          headers: _,
                        },
                        [o]: a,
                      },
                      {
                        endpoint: {
                          url: "https://sts-fips.{Region}.{PartitionResult#dnsSuffix}",
                          properties: _,
                          headers: _,
                        },
                        [o]: a,
                      },
                    ],
                    [o]: f,
                  },
                  {
                    error: "FIPS is enabled but this partition does not support FIPS",
                    [o]: O,
                  },
                ],
                [o]: f,
              },
              {
                conditions: conditions_2,
                rules: [
                  {
                    conditions: [He],
                    rules: [
                      {
                        endpoint: {
                          url: "https://sts.{Region}.{PartitionResult#dualStackDnsSuffix}",
                          properties: _,
                          headers: _,
                        },
                        [o]: a,
                      },
                    ],
                    [o]: f,
                  },
                  {
                    error: "DualStack is enabled but this partition does not support DualStack",
                    [o]: O,
                  },
                ],
                [o]: f,
              },
              ke,
              {
                endpoint: {
                  url,
                  properties: _,
                  headers: _,
                },
                [o]: a,
              },
            ],
            [o]: f,
          },
        ],
        [o]: f,
      },
      {
        error: "Invalid Configuration: Missing Region",
        [o]: O,
      },
    ],
  };
  cjsExports.ruleSet = ruleSet;
});
export { require_ruleset };
