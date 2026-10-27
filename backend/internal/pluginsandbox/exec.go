// Package pluginsandbox builds and runs the restricted child process used for
// native plugins. On Linux the server re-executes itself as a small launcher,
// applies process and filesystem restrictions, and then execs the verified
// plugin binary.
package pluginsandbox

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
)

const SubcommandName = "plugin-exec"

const (
	exitUsage    = 2
	exitSetup    = 125
	exitExecFail = 126
	exitNotFound = 127
)

// LaunchSpec describes the sandbox boundary for one plugin process.
type LaunchSpec struct {
	Enabled          bool
	BinaryPath       string
	BinarySHA256     string
	WorkDir          string
	RunDir           string
	LandlockEnabled  bool
	LandlockRequired bool
	SeccompEnabled   bool
	MaxOpenFiles     int
	Nice             int
}

type execOptions struct {
	Binary          string
	ExpectedSHA256  string
	WorkDir         string
	RunDir          string
	Landlock        bool
	RequireLandlock bool
	Seccomp         bool
	MaxOpenFiles    int
	Nice            int
}

// Command returns the command passed to go-plugin and the checksum that
// go-plugin must validate. In sandbox mode that checksum belongs to the core
// launcher; the launcher independently validates the plugin immediately before
// execve, preserving the original integrity check across the extra process.
func Command(spec LaunchSpec) (*exec.Cmd, []byte, error) {
	pluginChecksum, err := decodeChecksum(spec.BinarySHA256)
	if err != nil {
		return nil, nil, err
	}
	binaryPath, err := filepath.Abs(spec.BinaryPath)
	if err != nil {
		return nil, nil, fmt.Errorf("resolve plugin binary: %w", err)
	}
	workDir, err := filepath.Abs(spec.WorkDir)
	if err != nil {
		return nil, nil, fmt.Errorf("resolve plugin work directory: %w", err)
	}
	runDir, err := filepath.Abs(spec.RunDir)
	if err != nil {
		return nil, nil, fmt.Errorf("resolve plugin run directory: %w", err)
	}

	if runtime.GOOS != "linux" || !spec.Enabled {
		cmd := exec.Command(binaryPath)
		cmd.Dir = workDir
		cmd.Env = baseEnvironment(runDir)
		configureParentCommand(cmd)
		return cmd, pluginChecksum, nil
	}

	launcher, err := os.Executable()
	if err != nil {
		return nil, nil, fmt.Errorf("resolve plugin sandbox launcher: %w", err)
	}
	launcher, err = filepath.Abs(launcher)
	if err != nil {
		return nil, nil, fmt.Errorf("resolve plugin sandbox launcher: %w", err)
	}
	launcherChecksum, err := checksumFile(launcher)
	if err != nil {
		return nil, nil, fmt.Errorf("hash plugin sandbox launcher: %w", err)
	}
	args := []string{
		SubcommandName,
		"--expected-sha256=" + strings.ToLower(spec.BinarySHA256),
		"--work-dir=" + workDir,
		"--run-dir=" + runDir,
		"--landlock=" + strconv.FormatBool(spec.LandlockEnabled),
		"--require-landlock=" + strconv.FormatBool(spec.LandlockRequired),
		"--seccomp=" + strconv.FormatBool(spec.SeccompEnabled),
		"--max-open-files=" + strconv.Itoa(spec.MaxOpenFiles),
		"--nice=" + strconv.Itoa(spec.Nice),
		"--",
		binaryPath,
	}
	cmd := exec.Command(launcher, args...)
	cmd.Dir = workDir
	cmd.Env = baseEnvironment(runDir)
	configureParentCommand(cmd)
	return cmd, launcherChecksum, nil
}

// RunExec handles the hidden plugin-exec subcommand.
func RunExec(args []string) int {
	opts, err := parseExecArgs(args)
	if err != nil {
		fmt.Fprintln(os.Stderr, "plugin-exec:", err)
		return exitUsage
	}
	return runExec(opts)
}

// KillProcessGroup terminates descendants that a plugin may have spawned.
// The sandbox prevents changing process groups after exec, so the plugin and
// all of its descendants remain in the group created by Command.
func KillProcessGroup(processGroupID int) {
	killProcessGroup(processGroupID)
}

