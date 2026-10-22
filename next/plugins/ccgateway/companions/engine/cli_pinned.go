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
	cmd.Env = envWith(env, map[string]string{"DISABLE_AUTOUPDATER": "1"})
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
	for _, capability := range []string{features.BuildAttachmentCapability, features.BuildAttachmentCapabilityV2, features.BuildBillingCapability, features.BuildIdentityCapability, features.BuildInjectionCapability, features.BuildContentPreservationCapability} {
		if g.CLIInfo.supports(capability) {
			out = append(out, capability)
		}
	}
	// v1 transformation is implemented by this Worker, with the CLI's
	// verified build input contract. It does not imply v2 support.
	if !slices.Contains(out, features.BuildAttachmentCapability) && (!g.CLIInfo.supports(features.BuildContentPreservationCapability) || g.CLIInfo.supports(features.BuildAttachmentCapabilityV2)) {
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
	return out
}

// Validate the actual file before authentication or requests. A version string
// alone cannot distinguish the official binary from the required patched CLI.
func verifyPinnedCLI(cli, version string, o Options) error {
	if o.ExpectedCLIVersion == "" && o.ExpectedCLISHA256 == "" && o.ExpectedCLIPatch == "" {
		return nil
	}
	if version != o.ExpectedCLIVersion || !cliReleaseVersion.MatchString(version) {
		return fmt.Errorf("configured CLI version %q differs from executable %q", o.ExpectedCLIVersion, version)
	}
	digest, err := hex.DecodeString(o.ExpectedCLISHA256)
	if err != nil || len(digest) != sha256.Size || o.ExpectedCLIPatch == "" {
		return fmt.Errorf("pinned CLI requires SHA256 and patch identity")
	}
	file, err := os.Open(cli)
	if err != nil {
		return err
	}
	h := sha256.New()
	_, err = io.Copy(h, file)
	file.Close()
	if err != nil || hex.EncodeToString(h.Sum(nil)) != o.ExpectedCLISHA256 {
		return fmt.Errorf("pinned CLI checksum mismatch")
	}
	info, err := readCLIRequestInfo(cli, version, o)
	if err != nil || info.Patch != o.ExpectedCLIPatch {
		return fmt.Errorf("pinned CLI patch identity mismatch")
	}
	if o.RequestMode != "" {
		found := false
		for _, cap := range info.Capabilities {
			if cap == "request_"+o.RequestMode {
				found = true
			}
		}
		if !found {
			return fmt.Errorf("pinned CLI does not support requested mode")
		}
	}
	return nil
}
