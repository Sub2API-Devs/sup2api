package cli

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os/exec"

	"github.com/yourusername/ccgateway-worker/pkg/types"
)

// Manager CLI 管理器
type Manager interface {
	Start(ctx context.Context, args []string) (Process, error)
}

// Process CLI 进程接口
type Process interface {
	Stdout() io.ReadCloser
	Stdin() io.WriteCloser
	Wait() error
	Kill() error
}

// manager CLI 管理器实现
type manager struct {
	cliPath    string
	cliVersion string
}

// NewManager 创建新的 CLI 管理器
func NewManager(cliPath, cliVersion string) Manager {
	return &manager{
		cliPath:    cliPath,
		cliVersion: cliVersion,
	}
}

// Start 启动 CLI 进程
func (m *manager) Start(ctx context.Context, args []string) (Process, error) {
	cmd := exec.CommandContext(ctx, m.cliPath, args...)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("create stdout pipe: %w", err)
	}

	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("create stdin pipe: %w", err)
	}

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("start CLI: %w", err)
	}

	return &process{
		cmd:    cmd,
		stdout: stdout,
		stdin:  stdin,
	}, nil
}

// process CLI 进程实现
type process struct {
	cmd    *exec.Cmd
	stdout io.ReadCloser
	stdin  io.WriteCloser
}

func (p *process) Stdout() io.ReadCloser {
	return p.stdout
}

func (p *process) Stdin() io.WriteCloser {
	return p.stdin
}

func (p *process) Wait() error {
	return p.cmd.Wait()
}

func (p *process) Kill() error {
	return p.cmd.Process.Kill()
}

// StreamDecoder 流式解码器
type StreamDecoder struct {
	scanner *bufio.Scanner
}

// NewStreamDecoder 创建流式解码器
func NewStreamDecoder(r io.Reader) *StreamDecoder {
	return &StreamDecoder{
		scanner: bufio.NewScanner(r),
	}
}

// Next 读取下一个事件
func (d *StreamDecoder) Next() (*types.Event, error) {
	if !d.scanner.Scan() {
		if err := d.scanner.Err(); err != nil {
			return nil, err
		}
		return nil, fmt.Errorf("EOF")
	}

	line := d.scanner.Bytes()

	// 解析 JSON 行
	var frame struct {
		Type  string          `json:"type"`
		Event json.RawMessage `json:"event"`
	}

	if err := json.Unmarshal(line, &frame); err != nil {
		return nil, fmt.Errorf("unmarshal frame: %w", err)
	}

	return &types.Event{
		Type: frame.Type,
		Data: frame.Event,
	}, nil
}
