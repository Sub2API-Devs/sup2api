# Skills resource implementation evidence

## Implemented in the sixth working batch

`core.SkillResources` is a separate port implemented by the existing provider-resource service. Migration `0040_provider_skill_versions.sql` stores parent-scoped version IDs, verified provider IDs, optional real legacy epoch aliases, lifecycle operations, bytes, metadata and actual provider creation time. It shares owner quota/transaction locks with Files and containers; a skill parent has zero package bytes and each version owns its measured expanded bytes.

New uploads atomically reserve parent plus initial version. A successful provider create is followed by a fixed-account initial-version read, validating the returned ID/epoch against the parent's actual latest selector and matching `skill_id`. Completion records both in one transaction. Failed network/5xx/malformed metadata or persistence remains uncertain, retains capacity, and never triggers a second upload. Confirmed `invalid_request_error`, authentication or permission rejection may release the reservation while keeping its idempotency record. New versions stay attached to one verified parent and issuer.

`FindVersion` is the public-input lookup: authenticated owner, ready parent, ready version, public version ID or verified legacy epoch. `latest` resolves only among registered ready versions using actual provider creation time, not local request or completion order. `FindObservedVersion` is a separate internal response lookup: same owner/parent, only registered provider ID or real epoch; no `latest`, no public ID and no registration of unseen output. Both use read-only repeatable snapshots. The root model-reference integration freezes the returned version before dispatch; HTTP storage completion alone is not proof that model integration is deployed.

Parent deletion blocks during unfinished child mutations. Confirmed stable parent deletion tombstones all versions atomically. Known rejected deletion restores ready; unknown deletion stays unavailable. Tombstoned provider skills cannot be registered again under another public ID. Skills do not inherit the Files default TTL.

## HTTP and transport

Implemented `/v1/skills` create/list; owned parent metadata/delete; owned version create/list/metadata/delete; and version ZIP download. Authorization and user/account slots reuse the Files resource entry point. Current group membership and the live account/principal/generation are checked before provider operations. No client credentials or arbitrary workspace headers are forwarded. `?beta=true` is retained without treating it as the old Skills beta header.

Uploads preserve the entire multipart wire body and relative filenames. Private temporary files, four shared spool slots and an upload read-idle deadline are reused. Files and ZIP expanded data share a 30 MiB local bound (the provider remains authoritative for its documented 30 MB limit); multipart overhead is bounded separately. ZIP detection checks filename, MIME and magic bytes, and streamed decompression validates CRC/size without extracting files or executing package content. Version downloads are completely measured in a bounded private spool before success is published, because version metadata has no reliable ZIP Content-Length.

List never enumerates the provider workspace's custom skills. Custom parents and versions are SQL-filtered before pagination. Empty/unready skills are excluded before pagination. Default list presents tenant-owned custom records followed by the provider's explicitly filtered Anthropic catalog; the opaque cursor records that scope transition. Built-in catalog responses are checked again for source and type, and subsequent provider catalog pages stay on the recorded account and issuer. Built-ins are not imported as tenant-created records. Direct built-in management routes are not implemented by these custom-resource handlers; built-in model references remain the provider-managed path.

Stable metadata uses public `id` / `latest_version_id`. Legacy `skills-2025-10-02` uses its actual `display_title`, string source, and provider-issued epoch. Version responses retain a public version `id` plus the real legacy `version` field. Stable-created versions for which no provider epoch was observed are not fabricated into legacy selectors: a legacy lookup needing that missing alias returns an explicit conflict. A future alias reconciliation read can extend that cross-dialect case without changing ownership. No timestamp-to-epoch inference is used.

## Sources checked

- [Skills guide](https://platform.claude.com/docs/en/build-with-claude/skills-guide)
- [Current Skills SDK](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/resources/beta/skills/skills.py) and [versions SDK](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/resources/beta/skills/versions.py)
- [Current list parameters](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/skill_list_params.py)
- [Current deleted-version schema](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/skills/beta_deleted_skill_version.py)
- [Legacy v0.75.0 version response](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/v0.75.0/src/anthropic/types/beta/skills/version_create_response.py), [parent response](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/v0.75.0/src/anthropic/types/beta/skill_create_response.py), [version deletion](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/v0.75.0/src/anthropic/types/beta/skills/version_delete_response.py)

## Validation and remaining evidence

Windows, `SUB2API_TESTPG=off`:

- `go test ./internal/gateway ./internal/providerresources -count=1`: PASS (gateway 9.514 s, providerresources 2.848 s at the preceding full run).
- Targeted Skills HTTP/upload/protocol tests: PASS. Cases cover unchanged multipart, initial-version verification, owner and issuer rejection, ZIP expansion bound, raw remote-selector rejection, actual legacy epoch, cross-scope catalog pagination, unknown upload without retry, binary output and metadata redaction.
- `go vet ./internal/providerresources ./internal/gateway`: PASS.
- Contracts `go test ./resources -count=1` and `go vet ./resources`: PASS; exact Skills SDK query/version-content route and forbidden operations are covered.

Linux PostgreSQL execution still required for `TestSkillResourcesDBAtomicVersionsOwnershipAndDeletion` and `TestSkillResourcesDBUnknownUploadAndQuota`. They cover concurrent reservation, actual creation-time ordering after restart, private/provider selector separation, ownership, tombstone/cascade, unknown capacity retention and confirmed rejection release. These DB tests are written but skipped locally because the local PostgreSQL fixture is unavailable; no DB result is claimed here.

No real provider Skills upload, OAuth-scope authorization, production custom-skill execution or live deployment has been performed by this agent. The root's Git-based Linux checkpoint, model integration and separate Worker/carrier evidence are required before calling this production-complete. Shared carrier routes require the sixth-batch build; fifth-batch running Workers do not yet include the new route contract.