func parseExecArgs(args []string) (*execOptions, error) {
	fs := flag.NewFlagSet(SubcommandName, flag.ContinueOnError)
	fs.SetOutput(os.Stderr)
	opts := &execOptions{}
	fs.StringVar(&opts.ExpectedSHA256, "expected-sha256", "", "expected plugin SHA-256")
	fs.StringVar(&opts.WorkDir, "work-dir", "", "read-only plugin installation directory")
	fs.StringVar(&opts.RunDir, "run-dir", "", "writable private plugin runtime directory")
	fs.BoolVar(&opts.Landlock, "landlock", false, "enable Landlock filesystem policy")
	fs.BoolVar(&opts.RequireLandlock, "require-landlock", false, "fail if Landlock cannot be enforced")
	fs.BoolVar(&opts.Seccomp, "seccomp", false, "enable seccomp syscall policy")
	fs.IntVar(&opts.MaxOpenFiles, "max-open-files", 1024, "RLIMIT_NOFILE")
	fs.IntVar(&opts.Nice, "nice", 10, "additional process nice value")
	if err := fs.Parse(args); err != nil {
		return nil, err
	}
	rest := fs.Args()
	if len(rest) != 1 || strings.TrimSpace(rest[0]) == "" {
		return nil, errors.New("exactly one plugin binary is required")
	}
	if _, err := decodeChecksum(opts.ExpectedSHA256); err != nil {
		return nil, err
	}
	if opts.MaxOpenFiles < 64 || opts.Nice < 0 || opts.Nice > 19 {
		return nil, errors.New("invalid plugin process limits")
	}
	if opts.RequireLandlock && !opts.Landlock {
		return nil, errors.New("require-landlock needs landlock enabled")
	}
	opts.Binary = rest[0]
	return opts, nil
}

func decodeChecksum(value string) ([]byte, error) {
	checksum, err := hex.DecodeString(strings.TrimSpace(value))
	if err != nil || len(checksum) != sha256.Size {
		return nil, errors.New("invalid plugin SHA-256")
	}
	return checksum, nil
}

func verifyBinary(path, expected string) error {
	want, err := decodeChecksum(expected)
	if err != nil {
		return err
	}
	got, err := checksumFile(path)
	if err != nil {
		return err
	}
	if !equalBytes(got, want) {
		return errors.New("plugin binary checksum mismatch")
	}
	return nil
}

func checksumFile(path string) ([]byte, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer func() { _ = file.Close() }()
	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return nil, err
	}
	return hash.Sum(nil), nil
}

func equalBytes(left, right []byte) bool {
	if len(left) != len(right) {
		return false
	}
	var diff byte
	for i := range left {
		diff |= left[i] ^ right[i]
	}
	return diff == 0
}

var baseEnvKeys = []string{
	"PATH", "LANG", "LC_ALL", "TZ", "SSL_CERT_FILE", "SSL_CERT_DIR",
	"SYSTEMROOT", "SystemRoot", "WINDIR", "ComSpec",
}

func baseEnvironment(runDir string) []string {
	env := make([]string, 0, len(baseEnvKeys)+3)
	for _, key := range baseEnvKeys {
		if value, ok := os.LookupEnv(key); ok {
			env = append(env, key+"="+value)
		}
	}
	return append(env, "HOME="+runDir, "TMPDIR="+runDir, "TEMP="+runDir, "TMP="+runDir)
}

// execEnvironment is a second environment filter inside the launcher. It
// preserves go-plugin's handshake variables while preventing future callers
// from accidentally leaking core configuration to a plugin.
func execEnvironment(environ []string) []string {
	allowed := map[string]bool{
		"PATH": true, "HOME": true, "LANG": true, "LC_ALL": true, "TZ": true,
		"TMPDIR": true, "TEMP": true, "TMP": true,
		"SSL_CERT_FILE": true, "SSL_CERT_DIR": true,
		"SYSTEMROOT": true, "SystemRoot": true, "WINDIR": true, "ComSpec": true,
		"SUB2API_PLUGIN_MAGIC_COOKIE": true,
	}
	out := make([]string, 0, len(environ))
	for _, item := range environ {
		key, _, ok := strings.Cut(item, "=")
		if ok && (allowed[key] || strings.HasPrefix(key, "PLUGIN_")) {
			out = append(out, item)
		}
	}
	return out
}
