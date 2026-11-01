package ccgateway

// Pinned images of the per-account runtime (CONTRACTS §49.16): unless the
// CCGateway configuration overrides them (Config.Images, e.g. tags built on
// the Docker host while the GHCR packages are private), the core installs
// exactly these references and starts the controller from ControllerImage
// with AppImage / EgressImage in its environment. EgressImage is the shared
// Xray egress gateway's image (CONTRACTS §57). They only matter without a
// plugin bundle.
//
// Update method: after a change under tools/ccgateway is pushed, take the
// three digests from the summary of the "CCGateway images" workflow
// (.github/workflows/ccgateway-images.yml) and replace them here.
//
// Current digests: the controller is the Go controller built by CI from
// source 3bb9d3a8d (ccgateway 0.1.120, guard mode); egress is the Xray
// gateway from 7a72fd342 (ccgateway 0.1.118). AppImage is still from
// 22cfdb506: the workflow cannot build the app image (the customized CLI
// under cli-mods/release is not in Git).
const (
	AppImage        = "ghcr.io/sub2api-devs/ccgateway-app@sha256:7dd6ca54aba0f893390a981ac01967601e924e6787b67a8bad6d6c70bc6d8833"
	EgressImage     = "ghcr.io/sub2api-devs/ccgateway-egress@sha256:50c259a9b0e1256f8cd732f8aca8653d0797c7539b9f314b54a88c21b48d8373"
	ControllerImage = "ghcr.io/sub2api-devs/ccgateway-controller@sha256:8e07d52b8b9ee34aebed7f5273688c3ebed9bc09567a4a0c9a29f0620561fc58"
)

// GatewayImage is the Caddy image of the control panel's HTTPS gateway
// (CONTRACTS §53.3), overridable with images.gateway.
const GatewayImage = "caddy:2.11.7-alpine"

// GuardImage is the ccgateway guard (CONTRACTS §76), the host service that
// runs the Docker operations of a Go controller. It is not in the plugin
// package: only an explicit controller install (over SSH or on this machine)
// writes it into /opt/ccgateway/.env. Overridable with images.guard (e.g. a
// tag built on the Docker host by build-ccgateway-guard.sh while the GHCR
// package is private). Built and pushed by the "CCGateway images" workflow
// (matrix entry ccgateway-guard); this digest is the CI build of source
// 3bb9d3a8d (image loads written through, 2026-11-01).
const GuardImage = "ghcr.io/sub2api-devs/ccgateway-guard@sha256:ac1ca9e66dcc38d2185b693c1a874ae597b734929562f4a5e000489babf7146b"

// ControllerImageGuardAPI tells whether ControllerImage carries the label
// io.sup2api.ccgateway.guard-api=1 (a Go controller, installed through
// compose next to the guard). The core refuses to self-upgrade a controller
// the guard has not adopted yet to such an image (controller_adopt_required,
// CONTRACTS §76.6). True since ControllerImage is the Go controller.
const ControllerImageGuardAPI = true
