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

// active-runtime.json is root-owned deployment metadata, never a request
// field. Absence preserves the established pinned environment contract.
func (c *Config) loadActiveRuntime(root string) error {
	active := filepath.Join(root, "active-runtime.json")
	if _, err := os.Lstat(active); os.IsNotExist(err) {
		return nil
	} else if err != nil {
		return err
	}
	read := func(path string, out any) error {
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
	var selection struct {
		SchemaVersion      int    `json:"schema_version"`
		Manifest           string `json:"manifest"`
		Version            string `json:"version"`
		RequestMode        string `json:"request_mode"`
		MaintenanceLease   string `json:"maintenance_lease"`
		MaintenanceExpires int64  `json:"maintenance_expires"`
		MaintenanceOnly    bool   `json:"maintenance_only"`
	}
	if err := read(active, &selection); err != nil {
		return err
	}
	if selection.SchemaVersion != 1 || !features.ValidCLIVersion(selection.Version) || (selection.RequestMode != "build" && selection.RequestMode != "direct") {
		return fmt.Errorf("invalid active runtime selection")
	}
	if selection.Manifest == "" || filepath.IsAbs(selection.Manifest) {
		return fmt.Errorf("active runtime manifest must be relative to trusted CLI root")
	}
	manifestPath := filepath.Join(root, filepath.FromSlash(selection.Manifest))
	var manifest struct {
		Versions map[string]struct {
			Path   string   `json:"path"`
			SHA256 string   `json:"sha256"`
			Patch  string   `json:"patch"`
			Modes  []string `json:"modes"`
		} `json:"versions"`
	}
	if err := read(manifestPath, &manifest); err != nil {
		return err
	}
	item, ok := manifest.Versions[selection.Version]
	checksum, err := hex.DecodeString(item.SHA256)
	if !ok || err != nil || len(checksum) != sha256.Size || item.SHA256 != strings.ToLower(item.SHA256) || !activePatch.MatchString(item.Patch) || !slices.Contains(item.Modes, selection.RequestMode) || item.Path == "" || filepath.IsAbs(item.Path) {
		return fmt.Errorf("invalid active runtime CLI manifest entry")
	}
	// A release manifest resolves its binary relative to its own directory.
	binary := filepath.Join(filepath.Dir(manifestPath), filepath.FromSlash(item.Path))
	if err := validateTrustedRuntimePath(root, binary); err != nil {
		return err
	}
	file, err := os.Open(binary)
	if err != nil {
		return err
	}
	hash := sha256.New()
	_, err = io.Copy(hash, file)
	file.Close()
	if err != nil || hex.EncodeToString(hash.Sum(nil)) != item.SHA256 {
		return fmt.Errorf("active runtime CLI checksum mismatch")
	}
	c.CLIPath, c.CLIVersion, c.CLISHA256, c.CLIPatch = binary, selection.Version, item.SHA256, item.Patch
	c.CLIChecksumVerified = true
	c.RequestMode = selection.RequestMode
	c.MaintenanceOnly = selection.MaintenanceOnly
	if selection.MaintenanceLease != "" {
		if !activeLease.MatchString(selection.MaintenanceLease) || selection.MaintenanceExpires > time.Now().Add(10*time.Minute).Unix() {
			return fmt.Errorf("invalid active runtime maintenance lease")
		}
		c.RuntimeMaintenanceLease = selection.MaintenanceLease
		c.RuntimeMaintenanceExpires = time.Unix(selection.MaintenanceExpires, 0)
	}
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
