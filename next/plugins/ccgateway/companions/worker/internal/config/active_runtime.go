package config

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
)

var activePatch = regexp.MustCompile(`^ccgateway-[a-z0-9-]+$`)
var activeLease = regexp.MustCompile(`^[a-f0-9]{48}$`)

// activeRuntimeSelection is active-runtime.json: the deployment's chosen CLI.
type activeRuntimeSelection struct {
	SchemaVersion      int    `json:"schema_version"`
	Manifest           string `json:"manifest"`
	Version            string `json:"version"`
	RequestMode        string `json:"request_mode"`
	MaintenanceLease   string `json:"maintenance_lease"`
	MaintenanceExpires int64  `json:"maintenance_expires"`
	MaintenanceOnly    bool   `json:"maintenance_only"`
}

// activeRuntimeManifest is the release manifest the selection points at.
type activeRuntimeManifest struct {
	Versions map[string]activeRuntimeEntry `json:"versions"`
}

type activeRuntimeEntry struct {
	Path   string   `json:"path"`
	SHA256 string   `json:"sha256"`
	Patch  string   `json:"patch"`
	Modes  []string `json:"modes"`
}

// active-runtime.json is root-owned deployment metadata, never a request
// field. Absence preserves the established pinned environment contract.
func (c *Config) loadActiveRuntime(root string) error {
	active := filepath.Join(root, "active-runtime.json")
	if _, err := os.Lstat(active); os.IsNotExist(err) {
		return nil
	} else if err != nil {
		return err
	}
	var selection activeRuntimeSelection
	if err := readTrustedJSON(root, active, &selection); err != nil {
		return err
	}
	if err := selection.validate(); err != nil {
		return err
	}
	manifestPath := filepath.Join(root, filepath.FromSlash(selection.Manifest))
	var manifest activeRuntimeManifest
	if err := readTrustedJSON(root, manifestPath, &manifest); err != nil {
		return err
	}
	item, binary, err := verifyRuntimeManifestEntry(root, manifestPath, selection, manifest)
	if err != nil {
		return err
	}
	c.CLIPath, c.CLIVersion, c.CLISHA256, c.CLIPatch = binary, selection.Version, item.SHA256, item.Patch
	c.CLIChecksumVerified = true
	c.RequestMode = selection.RequestMode
	c.MaintenanceOnly = selection.MaintenanceOnly
	return c.applyMaintenanceLease(selection)
}

// validate rejects a selection that is malformed or points outside the
// supported CLI/mode set.
func (s activeRuntimeSelection) validate() error {
	if s.SchemaVersion != 1 || !features.ValidCLIVersion(s.Version) || (s.RequestMode != "build" && s.RequestMode != "direct") {
		return fmt.Errorf("invalid active runtime selection")
	}
	if s.Manifest == "" || filepath.IsAbs(s.Manifest) {
		return fmt.Errorf("active runtime manifest must be relative to trusted CLI root")
	}
	return nil
}

// readTrustedJSON decodes one bounded, root-owned JSON file below root.
func readTrustedJSON(root, path string, out any) error {
	if err := validateTrustedRuntimePath(root, path); err != nil {
		return err
	}
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()
	raw, err := io.ReadAll(io.LimitReader(file, 65537))
	if err != nil || len(raw) > 65536 {
		return fmt.Errorf("active runtime metadata exceeds limit")
	}
	if err := json.Unmarshal(raw, out); err != nil {
		return fmt.Errorf("invalid active runtime metadata: %w", err)
	}
	return nil
}

// verifyRuntimeManifestEntry selects the manifest entry for the version,
// checks it and returns the entry and its hashed binary path.
func verifyRuntimeManifestEntry(root, manifestPath string, selection activeRuntimeSelection, manifest activeRuntimeManifest) (activeRuntimeEntry, string, error) {
	item, ok := manifest.Versions[selection.Version]
	checksum, err := hex.DecodeString(item.SHA256)
	if !ok || err != nil || len(checksum) != sha256.Size || item.SHA256 != strings.ToLower(item.SHA256) || !activePatch.MatchString(item.Patch) || !slices.Contains(item.Modes, selection.RequestMode) || item.Path == "" || filepath.IsAbs(item.Path) {
		return item, "", fmt.Errorf("invalid active runtime CLI manifest entry")
	}
	// A release manifest resolves its binary relative to its own directory.
	binary := filepath.Join(filepath.Dir(manifestPath), filepath.FromSlash(item.Path))
	if err := validateTrustedRuntimePath(root, binary); err != nil {
		return item, "", err
	}
	file, err := os.Open(binary)
	if err != nil {
		return item, "", err
	}
	hash := sha256.New()
	_, err = io.Copy(hash, file)
	file.Close()
	if err != nil || hex.EncodeToString(hash.Sum(nil)) != item.SHA256 {
		return item, "", fmt.Errorf("active runtime CLI checksum mismatch")
	}
	return item, binary, nil
}

// applyMaintenanceLease records the short-lived runtime maintenance lease.
func (c *Config) applyMaintenanceLease(selection activeRuntimeSelection) error {
	if selection.MaintenanceLease == "" {
		return nil
	}
	if !activeLease.MatchString(selection.MaintenanceLease) || selection.MaintenanceExpires > time.Now().Add(10*time.Minute).Unix() {
		return fmt.Errorf("invalid active runtime maintenance lease")
	}
	c.RuntimeMaintenanceLease = selection.MaintenanceLease
	c.RuntimeMaintenanceExpires = time.Unix(selection.MaintenanceExpires, 0)
	return nil
}

func validateTrustedRuntimePath(root, target string) error {
	root, err := filepath.Abs(root)
	if err != nil {
		return err
	}
	target, err = filepath.Abs(target)
	if err != nil {
		return err
	}
	rel, err := filepath.Rel(root, target)
	if err != nil || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) || filepath.IsAbs(rel) {
		return fmt.Errorf("active runtime path escapes trusted CLI root")
	}
	// Reject all symlinks and writable ancestors; checking only the leaf
	// would permit a non-root worker to swap a directory before exec.
	for path := target; ; path = filepath.Dir(path) {
		info, err := os.Lstat(path)
		if err != nil {
			return err
		}
		if info.Mode()&os.ModeSymlink != 0 || (path == target && !info.Mode().IsRegular()) {
			return fmt.Errorf("active runtime path must be a regular non-symlink file")
		}
		if err := verifyRuntimeOwner(info); err != nil {
			return err
		}
		if parent := filepath.Dir(path); parent == path {
			break
		}
	}
	return nil
}
