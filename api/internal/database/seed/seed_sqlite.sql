-- ============================================================================
-- seed_sqlite.sql — 初始种子数据（幂等：全部使用 INSERT OR IGNORE）
--
-- 说明：
--   * 本文件只包含“静态”种子：角色、字典、字典项（菜单/权限/图标等）。
--   * 动态种子（默认管理员账号需 bcrypt、默认部门、默认安全策略、基础字典）
--     由 seed/seed.go 在 Go 侧处理，因其涉及运行时计算（密码哈希、时间戳）。
--   * 原 sql_tables.go 中 SECURITY_LEVELS 字典曾被 INSERT 两次（一次带时间戳、
--     一次不带），此处已合并为一份，仅保留字典项定义。
-- ============================================================================

-- ============================================================================
-- 角色
-- ============================================================================
INSERT OR IGNORE INTO roles (id, name, code, description, permissions, status, type, level, is_built_in, metadata) VALUES
('1', '管理员', 'admin', '拥有所有权限',
 '["dashboard:view","meeting:read","meeting:write","meeting:delete","meeting:manage","sync:read","sync:manage","personnel:read","personnel:write","personnel:delete","personnel:manage","role:read","role:write","role:delete","role:manage","security:read","security:manage","security:user:manage","org:read","org:manage","staff:read","staff:manage","user:read","user:write","user:delete","user:manage","system:dict:read","system:dict:manage","system:config:read","system:config:manage","system:logs:read","logs:admin:read","logs:audit:read","device:read","device:manage","device:clear","system:nameplate:manage"]',
 'active', 'system', 1, 1,
 '{"color":"#DC2626","icon":"shield","category":"管理员"}');

INSERT OR IGNORE INTO roles (id, name, code, description, permissions, status, type, level, is_built_in, metadata) VALUES
('2', '安全管理员', 'security_admin', '负责安全管理和用户权限管理',
 '["dashboard:view","security:read","security:manage","security:user:manage","user:read","user:write","user:delete","user:manage","personnel:read","personnel:write","personnel:manage","logs:admin:read","system:config:read","system:config:manage"]',
 'active', 'system', 2, 1,
 '{"color":"#EF4444","icon":"shield-check","category":"管理员"}');

INSERT OR IGNORE INTO roles (id, name, code, description, permissions, status, type, level, is_built_in, metadata) VALUES
('3', '系统管理员', 'system_admin', '负责系统配置和组织架构管理',
 '["dashboard:view","org:read","org:manage","personnel:read","personnel:manage","staff:read","staff:manage","device:read","device:manage","device:clear","system:nameplate:manage"]',
 'active', 'system', 2, 1,
 '{"color":"#F59E0B","icon":"settings","category":"管理员"}');

INSERT OR IGNORE INTO roles (id, name, code, description, permissions, status, type, level, is_built_in, metadata) VALUES
('4', '审计员', 'audit_admin', '负责审计日志查看和监控告警',
 '["dashboard:view","logs:audit:read"]',
 'active', 'system', 2, 1,
 '{"color":"#8B5CF6","icon":"file-search","category":"管理员"}');

INSERT OR IGNORE INTO roles (id, name, code, description, permissions, status, type, level, is_built_in, metadata) VALUES
('5', '普通用户', 'user', '基础会议查看和打包权限',
 '["dashboard:view","meeting:read","meeting:write","meeting:delete","meeting:manage","sync:read","sync:manage","device:clear"]',
 'active', 'system', 3, 1,
 '{"color":"#10B981","icon":"user","category":"普通用户"}');

-- ============================================================================
-- 字典：安全级别（合并原两处重复定义，统一为一份）
-- ============================================================================
INSERT OR IGNORE INTO data_dicts (id, dict_code, dict_name, dict_type, status, item_count, remark)
VALUES ('0ef95cc4-1b81-465e-b636-99eea3d0b5df', 'SECURITY_LEVELS', '安全级别', 'security', 'enabled', 4, NULL);

INSERT OR IGNORE INTO dict_items (id, dict_code, code, name, value, status, sort) VALUES
('109', 'SECURITY_LEVELS', 'secret', '机密', 'secret', 'enabled', 3),
('110', 'SECURITY_LEVELS', 'confidential', '秘密', 'confidential', 'enabled', 2),
('111', 'SECURITY_LEVELS', 'internal', '内部', 'internal', 'enabled', 1);

-- ============================================================================
-- 字典：文件类型
-- ============================================================================
INSERT OR IGNORE INTO data_dicts (id, dict_code, dict_name, dict_type, status, item_count, remark)
VALUES ('a0499fe5-6adc-40b8-8edf-a87118206d4c', 'FILE_TYPES', '文件类型', 'file', 'enabled', 9, NULL);

