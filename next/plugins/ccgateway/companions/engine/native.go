package engine

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

var nativeSessionName = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

func writeNative(path string, rows []json.RawMessage) error {
	f, err := os.CreateTemp(filepath.Dir(path), ".native-*")
	if err != nil {
		return err
	}
	name := f.Name()
	defer os.Remove(name)
	if _, err = f.Write(nativeBytes(rows)); err != nil {
		f.Close()
		return err
	}
	if err = f.Close(); err != nil {
		return err
	}
	return os.Rename(name, path)
}

// nativeSource is the transcript the CLI writes: the resumed private copy
// (named by session ID), or for --session-id the CLI's projects file.
func (p *Prepared) nativeSource(env []string) (string, bool) {
	if p.Path != "" {
		return filepath.Join(filepath.Dir(p.Path), p.SessionID+".jsonl"), true
	}
	paths, err := filepath.Glob(filepath.Join(cliConfigDir(env), "projects", "*", p.SessionID+".jsonl"))
	if err != nil || len(paths) != 1 {
		return "", false
	}
	return paths[0], true
}

// Capture only after the process has exited and its native writer has flushed.
// Keep the native prefix byte-for-byte. A locally denied tool is a transport
// detail, not a result from the API client: discard that uncommitted tail.
// Nothing is shared yet: commit merges NativeAll into the branch's file.
func (p *Prepared) captureNative(env []string, messageID string) error {
	if !nativeSessionName.MatchString(p.SessionID) {
		return fmt.Errorf("invalid native session ID")
	}
	source, ok := p.nativeSource(env)
	if !ok {
		return fmt.Errorf("native CLI transcript not found")
	}
	p.NativePath = source
	rows, err := p.readNative(messageID)
	if p.Path == "" && p.dir != "" {
		// A --session-id run leaves its file in the CLI's projects directory;
		// keep the cleaned records with the request instead.
		_ = os.Remove(source)
		p.NativePath = filepath.Join(p.dir, p.SessionID+".jsonl")
	}
	if err != nil {
		return err
	}
	// Tool handoffs are cleaned in this run's records only; the copied
	// canonical records stay byte-for-byte.
	own := min(len(p.base), len(rows))
	p.NativeAll = append(rows[:own:own], cleanToolHandoffs(rows[own:], messageID)...)
	p.NativeRows = nativeChain(p.NativeAll, p.NativeAnchor)
	if len(p.NativeRows) == 0 {
		return fmt.Errorf("native transcript missing completed response")
	}
	return writeNative(p.NativePath, p.NativeAll)
}

// cliConfigDir is the CLI's configuration directory under this environment.
func cliConfigDir(env []string) string {
	values := map[string]string{}
	for _, item := range env {
		if k, v, ok := strings.Cut(item, "="); ok {
			values[k] = v
		}
	}
	config := values["CLAUDE_CONFIG_DIR"]
	if config == "" {
		home := values["HOME"]
		if home == "" {
			home = values["USERPROFILE"]
		}
		if home == "" {
			home, _ = os.UserHomeDir()
		}
		config = filepath.Join(home, ".claude")
	}
	return config
}

// readNative reads the transcript at NativePath up to the last record of the
// completed response, which becomes NativeAnchor. Only this run's part of the
// file (after the copied canonical records) can hold the response.
func (p *Prepared) readNative(messageID string) ([]json.RawMessage, error) {
	f, err := os.Open(p.NativePath)
	if err != nil {
		return nil, fmt.Errorf("cannot read native CLI transcript")
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil || info.Size() > 64<<20 {
		return nil, fmt.Errorf("native transcript exceeds limit")
	}
	scan := bufio.NewScanner(f)
	scan.Buffer(make([]byte, 65536), 32<<20)
	var rows []json.RawMessage
	end := 0
	for scan.Scan() {
		if len(scan.Bytes()) == 0 {
			continue
		}
		row := append(json.RawMessage(nil), scan.Bytes()...)
		var obj Object
		if json.Unmarshal(row, &obj) != nil {
			return nil, fmt.Errorf("invalid native transcript")
		}
		rows = append(rows, row)
		msg, _ := obj["message"].(map[string]any)
		if len(rows) > len(p.base) && str(obj, "type") == "assistant" && str(msg, "id") == messageID && str(obj, "uuid") != "" {
			end = len(rows)
			p.NativeAnchor = str(obj, "uuid")
		}
	}
	if err = scan.Err(); err != nil || end == 0 {
		return nil, fmt.Errorf("native transcript missing completed response")
	}
	return rows[:end], nil
}

// Parallel tool calls may persist a denial between two assistant blocks of
// the same model response. Removing only the tail misses those interleaved
// results. Drop this response's internal results and reconnect their children;
// never change the contents of any earlier user/assistant message.
func cleanToolHandoffs(rows []json.RawMessage, messageID string) []json.RawMessage {
	objects := make([]Object, len(rows))
	tools := map[string]bool{}
	first := len(rows)
	for i, row := range rows {
		_ = json.Unmarshal(row, &objects[i])
		msg, _ := objects[i]["message"].(map[string]any)
		if str(objects[i], "type") != "assistant" || str(msg, "id") != messageID {
			continue
		}
		if i < first {
			first = i
		}
		blocks, _ := msg["content"].([]any)
		for _, b := range blocks {
			if block, ok := b.(map[string]any); ok && str(block, "type") == "tool_use" {
				tools[str(block, "id")] = true
			}
		}
	}
	removed := map[string]any{}
	modified := map[int]bool{}
	for i, obj := range objects {
		if i < first || str(obj, "type") != "user" {
			continue
		}
		msg, _ := obj["message"].(map[string]any)
		blocks, _ := msg["content"].([]any)
		kept := make([]any, 0, len(blocks))
		for _, b := range blocks {
			block, _ := b.(map[string]any)
			if str(block, "type") == "tool_result" && tools[str(block, "tool_use_id")] {
				continue
			}
			kept = append(kept, b)
		}
		if len(kept) == len(blocks) {
			continue
		}
		if len(kept) == 0 {
			removed[str(obj, "uuid")] = obj["parentUuid"]
		} else {
			// A native user record may combine a denial with other content.
			// Preserve those blocks and the record UUID so descendants stay valid.
			msg["content"] = kept
			modified[i] = true
		}
	}
	if len(removed) == 0 && len(modified) == 0 {
		return rows
	}
	out := make([]json.RawMessage, 0, len(rows))
	for i, obj := range objects {
		if _, drop := removed[str(obj, "uuid")]; drop {
			continue
		}
		changed := modified[i]
		for n := 0; n < len(removed); n++ {
			parent, found := removed[str(obj, "parentUuid")]
			if !found {
				break
			}
			obj["parentUuid"] = parent
			changed = true
		}
		row := rows[i]
		if changed {
			row, _ = json.Marshal(obj)
		}
		out = append(out, row)
	}
	return out
}
