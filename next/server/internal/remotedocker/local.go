package remotedocker

import (
	"bytes"
	"context"
	"errors"
	"io"
	"os"
	"os/exec"
	"strings"
	"time"
)

// localPath is the search path of local scripts when the core has none.
const localPath = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

// RunLocalScript is RunScript on this machine: the fixed script runs as
// `sh -c <script>` with stdin fed to it, stdout bounded like RunScript and
// stderr discarded. The same rules apply: the script is built only from
// constants and validated values, secrets travel on stdin. The script gets a
// minimal environment (PATH, HOME and the Docker client variables), never
// the core's own (database URL, keys). err is only for failures to start or
// wait for the shell; a script that ran and failed has a nonzero ExitStatus.
func RunLocalScript(ctx context.Context, script string, stdin []byte, limit time.Duration) (ScriptResult, error) {
	return RunLocalScriptStream(ctx, script, bytes.NewReader(stdin), limit)
}

// RunLocalScriptStream is RunLocalScript with stdin streamed from a reader
// (RunScriptStream on this machine): a read error of stdin fails the run.
func RunLocalScriptStream(ctx context.Context, script string, stdin io.Reader, limit time.Duration) (ScriptResult, error) {
	if script == "" || strings.ContainsRune(script, 0) {
		return ScriptResult{}, errors.New("invalid script")
	}
	if stdin == nil {
		stdin = bytes.NewReader(nil)
	}
	ctx, cancel := context.WithTimeout(ctx, limit)
	defer cancel()
	cmd := exec.CommandContext(ctx, "sh", "-c", script)
	cmd.Env = localEnv()
	var out boundedOutput
	cmd.Stdout = &out
	in := &trackedInput{r: stdin}
	cmd.Stdin = in
	// Children (docker pull) may keep the output open after sh is killed.
	cmd.WaitDelay = 5 * time.Second
	err := cmd.Run()
	if ctx.Err() != nil {
		return ScriptResult{}, ctx.Err()
	}
	if in.failed() != nil {
		return ScriptResult{}, errors.New("local script input failed")
	}
	res := ScriptResult{Output: string(out.data)}
	var exit *exec.ExitError
	switch {
	case err == nil:
	case errors.As(err, &exit):
		res.ExitStatus = exit.ExitCode()
		if res.ExitStatus == 0 {
			res.ExitStatus = -1
		}
	default:
		return ScriptResult{}, errors.New("local script failed to run")
	}
	return res, nil
}

func localEnv() []string {
	path := os.Getenv("PATH")
	if path == "" {
		path = localPath
	}
	env := []string{"PATH=" + path}
	for _, name := range []string{"HOME", "DOCKER_HOST", "DOCKER_CONTEXT", "DOCKER_CONFIG", "DOCKER_CERT_PATH", "DOCKER_TLS_VERIFY", "SYSTEMROOT"} {
		if v, ok := os.LookupEnv(name); ok {
			env = append(env, name+"="+v)
		}
	}
	return env
}