-- ============================================================================
-- 字典：设备类型
-- ============================================================================
INSERT OR IGNORE INTO data_dicts (id, dict_code, dict_name, dict_type, status, item_count, remark)
VALUES ('1', 'DEVICE_TYPE', '设备类型', 'device', 'enabled', 5, '会议平板设备类型分类');

INSERT OR IGNORE INTO dict_items (id, dict_code, code, name, value, status, sort) VALUES
('1', 'DEVICE_TYPE', 'TABLET', '平板设备', '1', 'enabled', 1),
('2', 'DEVICE_TYPE', 'PHONE', '手机设备', '2', 'enabled', 2),
('3', 'DEVICE_TYPE', 'PC', '电脑设备', '3', 'enabled', 3),
('4', 'DEVICE_TYPE', 'TV', '电视设备', '4', 'enabled', 4),
('5', 'DEVICE_TYPE', 'PROJECTOR', '投影设备', '5', 'disabled', 5);

-- ============================================================================
-- 字典：会议状态
-- ============================================================================
INSERT OR IGNORE INTO data_dicts (id, dict_code, dict_name, dict_type, status, item_count, remark)
VALUES ('2', 'MEETING_STATUS', '会议状态', 'meeting', 'enabled', 4, '会议流程状态定义');

INSERT OR IGNORE INTO dict_items (id, dict_code, code, name, value, status, sort) VALUES
('6', 'MEETING_STATUS', 'PREPARATION', '准备中', 'preparation', 'enabled', 1),
('7', 'MEETING_STATUS', 'DISTRIBUTABLE', '可下发', 'distributable', 'enabled', 2),
('8', 'MEETING_STATUS', 'IN_PROGRESS', '进行中', 'in_progress', 'enabled', 3),
('9', 'MEETING_STATUS', 'CLOSED', '已关闭', 'closed', 'enabled', 4);

-- ============================================================================
-- 字典：会议室类型
-- ============================================================================
INSERT OR IGNORE INTO data_dicts (id, dict_code, dict_name, dict_type, status, item_count, remark)
VALUES ('3', 'ROOM_TYPE', '会议室类型', 'room', 'disabled', 8, '会议室场地类型分类');

INSERT OR IGNORE INTO dict_items (id, dict_code, code, name, value, status, sort) VALUES
('10', 'ROOM_TYPE', 'CONFERENCE_ROOM', '会议室', '1', 'enabled', 1),
('11', 'ROOM_TYPE', 'BOARD_ROOM', '董事会议室', '2', 'enabled', 2),
('12', 'ROOM_TYPE', 'TRAINING_ROOM', '培训室', '3', 'disabled', 3),
('13', 'ROOM_TYPE', 'AUDITORIUM', '礼堂', '4', 'enabled', 4),
('14', 'ROOM_TYPE', 'VIDEO_ROOM', '视频会议室', '5', 'enabled', 5),
('15', 'ROOM_TYPE', 'BREAK_ROOM', '茶歇室', '6', 'enabled', 6),
('16', 'ROOM_TYPE', 'PHONE_BOOTH', '电话亭', '7', 'enabled', 7),
('17', 'ROOM_TYPE', 'OUTDOOR_SPACE', '户外场地', '8', 'enabled', 8);

-- ============================================================================
-- 字典：文件格式
-- ============================================================================
INSERT OR IGNORE INTO data_dicts (id, dict_code, dict_name, dict_type, status, item_count, remark)
VALUES ('4', 'FILE_FORMAT', '文件格式', 'file', 'enabled', 12, '支持的文件格式类型');

INSERT OR IGNORE INTO dict_items (id, dict_code, code, name, value, status, sort) VALUES
('18', 'FILE_FORMAT', 'PDF', 'PDF文档', 'pdf', 'enabled', 1),
('19', 'FILE_FORMAT', 'DOCX', 'Word文档', 'docx', 'enabled', 2),
('20', 'FILE_FORMAT', 'PPTX', 'PowerPoint演示文稿', 'pptx', 'enabled', 3),
('21', 'FILE_FORMAT', 'XLSX', 'Excel表格', 'xlsx', 'enabled', 4),
('22', 'FILE_FORMAT', 'TXT', '文本文件', 'txt', 'enabled', 5),
('23', 'FILE_FORMAT', 'JPG', 'JPEG图片', 'jpg', 'enabled', 6),
('24', 'FILE_FORMAT', 'PNG', 'PNG图片', 'png', 'enabled', 7),
('25', 'FILE_FORMAT', 'MP4', 'MP4视频', 'mp4', 'enabled', 8),
('26', 'FILE_FORMAT', 'AVI', 'AVI视频', 'avi', 'disabled', 9),
('27', 'FILE_FORMAT', 'MP3', 'MP3音频', 'mp3', 'enabled', 10),
('28', 'FILE_FORMAT', 'WAV', 'WAV音频', 'wav', 'enabled', 11),
('29', 'FILE_FORMAT', 'ZIP', 'ZIP压缩包', 'zip', 'enabled', 12);

