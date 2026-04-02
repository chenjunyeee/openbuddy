# OpenBuddy

**桌面盲盒**：一只精灵、五档稀有度、**三十余种**可抽取种族（另含**隐藏款**）——帽子与眼睛花样、**Shiny**、顶栏飘云与多帧待机动画。

接上 **OpenClaw** 网关，它还能和你聊天；不配网关，它照常趴桌卖萌。

## 一览
![正常](https://github.com/user-attachments/assets/2bc8efba-066d-4b8a-ae9e-13e2e0927d53)


| 维度 | 玩点 |
|------|------|
| **稀有度** | Common → Uncommon → Rare → Epic → **Legendary**，带权重掉落；稀有越高属性地板越高。 |
| **种族** | 鸭、猫、龙、水豚、机甲、骷髅、骰子、月亮……等多路 **ASCII 精灵**（含简洁非生物款）。 |
| **隐藏款** | **`voidling`**：与稀有度独立骰点，**约 0.25%** 覆盖物种。 |
| **帽子** | 多款 ASCII 小帽（王冠、礼帽、螺旋桨、光环、巫师帽……）；另有极低概率 **幻彩帽 `astral`**（渐变贴层，与本体稀有分开 roll）；Common 档无帽。 |
| **眼睛** | 符号眼 ·✦×◉@° 等，与种族线条拼出不同观感。 |
| **闪（Shiny）** | 约 **1%** ；同种子算法脸黑脸白。 |
| **随机度** | 哈希 + 稳定 PRNG：**同 `userID` 同算法 = 同一只**；`CompanionBones` 字段变动会换脸。 |

## 能做什么（能力框架）

| 模块 | 你能用它做什么 |
|------|----------------|
| **窗口形态** | 无边框、透明/半透明、置顶；一角长期驻留。 |
| **桌宠本体** | **外观 + 稀有 + 数值**；睡眠 `zzz`、加载时星星、抚摸爱心、**精灵不可选中**。 |
| **互动与指令** | **拖精灵移窗**；`/c` 循环：透明正常 / 透明夜 / 精灵柔白底 / 精灵柔黑底、`/openclaw` 配网关； |
| **对话（可选）** | 网关 URL + Token 走 OpenClaw；不配则纯本地陪伴。 |
| **自动化接入** | 代理可向 userData 投 **bootstrap pending**，一把完成孵化与网关配置。 |

**边界**：不是通用聊天软件；模型与网关自备。契约与跑通步骤见 `docs/`。


## 状态
### 思考
![思考](https://github.com/user-attachments/assets/8f699070-2a5f-46d6-9e38-8b4f5fa18970)

### 睡觉
![睡觉](https://github.com/user-attachments/assets/7dbd5a84-c8e7-4349-a848-9904e0b908ec)

### 抚摸
![抚摸](https://github.com/user-attachments/assets/10d59629-1538-429a-b927-455e47569f49)

## 快速开始
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
- [桌宠 ASCII 精灵设计规则](./docs/PET_SPRITE_DESIGN.md)（网格、`{E}`、帽子行、隐藏种与扩展约定）
- 生成逻辑与精灵数据见 [`src/buddy/`](./src/buddy/)（`companion.ts`、`sprites.ts`、`types.ts`）。

Issues / PR 欢迎；若改 userData 或 IPC 契约，请同步更新 `docs/`。
