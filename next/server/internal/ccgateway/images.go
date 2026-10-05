package ccgateway

// Pinned images of the per-account runtime (CONTRACTS §49.16): unless the
// CCGateway configuration overrides them (Config.Images, e.g. tags built on
// the Docker host while the GHCR packages are private), the core installs
// exactly these references and starts the controller from ControllerImage
// with AppImage / EgressImage in its environment.
//
// Update method: after a change under tools/ccgateway is pushed, take the
// three digests from the summary of the "CCGateway images" workflow
// (.github/workflows/ccgateway-images.yml) and replace them here.
//
// Current digests: built by CI from source 22cfdb506.
const (
	AppImage        = "ghcr.io/sub2api-devs/ccgateway-app@sha256:7dd6ca54aba0f893390a981ac01967601e924e6787b67a8bad6d6c70bc6d8833"
	EgressImage     = "ghcr.io/sub2api-devs/ccgateway-egress@sha256:034cab04c40a531a783bed20d12cb05acacf3bca75fcf071205868459c502399"
	ControllerImage = "ghcr.io/sub2api-devs/ccgateway-controller@sha256:640861834c542e8e98542ff76275a641f96ce1dc16a97e7efe093b2d06f5f3f5"
)