-- ============================================================================
-- 字典：菜单分组
-- ============================================================================
INSERT OR IGNORE INTO data_dicts (id, dict_code, dict_name, dict_type, status, item_count, remark)
VALUES ('6', 'MENU_GROUPS', '菜单分组', 'menu', 'enabled', 4, '系统菜单分组定义');

INSERT OR IGNORE INTO dict_items (id, dict_code, code, name, value, status, sort) VALUES
('36', 'MENU_GROUPS', 'WORKSPACE', '工作台', 'workspace', 'enabled', 1),
('39', 'MENU_GROUPS', 'PERSONNEL', '人员管理', 'personnel', 'enabled', 2),
('40', 'MENU_GROUPS', 'ORGANIZATION', '组织架构', 'organization', 'enabled', 3),
('41', 'MENU_GROUPS', 'SYSTEM', '系统管理', 'system', 'enabled', 4);

-- ============================================================================
-- 字典：菜单项
-- ============================================================================
INSERT OR IGNORE INTO data_dicts (id, dict_code, dict_name, dict_type, status, item_count, remark)
VALUES ('7', 'MENU_ITEMS', '菜单项', 'menu', 'enabled', 7, '系统菜单项配置');

-- 种子只登记自带页面的菜单。业务项目新增页面时：
--   1) 在此追加一条 MENU_ITEMS（value 为 JSON：key/label/icon/path/permissions/group）
--   2) 在前端 utils/routeGenerator.tsx 里登记同名 key 的懒加载组件
-- 两处 key 必须一致，否则菜单点不开。
INSERT OR IGNORE INTO dict_items (id, dict_code, code, name, value, status, sort) VALUES
('43', 'MENU_ITEMS', 'DASHBOARD', '仪表板', '{"key":"dashboard","label":"仪表板","icon":"BarChart3","path":"/","permissions":["dashboard:view"],"group":"workspace"}', 'enabled', 1),
('48', 'MENU_ITEMS', 'ROLE_PERMISSIONS', '角色权限', '{"key":"role-permissions","label":"角色权限","icon":"Shield","path":"/role-permissions","permissions":["role:manage"],"group":"personnel"}', 'enabled', 2),
('50', 'MENU_ITEMS', 'DEPARTMENTS', '部门管理', '{"key":"departments","label":"部门管理","icon":"Building","path":"/departments","permissions":["org:manage"],"group":"organization"}', 'enabled', 3),
('51', 'MENU_ITEMS', 'STAFF_MANAGEMENT', '用户管理', '{"key":"staff-management","label":"用户管理","icon":"UserCheck","path":"/users","permissions":["staff:manage"],"group":"organization"}', 'enabled', 4),
('52', 'MENU_ITEMS', 'DATA_DICTIONARY', '数据字典', '{"key":"data-dictionary","label":"数据字典","icon":"Book","path":"/data-dictionary","permissions":["system:dict:read"],"group":"system"}', 'enabled', 5),
('53', 'MENU_ITEMS', 'BASIC_CONFIG', '安全策略', '{"key":"basic-config","label":"安全策略","icon":"Settings","path":"/basic-config","permissions":["system:config:read"],"group":"system"}', 'enabled', 6),
('55', 'MENU_ITEMS', 'ADMIN_LOGS', '操作日志', '{"key":"admin-logs","label":"操作日志","icon":"ScrollText","path":"/admin-logs","permissions":["logs:admin:read"],"group":"system"}', 'enabled', 7);

-- ============================================================================
-- 字典：可用图标
-- ============================================================================
INSERT OR IGNORE INTO data_dicts (id, dict_code, dict_name, dict_type, status, item_count, remark)
VALUES ('8', 'MENU_ICONS', '可用图标', 'menu', 'enabled', 15, '菜单可用图标列表');

