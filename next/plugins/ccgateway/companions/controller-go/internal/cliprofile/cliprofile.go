// Package cliprofile is the pinned CLI selection (Python cli_profiles.py;
// behaviour V7, PV19): the shape check of a configuration's "cli" and the
// probe of the selected image that proves the version is packaged.
//
// FROZEN: Profile, Validate, ProbeScript, Resolve, ErrUnavailable.
package cliprofile

import (
	"context"
	"errors"
	"fmt"

	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/pyjson"
)

// Request modes.
const (
	ModeBuild  = "build"
	ModeDirect = "direct"
)

// Profile is a validated "cli" object. Raw keeps the caller's key order:
// it is what state.cli stores (Python dict(value)).
type Profile struct {
	Version     string
	RequestMode string
	Raw         pyjson.Ordered
}

// PyValue is the stored dict.
func (p *Profile) PyValue() any { return p.Raw }

// ErrInvalid is validate_profile's ValueError ("invalid pinned CLI profile").
var ErrInvalid = errors.New("invalid pinned CLI profile")

// Validate is validate_profile(value): nil is a legacy configuration (no
// profile); otherwise exactly {version, request_mode, disable_auto_update}
// with version a CLI version, request_mode build or direct and
// disable_auto_update exactly true.
func Validate(value any) (*Profile, error) {
	if value == nil {
		return nil, nil
	}
	o, ok := value.(pyjson.Ordered)
	if !ok || len(o) != 3 || !o.Has("version") || !o.Has("request_mode") || !o.Has("disable_auto_update") {
		return nil, ErrInvalid
	}
	v, _ := o.Get("version")
	m, _ := o.Get("request_mode")
	d, _ := o.Get("disable_auto_update")
	version, ok := v.(string)
	mode, mok := m.(string)
	if !ok || !names.Version.MatchString(version) || !mok || (mode != ModeBuild && mode != ModeDirect) || !pyjson.IsTrue(d) {
		return nil, ErrInvalid
	}
	return &Profile{Version: version, RequestMode: mode, Raw: o.Clone()}, nil
}

// Default is the profile a new runtime gets from CCG_DEFAULT_CLI_VERSION.
func Default(version string) (*Profile, error) {
	return Validate(pyjson.Ordered{{Key: "version", Value: version}, {Key: "request_mode", Value: ModeBuild},
		{Key: "disable_auto_update", Value: true}})
}

// ProbeScript is cli_profiles.PROBE, byte for byte.
const ProbeScript = "\n" +
	"const fs=require('fs'),p=require('path'),c=require('crypto');\n" +
	"const version=process.argv[1],mode=process.argv[2],root='/opt/ccgateway/cli';\n" +
	"const manifest=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8'));\n" +
	"const item=manifest.versions?.[version];\n" +
	"if(!item||!Array.isArray(item.modes)||!item.modes.includes(mode))throw Error('requested CLI version/mode is not packaged in this image');\n" +
	"const file=fs.realpathSync(p.resolve(root,item.path));\n" +
	"if(!file.startsWith(root+'/')||!/^ccgateway-[a-z0-9-]+$/.test(item.patch)||! /^[a-f0-9]{64}$/.test(item.sha256))throw Error('invalid CLI manifest');\n" +
	"for(let q=file;;q=p.dirname(q)){const s=fs.statSync(q);if(s.uid!==0||(s.mode&18)!==0)throw Error('CLI path must be root-owned and immutable to worker');if(q==='/')break;}\n" +
	"if(c.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==item.sha256)throw Error('CLI checksum mismatch');\n" +
	"process.stdout.write(JSON.stringify({path:file,version,sha256:item.sha256,patch:item.patch}));\n"

// MaxProbeOutput is the largest probe answer accepted.
const MaxProbeOutput = 4096

// ErrUnavailable marks the failures Python caught as (ValueError,
// DockerException) around resolve_profile: answered 409
// cli_profile_unavailable by the caller.
var ErrUnavailable = errors.New("requested CLI version/mode is unavailable or invalid in the selected image")

type probeError struct{ err error }

func (e *probeError) Error() string        { return ErrUnavailable.Error() + ": " + e.err.Error() }
func (e *probeError) Unwrap() error        { return e.err }
func (e *probeError) Is(target error) bool { return target == ErrUnavailable }

func unavailable(err error) error { return &probeError{err} }

// Jobs is the guard call Resolve needs.
type Jobs interface {
	RunJob(ctx context.Context, aid string, job guardapi.Job) (*guardapi.JobResult, error)
}

// Job is the probe job of image for p (O7-③: root, no volume, no capabilities).
func Job(image string, p *Profile) guardapi.Job {
	return guardapi.Job{Image: image, Entrypoint: []string{"node"},
		Argv: []string{"-e", ProbeScript, p.Version, p.RequestMode}, User: guardapi.JobUserRoot,
		Volume: guardapi.VolumeNone, Caps: []string{}}
}

// Resolve is resolve_profile: {} for no profile; otherwise the probe runs
// in a one-shot job of image and its answer becomes the container's CLI
// variables. Failures that Python answered 409 match ErrUnavailable (probe
// exit code, guard error answers, oversized or invalid output, a version
// mismatch); a transport failure or a malformed but valid-JSON answer
// (Python KeyError) is returned as is (503).
func Resolve(ctx context.Context, jobs Jobs, aid, image string, p *Profile) (map[string]string, error) {
	if p == nil {
		return map[string]string{}, nil
	}
	res, err := jobs.RunJob(ctx, aid, Job(image, p))
	if err != nil {
		if _, ok := guardapi.AsError(err); ok {
			return nil, unavailable(err)
		}
		return nil, err
	}
	if res.ExitCode != 0 {
		return nil, unavailable(fmt.Errorf("probe exited with %d", res.ExitCode))
	}
	if len(res.Stdout) > MaxProbeOutput {
		return nil, unavailable(errors.New("invalid CLI profile probe"))
	}
	v, err := pyjson.Decode(res.Stdout)
	if err != nil {
		return nil, unavailable(err)
	}
	item, ok := v.(pyjson.Ordered)
	if !ok {
		return nil, errors.New("CLI profile probe answer is not an object")
	}
	version, _ := item.Get("version")
	if !pyjson.Equal(version, p.Version) {
		return nil, unavailable(errors.New("CLI profile version mismatch"))
	}
	out := map[string]string{}
	for key, field := range map[string]string{"WORKER_CLI_PATH": "path", "WORKER_CLI_VERSION": "version",
		"CCG_CLI_SHA256": "sha256", "CCG_CLI_PATCH": "patch"} {
		raw, ok := item.Get(field)
		s, isStr := raw.(string)
		if !ok || !isStr {
			return nil, fmt.Errorf("CLI profile probe answer lacks %s", field)
		}
		out[key] = s
	}
	out["CCG_REQUEST_MODE"] = p.RequestMode
	return out, nil
}
