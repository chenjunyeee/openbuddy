# OpenBuddy

**桌面 ASCII 盲盒搭档**：一只精灵、五档稀有度、二十四种种族——还有帽子、眼睛花样、隐藏款闪与多词条面板（DEBUGGING / PATIENCE / CHAOS / WISDOM / SNARK 等）。每件外形由你的 **`userID` 种子**一次铸成，换电脑不换号，搭档不变。

接上 **OpenClaw** 网关，它还能和你聊天；不配网关，它照常趴桌卖萌。

## 一览

| 维度 | 玩点 |
|------|------|
| **稀有度** | Common → Uncommon → Rare → Epic → **Legendary**，带权重掉落；稀有底线更高，面板更夸张。 |
| **种族** | 鸭、鹅、史莱姆团、猫、龙、章鱼、水豚、机器人……共 **24** 路 ASCII 精灵，多帧待机动画。 |
| **帽子** | ：**7 款** ASCII 小帽（王冠 / 高礼帽 / 螺旋桨 / 光环 / 巫师尖顶 / 针织帽 / 小黄鸭）。
| **眼睛** | 多款符号眼 ·✦×◉@°，和种族帧拼出不同「表情」。 |
| **闪（Shiny）** | 约 **1%** 概率的隐藏闪；全看种子脸黑脸白。 |
| **面板数值** | 五条属性随机拉条，带「主修」与「短板」，稀有度越高地板越高。 |
| **随机度** | 哈希 + 稳定 PRNG：**同 `userID` 同版本算法 = 同一只**； |

## 能做什么（能力框架）

| 模块 | 你能用它做什么 |
|------|----------------|
| **窗口形态** | 无边框、透明、置顶；一角长期驻留，不抢主屏。 |
| **桌宠本体** | 上面那套 **外观 + 稀有度 + 数值**，睡眠 `zzz`、加载时星星、抚摸爱心。 |
| **互动与指令** | 底部输入常显（睡眠时隐藏但仍占位，精灵不随窗缩放移位）；拖精灵移窗；`/c` 换壳、`/openclaw` 配网关； |
| **对话（可选）** | 网关 URL + Token 走 OpenClaw；不配则纯本地陪伴。 |
| **自动化接入** | 代理可向 userData 投 **bootstrap pending**，一把完成孵化与网关配置。 |

**边界**：不是通用聊天软件；模型与网关自备。契约与跑通步骤见 `docs/`。

## 预览

<img width="2498" height="1282" alt="image" src="https://github.com/user-attachments/assets/7d079a8f-d4bc-41d1-ab1b-4cd46eaf7568" />

## 快速运行

```bash
npm install
npm run dev
```

```bash
npm run build
npm run start:dist
```

打印 userData 等路径（解析时注意控制台杂讯）：

```bash
npx electron . --buddy-print-paths
```

## 延伸阅读

- [OpenClaw 执行手册：从零跑通桌宠与本机对话](./docs/OPENCLAW_AGENT_RUNBOOK.md)（面向代理 / shell 的完整步骤）
- [Bootstrap：`buddy-bootstrap-pending.json` 与 pending 文件说明](./docs/openclaw-bootstrap.md)（与执行手册 § 字段说明交叉引用）
- 桌宠生成与精灵数据见 [`src/buddy/`](./src/buddy/)（`companion.ts`、`sprites.ts`、`types.ts`）。

Issues / PR 欢迎；若改 userData 或 IPC 契约，请同步更新 `docs/`。
