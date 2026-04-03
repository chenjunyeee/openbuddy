# buddy-desktop：OpenClaw 一键配置（克隆 / 安装 / 启动 + 孵化）

> **给 OpenClaw 从零跑通**：请先读 **[OPENCLAW_AGENT_RUNBOOK.md](./OPENCLAW_AGENT_RUNBOOK.md)**（含克隆 [openbuddy](https://github.com/chenjunyeee/openbuddy)、构建、写 pending、启动、验收）。本文档为 **pending 格式与文件说明** 的补充参考。

本文档供在本机运行的 **OpenClaw**（或其它自动化代理）按步骤执行，在**不写 UI** 的前提下完成：

1. 安装并启动 buddy-desktop  
2. 写入 **OpenClaw 网关 URL + Token**（与同目录下手动 `/openclaw` 等价）  
3. **孵化**：固定 `userID`、写入性格（可缺省则由应用随机）、`hatchLocked` 锁定；**显示名为英文物种 id**（由 `userID` 与 buddy roll 算法决定，**非**用户在 pending 里起名）  
4. 重启应用后桌宠外形与 `companion.name`（= 物种）由 `userID` 确定性推导，可直接对话  

---

## 1. 获取 Electron `userData` 路径

buddy-desktop 所有配置文件都在 **Electron 用户目录** 下（因 OS / 安装方式而异）。

**推荐**：安装依赖后在本机执行一次：

```bash
cd /path/to/repo
npm install
./node_modules/.bin/electron . --buddy-print-paths
```
（stdout 为纯 JSON；勿对 `npm run start:print-paths` 的整段 stdout 直接 `JSON.parse`。）

将打印一段 JSON，例如：

```json
{
  "userData": "/Users/you/Library/Application Support/buddy-desktop",
  "bootstrapPending": "/Users/you/.../buddy-bootstrap-pending.json",
  "profile": "/Users/you/.../buddy-profile.json",
  "openclaw": "/Users/you/.../buddy-openclaw.json",
  "bootstrapApplied": "/Users/you/.../buddy-bootstrap-applied.json"
}
```

把其中的 **`bootstrapPending`** 路径用于「待消费」文件；**`userData`** 用于文档中的变量 `$USER_DATA`。

> 若暂时跳过该命令：`userData` 在 macOS 上多为  
> `~/Library/Application Support/buddy-desktop`  
> Windows 多为 `%APPDATA%/buddy-desktop`，Linux 多为 `~/.config/buddy-desktop`（以实际 `app.getPath('userData')` 为准）。

---

## 2. 待消费文件：`buddy-bootstrap-pending.json`

在 **启动 buddy-desktop 之前**（或启动后立刻下一次启动前），向 **`bootstrapPending`** 路径写入 **完整 JSON**（UTF-8）。

### 2.1 格式（`version` 必须为 `1`）

```json
{
  "version": 1,
  "openclaw": {
    "url": "http://127.0.0.1:18789",
    "token": "你的网关 Token"
  },
  "hatch": {
    "userID": "openclaw-hatch-唯一稳定字符串",
    "personality": "性格要点，传给系统提示（英文一句为佳）；可省略则由应用随机生成",
    "hatchedAt": 1743465600000
  }
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `openclaw.url` | 是 | 网关 Base URL；无协议时可由应用补 `http://`，建议写全。 |
| `openclaw.token` | 是 | 与当前 OpenClaw 网关认证方式一致。 |
| `hatch.userID` | 是 | **永久绑定外形**；同一字符串在同一版本 buddy 算法下种族/稀有度等固定。请使用 UUID 或项目级唯一 id。 |
| `hatch.personality` | 否 | 性格描述，≤200 字符；缺省时应用按同一 `userID` 本地随机英文一句。 |
| `hatch.hatchedAt` | 否 | Unix 毫秒时间戳；缺省则使用应用消费时的当前时间。 |

> **`hatch.name` 已废弃**：profile 中 `companion.name` 恒为 roll 得到的**英文物种 id**（如 `duck`、`voidling`），与用户在 pending 里填名无关。旧 pending 若仍含 `name`，应用将忽略该字段。  

### 2.2 幂等与冲突

- **若已有 `buddy-profile.json` 且 `hatchLocked === true`**：本次 **pending 不会被应用**，pending 文件会改名为 `buddy-bootstrap-skipped-<timestamp>.json`（避免死循环）。需更换环境时请**人工删除** profile / 或用新机器。  
- 成功应用后：pending 被删除，并生成 **`buddy-bootstrap-applied.json`**（审计用，可人工删除）。  
- **OpenClaw 凭证**：写入 `buddy-openclaw.json`，与手动 `/openclaw` 一致；之后仍可在应用内用 `/openclaw` **更新 URL/Token**（`hatchLocked` **不**锁网关）。

---

## 3. OpenClaw 建议自动化步骤（示例）

以下假设仓库已克隆到 `$REPO`，且本机已有 Node / npm。

```bash
# 1) 安装与构建（按需）— 仓库示例：https://github.com/chenjunyeee/openbuddy
cd "$REPO/openbuddy"
npm ci
npm run build

# 2) 打印路径（stdout 仅为 JSON）
export PATHS_JSON="$(./node_modules/.bin/electron . --buddy-print-paths)"
PENDING="$(node -e 'console.log(JSON.parse(process.env.PATHS_JSON).bootstrapPending)')"

# 3) 写入 pending（由 OpenClaw 替换环境变量）
#    OPENCLAW_GATEWAY_URL / OPENCLAW_GATEWAY_TOKEN / BUDDY_HATCH_USER_ID / BUDDY_PERSONALITY（性格可空）
cat > "$PENDING" <<EOF
{
  "version": 1,
  "openclaw": {
    "url": "${OPENCLAW_GATEWAY_URL}",
    "token": "${OPENCLAW_GATEWAY_TOKEN}"
  },
  "hatch": {
    "userID": "${BUDDY_HATCH_USER_ID}",
    "personality": "${BUDDY_PERSONALITY}"
  }
}
EOF

# 4) 启动应用（生产包替换为你的可执行文件）
npm run start:dist
```

**要点**：必须先写好 **`buddy-bootstrap-pending.json`**，再**第一次**启动消费它的那次进程；或启动前写好，下一次冷启动也会消费（主进程在 `ready` 时先处理 pending）。

---

## 4. 文件一览（`userData` 内）

| 文件 | 作用 |
|------|------|
| `buddy-bootstrap-pending.json` | 待应用的一键配置（应用后删除） |
| `buddy-bootstrap-applied.json` | 最近一次成功应用的副本 |
| `buddy-bootstrap-skipped-*.json` | 已锁定仍写入 pending 时的跳过记录 |
| `buddy-profile.json` | 持久化 `userID`、`companion`、`hatchLocked` |
| `buddy-openclaw.json` | 网关 `url` + `token` |
| `buddy-desktop-prefs.json` | 窗口位置（与孵化无关） |

---

## 5. 仅配 OpenClaw、不自动化孵化

可不写 `buddy-bootstrap-pending.json`，继续让用户在输入框使用：

- `/openclaw <网关> <Token>` 或 `/openclaw <Token>`（本机默认 URL 见应用内引导）

此时 **`buddy-profile.json` 不存在**时，渲染进程仍使用内置默认演示配置（未锁定）；需要「固定外形 + 锁定」时请使用本文档第 2 节。

---

## 6. 校验清单

- [ ] `npm run build` 成功  
- [ ] `./node_modules/.bin/electron . --buddy-print-paths` 能打印可解析的 JSON  
- [ ] pending 已写入且 JSON 合法  
- [ ] 启动后 `buddy-openclaw.json` 与 `buddy-profile.json` 存在，`profile.hatchLocked === true`  
- [ ] 应用内发一句普通消息，能走 OpenClaw 返回回复  

如有问题，查看主进程控制台日志前缀 `[buddy-bootstrap]`。
