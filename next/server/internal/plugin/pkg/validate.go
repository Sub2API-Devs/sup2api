package pkg

import (
	"errors"

	"github.com/robfig/cron/v3"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest/check"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Static manifest validation lives in the SDK (sdk/manifest/check) so that
// the host, the packaging CLI and a plugin's own tests run the same rules.
// This file is the host's wrapper: it keeps the API server modules import and
// turns the SDK's field errors into the core error clients see.

// KnownCapabilities lists the capability ids host 0.1 understands.
var KnownCapabilities = check.KnownCapabilities

// Resource caps besides the configurable memory cap.
const (
	MaxCPU          = check.MaxCPU
	MaxThreads      = check.MaxThreads
	MaxOpenFiles    = check.MaxOpenFiles
	MaxHookTimeout  = check.MaxHookTimeout
	MinRankTimeout  = check.MinRankTimeout
	MaxRankTimeout  = check.MaxRankTimeout
	MaxPromptBytes  = check.MaxPromptBytes
	RequiredArchAMD = check.RequiredArchAMD
	RequiredArchARM = check.RequiredArchARM
)

// EndpointOwner is a gateway endpoint of a platform declared by another
// installed plugin.
type EndpointOwner = check.EndpointOwner

// PlatformOwner is a platform declared by another installed plugin.
type PlatformOwner = check.PlatformOwner

// ValidateOptions carries host facts needed by Validate.
type ValidateOptions = check.ValidateOptions

// OthersFromManifests collects the platforms and endpoints declared by the
// given manifests of other installed plugins (for ValidateOptions).
func OthersFromManifests(ms []*manifest.Manifest) ([]PlatformOwner, []EndpointOwner) {
	return check.OthersFromManifests(ms)
}

// Validate checks a manifest against the package contents and host facts.
// All problems are reported together as invalid_argument with
// details.fields.
func Validate(m *manifest.Manifest, files map[string][]byte, opt ValidateOptions) error {
	err := check.Validate(m, files, opt)
	if err == nil {
		return nil
	}
	var ve *check.ValidationError
	if !errors.As(err, &ve) {
		return err
	}
	fields := make([]core.FieldError, len(ve.Fields))
	for i, f := range ve.Fields {
		fields[i] = core.FieldError{Field: f.Field, Code: f.Code, Message: f.Message}
	}
	return core.InvalidFields(fields...).WithMessage("plugin manifest validation failed")
}

// CheckPlatform applies the endpoint, usage and sticky rules of a plugin
// platform to a single platform definition (used to hold the built-in
// platforms to the plugin contract).
func CheckPlatform(p manifest.Platform) []core.FieldError {
	fs := check.CheckPlatform(p)
	out := make([]core.FieldError, len(fs))
	for i, f := range fs {
		out[i] = core.FieldError{Field: f.Field, Code: f.Code, Message: f.Message}
	}
	return out
}

// BinaryPath expands the {os}/{arch} template.
func BinaryPath(tpl, goos, goarch string) string { return check.BinaryPath(tpl, goos, goarch) }

// HostCompatible matches a semver range against the host version, ignoring
// any pre-release/build suffix of the host version.
func HostCompatible(constraint, hostVersion string) (bool, error) {
	return check.HostCompatible(constraint, hostVersion)
}

// NormalizeRoutePath replaces gin parameter names so "/v1/:a" and "/v1/:b"
// compare equal.
func NormalizeRoutePath(p string) string { return check.NormalizeRoutePath(p) }

// ParseSchedule parses a job schedule (5-field cron or "@every <d>").
func ParseSchedule(s string) (cron.Schedule, error) { return check.ParseSchedule(s) }

// MigrationFiles lists *.sql files directly under dir, sorted.
func MigrationFiles(files map[string][]byte, dir string) []string {
	return check.MigrationFiles(files, dir)
}

// PathParams returns the parameter names of an endpoint path (nil when the
// path is malformed).
func PathParams(p string) []string { return check.PathParams(p) }

// PathsOverlap reports whether some request path matches both endpoint path
// patterns (malformed paths never overlap).
func PathsOverlap(a, b string) bool { return check.PathsOverlap(a, b) }

// EndpointsConflict reports whether two gateway endpoints could both match
// one request (same method, overlapping path patterns).
func EndpointsConflict(a, b manifest.Endpoint) bool { return check.EndpointsConflict(a, b) }
