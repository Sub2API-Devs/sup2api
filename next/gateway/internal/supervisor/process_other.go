//go:build !linux

package supervisor

import (
	"errors"
	"os"
	"os/exec"
)

func configureProcess(*exec.Cmd) {}
func configureSupervisor() error { return errors.New("managed core supervisor requires Linux") }
func reapGroup(int)              {}
func processStartID(int) (string, error) {
	return "", errors.New("managed core supervisor requires Linux")
}
func terminateProcess(int) error   { return errors.New("managed core supervisor requires Linux") }
func sameProcess(int, string) bool { return false }
func terminateGroup(int) error     { return errors.New("managed core supervisor requires Linux") }
func groupGone(int) bool           { return false }
func lockProcess(string) (*os.File, error) {
	return nil, errors.New("managed core supervisor requires Linux")
}
func unlockProcess(*os.File) error { return nil }
func syncProcessDir(string) error  { return nil }
