package engine

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"slices"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
)

type cliRequestInfo struct {
	Version      string   `json:"version"`
	Patch        string   `json:"patch"`
	Capabilities []string `json:"capabilities"`
	SHA256       string   `json:"-"`
}

func readCLIRequestInfo(cli, version string, o Options) (cliRequestInfo, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, cli, "--ccgateway-info")
	env := o.Env
	if env == nil {
		env = os.Environ()
	}
	cmd.Env = envWith(withoutWorkerSecrets(env), map[string]string{"DISABLE_AUTOUPDATER": "1"})
	raw, err := cmd.Output()
	var info cliRequestInfo
	if err != nil || len(raw) > 8192 || json.Unmarshal(raw, &info) != nil || info.Version != version || info.Patch == "" {
		return cliRequestInfo{}, fmt.Errorf("cannot verify CLI request capabilities")
	}
	return info, nil
}

// Capabilities are an intersection, never inferred from a product version.
func (i cliRequestInfo) supports(capability string) bool {
	return slices.Contains(i.Capabilities, capability)
}

func (g *Gateway) configureResourceReporting() {
	g.Runner.ReportContainerResources = !g.MaintenanceOnly && g.CLIInfo.supports(features.ContainerResourceReportingCapability)
}

func (g *Gateway) requestCapabilities() []string {
	out := []string{}
	if g.MaintenanceOnly || !g.CLIInfo.supports("request_build") {
		return out
	}
	for _, capability := range []string{features.BuildAttachmentCapabilityV2, features.BuildBillingCapability, features.BuildIdentityCapability, features.BuildInjectionCapability, features.RequestLevelsCapability, features.BuildContentPreservationCapability} {
		if g.CLIInfo.supports(capability) {
			out = append(out, capability)
		}
	}
	// v1 is the name an older core preflights the platform and OS sources
	// with; the CLI's content adapter (v2) is what applies them, and the
	// Worker's build gate asks for v2. So v1 is v2's alias, never more.
	if g.CLIInfo.supports(features.BuildAttachmentCapabilityV2) {
		out = append(out, features.BuildAttachmentCapability)
	}
	if g.CLIInfo.supports("request_direct") {
		out = append(out, features.RequestPolicyModeCapability)
		if g.CLIInfo.supports(features.DirectBillingCapability) {
			out = append(out, features.DirectBillingCapability)
		}
	}
	if g.Runner != nil && g.Runner.ReportContainerResources && g.CLIInfo.supports(features.ContainerResourceReportingCapability) {
		out = append(out, features.ContainerResourceReportingCapability)
	}
	if g.requestIdentityEnabled {
		out = append(out, features.RequestIdentityCapability)
	}
	if g.CLIInfo.supports(features.RequestAgentContextCapability) {
		out = append(out, features.RequestAgentContextCapability)
	}
	// The request log keeps the request the CLI sent (request_command.go).
	if g.CLIInfo.supports(features.RequestCaptureCapability) {
		out = append(out, features.RequestCaptureCapability)
	}
	return out
}

// verifyPinnedCLI validates the actual file before authentication or
// requests, and reads its request info once (audit C12). A version string
// alone cannot distinguish the official binary from the required patched CLI.
// A checksum the caller already verified on a root-owned file
// (Options.CLIChecksumVerified) is not computed again. An unpinned CLI (a
// development build) is only asked for its info.
func verifyPinnedCLI(cli, version string, o Options) (cliRequestInfo, error) {
	if !o.pinned() {
		return readCLIRequestInfo(cli, version, o)
	}
	if version != o.ExpectedCLIVersion || !features.ValidCLIVersion(version) {
		return cliRequestInfo{}, fmt.Errorf("configured CLI version %q differs from executable %q", o.ExpectedCLIVersion, version)
	}
	digest, err := hex.DecodeString(o.ExpectedCLISHA256)
	if err != nil || len(digest) != sha256.Size || o.ExpectedCLIPatch == "" {
		return cliRequestInfo{}, fmt.Errorf("pinned CLI requires SHA256 and patch identity")
	}
	if !o.CLIChecksumVerified {
		if err = verifyCLIChecksum(cli, o.ExpectedCLISHA256); err != nil {
			return cliRequestInfo{}, err
		}
	}
	info, err := readCLIRequestInfo(cli, version, o)
	if err != nil || info.Patch != o.ExpectedCLIPatch {
		return cliRequestInfo{}, fmt.Errorf("pinned CLI patch identity mismatch")
	}
	return info, nil
}

func verifyCLIChecksum(cli, expected string) error {
	file, err := os.Open(cli)
	if err != nil {
		return err
	}
	h := sha256.New()
	_, err = io.Copy(h, file)
	file.Close()
	if err != nil || hex.EncodeToString(h.Sum(nil)) != expected {
		return fmt.Errorf("pinned CLI checksum mismatch")
	}
	return nil
}
