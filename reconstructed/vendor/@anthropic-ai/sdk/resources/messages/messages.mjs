/**
 * @anthropic-ai/sdk/resources/messages/messages.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../core/resource.mjs";
import { Ao } from "./batches.mjs";
import { Cs } from "../../internal/constants.mjs";
import { ss } from "../../internal/stainless-helper-header.mjs";
import { T } from "../../internal/headers.mjs";
import { Fa } from "../../lib/parser.mjs";
import { Ed } from "../../lib/MessageStream.mjs";

//@ chunk-hwmsct5x.js:158362-159992 esm-fingerprint
var $ie = (() => {
    class e extends Y {
      constructor() {
        super(...arguments);
        this.batches = new Ao(this._client);
      }
      create(n, r) {
        let { user_profile_id: user_profile_id, workspace_id: workspace_id, ...y } = n;
        if (y.model in vd)
          console.warn(`The model '${y.model}' is deprecated and will reach end-of-life on ${vd[y.model]}
Please migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`);
        if (Ng.includes(y.model) && y.thinking && y.thinking.type === "enabled")
          console.warn(
            `Using Claude with ${y.model} and 'thinking.type=enabled' is deprecated. Use 'thinking.type=adaptive' instead which results in better model performance in our testing: https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking`,
          );
        let w = r?.timeout ?? this._client._options.timeout;
        if (!y.stream && w == null) {
          let E = Cs[y.model] ?? void 0;
          w = this._client.calculateNonstreamingTimeout(y.max_tokens, E);
        }
        let S = ss(y.tools, y.messages);
        return this._client.post("/v1/messages", {
          body: y,
          timeout: w ?? 600000,
          ...r,
          headers: T([
            {
              ...(user_profile_id != null ? { "anthropic-user-profile-id": user_profile_id } : void 0),
              ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
            },
            S,
            r?.headers,
          ]),
          stream: n.stream ?? !1,
        });
      }
      parse(n, r) {
        return this.create(n, r).then((s) => Fa(s, n, { logger: this._client.logger ?? console }));
      }
      stream(n, r) {
        return Ed.createMessage(this, n, r, { logger: this._client.logger ?? console });
      }
      countTokens(n, r) {
        let { user_profile_id: user_profile_id, workspace_id: workspace_id, ...y } = n;
        return this._client.post("/v1/messages/count_tokens", {
          body: y,
          ...r,
          headers: T([
            {
              ...(user_profile_id != null ? { "anthropic-user-profile-id": user_profile_id } : void 0),
              ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
            },
            r?.headers,
          ]),
        });
      }
    }
    return ((e.Batches = Ao), e);
  })(),
  vd = {},
  Ng = ["claude-mythos-preview", "claude-opus-4-6"];

export { $ie };
