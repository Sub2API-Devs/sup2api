package anthropicoauth

import (
	"bufio"
	"io"
)

type restoringBody struct {
	io.ReadCloser
}

func rewriteResponseBody(source io.ReadCloser, replacements [][2]string) io.ReadCloser {
	reader, writer := io.Pipe()
	go func() {
		defer source.Close()
		err := restoreStream(writer, source, replacements)
		_ = writer.CloseWithError(err)
	}()
	return &restoringBody{ReadCloser: reader}
}

func restoreStream(output io.Writer, input io.Reader, replacements [][2]string) error {
	maxPattern := 1
	for _, replacement := range replacements {
		if len(replacement[0]) > maxPattern {
			maxPattern = len(replacement[0])
		}
	}
	reader := bufio.NewReaderSize(input, 32<<10)
	buffer := make([]byte, 0, 64<<10)
	chunk := make([]byte, 32<<10)
	for {
		count, err := reader.Read(chunk)
		if count > 0 {
			buffer = append(buffer, chunk[:count]...)
			limit := len(buffer) - (maxPattern - 1)
			if limit > 0 {
				consumed, writeErr := restorePrefix(output, buffer, limit, replacements)
				if writeErr != nil {
					return writeErr
				}
				buffer = append(buffer[:0], buffer[consumed:]...)
			}
		}
		if err == io.EOF {
			_, writeErr := restorePrefix(output, buffer, len(buffer), replacements)
			return writeErr
		}
		if err != nil {
			return err
		}
	}
}

// restorePrefix consumes at least limit source bytes. A replacement beginning
// before limit is emitted atomically even when it extends into the retained
// suffix, preventing split SSE chunks from exposing an alias.
func restorePrefix(output io.Writer, source []byte, limit int, replacements [][2]string) (int, error) {
	position := 0
	for position < limit {
		matched := false
		for _, replacement := range replacements {
			from := replacement[0]
			if from == "" || len(source)-position < len(from) || string(source[position:position+len(from)]) != from {
				continue
			}
			if _, err := io.WriteString(output, replacement[1]); err != nil {
				return position, err
			}
			position += len(from)
			matched = true
			break
		}
		if matched {
			continue
		}
		if _, err := output.Write(source[position : position+1]); err != nil {
			return position, err
		}
		position++
	}
	return position, nil
}