INSERT OR IGNORE INTO dict_items (id, dict_code, code, name, value, status, sort) VALUES
('59', 'MENU_ICONS', 'BAR_CHART_3', '条形图3', 'BarChart3', 'enabled', 1),
('60', 'MENU_ICONS', 'CALENDAR', '日历', 'Calendar', 'enabled', 2),
('61', 'MENU_ICONS', 'USER', '用户', 'User', 'enabled', 3),
('62', 'MENU_ICONS', 'USERS', '用户组', 'Users', 'enabled', 4),
('63', 'MENU_ICONS', 'REFRESH_CW', '刷新', 'RefreshCw', 'enabled', 5),
('64', 'MENU_ICONS', 'SHIELD', '盾牌', 'Shield', 'enabled', 6),
('65', 'MENU_ICONS', 'LOCK', '锁', 'Lock', 'enabled', 7),
('66', 'MENU_ICONS', 'BUILDING', '建筑', 'Building', 'enabled', 8),
('67', 'MENU_ICONS', 'USER_CHECK', '用户检查', 'UserCheck', 'enabled', 9),
('68', 'MENU_ICONS', 'BOOK', '书本', 'Book', 'enabled', 10),
('69', 'MENU_ICONS', 'SETTINGS', '设置', 'Settings', 'enabled', 11),
('70', 'MENU_ICONS', 'FILE_TEXT', '文件文本', 'FileText', 'enabled', 12),
('71', 'MENU_ICONS', 'SCROLL_TEXT', '滚动文本', 'ScrollText', 'enabled', 13),
('72', 'MENU_ICONS', 'SEARCH', '搜索', 'Search', 'enabled', 14),
('73', 'MENU_ICONS', 'ALERT_TRIANGLE', '警告三角', 'AlertTriangle', 'enabled', 15);

-- ============================================================================
-- 字典：系统权限
-- ============================================================================
INSERT OR IGNORE INTO data_dicts (id, dict_code, dict_name, dict_type, status, item_count, remark)
VALUES ('9', 'PERMISSIONS', '系统权限', 'permission', 'enabled', 36, '系统所有权限定义');

