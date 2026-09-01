package schema

import (
	"embed"
	"fmt"
)

// sqliteFS 内嵌所有 SQLite 建表脚本（纯 DDL，不含种子数据）。
// 文件名前缀数字决定加载顺序，且已按外键依赖排序：
//
//	01_core  无外键依赖的基础表（users, roles, departments, 字典, 安全策略）
//	03_log   操作日志 + 视图
//
// 业务项目请新增 1x_xxx.sql，并在下方 sqliteFiles 中按依赖顺序登记。
//
//go:embed sqlite/*.sql
var sqliteFS embed.FS

// sqliteFiles 显式声明加载顺序，避免依赖目录遍历的隐式排序。
var sqliteFiles = []string{
	"sqlite/01_core.sql",
	"sqlite/03_log.sql",
}

// SQLiteStatements 按顺序返回每个 schema 文件的完整 SQL 文本。
// 每个元素是一整个 .sql 文件，交由 db.Exec 一次执行（SQLite 支持多语句）。
func SQLiteStatements() ([]string, error) {
	stmts := make([]string, 0, len(sqliteFiles))
	for _, name := range sqliteFiles {
		content, err := sqliteFS.ReadFile(name)
		if err != nil {
			return nil, fmt.Errorf("读取 schema 文件 %s 失败: %w", name, err)
		}
		stmts = append(stmts, string(content))
	}
	return stmts, nil
}
