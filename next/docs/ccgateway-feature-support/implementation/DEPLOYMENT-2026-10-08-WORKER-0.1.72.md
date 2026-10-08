# Worker 0.1.72 deployment — 2026-10-08

Status: Worker rollout complete; default-image/controller refresh handed to the API agent. Exact Git source `e73b3392c64921c51439e63be5f118c761ae795e`, clean server worktree `/root/ccgateway-features-e73b3392c`, artifacts `/opt/ccgateway-runtime/feature-validation-e73b3392c`. No local-source upload; helper-history work in progress is not included.

Scope: remove implicit CLI context_management when the API caller omitted the field. Explicit client context remains unchanged; no thinking injection or safety attachment change. Core0.1.70/plugin0.1.11/catalog.14 remain unchanged.

Preflight: both live binaries match expected0.1.71 SHA256 `d229d9d52d0ec720205e007ff2b506ec7687b8291506c6423d3317b0fbead1cd`; processes are only docker-init/ccgateway, no active CLI, no explicit Mod override. New image0.1.72 is absent. Disk9.6GiB available; no cleanup or prune.

Linux race/count=1 and vet gates run sequentially with two CPUs/2GiB and cached compilation, not cached results. Original container IDs, mounts, authorization and old image reference must remain intact. No model calls during rollout; default-image/controller step is coordinated separately after both accounts pass.

Linux gates complete: engine race25.077s; Worker config1.045s/server1.223s/worker7.181s; contracts credits1.076s/features1.262s/httpfacts1.039s/resources1.052s; diagnostics has no tests. All three vet invocations passed. Standalone0.1.72/full-SHA executable SHA256 `ae99f09e2b3f5971e5d106d6e034d6a608c092a07843d2fddf56a2e68a7fae3b`. Source worktree remains clean.

## Final Worker validation and rollout

New image `ccgateway-worker:0.1.72` ID `sha256:caa4357c12badb5056d7158c784dd87a124eab784ab3705fa4255fe49c38dfa8`, exact OCI revision e73b3392c64921c51439e63be5f118c761ae795e. Image-built executable SHA256 `5d33f89a5126841331874e33d5aad62274776074ab8327a0faa087d6320f1588` (Docker flags differ from standalone trimpath artifact). A network-disabled fixture container passed health200/features200/default8787/version0.1.72/full revision/modified=false/catalog.14/CLI2.1.292; fixture removed. Disk after build9.4GiB; old resources retained.

Unique backups `/opt/ccgateway-runtime/manual-backups/20261008-e73b3392c-22` and `...-21` retain old0.1.71 embedded-Mod executable, before/after identity snapshots, CLI symlink, deployed hash and runtime verification. Expected old hash and no active CLI checked again immediately before atomic rename. Account22 completed before21 began; each original container restarted once.

Both deployed binaries equal `ae99f09e2b3f5971e5d106d6e034d6a608c092a07843d2fddf56a2e68a7fae3b`; health/features success, catalog.14/CLI292/version.72/full revision correct, no Mod override. Full identity snapshots compare byte-for-byte equal:

- #22 container ID `9de9b219210f43379014eb2bb991bc7cb813e2ecd92a9ec0830e232e7f1c8e22`, loggedIn=true/authMethod=claude.ai.
- #21 container ID `6b67d1ffb6e65ffd91a07ff43b18c987e454a2ec20342e064bd33dc91543ae2b`, loggedIn=true/authMethod=api_key.
- Original image reference `ccgateway:0.1.56`, image ID `sha256:789f605082fbec34e210d859fac06c9f9603e3ec8f535e249924074a5754b85d`, mount/user/path/args unchanged. No container recreation or OAuth replacement.

Worker delivery is complete; root/API agent received success. API agent owns the subsequent defaultapp.72/controller-only refresh, preserving core.70/plugin.11. No model call or READY inference was sent by this Worker rollout. Runtime checks do not establish provider acceptance of the pending-history fixture.


## Default image/controller completion

API agent reported completed stable default-image-only update: images.app=`ccgateway-worker:0.1.72`, all other public fields and secret-presence unchanged. Controller refresh timestamp2026-10-08T09:30:40.825Z; controller environment reports.72. Both account complete identity/image/mount/auth-label before/after snapshots match. Core0.1.70/plugin0.1.11 were not republished; no model requests during refresh. Operational evidence: OVH `worker-default-0.1.72`, cc-max `manual-backups/default-image-0.1.72`.

After full stability, root performed one real Sonnet pending-history acceptance request; see `PUBLIC-ACCEPTANCE-0.1.72.md` for the separate inference result and original-log verification. Deployment checks themselves remain explicitly non-inference.
