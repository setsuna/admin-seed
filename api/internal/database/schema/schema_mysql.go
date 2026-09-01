package schema

import (
	"embed"
	"fmt"
	"regexp"
	"strings"
)

// mysqlFS 内嵌所有 MySQL 建表脚本（纯 DDL，不含种子数据）。
// 文件名前缀数字决定加载顺序，且已按外键依赖排序：
//
//	01_core  无外键依赖的基础表（users, roles, departments, 字典, 安全策略）
//	03_log   操作日志 + 视图
//
// 业务项目请新增 1x_xxx.sql，并在下方 mysqlFiles 中按依赖顺序登记。
//
//go:embed mysql/*.sql
var mysqlFS embed.FS

// mysqlFiles 显式声明加载顺序，避免依赖目录遍历的隐式排序。
var mysqlFiles = []string{
	"mysql/01_core.sql",
	"mysql/03_log.sql",
}

// stmtSplitter 按分号切分语句。
// MySQL 驱动默认不允许一次 Exec 多条语句（除非连接串开 multiStatements），
// 因此这里在应用层切分后逐条执行，避免对连接串做额外要求。
var stmtSplitter = regexp.MustCompile(`;\s*\n`)

// MySQLStatements 返回 MySQL 建表脚本（按顺序，已按语句切分）。
func MySQLStatements() ([]string, error) {
	var stmts []string
	for _, name := range mysqlFiles {
		content, err := mysqlFS.ReadFile(name)
		if err != nil {
			return nil, fmt.Errorf("读取 schema 文件 %s 失败: %w", name, err)
		}
		for _, raw := range stmtSplitter.Split(string(content), -1) {
			if s := stripSQLComments(raw); s != "" {
				stmts = append(stmts, s)
			}
		}
	}
	return stmts, nil
}

// stripSQLComments 去掉整行 `--` 注释与首尾空白；
// 若剩余内容为空则返回空串，调用方据此跳过。
func stripSQLComments(sql string) string {
	var b strings.Builder
	for _, line := range strings.Split(sql, "\n") {
		if t := strings.TrimSpace(line); t == "" || strings.HasPrefix(t, "--") {
			continue
		}
		b.WriteString(line)
		b.WriteString("\n")
	}
	return strings.TrimSpace(b.String())
}
