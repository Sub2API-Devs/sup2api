package egress

import (
	"context"
	"net"
	"net/netip"
	"strconv"
	"sync"
	"time"
)

// coreAddrTTL is how long the resolved addresses of a core service are
// reused before they are looked up again.
const coreAddrTTL = 30 * time.Second

// coreAddrs are the core's own services (Redis, PostgreSQL) that no plugin
// may reach through the tunnel, by name or by any address the name resolves
// to.
type coreAddrs struct {
	lookup func(ctx context.Context, host string) ([]netip.Addr, error)
	names  map[string]bool // normalized host:port
	hosts  []coreHost

	mu sync.Mutex
}

type coreHost struct {
	host     string
	port     int
	ip       netip.Addr // set when host is an IP literal
	resolved []netip.Addr
	at       time.Time
}

func newCoreAddrs(list []string, lookup func(ctx context.Context, host string) ([]netip.Addr, error)) *coreAddrs {
	c := &coreAddrs{lookup: lookup, names: map[string]bool{}}
	for _, a := range list {
		k, ok := addrKey(a)
		if !ok {
			continue
		}
		c.names[k] = true
		h, ps, _ := net.SplitHostPort(k)
		port, err := strconv.Atoi(ps)
		if err != nil {
			continue
		}
		ch := coreHost{host: h, port: port}
		if ip, err := netip.ParseAddr(h); err == nil {
			ch.ip = ip.Unmap()
		}
		c.hosts = append(c.hosts, ch)
	}
	return c
}

func (c *coreAddrs) matchName(hostPort string) bool { return c.names[hostPort] }

// matchAddr reports whether addr:port is one of the core services. A name
// that cannot be resolved right now matches nothing (the name itself is
// still refused by matchName).
func (c *coreAddrs) matchAddr(ctx context.Context, addr netip.Addr, port int) bool {
	addr = addr.Unmap()
	c.mu.Lock()
	defer c.mu.Unlock()
	for i := range c.hosts {
		h := &c.hosts[i]
		if h.port != port {
			continue
		}
		if h.ip.IsValid() {
			if sameAddr(h.ip, addr) {
				return true
			}
			continue
		}
		if h.host == "localhost" && isLocal(addr) {
			return true
		}
		if time.Since(h.at) > coreAddrTTL && c.lookup != nil {
			lctx, cancel := context.WithTimeout(ctx, dnsLookupTimeout)
			if ips, err := c.lookup(lctx, h.host); err == nil {
				h.resolved, h.at = ips, time.Now()
			}
			cancel()
		}
		for _, ip := range h.resolved {
			if sameAddr(ip.Unmap(), addr) {
				return true
			}
		}
	}
	return false
}

// isLocal: an address that reaches this host's own services (0.0.0.0 and ::
// connect to the local host on Linux).
func isLocal(a netip.Addr) bool { return a.IsLoopback() || a.IsUnspecified() }

func sameAddr(a, b netip.Addr) bool { return a == b || (isLocal(a) && isLocal(b)) }
