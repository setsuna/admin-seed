# admin-seed

从 `meeting-api`(Go) + `admin-backend`(React) 剥离出的**通用后台种子项目**，
只保留框架层与系统管理能力，不含任何业务域代码。

新项目从这里起步：`cp -R admin-seed your-project`，改模块名，然后往里长业务。

```
admin-seed/
├── api/    Go 1.21+ / Gin / Squirrel / JWT / SQLite·MySQL
└── web/    React 18 / TypeScript / Vite / TailwindCSS / TanStack Query / Zustand
```

## 快速开始

```bash
# 后端
cd api
cp .env.example .env          # 默认 sqlite + 8080 端口，可在 .env 里改 SERVER_PORT
go mod tidy && go run ./cmd/server

# 前端（另开终端）
cd web
npm install && npm run dev
```

默认账号（见 `api/internal/database/seed/seed.go`）：

| 账号 | 角色 | 初始密码 |
|---|---|---|
| admin | admin 管理员 | 1234QWer |
| secadm | security_admin 安全管理员 | 1234QWer |
| sysadm | system_admin 系统管理员 | 1234QWer |
| auditadm | audit_admin 审计员 | 1234QWer |
| user | user 普通用户 | 1234QWer |

**上生产前务必改掉默认密码和 `JWT_SECRET`。**

前后端一体部署：`cd web && npm run build && cp -R dist ../api/static`，
Go 服务会把 `./static` 作为 SPA 根目录并处理前端路由 fallback。

## 种子包含什么

**后端（api，约 2.0 万行 / 108 个 Go 文件）**

| 层 | 内容 |
|---|---|
| 框架 | Squirrel 查询构建器封装、泛型 Repository 基类、跨 Repository 事务、统一响应与错误码、请求校验、JWT、日志、限流、CORS、安全头、RequestID |
| 审计 | 零埋点审计：注册一次 Fetcher，中间件在写操作前后自动取库内快照，生成字段级「A 改为 B」变更明细 |
| 系统管理 | 认证（登录/登出/刷新/改密）、用户、角色、权限、部门、数据字典、菜单配置、安全策略、操作日志、仪表板 |
| 实时 | WebSocket 管理器 + 通用系统通知处理器 |
| 数据库 | SQLite 与 **MySQL 双驱动**，schema 按文件分组内嵌，启动自动建表 + 种子数据 |

**前端（web，约 2.0 万行 / 124 个 TS 文件）**

| 层 | 内容 |
|---|---|
| UI | 32 个基础组件（Button/Card/Modal/Table/Select/Tabs/Sheet/Popover/Tooltip…） |
| 布局 | 侧边栏、主布局、权限初始化、空闲超时锁定、WebSocket 初始化、主题切换 |
| 数据 | 统一 httpClient（自动解包 data、401 跳登录、错误码分类）、TanStack Query、Zustand 切片（auth/ui/app） |
| 页面 | 登录、仪表板、用户管理、部门管理、数据字典、安全策略、角色权限、操作日志 |
| 其他 | 菜单驱动的动态路由生成、面包屑、权限守卫、通知系统 |

## 剥离时做的改造

1. **权限模型加了数据范围（data_scope）**
   原项目按角色枚举硬编码可见性。种子在 `roles` 表加了
   `data_scope`（1-全部 2-自定义 3-本部门 4-本部门及以下 5-仅本人）
   与 `role_departments` 关联表，多级代理 / 加盟 / 分公司场景直接可用。

2. **补齐了 MySQL schema**
   原项目只实现了 SQLite（`MySQLStatements()` 是个 TODO）。
   种子按 SQLite 版一一对应写了 `schema/mysql/*.sql`，并在应用层按分号切分语句
   逐条执行，不要求连接串开 `multiStatements`。

3. **密码传输加密改成可开关且两端对齐**
   前端原本写死 RSA 加密、后端有开关，两边不一致会登录失败且报错是
   "用户名或密码错误"，极难排查。现在两端都由开关控制：
   `VITE_CRYPTO_ENABLE`（前端）必须与 `CRYPTO_ENABLE`（后端）一致，种子默认都关。

4. **仪表板改为系统管理域统计**，时间条件全部在 Go 侧算好后参数传入，
   不使用 `date('now')` / `CURDATE()` 这类方言函数，SQLite 与 MySQL 行为一致。

5. **菜单种子精简为 7 项**，与种子自带页面一一对应，不留点不开的死菜单。

## 剥离时丢掉了什么

会议、投票、议程、参会人、归档、打包分发、电子铭牌、设备挂载、离线平板 License、
环境校验、文件模块（与会议/密级耦合过深，业务项目按需自建）。

`model_style` 之类的遗留表未做保留。原项目的密级（security_level）体系**未拆除**，
`users.security_level` 字段与相关字典仍在——拆它会牵动 model / service / dto / 前端多处，
风险大于收益。用不到就忽略，字段有默认值不影响使用。

