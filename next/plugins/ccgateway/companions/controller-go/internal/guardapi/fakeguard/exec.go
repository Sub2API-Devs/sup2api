package fakeguard

import (
	"fmt"
	"strconv"
	"strings"

	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/pyjson"
)

// runExec answers an exec: a hook when one matches, else the emulation.
func (g *Guard) runExec(target, aid string, argv []string, user string) (int, []byte) {
	if fn := g.execHook(target, argv); fn != nil {
		return fn(argv, user)
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	if target == "gateway" {
		return g.gatewayEmulation(argv)
	}
	c := g.containers[names.Name(g.prefix, aid, "app")]
	if c == nil {
		return 1, nil
	}
	return c.emulate(argv, user)
}

// emulate is a minimal coreutils on the container's file map.
func (c *container) emulate(argv []string, user string) (int, []byte) {
	root := user == "0"
	switch {
	case argv[0] == "sha256sum" && len(argv) == 2:
		f, ok := c.files[argv[1]]
		if !ok {
			return 1, []byte("sha256sum: " + argv[1] + ": No such file or directory\n")
		}
		return 0, []byte(sha256Hex(f.data) + "  " + argv[1] + "\n")
	case argv[0] == "chmod" && len(argv) == 3:
		f, ok := c.files[argv[2]]
		mode, err := strconv.ParseInt(argv[1], 8, 64)
		if !ok || err != nil || !root {
			return 1, []byte("chmod: failed\n")
		}
		f.mode = mode
		return 0, nil
	case argv[0] == "stat" && len(argv) == 4 && argv[1] == "-c" && argv[2] == "%u:%g:%a":
		f, ok := c.files[argv[3]]
		if !ok {
			return 1, []byte("stat: cannot stat\n")
		}
		return 0, []byte(fmt.Sprintf("%d:%d:%o\n", f.uid, f.gid, f.mode))
	case argv[0] == "mv" && len(argv) == 4 && argv[1] == "-f":
		f, ok := c.files[argv[2]]
		if !ok || !root {
			return 1, []byte("mv: failed\n")
		}
		delete(c.files, argv[2])
		c.files[argv[3]] = f
		return 0, nil
	case argv[0] == "rm" && len(argv) == 3 && argv[1] == "-f":
		delete(c.files, argv[2])
		return 0, nil
	case argv[0] == "mkdir" && len(argv) == 4 && argv[1] == "-m":
		if c.dirs[argv[3]] || !c.dirs[parentDir(argv[3])] || !root {
			return 1, []byte("mkdir: failed\n")
		}
		c.dirs[argv[3]] = true
		return 0, nil
	}
	return 0, nil
}

// gatewayEmulation is a minimal Xray API, ip and ss of the shared gateway.
func (g *Guard) gatewayEmulation(argv []string) (int, []byte) {
	if len(argv) >= 3 && argv[0] == "xray" && argv[1] == "api" {
		return g.xrayAPI(argv[2], argv[3:])
	}
	if len(argv) == 4 && argv[0] == "ip" && argv[1] == "-j" && argv[2] == "-4" && argv[3] == "addr" {
		return 0, g.ipAddr()
	}
	if len(argv) == 3 && argv[0] == "sh" && argv[1] == "-ec" {
		script := argv[2]
		switch {
		case strings.Contains(script, "ss -lnt") && strings.Contains(script, ":15001"):
			if g.listening {
				return 0, nil
			}
			return 1, nil
		case strings.Contains(script, "ccg_shared") && strings.Contains(script, "/config/active.nft"):
			g.nftApplied = string(g.gatewayFiles["active.nft"])
			return 0, nil
		}
		return 0, nil
	}
	if len(argv) >= 2 && argv[0] == "ss" && argv[1] == "-Hnt" {
		return 0, []byte(g.establishedSS)
	}
	return 0, nil
}

func (g *Guard) operation() pyjson.Ordered {
	o, _ := pyjson.DecodeObject(g.gatewayFiles["operation.json"])
	return o
}

func tagsOf(list any) []string {
	var out []string
	l, _ := list.([]any)
	for _, item := range l {
		if o, ok := item.(pyjson.Ordered); ok {
			if t, ok := o.Get("tag"); ok {
				if s, ok := t.(string); ok {
					out = append(out, s)
				}
			}
		}
	}
	return out
}

func remove(list []string, s string) []string {
	var out []string
	for _, x := range list {
		if x != s {
			out = append(out, x)
		}
	}
	return out
}

func contains(list []string, s string) bool {
	for _, x := range list {
		if x == s {
			return true
		}
	}
	return false
}

func (g *Guard) xrayAPI(action string, rest []string) (int, []byte) {
	if action == "lso" && g.xray.ready > 0 {
		g.xray.ready--
		return 1, []byte("failed to dial\n")
	}
	tagged := func(key string, tags []string) []byte {
		list := []any{}
		for _, t := range tags {
			list = append(list, pyjson.Ordered{{Key: "tag", Value: t}})
		}
		return pyjson.MustMarshal(pyjson.Ordered{{Key: key, Value: list}})
	}
	last := ""
	if len(rest) > 0 {
		last = rest[len(rest)-1]
	}
	switch action {
	case "lso":
		return 0, tagged("outbounds", append([]string{"block"}, g.xray.outbounds...))
	case "lsi":
		return 0, tagged("inbounds", append([]string{"api", "transparent"}, g.xray.inbounds...))
	case "ado":
		v, _ := g.operation().Get("outbounds")
		for _, t := range tagsOf(v) {
			if contains(g.xray.outbounds, t) {
				return 1, []byte("existing tag\n")
			}
			g.xray.outbounds = append(g.xray.outbounds, t)
		}
		return 0, nil
	case "adi":
		v, _ := g.operation().Get("inbounds")
		for _, t := range tagsOf(v) {
			if contains(g.xray.inbounds, t) {
				return 1, []byte("existing tag\n")
			}
			g.xray.inbounds = append(g.xray.inbounds, t)
		}
		return 0, nil
	case "adrules":
		g.xray.rules = g.operation()
		return 0, nil
	case "rmo":
		g.xray.outbounds = remove(g.xray.outbounds, last)
		return 0, nil
	case "rmi":
		g.xray.inbounds = remove(g.xray.inbounds, last)
		return 0, nil
	}
	return 1, []byte("unknown command\n")
}

// ipAddr is `ip -j -4 addr` of the gateway: lo, then eth<i> per endpoint.
func (g *Guard) ipAddr() []byte {
	list := []any{pyjson.Ordered{{Key: "ifindex", Value: int64(1)}, {Key: "ifname", Value: "lo"},
		{Key: "addr_info", Value: []any{pyjson.Ordered{{Key: "family", Value: "inet"}, {Key: "local", Value: "127.0.0.1"},
			{Key: "prefixlen", Value: int64(8)}}}}}}
	if gw := g.containers[names.SharedGateway(g.prefix)]; gw != nil {
		for i, e := range gw.endpoints {
			plen := int64(24)
			if n := g.networks[e.network]; n != nil {
				plen = int64(n.subnet.Bits())
			}
			list = append(list, pyjson.Ordered{{Key: "ifindex", Value: int64(i + 2)}, {Key: "ifname", Value: "eth" + strconv.Itoa(i)},
				{Key: "addr_info", Value: []any{pyjson.Ordered{{Key: "family", Value: "inet"}, {Key: "local", Value: e.ip},
					{Key: "prefixlen", Value: plen}}}}})
		}
	}
	return pyjson.MustMarshal(list)
}
