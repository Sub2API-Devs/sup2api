package grpcruntime

import (
	"net"
	"runtime"
)

// PluginAddrForTest is the address of the plugin process's gRPC server (nil
// when not running).
func (i *Instance) PluginAddrForTest() net.Addr {
	p := i.proc.Load()
	if p == nil {
		return nil
	}
	if rc := p.client.ReattachConfig(); rc != nil {
		return rc.Addr
	}
	return nil
}

// FallbackRunRootForTest is the per-user run directory used when the
// configured one is too long for unix sockets ("" on Windows).
func FallbackRunRootForTest() string {
	if runtime.GOOS == "windows" {
		return ""
	}
	root, _ := fallbackRunRoot()
	return root
}
