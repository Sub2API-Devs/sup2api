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
	"time"
)

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
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, cli, "--ccgateway-info")
	env := o.Env
	if env == nil {
		env = os.Environ()
	}
	cmd.Env = envWith(env, map[string]string{"DISABLE_AUTOUPDATER": "1"})
	raw, err := cmd.Output()
	var info struct {
		Version      string   `json:"version"`
		Patch        string   `json:"patch"`
		Capabilities []string `json:"capabilities"`
	}
	if err != nil || len(raw) > 8192 || json.Unmarshal(raw, &info) != nil || info.Version != version || info.Patch != o.ExpectedCLIPatch {
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
