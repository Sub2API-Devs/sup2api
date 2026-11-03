/**
 * @anthropic-ai/sdk/resources/beta/messages/messages.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-layout 1
 */
import { Y } from "../../../core/resource.mjs";
import { zr } from "./batches.mjs";
import { bd, parseMessageContent } from "../../../lib/beta-parser.mjs";
import { Cs } from "../../../internal/constants.mjs";
import { ss } from "../../../internal/stainless-helper-header.mjs";
import { T } from "../../../internal/headers.mjs";
import { ld } from "../../../lib/BetaMessageStream.mjs";
import { Ia } from "../../../lib/tools/BetaToolRunner.mjs";
import { ch } from "../../../lib/tools/ToolError.mjs";

//@ chunk-hwmsct5x.js:116886-118856 esm-layout
var _d = {},
  sg = ["claude-mythos-preview", "claude-opus-4-6"],
  qs = (() => {
    class e extends Y {
      constructor() {
        super(...arguments);
        this.batches = new zr(this._client);
      }
      create(n, r) {
        let s = bd(n),
          { betas: betas, user_profile_id: user_profile_id, workspace_id: workspace_id, ...S } = s;
        if (S.model in _d)
          console.warn(`The model '${S.model}' is deprecated and will reach end-of-life on ${_d[S.model]}
Please migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`);
        if (sg.includes(S.model) && S.thinking && S.thinking.type === "enabled")
          console.warn(
            `Using Claude with ${S.model} and 'thinking.type=enabled' is deprecated. Use 'thinking.type=adaptive' instead which results in better model performance in our testing: https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking`,
          );
        let E = r?.timeout ?? this._client._options.timeout;
        if (!S.stream && E == null) {
          let L = Cs[S.model] ?? void 0;
          E = this._client.calculateNonstreamingTimeout(S.max_tokens, L);
        }
        let R = ss(S.tools, S.messages);
        return this._client.post("/v1/messages?beta=true", {
          body: S,
          timeout: E ?? 600000,
          ...r,
          headers: T([
            {
              ...(betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0),
              ...(user_profile_id != null ? { "anthropic-user-profile-id": user_profile_id } : void 0),
              ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
            },
            R,
            r?.headers,
          ]),
          stream: s.stream ?? !1,
        });
      }
      parse(n, r) {
        return (
          (r = {
            ...r,
            headers: T([
              { "anthropic-beta": [...(n.betas ?? []), "structured-outputs-2025-12-15"].toString() },
              r?.headers,
            ]),
          }),
          this.create(n, r).then((s) => parseMessageContent(s, n, { logger: this._client.logger ?? console }))
        );
      }
      stream(n, r) {
        return ld.createMessage(this, n, r);
      }
      countTokens(n, r) {
        let s = bd(n),
          { betas: betas, user_profile_id: user_profile_id, workspace_id: workspace_id, ...S } = s;
        return this._client.post("/v1/messages/count_tokens?beta=true", {
          body: S,
          ...r,
          headers: T([
            {
              "anthropic-beta": [...(betas ?? []), "token-counting-2024-11-01"].toString(),
              ...(user_profile_id != null ? { "anthropic-user-profile-id": user_profile_id } : void 0),
              ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
            },
            r?.headers,
          ]),
        });
      }
      toolRunner(n, r) {
        return new Ia(this._client, n, r);
      }
    }
    return ((e.Batches = zr), (e.BetaToolRunner = Ia), (e.ToolError = ch), e);
  })();

export { qs };