INSERT OR IGNORE INTO dict_items (id, dict_code, code, name, value, status, sort) VALUES
('74', 'PERMISSIONS', 'dashboard:view', '仪表板查看', '{"category":"workspace","resource":"dashboard","action":"read","description":"查看仪表板"}', 'enabled', 1),
('75', 'PERMISSIONS', 'meeting:read', '会议查看', '{"category":"meeting","resource":"meeting","action":"read","description":"查看会议信息"}', 'enabled', 2),
('76', 'PERMISSIONS', 'meeting:write', '会议创建', '{"category":"meeting","resource":"meeting","action":"write","description":"创建会议"}', 'enabled', 3),
('77', 'PERMISSIONS', 'meeting:delete', '会议删除', '{"category":"meeting","resource":"meeting","action":"delete","description":"删除会议"}', 'enabled', 4),
('78', 'PERMISSIONS', 'meeting:manage', '会议管理', '{"category":"meeting","resource":"meeting","action":"manage","description":"全面管理会议"}', 'enabled', 5),
('79', 'PERMISSIONS', 'sync:read', '同步状态查看', '{"category":"sync","resource":"sync","action":"read","description":"查看同步状态"}', 'enabled', 6),
('80', 'PERMISSIONS', 'sync:manage', '同步管理', '{"category":"sync","resource":"sync","action":"manage","description":"管理同步设置"}', 'enabled', 7),
('81', 'PERMISSIONS', 'personnel:read', '人员查看', '{"category":"personnel","resource":"personnel","action":"read","description":"查看参会人员"}', 'enabled', 8),
('82', 'PERMISSIONS', 'personnel:write', '人员编辑', '{"category":"personnel","resource":"personnel","action":"write","description":"编辑人员信息"}', 'enabled', 9),
('83', 'PERMISSIONS', 'personnel:delete', '人员删除', '{"category":"personnel","resource":"personnel","action":"delete","description":"删除人员"}', 'enabled', 10),
('84', 'PERMISSIONS', 'personnel:manage', '人员管理', '{"category":"personnel","resource":"personnel","action":"manage","description":"管理参会人员"}', 'enabled', 11),
('85', 'PERMISSIONS', 'role:read', '角色查看', '{"category":"personnel","resource":"role","action":"read","description":"查看角色信息"}', 'enabled', 12),
('86', 'PERMISSIONS', 'role:write', '角色编辑', '{"category":"personnel","resource":"role","action":"write","description":"编辑角色权限"}', 'enabled', 13),
('87', 'PERMISSIONS', 'role:delete', '角色删除', '{"category":"personnel","resource":"role","action":"delete","description":"删除角色"}', 'enabled', 14),
('88', 'PERMISSIONS', 'role:manage', '角色管理', '{"category":"personnel","resource":"role","action":"manage","description":"管理角色权限"}', 'enabled', 15),
('89', 'PERMISSIONS', 'security:read', '密级查看', '{"category":"personnel","resource":"security","action":"read","description":"查看人员密级"}', 'enabled', 16),
('90', 'PERMISSIONS', 'security:manage', '密级管理', '{"category":"personnel","resource":"security","action":"manage","description":"管理人员密级"}', 'enabled', 17),
('91', 'PERMISSIONS', 'security:user:manage', '用户安全管理', '{"category":"security","resource":"user_security","action":"manage","description":"管理用户密码和状态"}', 'enabled', 35),
('92', 'PERMISSIONS', 'org:read', '组织查看', '{"category":"organization","resource":"organization","action":"read","description":"查看组织架构"}', 'enabled', 18),
('93', 'PERMISSIONS', 'org:manage', '组织管理', '{"category":"organization","resource":"organization","action":"manage","description":"管理组织架构"}', 'enabled', 19),
('94', 'PERMISSIONS', 'staff:read', '员工查看', '{"category":"organization","resource":"staff","action":"read","description":"查看员工信息"}', 'enabled', 20),
('95', 'PERMISSIONS', 'staff:manage', '员工管理', '{"category":"organization","resource":"staff","action":"manage","description":"管理员工信息"}', 'enabled', 21),
('96', 'PERMISSIONS', 'user:read', '用户查看', '{"category":"organization","resource":"user","action":"read","description":"查看用户信息"}', 'enabled', 31),
('97', 'PERMISSIONS', 'user:write', '用户创建', '{"category":"organization","resource":"user","action":"write","description":"创建用户"}', 'enabled', 32),
('98', 'PERMISSIONS', 'user:delete', '用户删除', '{"category":"organization","resource":"user","action":"delete","description":"删除用户"}', 'enabled', 33),
('99', 'PERMISSIONS', 'user:manage', '用户管理', '{"category":"organization","resource":"user","action":"manage","description":"全面管理用户"}', 'enabled', 34),
('100', 'PERMISSIONS', 'system:dict:read', '数据字典查看', '{"category":"system","resource":"dict","action":"read","description":"查看数据字典"}', 'enabled', 22),
('101', 'PERMISSIONS', 'system:dict:manage', '数据字典管理', '{"category":"system","resource":"dict","action":"manage","description":"管理数据字典"}', 'enabled', 23),
('102', 'PERMISSIONS', 'system:config:read', '系统配置查看', '{"category":"system","resource":"config","action":"read","description":"查看系统配置"}', 'enabled', 24),
('103', 'PERMISSIONS', 'system:config:manage', '系统配置管理', '{"category":"system","resource":"config","action":"manage","description":"管理系统配置"}', 'enabled', 25),
('104', 'PERMISSIONS', 'system:logs:read', '系统日志查看', '{"category":"system","resource":"logs","action":"read","description":"查看系统日志"}', 'enabled', 26),
('105', 'PERMISSIONS', 'logs:admin:read', '管理员日志查看', '{"category":"system","resource":"admin_logs","action":"read","description":"查看管理员操作日志"}', 'enabled', 27),
('106', 'PERMISSIONS', 'logs:audit:read', '审计日志查看', '{"category":"system","resource":"audit_logs","action":"read","description":"查看审计日志"}', 'enabled', 28),
('107', 'PERMISSIONS', 'monitor:alerts:read', '告警查看', '{"category":"monitoring","resource":"alerts","action":"read","description":"查看告警信息"}', 'enabled', 29),
('108', 'PERMISSIONS', 'monitor:alerts:manage', '告警处理', '{"category":"monitoring","resource":"alerts","action":"manage","description":"处理告警"}', 'enabled', 30),
('112', 'PERMISSIONS', 'device:read', '设备查看', '{"category":"system","resource":"device","action":"read","description":"查看设备信息"}', 'enabled', 36),
('113', 'PERMISSIONS', 'device:manage', '设备管理', '{"category":"system","resource":"device","action":"manage","description":"管理设备"}', 'enabled', 37),
('116', 'PERMISSIONS', 'device:clear', '设备数据清空', '{"category":"system","resource":"device","action":"clear","description":"清空设备所有会议数据（高危，不可逆）"}', 'enabled', 38),
('118', 'PERMISSIONS', 'system:nameplate:manage', '电子铭牌管理', '{"category":"system","resource":"nameplate","action":"manage","description":"管理电子铭牌模板与手势密码"}', 'enabled', 39);
