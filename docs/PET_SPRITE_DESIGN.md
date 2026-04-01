# 桌宠 ASCII 精灵 — 设计规则

本文约定 `sprites.ts` / `types.ts` / `companion.ts` 中形象与随机内容如何扩展，避免破坏布局、眨眼与窗口 resize。

## 网格与帧

- **列宽**：每行在 `{E}` 替换为 **单字符** 眼睛后，目标宽度约 **12 列**（与现有精灵一致），否则 Electron `buddy-resize` 可能抖动。
- **行数**：每物种 **5 行** 为一帧；**第 0 行** 为帽子槽：在 **静帧 0、1** 上必须 **全空白**（仅空格），第 3 帧可用顶行做烟缕等（与章鱼一致）；否则帽子无法叠上或高度会帧间跳变。
- **帧数**：每物种 **3 帧** idle，供 `PetView` 的 `IDLE_SEQUENCE` 与 `-1` 眨眼步进使用；若新增物种也必须提供 3 帧。

## 眼睛占位 `{E}`

- 仅使用 **`{E}`** 表示眼睛槽；眨眼时 **只把 `{E}` 换成 `'-'`**，**禁止**在整行上对 `companion.eye` 做 `replaceAll`（避免误伤考拉鼻子等与眼同形的字面量）。
- **眼睛字符**：须为 **`EYES` 中的单码点字符**，且避免与身体 **字面量** 故意撞形。

## 帽子

- 帽子来自 `HAT_LINES`，宽度约 **12**，戴在 **第 0 行**；`'none'` 为空字符串。
- 新增帽子：在 `HATS` + `HAT_LINES` 同步增加；`common` 稀有度逻辑上仍 **无帽**（见 `rollFrom`）。
- **幻彩帽** `hatRarity: 'astral'` 仅影响渲染样式，不改变 ASCII 行内容。

## 隐藏款（物种）

- **不进常规池**：隐藏物种不得进入 `pick(rng, SPECIES_ROLLABLE)`；应出现在 `SPECIES`（类型与 `BODIES`），用 **`SPECIES_ROLLABLE`**（`SPECIES` 去掉隐藏种）再抽；再以 **独立低概率** `SECRET_SPECIES_CHANCE` **覆盖** `species`（见 `companion.ts` 注释）。
- **脚底装饰**：当前 `charm` 固定为 `'none'`。

## 随机与兼容

- `CompanionBones` 字段增减会改变同一 `userId` 的 roll；若需稳定可加独立子种子。
- `rollFrom` 与 `rollFromForcedRarity` 共用隐藏种逻辑，测试模式与线上一致。

## UI 与动效

- 开盒、稀有行晕光、云朵等见 `PetView` / `index.css`；气泡已去投影，新增样式避免强泛光。

---

*维护：改动精灵流水线时同步更新本节。*
