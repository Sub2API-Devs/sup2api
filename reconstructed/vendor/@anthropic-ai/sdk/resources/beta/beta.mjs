/**
 * @anthropic-ai/sdk/resources/beta/beta.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../core/resource.mjs";
import { Rr } from "./models.mjs";
import { qs } from "./messages/messages.mjs";
import { ds } from "./agents/agents.mjs";
import { Ms } from "./environments/environments.mjs";
import { Zs } from "./sessions/sessions.mjs";
import { _r } from "./deployments.mjs";
import { hr } from "./deployment-runs.mjs";
import { ri } from "./vaults/vaults.mjs";
import { Os } from "./memory-stores/memory-stores.mjs";
import { Sr } from "./files.mjs";
import { ti } from "./skills/skills.mjs";
import { Mr } from "./webhooks.js";
import { Ar } from "./user-profiles.mjs";
import { br } from "./dreams.mjs";
import { ni } from "./tunnels/tunnels.mjs";
import { Vs } from "./organization/organization.mjs";

//@ chunk-hwmsct5x.js:144643-145529 esm-fingerprint
var Nie = (() => {
  class e extends Y {
    constructor() {
      super(...arguments);
      ((this.models = new Rr(this._client)),
        (this.messages = new qs(this._client)),
        (this.agents = new ds(this._client)),
        (this.environments = new Ms(this._client)),
        (this.sessions = new Zs(this._client)),
        (this.deployments = new _r(this._client)),
        (this.deploymentRuns = new hr(this._client)),
        (this.vaults = new ri(this._client)),
        (this.memoryStores = new Os(this._client)),
        (this.files = new Sr(this._client)),
        (this.skills = new ti(this._client)),
        (this.webhooks = new Mr(this._client)),
        (this.userProfiles = new Ar(this._client)),
        (this.dreams = new br(this._client)),
        (this.tunnels = new ni(this._client)),
        (this.organization = new Vs(this._client)));
    }
  }
  return (
    (e.Models = Rr),
    (e.Messages = qs),
    (e.Agents = ds),
    (e.Environments = Ms),
    (e.Sessions = Zs),
    (e.Deployments = _r),
    (e.DeploymentRuns = hr),
    (e.Vaults = ri),
    (e.MemoryStores = Os),
    (e.Files = Sr),
    (e.Skills = ti),
    (e.Webhooks = Mr),
    (e.UserProfiles = Ar),
    (e.Dreams = br),
    (e.Tunnels = ni),
    (e.Organization = Vs),
    e
  );
})();

export { Nie };
