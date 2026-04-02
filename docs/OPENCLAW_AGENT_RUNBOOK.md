# OpenClaw 执行手册（精简版）：跑通 openbuddy 桌宠 + 本机对话

> **读者**：本机 OpenClaw / 可跑 shell 的代理。  
> **目标**：独立 Agent + 固定工作区 → 与用户对齐**显示名与性格** → 检出 [openbuddy](https://github.com/chenjunyeee/openbuddy) → 构建 → 写 `buddy-bootstrap-pending.json` → **用 Electron 启动**，与已运行网关聊天。  
> **pending 字段详解**：[openclaw-bootstrap.md](./openclaw-bootstrap.md)。

---

## 一、核心流程（顺序不可颠倒）

| 步 | 做什么 |
|----|--------|
| 1 | **建独立 Agent**，专用「桌宠 / openbuddy」；Shell / Tools / Soul **同一套 `$REPO_ROOT` 绝对路径**（可设 `OPENBUDDY_REPO_ROOT`）。 |
| 2 | **划定工作区目录**；下文 **`$REPO_ROOT`** = 检出后含 `package.json`、`electron/`、`src/` 的仓库根。 |
| 3 | **向用户确认桌宠**：只要 **`hatch.name`**、**`personality`**（见下文约定）。**不要问 userID**：由代理 **现场随机 UUID**（或 `crypto.randomUUID()`），**勿**向用户索要。用户未说清名/性格前 **不 clone、不 npm**。 |
| 4 | 在工作区根 **`git clone`** openbuddy（空目录可 `git clone … .`）。 |
| 5 | `npm ci` → `npm run build`（无 lock 用 `npm install`）。 |
| 6 | **`./node_modules/.bin/electron . --buddy-print-paths`** → 记下 JSON 里的 **`bootstrapPending`**、**`userData`**（见 §3）。 |
| 7 | 写入 **`buddy-bootstrap-pending.json`**（`version: 1`，网关 + hatch）。 |
| 8 | **`npm run start:dist`**（开发联调用 `npm run dev`）。首次 ready 会消费 pending、锁定孵化。 |
| 9 | **验收**（§5）。 |

**`/update`**：在 **`$REPO_ROOT`** 内 `git pull` → `npm ci` / `npm run build` → 重启 `npm run start:dist`（或等价）；Soul / Agent / Tools 路径与之一致。

**存活巡检**：Agent 还须配置 **每 5 分钟** 的定时检查（见 **§九**）；进程不在则 **提示用户**。

---

## 二、Agent 约定（问用户 vs 自动生成）

- **`hatch.name`**：须用户指定或确认；禁止仅为跑通默认 `buddy` / `test`。未答 → **先问再写** pending。用户说「随便」→ 可代选，**回显**最终名。  
- **`personality`**：优先用户原话；无则一句短确认，勿自写长篇人设。  
- **`hatch.userID`**：**不向用户提问**。代理生成 **UUID**（例：`550e8400-e29b-41d4-a716-446655440000`）；同一字符串在本版本 buddy 算法下外形固定。**勿在日志/录屏里泄露 Token**；`userID` 可记在代理侧便于排障。

---

## 三、前置与路径（避坑）

- **网关**：Base URL + Token；勿写入日志/录屏。  
- **环境**：`git`；**Node 20+**、`npm`。  
- **userData 目录名** = `package.json` 的 **`"name"`**（当前 **`buddy-desktop`**，≠ 文件夹名 `openbuddy`）。

**禁止**：用 **`node electron/main.cjs`** 启动主进程 → `app` API 不可用，会报 `getPath` 等错。**必须**：`npm run start:dist`、`npm run dev`、`npx electron .`、或 **`./node_modules/.bin/electron .`**。

**取路径（stdout 须为纯 JSON）**：

```bash
cd "$REPO_ROOT"
./node_modules/.bin/electron . --buddy-print-paths
```

勿对 **`npm run start:print-paths`** 的整段 stdout 直接 `JSON.parse`（npm 可能夹横幅）；优先直接调 **`electron`**。

**网络慢（按需）**：`npm config set registry https://registry.npmmirror.com`；装依赖前可 `export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"` 等（见旧版细节或 README）。Git 可换镜像 / `ghproxy`。

---

## 四、克隆与构建

```bash
cd "$REPO_ROOT"   # 已为空目录或团队约定根
git clone https://github.com/chenjunyeee/openbuddy.git .
npm ci
npm run build
```

克隆到**子目录**时，`$REPO_ROOT` 必须指向含 `package.json` 的那一层，并与 Tools 声明一致。

---

## 五、写 pending 与启动

**变量**：`OPENCLAW_GATEWAY_URL`、`OPENCLAW_GATEWAY_TOKEN`、**`BUDDY_HATCH_USER_ID`**（代理随机 UUID）、**`BUDDY_DISPLAY_NAME`**、**`BUDDY_PERSONALITY`**（均与用户约定一致）。

```bash
PENDING="<上一步 JSON 的 bootstrapPending 绝对路径>"

cat > "$PENDING" <<EOF
{
  "version": 1,
  "openclaw": {
    "url": "${OPENCLAW_GATEWAY_URL}",
    "token": "${OPENCLAW_GATEWAY_TOKEN}"
  },
  "hatch": {
    "userID": "${BUDDY_HATCH_USER_ID}",
    "name": "${BUDDY_DISPLAY_NAME}",
    "personality": "${BUDDY_PERSONALITY}"
  }
}
EOF

cd "$REPO_ROOT"
npm run start:dist
```

可选：`python3 -m json.tool "$PENDING" > /dev/null && echo OK`。

**消费结果**：生成 **`buddy-openclaw.json`**、**`buddy-profile.json`**（`hatchLocked: true`），删除 pending，写 **`buddy-bootstrap-applied.json`**。

---

## 六、验收

- **userData 内**：有 `buddy-openclaw.json`（url/token）；`buddy-profile.json` 存在且 **`hatchLocked === true`**，`companion.name` 为用户认可名；**无** `buddy-bootstrap-pending.json`；有 `buddy-bootstrap-applied.json`。  
- **应用**：能发普通文本并经网关回复。  
- 无 pending 可走应用内 **`/openclaw`**；本手册以一次 pending 免手动为目标。

---

## 七、常见问题（必要避坑）

| 现象 | 处理 |
|------|------|
| **`getPath` / `app` undefined** | 勿 `node` 直跑 `main.cjs`；用 **`npm run start:dist`** 或 **`electron .`**。 |
| **拿不到纯 JSON** | 用 **`./node_modules/.bin/electron . --buddy-print-paths`**，勿依赖未截断的 `npm run` 输出做 parse。 |
| **pending 未应用** | JSON UTF-8、`version: 1`、**`openclaw`/`hatch` 字段非空**。若 profile 已 **`hatchLocked: true`**，pending 会变 **`buddy-bootstrap-skipped-*`**；换孵化须清/备份 userData 相关文件（见 openclaw-bootstrap）。 |
| **能开不能聊** | 测网关连通与 Token；可看 `electron/main.cjs` 中 env 覆盖。 |
| **重装孵化** | 关应用 → 删/备份 `buddy-profile.json`、`buddy-openclaw.json`、`buddy-bootstrap-applied.json`、skipped → 新 pending → 再 `npm run start:dist`。 |

孵化锁定后 **勿** 再用 pending 改 **userID / 名 / 性格**；网关 URL/Token 仍可用 **`/openclaw`**。

---

## 八、一页脚本模板（按需裁剪）

**前置**：Agent + `$REPO_ROOT`；已向用户确认**名与性格**；已准备网关 URL/Token。

```bash
export REPO_ROOT="/path/to/agent-workspace"
export OPENCLAW_GATEWAY_URL="http://127.0.0.1:18789"
export OPENCLAW_GATEWAY_TOKEN="…"
export BUDDY_DISPLAY_NAME="…"      # 用户确认
export BUDDY_PERSONALITY="…"      # 用户确认
export BUDDY_HATCH_USER_ID="$(node -e "console.log(require('crypto').randomUUID())")"

# git clone …
cd "$REPO_ROOT"
npm ci
npm run build

export PATHS_JSON="$(./node_modules/.bin/electron . --buddy-print-paths)"
PENDING="$(node -e 'console.log(JSON.parse(process.env.PATHS_JSON).bootstrapPending)')"

cat > "$PENDING" <<EOF
{
  "version": 1,
  "openclaw": {
    "url": "${OPENCLAW_GATEWAY_URL}",
    "token": "${OPENCLAW_GATEWAY_TOKEN}"
  },
  "hatch": {
    "userID": "${BUDDY_HATCH_USER_ID}",
    "name": "${BUDDY_DISPLAY_NAME}",
    "personality": "${BUDDY_PERSONALITY}"
  }
}
EOF

npm run start:dist
```

`PATHS_JSON` 解析失败时：手动执行 print-paths，肉眼复制 `bootstrapPending`，或对 **仅含 JSON 的那一行** 再 `JSON.parse`。

---

## 九、桌宠存活巡检（Agent 必配：5 分钟）

桌宠是独立 Electron 进程，崩溃或被关掉后网关仍在，用户可能误以为「还能聊」。**本 Agent** 须在 OpenClaw / 主机上配置 **固定间隔 5 分钟（300 秒）** 的重复任务，只做两件事：**判断是否存活** → **不存活则明确提示用户**。

### 9.1 怎么判「存活」

- **推荐**：看是否存在 **与本仓库绑定的 Electron 主进程**——进程参数或工作目录能关联到 **`$REPO_ROOT`**（例如命令行中出现该路径下的 `electron`、`main.cjs` 或 `node_modules/electron` 启动链）。
- **禁止**：仅匹配 `'electron'` 四字，以免把别的 Electron 应用当成桌宠。
- **说明**：用户 **主动退出** 桌宠时也会判为「未存活」；提示文案可加一句「若您刚关闭窗口可忽略」，避免误扰（可选）。

### 9.2 检查示例（bash，按需改 `pgrep` / `ps` 适应系统）

```bash
export REPO_ROOT="/path/to/agent-workspace"  # 与上文一致

if command -v pgrep >/dev/null 2>&1; then
  # macOS 常见：pgrep -fl；部分 Linux：pgrep -af
  _pat="$(pgrep -fl electron 2>/dev/null || pgrep -af electron 2>/dev/null || true)"
else
  _pat="$(ps aux 2>/dev/null || true)"
fi
if echo "$_pat" | grep -F "$REPO_ROOT" | grep -qi electron; then
  exit 0   # 存活
fi
# 未存活：由 Agent 走 9.3
exit 1
```

Windows 可用 PowerShell 查 `Get-CimInstance Win32_Process`，过滤 **`CommandLine`** 同时含 **`$REPO_ROOT`** 与 **`electron`**（路径分隔符按本机转义）。

### 9.3 未存活时如何「提示用户」

至少满足其一（按你方 OpenClaw 能力选）：

- **对话内主动提醒**：例如向用户可见会话发一条短消息：**桌宠进程当前未在运行**，并给出 **`cd "$REPO_ROOT" && npm run start:dist`**（或与用户约定的一键启动方式）；**勿** 仅写代理私有日志而不让用户看见。
- **系统通知** / 团队告警渠道：若 Agent 支持，可叠加。

### 9.4 定时从哪来

任选其一并写进 Soul / Agent 运维说明，与 **`$REPO_ROOT`** 同级固定：

- **cron**：每 5 分钟执行一次，例如 `*/5 * * * *` 调用检查脚本；  
- **systemd timer** / **launchd** / **Windows 任务计划程序**：间隔 5 分钟；  
- 或 OpenClaw 内置「周期任务 / workflow」——**周期必须为 5 分钟**（除非团队统一改成更长，本手册默认 **300s**）。

---

**版本**：与仓库 `docs/`、`electron/main.cjs` 一致；细节冲突以代码为准。
