/**
 * protobufjs/google/protobuf/api.json
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-3k21nfa0.js:168464-169329 cjs-fingerprint
var require_api = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = {
    nested: {
      google: {
        nested: {
          protobuf: {
            nested: {
              Api: {
                fields: {
                  name: {
                    type: "string",
                    id: 1,
                  },
                  methods: {
                    rule: "repeated",
                    type: "Method",
                    id: 2,
                  },
                  options: {
                    rule: "repeated",
                    type: "Option",
                    id: 3,
                  },
                  version: {
                    type: "string",
                    id: 4,
                  },
                  sourceContext: {
                    type: "SourceContext",
                    id: 5,
                  },
                  mixins: {
                    rule: "repeated",
                    type: "Mixin",
                    id: 6,
                  },
                  syntax: {
                    type: "Syntax",
                    id: 7,
                  },
                },
              },
              Method: {
                fields: {
                  name: {
                    type: "string",
                    id: 1,
                  },
                  requestTypeUrl: {
                    type: "string",
                    id: 2,
                  },
                  requestStreaming: {
                    type: "bool",
                    id: 3,
                  },
                  responseTypeUrl: {
                    type: "string",
                    id: 4,
                  },
                  responseStreaming: {
                    type: "bool",
                    id: 5,
                  },
                  options: {
                    rule: "repeated",
                    type: "Option",
                    id: 6,
                  },
                  syntax: {
                    type: "Syntax",
                    id: 7,
                  },
                },
              },
              Mixin: {
                fields: {
                  name: {
                    type: "string",
                    id: 1,
                  },
                  root: {
                    type: "string",
                    id: 2,
                  },
                },
              },
              SourceContext: {
                fields: {
                  fileName: {
                    type: "string",
                    id: 1,
                  },
                },
              },
              Option: {
                fields: {
                  name: {
                    type: "string",
                    id: 1,
                  },
                  value: {
                    type: "Any",
                    id: 2,
                  },
                },
              },
              Syntax: {
                values: {
                  SYNTAX_PROTO2: 0,
                  SYNTAX_PROTO3: 1,
                },
              },
            },
          },
        },
      },
    },
  };
});
export { require_api };
