# OpenBuddy

桌面端桌宠：可选接入 **OpenClaw** 网关做对话；不配网关时仍可作为本地小窗口使用。

> 一句话：开在桌面一隅的小搭档——不抢戏，但一直在。

## 预览

<img width="2498" height="1282" alt="image" src="https://github.com/user-attachments/assets/7d079a8f-d4bc-41d1-ab1b-4cd46eaf7568" />



## 功能概览

| 能力 | 说明 |
|------|------|
| 窗口 | 无边框、透明、置顶；具体层级与平台相关逻辑在 `electron/main.cjs` |
| 桌宠 UI | React：`src/renderer`（精灵与状态见 `PetView`、`BuddyState`） |
| 陪伴物数据 | `userID` → 种族/稀有度/数值等，`src/buddy/companion.ts`；配置见 `config.ts`、`sprites.ts` |
| 对话（可选） | 配置 OpenClaw 网关 URL + Token 后，经主进程转发请求（`electron/openclaw-chat.cjs` 等） |
| 自动化引导 | 通过写入 `userData` 下的 bootstrap 待消费文件完成「配网关 + 孵化」，见 `docs/openclaw-bootstrap.md` |

应用内输入与交互（以 `App.tsx` / `PetView.tsx` / `electron/main.cjs` 为准）：例如 `/openclaw`、夜间 **`/c`**、**拖动窗/精灵**即抚摸（CSS drag + 主进程 `move` IPC）、`/p` 等。

## 技术栈

- **Electron**（主进程 CommonJS：`electron/*.cjs`）
- **Vite 6** + **React 18** + **TypeScript**（渲染进程，开发服务器默认 `127.0.0.1:5187`）
- 预加载脚本通过 `contextBridge` 暴露 `window.buddyDesktop`（见 `electron/preload.cjs`）

## 仓库结构（高层）

```
buddy-desktop/
├── electron/           # 主进程、preload、OpenClaw 与聊天会话、环境加载
├── src/
│   ├── buddy/          # 纯 TS：陪伴物生成、类型、精灵元数据（可被 Vite 打包进 renderer）
│   └── renderer/       # React 入口与 UI
├── dist/               # vite build 输出（由 Electron 加载）
└── docs/               # OpenClaw 跑通与 bootstrap 格式说明
```

## 架构（与代码对应）

1. **主进程** `electron/main.cjs`  
   创建 `BrowserWindow`（默认尺寸常量与同目录注释一致），注册 IPC（如 `buddy-resize`、`buddy-chat`、`buddy-save-openclaw` 等），读写 `app.getPath('userData')` 下的偏好与 profile；可选禁用 GPU（`BUDDY_DISABLE_GPU`）减轻拖影。

2. **预加载** `electron/preload.cjs`  
   只暴露窄接口给渲染层：`resizeToFit`、`sendChat`、`OpenClaw` 配置与状态、`getProfile`、`getPaths` 等，避免渲染进程直接 `require('electron')`。

3. **渲染进程**  
   Vite 打包的 React 应用：UI、输入与指令解析、调用 `window.buddyDesktop` 与主进程通信。

4. **`src/buddy`**  
   与 Electron 无直接依赖；陪伴物外观与数值由哈希与种子算法确定，便于测试与复用。

5. **OpenClaw 相关**  
   网关 HTTP 调用、会话与中文引导副本分布在 `electron/openclaw-*.cjs`、`electron/buddy-prompt.cjs` 与 `src/openclawSetupZh.ts`；**从零搭环境**请优先读 [`docs/OPENCLAW_AGENT_RUNBOOK.md`](./docs/OPENCLAW_AGENT_RUNBOOK.md)。

## 本地数据位置

所有 JSON 状态均在 Electron **userData** 目录下（随系统与安装方式变化）。可用：

```bash
npm install
npx electron . --buddy-print-paths
```

打印路径元信息（注意：`npm run start:print-paths` 的完整 stdout 可能夹杂其他日志，不要整段当 JSON 解析）。详细文件语义见 `docs/openclaw-bootstrap.md`。

## 开发与运行

**环境**：Node.js（与当前 `package.json` 中工程一致即可）、npm。

```bash
npm install
npm run dev
```

- `dev`：并行启动 Vite（`:5187`）与 Electron；若本机 `localhost` 仅 IPv6，项目已绑定 `127.0.0.1` 以避免脚本卡住（见 `vite.config.ts` 注释）。

```bash
npm run build      # 产出 dist/
npm run start:dist # 使用打包后的 renderer
npm run typecheck
npm run test:openclaw   # OpenClaw 相关快速检测脚本
```

## 文档

- [OpenClaw 经纪 / 代理跑通](./docs/OPENCLAW_AGENT_RUNBOOK.md)
- [Bootstrap 文件格式与 pending](./docs/openclaw-bootstrap.md)
- [桌宠种族与心情汇总](./docs/PET_SPECIES_AND_MOODS.md)

## 许可与贡献

Issues / PR 欢迎；修改主进程 IPC 或 userData 格式时建议同步更新 `docs/` 下对应说明。