## 加一个新业务模块

后端（以「设备」为例）：

1. `internal/model/device.go` 定义模型
2. `internal/dto/request|response/device.go` 定义出入参
3. `internal/repository/device.go` 继承 `baseRepository[model.Device]`，
   并在 `interfaces.go` / `manager.go` / `transaction.go` 三处登记 `Device()`
4. `internal/service/device_service.go` 写业务逻辑
5. `internal/handler/device/{device.go,routes.go}` 写 handler 与路由
6. `internal/handler/handlers.go` 构造并挂到 `Handlers`
7. `internal/router/router.go` 调用 `device.RegisterDeviceRoutes(protected, h.Device)`
8. `internal/database/schema/{sqlite,mysql}/1x_device.sql` 建表，并在
   `schema_sqlite.go` / `schema_mysql.go` 的文件清单里按依赖顺序登记
9. 需要审计就在 `audit_fetchers.go` 加一行 `audit.RegisterMany(...)`

前端：

1. `src/types/domain/device.types.ts` 定义类型
2. `src/services/api/device.api.ts` 写 API
3. `src/hooks/useDevice.ts` 封装 TanStack Query
4. `src/pages/DeviceListPage.tsx` 写页面
5. `src/utils/routeGenerator.tsx` 登记懒加载组件（key 要与菜单一致）
6. 数据库 `MENU_ITEMS` 字典加一条菜单项

## 视觉规范

后台的层级靠**背景灰度**建立，不靠阴影：

| 层 | token | 值 | 说明 |
|---|---|---|---|
| 页面底 | `--bg-page` | `#F5F5F5` | 内容区最外层，用 `bg-bg-page` |
| 卡片 / 表格 | `--card` | `#FFFFFF` | 白底，1px 边框 |
| 边框 | `--border` | `#E8E8E8` | 卡片与分隔线 |

两条硬规则：

1. **页面底与卡片必须拉开 ≥4% 灰度。** 原值是 `#FAFAFA`（只差 2%），
   在表格页会和白色表格糊成一片，看着像"脏白"而不像刻意的灰。
2. **不要用纯白当页面底。** shadcn 的 `--background` 必须保持纯白（大量组件默认透出它），
   页面外层一律用 `bg-bg-page`。纯白底 + 白卡片时，卡片边界、分页条、表头全部失去容器感。

卡片默认**只有边框、没有常驻阴影**——浅色系里阴影几乎不可见，反而让边缘发糊。
需要"浮起"效果时用 `<Card variant="lift">`，hover 才加阴影。

## 排错

**启动后浏览器报 500 / 页面打不开**，先按这三步查：

1. **是不是有旧进程占着端口。** `go run` 起的进程叫 `server`，用
   `pkill -f "bin/server"` 杀不掉，得 `lsof -nP -iTCP:<端口> -sTCP:LISTEN`
   看谁占着、再按 PID kill。端口被占时服务会 FATAL 退出，
   而浏览器打到的是那个旧进程，行为与当前代码不一致。
2. **改了表结构没重编译。** Repository 用 `SELECT *` + 按列序 Scan，
   加了字段但二进制是旧的，会 500 并在服务端日志里报
   `expected N destination arguments in Scan, not M`。
3. **前后端加密开关不一致。** `VITE_CRYPTO_ENABLE` 与 `CRYPTO_ENABLE`
   必须同为 true 或同为 false，否则登录必失败（且提示是"用户名或密码错误"）。

服务端日志在 `logs/`，或直接看启动时的 stdout —— 每个 500 都会打印
`[ERROR] Repository错误` 及具体 SQL 错误，比浏览器控制台的信息多得多。

## 已知待办

- `users.security_level` 密级体系未拆除（见上）
- 字典种子里还留着 `MEETING_STATUS` / `ROOM_TYPE` / `DEVICE_TYPE` 三条会议遗留字典，
  新项目可直接在「数据字典」页面删掉
- Repository 层多处使用 `SELECT *` + 按列序 `Scan`，加字段时必须同步改 Scan
  顺序，否则报 "expected N destination arguments"。建议后续改成显式列名。
- MySQL schema 已按 SQLite 版翻译并做了语法检查，但**尚未在真实 MySQL 实例上跑过**，
  首次使用请在测试库验证

## 验证状态

- `go build ./...` 通过，`go vet ./...` 无输出
- `npx tsc --noEmit` 0 错误，`npm run build` 通过
- SQLite 下实际启动：9 张表 + 2 个视图建成，5 个种子账号写入
- 登录 → 仪表板 → 用户管理 → 数据字典 浏览器端全流程实测通过
- API 冒烟：auth/me、users、users/stats、roles、departments、departments/tree、
  dashboard、dictionaries、policy、logs 全部 200
