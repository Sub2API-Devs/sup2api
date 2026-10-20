//go:build !linux

package config

import (
	"fmt"
	"os"
)

func verifyRuntimeOwner(info os.FileInfo) error {
	return fmt.Errorf("active runtime activation requires Linux ownership validation")
}
