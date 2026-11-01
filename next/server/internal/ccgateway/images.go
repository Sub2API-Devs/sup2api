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
// Current digests: controller and egress built by CI from source 7a72fd342
// (ccgateway 0.1.118: the egress image is Xray, and only a controller of that
// age runs it as the shared gateway, so the two move together). AppImage is
// still from 22cfdb506: the workflow cannot build the app image (the
// customized CLI under cli-mods/release is not in Git).
const (
	AppImage        = "ghcr.io/sub2api-devs/ccgateway-app@sha256:7dd6ca54aba0f893390a981ac01967601e924e6787b67a8bad6d6c70bc6d8833"
	EgressImage     = "ghcr.io/sub2api-devs/ccgateway-egress@sha256:50c259a9b0e1256f8cd732f8aca8653d0797c7539b9f314b54a88c21b48d8373"
	ControllerImage = "ghcr.io/sub2api-devs/ccgateway-controller@sha256:7871c73dd0c135cbaf0314b66da9b1f4ea7abe84d3c427a4ff039372e3c47eac"
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
// (matrix entry ccgateway-guard).
//
// PLACEHOLDER: the digest below is not a real image. 发布前由主控替换 with
// the digest the workflow reports for ccgateway-guard.
const GuardImage = "ghcr.io/sub2api-devs/ccgateway-guard@sha256:0000000000000000000000000000000000000000000000000000000000000000"

// ControllerImageGuardAPI tells whether ControllerImage carries the label
// io.sup2api.ccgateway.guard-api=1 (a Go controller, installed through
// compose next to the guard). The core refuses to self-upgrade a controller
// the guard has not adopted yet to such an image (controller_adopt_required,
// CONTRACTS §76.6). 发布前由主控替换: set to true together with
// ControllerImage when it becomes the Go controller's digest.
const ControllerImageGuardAPI = false
