# Worker 0.1.68 deployment — 2026-10-08

Status: image and both original account containers deployed and verified. Core/default-image/controller release is separate.

Git candidate `9ba4b278217f077e39cc4e31bc63f50658382133`, clean detached server worktree `/root/ccgateway-features-9ba4b2782`. No local source uploaded. Artifact directory `/opt/ccgateway-runtime/feature-validation-9ba4b2782`.

Scope: authenticated tool-result trimEnd recovery, streamed MCP input transport, inline search compatibility and catalog2026-10-08.10. Go tests rerun with race/count=1, 2CPU/2GiB/GOMAXPROCS2, reusing compiler/module caches only. Image0.1.68 must be new; old images/resources retained. Accounts22 then21 will be updated by atomic executable replacement and restart of the original containers, never recreated. Default image/controller/core updates are assigned separately to the API agent.


## Final artifacts and Linux validation

- Deployed binary SHA256 `8adafe7352d044ff94bcfaab49f75fe840a7d2dff372dc8def55a7ac5046ad8d`, Version0.1.68/full candidate revision.
- New image `ccgateway-worker:0.1.68`, ID `sha256:6a148f68b718ab9ade96b5e2b6b3350217b1b0b1ba9ba0d15be018a564dcdc04`; OCI revision exact9ba4b278217f077e39cc4e31bc63f50658382133.
- Image internal binary SHA256 `fa8efbf692f9bc44ca35a35fc76bb063ec5d9c1425f56bbc071261b72dc9267e`. Its Dockerfile flags differ from standalone trimpath build, hence separately verified hashes.
- Git companions context / worker/Dockerfile, legacy Docker builder2CPU/2GiB. Existing image tags not overwritten. Isolated fixture-key container verified health/features200/default8787/buildmodifiedfalse/catalog2026-10-08.10/CLI2.1.292, then was stopped and removed.
- Current-SHA race tests: engine23.817s; worker config1.048s/server1.289s/worker7.196s; contracts credits1.084s/features1.231s/httpfacts1.026s/resources1.059s. Diagnostics package has no tests. Engine/Worker/contracts vet all passed. No old test-result reuse or DB claim.

## Accounts and rollback

Unique backups `/opt/ccgateway-runtime/manual-backups/20261008-9ba4b2782-22` and `...-21` preserve0.1.67 binary hash `ce7b5dcd3b2edb50b39b8ea9d00c84debf22411ca68d36b534c03f22a41e67b8`, complete before/after identity snapshots, CLI symlink, deployed hash and verification output.

Updater checked no active CLI and expected old hash before backup and atomic replacement, then restarted the same container. Account22 finished all checks before21 started. Container IDs, image references/IDs, users, mounts, args and executable paths compare identical before/after:

- #22 `9de9b219210f43379014eb2bb991bc7cb813e2ecd92a9ec0830e232e7f1c8e22`, login true/claude.ai.
- #21 `6b67d1ffb6e65ffd91a07ff43b18c987e454a2ec20342e064bd33dc91543ae2b`, login true/api_key.
- Both retain `ccgateway:0.1.56`, image `sha256:789f605082fbec34e210d859fac06c9f9603e3ec8f535e249924074a5754b85d`. No account rebuild, authorization replacement, old image removal or unrelated cleanup.

Each passedhealth/features and one real Opus5.5 READY call, no retry:22 HTTP200/end_turn/input65/output4/cache0;21 HTTP200/end_turn/input52/output4/cache0. No key/email/token was printed. This does not replace root's pending real5Read/MCP/inline functional acceptance after the coordinated core/controller release.

Both root and API agent received the success signal; this agent made no default-image/controller configuration change.
