# OpenClaw 执行手册：从零跑通 openbuddy 桌宠 + 本机 OpenClaw 对话

> **本文档读者**：在本机运行的 OpenClaw（或任何能执行 shell 的自动化代理）。  
> **目标**：克隆 [openbuddy](https://github.com/chenjunyeee/openbuddy)、安装构建、**无 UI 完成孵化与网关配置**、启动应用后用桌宠与**已在本机运行的 OpenClaw 网关**聊天。  
> **技术细则**：`buddy-bootstrap-pending.json` 字段含义见同目录 [openclaw-bootstrap.md](./openclaw-bootstrap.md)。

---

## 0. 你必须先具备什么

1. **本机 OpenClaw 网关已就绪**  
   - 你知道可访问的 **网关 Base URL**（示例：`http://127.0.0.1:18789`，以你本机为准）。  
   - 你有与该网关匹配的 **Token**（或等价认证密钥；应用里按「Token」字段写入配置文件）。

2. **本机环境**  
   - `git`、`node`（建议 **Node 20+**）、`npm` 可用。  
   - 能运行 **Electron**（macOS / Windows / Linux 均可）。

3. **权限**  
   - 能对用户目录下 Electron 的 `userData` 路径 **创建/写入文件**（见第 4 步打印出的路径）。

若网关未启动，请先按你的 OpenClaw 部署文档把网关跑起来，再继续下面步骤。

---

## 1. 克隆仓库

```bash
git clone https://github.com/chenjunyeee/openbuddy.git
cd openbuddy
```

下文默认当前目录为 **`$REPO_ROOT`**（即 `openbuddy` 仓库根目录，内含 `package.json`、`electron/`、`src/`）。

---

## 2. 安装依赖并构建前端

```bash
cd "$REPO_ROOT"
npm ci
npm run build
```

- `npm ci` 要求存在 `package-lock.json`；若仅有 `package-lock` 缺失可改用 `npm install`。  
- `build` 会生成 `dist/`，**生产启动 `npm run start:dist` 依赖它**。

可选自检：

```bash
npm run typecheck
```

---

## 3. 准备孵化 + 网关信息（由 OpenClaw 填入真实值）

在写配置文件之前，先确定以下变量（示例名可改）：

| 变量 | 含义 | 示例 |
|------|------|------|
| `OPENCLAW_GATEWAY_URL` | 本机网关 Base URL | `http://127.0.0.1:18789` |
| `OPENCLAW_GATEWAY_TOKEN` | 网关 Token | （由你的 OpenClaw 提供） |
| `BUDDY_HATCH_USER_ID` | **永久决定桌宠外形**的稳定字符串，建议 UUID | `550e8400-e29b-41d4-a716-446655440000` |
| `BUDDY_DISPLAY_NAME` | 桌宠显示名（非空，≤64 字） | `小咪` |
| `BUDDY_PERSONALITY` | 性格描述（非空，≤200 字） | `话少、偶尔吐槽、乐于助人` |

**不要**在日志或录屏中泄露 Token。

---

## 4. 解析 Electron 配置目录（必做）

配置文件全部在 Electron **`userData`** 下；**目录名与 `package.json` 里的 `"name"` 一致**（当前仓库为 **`buddy-desktop`**，不是仓库文件夹名 `openbuddy`）。

在仓库根目录执行（**请用下面命令**，以便 stdout **只有 JSON**，便于脚本解析；`npm run start:print-paths` 会在前面加 npm 横幅，**不要**对整段 stdout 做 `JSON.parse`）：

```bash
cd "$REPO_ROOT"
./node_modules/.bin/electron . --buddy-print-paths
```

终端会打印 **纯 JSON**，其中必须记下：

- **`bootstrapPending`**：你要创建的 **`buddy-bootstrap-pending.json`** 的**绝对路径**  
- **`userData`**：配置根目录（排错用）

**OpenClaw 请把该 JSON 完整保存到上下文**（后续步骤要精确路径）。

---

## 5. 写入一键初始化文件（在首次启动应用之前）

在拿到 **`bootstrapPending`** 的绝对路径后，写入 UTF-8 JSON。**必须在第一次正常启动桌宠应用之前写好**（或写好后再启动一次应用，主进程会在 `ready` 时消费该文件）。

下面示例用 **heredoc**；请把占位符换成第 3 步的真实值：

```bash
PENDING="/绝对路径/来自/start:print-paths/bootstrapPending/字段"

cat > "$PENDING" <<'JSONEOF'
{
  "version": 1,
  "openclaw": {
    "url": "OPENCLAW_GATEWAY_URL_HERE",
    "token": "OPENCLAW_GATEWAY_TOKEN_HERE"
  },
  "hatch": {
    "userID": "BUDDY_HATCH_USER_ID_HERE",
    "name": "BUDDY_DISPLAY_NAME_HERE",
    "personality": "BUDDY_PERSONALITY_HERE"
  }
}
JSONEOF
```

**不要用上面字面量提交**：应把 `OPENCLAW_GATEWAY_URL_HERE` 等替换为真实字符串后保存；若使用 `cat <<EOF`（无引号），可由 shell 展开环境变量。

**校验 JSON**（可选）：

```bash
python3 -m json.tool "$PENDING" > /dev/null && echo "JSON ok"
```

---

## 6. 启动桌宠应用（消费 pending）

仍在仓库根目录：

```bash
cd "$REPO_ROOT"
npm run start:dist
```

说明：

- 主进程启动时会 **先** 尝试消费 **`buddy-bootstrap-pending.json`**：  
  写入 **`buddy-openclaw.json`**（网关）、**`buddy-profile.json`**（`userID` + 灵魂 + **`hatchLocked: true`**），然后删除 pending，并写入 **`buddy-bootstrap-applied.json`** 留档。  
- 成功后窗口应出现桌宠；关闭应用后配置仍保留在 `userData`。

### 开发模式（仅当需要联调 Vite 时）

```bash
npm run dev
```

同样需要 **已执行 `npm run build`** 或 dev 流程能拉到资源；**一键初始化仍适用**：pending 在 **Electron 进程 ready 时** 被消费，与 dev/prod 入口一致。

---

## 7. 验收清单（OpenClaw 请逐项确认）

1. **文件**（路径均在 `start:print-paths` 的 `userData` 下）  
   - [ ] **`buddy-openclaw.json`** 存在且含 `url`、`token`  
   - [ ] **`buddy-profile.json`** 存在且 **`hatchLocked === true`**，且 `companion.name` / `personality` / `userID` 符合预期  
   - [ ] **`buddy-bootstrap-pending.json` 不应再存在**（已消费则删除）  
   - [ ] **`buddy-bootstrap-applied.json`** 存在（表示至少成功应用过一次）

2. **应用内**  
   - [ ] 桌宠外形与 **固定的 `userID`** 一致（同机重复安装同一 `userID` 应同形象）  
   - [ ] 在输入框输入 **普通文本**（非 `/` 指令），Enter 发送，能收到模型回复（经本机 OpenClaw 网关）

3. **未配置网关时**  
   - 若故意不写 pending 或 openclaw 为空，应用会引导 `/openclaw`；本 Runbook 目标是一次性通过 pending 跳过该手动步骤。

---

## 8. 常见问题

### 8.1 打印路径无输出或报错

- 确认在 **`$REPO_ROOT`** 执行，且已 `npm ci`（或 `npm install`）安装 **electron**。  
- 使用：`./node_modules/.bin/electron . --buddy-print-paths`（stdout 仅为 JSON）。`npm run start:print-paths` 亦可，但 stdout 含 npm 横幅，**不要**对整段输出直接 `JSON.parse`。

### 8.2 pending 没被吃掉 / 没有 `buddy-profile.json`

- JSON 必须为合法 UTF-8，`version` 必须是 **`1`**。  
- `openclaw.url`、`openclaw.token`、`hatch.userID`、`hatch.name`、`hatch.personality` 均不能为空字符串。  
- 若 **`buddy-profile.json` 已是 `hatchLocked: true`**，新的 pending 会被 **跳过** 并重命名为 `buddy-bootstrap-skipped-*.json`；开发换形象需删除 `userData` 下相关文件或使用新 `userData`（不同系统用户/清空该目录）。

### 8.3 能开应用但发消息失败

- 用浏览器或 `curl` 确认 **网关 URL** 在本机可达。  
- 核对 Token 是否与网关配置一致。  
- 主进程仍支持环境变量（若你通过 env 注入）：`OPENCLAW_GATEWAY_URL`、`OPENCLAW_GATEWAY_TOKEN`（实现以仓库 `electron/main.cjs` 为准）。

### 8.4 重新从 0 再初始化同一台机器

1. 退出应用。  
2. 删除（或备份）**`userData`** 下 `buddy-profile.json`、`buddy-openclaw.json`、`buddy-bootstrap-applied.json` 及任何 `buddy-bootstrap-skipped-*.json`。  
3. 重新写入新的 **`buddy-bootstrap-pending.json`**，再 `npm run start:dist`。

---

## 9. 与手动配置的关系

- 不写 pending 时，用户仍可在应用内用 **`/openclaw`** 配置网关（与本文「自动化初始化」并行存在）。  
- **孵化锁定后**：不应再依赖 pending 改 **`userID` / 名字 / 性格**；网关 URL/Token 仍可在应用内用 **`/openclaw`** 更新（不写进 profile 锁）。

---

## 10. 一步汇总命令模板（供 OpenClaw 复制后替换变量）

以下假定已导出：`OPENCLAW_GATEWAY_URL`、`OPENCLAW_GATEWAY_TOKEN`、`BUDDY_HATCH_USER_ID`、`BUDDY_DISPLAY_NAME`、`BUDDY_PERSONALITY`。

```bash
export REPO_ROOT="$HOME/work/openbuddy"
git clone https://github.com/chenjunyeee/openbuddy.git "$REPO_ROOT"
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

若 `PATHS_JSON` 解析失败（极少见），请人工执行 `./node_modules/.bin/electron . --buddy-print-paths`，将输出贴入 `JSON.parse` 后取 `bootstrapPending` 赋给 `PENDING`。

---

**文档版本**：与仓库 [chenjunyeee/openbuddy](https://github.com/chenjunyeee/openbuddy) 主分支 `docs/` 下内容同步维护；若行为与代码不一致，以 `electron/main.cjs` 为准。
