package main

import (
	"bufio"
	"encoding/json"
	"errors"
	"io/fs"
	"os"
	"sync"
	"time"
)

// Answers はアンケート3問への回答（各 1〜5）。
type Answers struct {
	Scary      int `json:"scary"`
	Understand int `json:"understand"`
	Fixable    int `json:"fixable"`
}

// Response は1人分の回答。名前などの個人情報は持たない。
type Response struct {
	ID        string    `json:"id"`
	Dataset   *string   `json:"dataset"`
	Pre       Answers   `json:"pre"`
	Post      Answers   `json:"post"`
	CreatedAt time.Time `json:"createdAt"`
}

// Store は回答の保存先。今はファイルに保存しているが、
// 後で SQLite や Postgres に替えたくなったら、このインターフェースを満たす型を作ればよい。
type Store interface {
	Add(r Response) error
	All() ([]Response, error)
}

// FileStore は回答を JSON Lines（1行に1件のJSON）でファイルに追記する。
// 同じ id の回答がすでにあれば保存しない（1ブラウザ1回にするため。PostgresStore と同じ動き）。
type FileStore struct {
	mu   sync.Mutex
	path string
}

func NewFileStore(path string) *FileStore {
	return &FileStore{path: path}
}

func (s *FileStore) Add(r Response) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	existing, err := s.readAll()
	if err != nil {
		return err
	}
	for _, e := range existing {
		if e.ID == r.ID {
			return nil
		}
	}

	f, err := os.OpenFile(s.path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer f.Close()
	return json.NewEncoder(f).Encode(r)
}

func (s *FileStore) All() ([]Response, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.readAll()
}

// readAll はファイルの全件を読む。呼び出す側で s.mu をロックしておくこと。
func (s *FileStore) readAll() ([]Response, error) {

	f, err := os.Open(s.path)
	if errors.Is(err, fs.ErrNotExist) {
		return nil, nil // まだ1件も保存されていない
	}
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var out []Response
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		var r Response
		if err := json.Unmarshal(sc.Bytes(), &r); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, sc.Err()
}
