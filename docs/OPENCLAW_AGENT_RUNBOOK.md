# OpenClaw 执行手册：从零跑通 openbuddy 桌宠 + 本机 OpenClaw 对话

> **读者**：本机 OpenClaw / 可跑 shell 的代理。  
> **目标**：在**独立 Agent + 独立工作区**内，先与用户对齐桌宠需求，再克隆 [openbuddy](https://github.com/chenjunyeee/openbuddy)、`npm ci` + `build`、**无 UI** 写入 pending，启动后与**已运行的本机网关**聊天。  
> **字段说明**：`buddy-bootstrap-pending.json` → [openclaw-bootstrap.md](./openclaw-bootstrap.md)。

---

## 总流程（编排顺序，须遵守）

下列顺序**不可颠倒**；OpenClaw 指挥自动化时应按此编排，避免未问清需求就拉代码、或路径与 Agent 不一致。

1. **创建独立 Agent**  
   在本机 OpenClaw 中为「桌宠 / openbuddy / 本 Runbook」单独建一个 Agent（与日常通用助手隔离），后续 shell、Tools、Soul 均指向该 Agent。

2. **划定独立工作区**  
   为该 Agent 指定**唯一**物理目录作为工作区根（下文 **`$REPO_ROOT`** 即此根：检出后须含 `package.json`、`electron/`、`src/`）。Agent 配置、环境变量（如 `OPENBUDDY_REPO_ROOT`）、Tools 默认 cwd **必须**与此路径一致，**不要**假设任意 cwd 可用。

3. **向用户确认桌宠需求（再拉代码）**  
   在**尚未** `git clone` / 拉取仓库前，明确询问用户想要什么样的桌宠：显示名 `hatch.name`、性格 `personality`、是否需代选 `userID` 等，遵循下文「Agent 强制约定」。**用户答复明确之前，不执行 §1 及之后技术步骤。**

4. **拉取项目到该 Agent 工作区根**  
   需求确认后，将 openbuddy **检出到步骤 2 的工作区根**（空目录下 `git clone … .` 使仓库根即工作区根，或团队约定子目录时须在 Soul / Agent / Tools 写清同一 `$REPO_ROOT`）。

5. **配置 → 初始化 → 运行**  
   按 §2 起：`npm ci`、`npm run build`、解析 `--buddy-print-paths`、写 `buddy-bootstrap-pending.json`（§3–§5）、`npm run start:dist`（§6），验收见 §7。

**`/update`**（§0）仍在已绑定的 **`$REPO_ROOT`** 内拉取最新并重建/重启，与工作区绑定不变。

---

### Agent 强制约定：宠物名称必须来自用户

- `hatch.name`：须用户指定或确认；可给示例但必须由用户选定，**禁止**默认成 `buddy` / `test` 等仅为跑通。未答复则**先问再写** pending（见下文 §5）。  
- 用户明确「随便 / 你起一个」→ 可代选，同轮 **回显** 将写入 pending 的最终名字。  
- `personality`：优先用户原话；无则一句确认短默认，勿擅自写长人设。

---

## 0. 前置条件

1. **网关**：可访问的 Base URL（例 `http://127.0.0.1:18789`）+ 匹配 **Token**（勿写入日志/录屏）。  
2. **环境**：`git`；**Node 20+**、`npm`；可跑 Electron（macOS / Windows / Linux）。  
3. **权限**：可对 Electron **`userData`** 读写（路径见 §4）。

网关未起则先按 OpenClaw 部署启动。

### 独立 Agent 与 `/update`（OpenClaw 侧配置提示）

编排顺序见上文「总流程」：**先**建独立 Agent、**再**绑定独立工作区、**问清桌宠**后**再**克隆；本节约定的是该 Agent **绑定好之后**的路径与更新行为。为避免长期停留在旧代码与旧步骤，**建议在 Soul、Agent 与 Tools 三处一并纳入同一套「更新」约定**（不要只写在其中一层）：

- **服务目录**：该独立 Agent **必须稳定知晓** **openbuddy 在该工作区内的检出根目录**（与下文 **`$REPO_ROOT`** 为同一物理路径）。请在 **Soul、Agent 配置与 Tools** 中 **写清同一个绝对路径**（例如环境变量 `OPENBUDDY_REPO_ROOT` / 系统提示里的固定说明 / Tool 默认参数），**不要**默认「在任何 cwd 下都能跑」；执行 `git pull`、写 pending、`npm run`、`electron .`、`--buddy-print-paths`、重启进程等步骤时，均应以该目录为基准。
- **触发**：收到 **`/update`**（或团队内与之一致的固定指令）即视为要求升级到仓库最新。
- **行为**：在上述 **服务目录** 内执行 **拉取最新代码**（如 `git pull` 或等价流程），再 **重新安装/构建并重新运行**（如 `npm ci`、`npm run build`，并重启 `npm run start:dist` 或由你们托管的进程），使自动化与桌宠二进制与当前 Runbook、当前主分支一致。

具体命令与安全策略（分支、是否强制、是否仅 fast-forward）由部署方在 OpenClaw 里实现；本段约定：**服务目录对 Agent 显式可读**，且 **Soul / Agent / Tools 与 `/update` 对齐**，避免 Soul 有路径说明而 Tools 仍用错 cwd、或更新与写 pending 不在同一检出根上。

---

## 0.1 空白系统（镜像 / 加速，按需）

进入 §2 前：`node -v`（≥20）、`npm -v`。

**Node**：<https://nodejs.org/> 或 [nvm](https://github.com/nvm-sh/nvm) `nvm install 20 && nvm use 20` / [fnm](https://github.com/Schniz/fnm) `fnm install 20 && fnm use 20`。

**npm 慢**：全局 `npm config set registry https://registry.npmmirror.com`，或仅当次 `npm ci --registry=https://registry.npmmirror.com`（二选一即可）。

查/还原：`npm config get registry`；官方：`npm config set registry https://registry.npmjs.org`。

**Electron 二进制慢**（同一会话 export 后再装依赖）：

```bash
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
export ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
npm ci
```

（环境若认小写 `electron_mirror` 以你方为准；常见 postinstall 认 `ELECTRON_MIRROR`。）

**Git 慢**：

```bash
git clone https://github.com/chenjunyeee/openbuddy.git
git clone https://ghproxy.net/https://github.com/chenjunyeee/openbuddy.git
```

镜像可用性变化，失败则换官方 / 代理 / zip / SSH。

**Agent 自检**：Node/npm OK；`npm ci` 失败已试 registry / `ELECTRON_MIRROR`；**独立 Agent + 工作区已绑定**；**桌宠需求已与用户确认**（文首约定）；`hatch.name`/性格等已可用于 §3–§5。

---

## 1. 克隆

**前置**：已完成「总流程」步骤 1–3（Agent、工作区、用户桌宠需求），在**该 Agent 的工作区根**执行。

示例（工作区空目录即仓库根）：

```bash
cd "$REPO_ROOT"
git clone https://github.com/chenjunyeee/openbuddy.git .
```

若克隆到子目录，则后文所有命令在 **`$REPO_ROOT`** = 含 `package.json` 的仓库根，且须与 Tools/Soul 声明的绝对路径一致。

下文 **`$REPO_ROOT`** = 仓库根（含 `package.json`、`electron/`、`src/`）。

---

## 2. 依赖 + 构建

```bash
cd "$REPO_ROOT"
npm ci
npm run build
```

- 无 `package-lock.json` 时用 `npm install`。  
- `dist/` 供 **`npm run start:dist`**。  
- 网络失败 → §0.1；可 `npm cache clean --force` 后重试（会清空 npm 缓存）。

可选：`npm run typecheck`。

---

## 3. 变量（写入前定值）

| 变量 | 含义 | 示例 |
|------|------|------|
| `OPENCLAW_GATEWAY_URL` | 网关 Base URL | `http://127.0.0.1:18789` |
| `OPENCLAW_GATEWAY_TOKEN` | 网关 Token | （本机 OpenClaw） |
| `BUDDY_HATCH_USER_ID` | 永久定外形，建议 UUID | `550e8400-e29b-41d4-a716-446655440000` |
| `BUDDY_DISPLAY_NAME` | 非空显示名 ≤64，须符合文首命名约定 | `小咪` |
| `BUDDY_PERSONALITY` | 性格，≤200，优先用户原话 | `话少、偶尔吐槽、乐于助人` |

---

## 4. `userData` 与纯 JSON 路径（必做）

配置在 Electron **`userData`**；**目录名 = `package.json` 的 `"name"`** → 当前 **`buddy-desktop`**（≠ 文件夹名 `openbuddy`）。

**解析路径**：须用下列命令，**stdout 仅 JSON**（勿对 `npm run start:print-paths` 整段 stdout `JSON.parse`，含 npm 横幅）。

```bash
cd "$REPO_ROOT"
./node_modules/.bin/electron . --buddy-print-paths
```

记下：**`bootstrapPending`**（＝要创建的 `buddy-bootstrap-pending.json` 绝对路径）、**`userData`**。代理请保留完整 JSON。

---

## 5. 写 `buddy-bootstrap-pending.json`（首次正常启动前）

```bash
PENDING="/绝对路径/来自上一步/bootstrapPending/"

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

占位符换成 §3 真值；`cat <<EOF`（无引号）可 shell 展开变量。

可选：`python3 -m json.tool "$PENDING" > /dev/null && echo "JSON ok"`。

---

## 6. 启动（消费 pending）

```bash
cd "$REPO_ROOT"
npm run start:dist
```

**ready 时**：消费 **`buddy-bootstrap-pending.json`** → 写 **`buddy-openclaw.json`**、**`buddy-profile.json`**（`hatchLocked: true`）→ 删 pending → 写 **`buddy-bootstrap-applied.json`**。配置留在 `userData`。

**联调**：`npm run dev`（需已 `build` 或 dev 能拉到资源）；pending 同样在 Electron ready 消费。

---

## 7. 验收

- **文件**（均在 `userData`）：`buddy-openclaw.json` 有 `url`、`token`；`buddy-profile.json` 存在且 `hatchLocked === true`，`companion.name`＝用户认可名，`personality` / `userID` 符合；**无** `buddy-bootstrap-pending.json`；有 `buddy-bootstrap-applied.json`。  
- **应用**：外形与固定 `userID` 一致；普通文本发送能经网关收到回复。  
- 不设 pending 时应用会走 **`/openclaw`**；本 Runbook 目标是一次 pending 跳过手动。

---

## 8. 常见问题

- **8.1 无路径 JSON**：在 `$REPO_ROOT` 且已装 electron；用 `./node_modules/.bin/electron . --buddy-print-paths`。  
- **8.2 pending 未消费**：UTF-8 合法 JSON，`version: 1`，`openclaw.*` 与 `hatch.*` 均非空。若 profile 已 **`hatchLocked: true`**，新 pending 会 **`buddy-bootstrap-skipped-*.json`**；换宠需清 `userData` 相关文件或新用户。  
- **8.3 能开不能聊**：curl/浏览器测网关；核对 Token；可选 env `OPENCLAW_GATEWAY_URL` / `OPENCLAW_GATEWAY_TOKEN`（见 `electron/main.cjs`）。  
- **8.4 重装初始化**：关应用 → 删/备份 `userData` 下 `buddy-profile.json`、`buddy-openclaw.json`、`buddy-bootstrap-applied.json`、`*skipped*` → 新 pending → `npm run start:dist`。

---

## 9. 与手动配置

无 pending 时可用应用内 **`/openclaw`**。孵化锁定后勿用 pending 改 **`userID`/名/性格**；URL/Token 仍可用 **`/openclaw`** 更新。

---

## 10. 汇总模板（替换变量后执行）

**前置**：已创建独立 Agent、已设 **`REPO_ROOT`** 为该 Agent 独立工作区根（并完成克隆，本模板从克隆后开始；若尚未克隆，先执行 §1）。

已导出：`OPENCLAW_GATEWAY_URL`、`OPENCLAW_GATEWAY_TOKEN`、`BUDDY_HATCH_USER_ID`、`BUDDY_DISPLAY_NAME`、`BUDDY_PERSONALITY`（名/性格已按「总流程」与用户确认）。空白机可先 §0.1。

```bash
# 须与本 Agent 绑定的独立工作区根（检出后含 package.json）
export REPO_ROOT="/path/to/your-agent-workspace"
# npm config set registry https://registry.npmmirror.com
# export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
# 若 §1 未单独执行：空目录下克隆到工作区根
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

`PATHS_JSON` 解析失败则手动跑 `./node_modules/.bin/electron . --buddy-print-paths`，`JSON.parse` 取 `bootstrapPending`。

---

**版本**：与 [openbuddy](https://github.com/chenjunyeee/openbuddy) `docs/` 同步；与代码冲突以 `electron/main.cjs` 为准。
