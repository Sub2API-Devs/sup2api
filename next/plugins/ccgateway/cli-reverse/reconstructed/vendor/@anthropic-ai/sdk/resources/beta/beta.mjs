/**
 * @anthropic-ai/sdk/resources/beta/beta.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../core/resource.mjs";
import { Models } from "./models.mjs";
import { Messages } from "./messages/messages.mjs";
import { Agents } from "./agents/agents.mjs";
import { Environments } from "./environments/environments.mjs";
import { Sessions } from "./sessions/sessions.mjs";
import { Deployments } from "./deployments.mjs";
import { DeploymentRuns } from "./deployment-runs.mjs";
import { Vaults } from "./vaults/vaults.mjs";
import { MemoryStores } from "./memory-stores/memory-stores.mjs";
import { Files } from "./files.mjs";
import { Skills } from "./skills/skills.mjs";
import { Webhooks } from "./webhooks.js";
import { UserProfiles } from "./user-profiles.mjs";
import { Dreams } from "./dreams.mjs";
import { Tunnels } from "./tunnels/tunnels.mjs";
import { Organization } from "./organization/organization.mjs";

//@ chunk-vn3g7zt8.js:145023-145909 esm-fingerprint
var Beta = (() => {
  class Beta extends APIResource {
    constructor() {
      super(...arguments);
      this.models = new Models(this._client);
      this.messages = new Messages(this._client);
      this.agents = new Agents(this._client);
      this.environments = new Environments(this._client);
      this.sessions = new Sessions(this._client);
      this.deployments = new Deployments(this._client);
      this.deploymentRuns = new DeploymentRuns(this._client);
      this.vaults = new Vaults(this._client);
      this.memoryStores = new MemoryStores(this._client);
      this.files = new Files(this._client);
      this.skills = new Skills(this._client);
      this.webhooks = new Webhooks(this._client);
      this.userProfiles = new UserProfiles(this._client);
      this.dreams = new Dreams(this._client);
      this.tunnels = new Tunnels(this._client);
      this.organization = new Organization(this._client);
    }
  }
  Beta.Models = Models;
  Beta.Messages = Messages;
  Beta.Agents = Agents;
  Beta.Environments = Environments;
  Beta.Sessions = Sessions;
  Beta.Deployments = Deployments;
  Beta.DeploymentRuns = DeploymentRuns;
  Beta.Vaults = Vaults;
  Beta.MemoryStores = MemoryStores;
  Beta.Files = Files;
  Beta.Skills = Skills;
  Beta.Webhooks = Webhooks;
  Beta.UserProfiles = UserProfiles;
  Beta.Dreams = Dreams;
  Beta.Tunnels = Tunnels;
  Beta.Organization = Organization;
  return Beta;
})();
export { Beta };
