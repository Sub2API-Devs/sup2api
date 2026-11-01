package api

import (
	"bufio"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"io"
	"net/netip"
	"os"
	"strings"
)

// ParseRoutes reads /proc/net/route and returns every route whose mask is
// not 0 (network.host_routes()).
func ParseRoutes(r io.Reader) ([]netip.Prefix, error) {
	sc := bufio.NewScanner(r)
	var out []netip.Prefix
	first := true
	for sc.Scan() {
		if first {
			first = false
			continue
		}
		f := strings.Fields(sc.Text())
		if len(f) < 8 {
			continue
		}
		dst, err1 := hex.DecodeString(f[1])
		mask, err2 := hex.DecodeString(f[7])
		if err1 != nil || err2 != nil || len(dst) != 4 || len(mask) != 4 {
			return nil, errors.New("malformed route table")
		}
		m := binary.LittleEndian.Uint32(mask)
		if m == 0 {
			continue
		}
		bits := 0
		for v := m; v != 0; v >>= 1 {
			bits += int(v & 1)
		}
		// /proc/net/route stores addresses in host byte order (little endian
		// on amd64/arm64): the first byte of the field is the last octet.
		addr := netip.AddrFrom4([4]byte{dst[3], dst[2], dst[1], dst[0]})
		out = append(out, netip.PrefixFrom(addr, bits).Masked())
	}
	return out, sc.Err()
}

// HostRoutesFile reads routes from a file (/proc/net/route).
func HostRoutesFile(path string) func() ([]netip.Prefix, error) {
	return func() ([]netip.Prefix, error) {
		f, err := os.Open(path)
		if err != nil {
			return nil, err
		}
		defer f.Close()
		return ParseRoutes(f)
	}
}
