# MV Fan-Edit Skill — HyperFrames Music Video Remix

将任意 **MV + 音频片段** 按**导演视角**设计分镜，输出 **9:16 竖屏短视频**（HyperFrames 合成，含 GSAP 动态歌词、音频轨道、设计感遮罩）。

---

## 适用场景

- 有一首歌的 **MV 视频**（横屏 16:9）+ **音频片段**（30-60s）
- 想做 **微信视频号/抖音/小红书** 竖屏二创
- 需要**导演级运镜设计**、**动态歌词**、**设计感遮罩**
- 产物必须是**真视频文件**（非图片序列），走 HyperFrames 标准渲染管线

---

## 项目结构

```
my-song/
├── assets/
│   ├── mv.mp4           # 原始横屏 MV
│   └── song-XXs.mp3     # 对齐好歌词的音频片段
├── config.json          # 唯一配置入口（分镜/歌词/画布）
├── outputs/             # 成片输出
└── renders/             # 中间片段（自动生成）
```

---

## 配置文件 `config.json`（唯一改动点）

```json
{
  "mv_path": "assets/mv.mp4",
  "audio_path": "assets/song-37s.mp3",
  "canvas": { "w": 1080, "h": 1920, "fps": 30, "dur": 37 },
  "shots": [
    {"mv_start": 60, "mv_end": 66, "crop_x": 656, "label": "开场特写"},
    {"mv_start": 66, "mv_end": 72, "crop_x": 656, "label": "副歌入"},
    {"mv_start": 72, "mv_end": 78, "crop_x": 656, "label": "乐队/全景"},
    {"mv_start": 78, "mv_end": 84, "crop_x": 656, "label": "高潮特写"},
    {"mv_start": 84, "mv_end": 90, "crop_x": 656, "label": "余韵收尾"},
    {"mv_start": 90, "mv_end": 97, "crop_x": 656, "label": "结束"}
  ],
  "lyrics": [
    {"text": "第一句歌词", "start": 0, "end": 5, "highlight": true},
    {"text": "第二句歌词", "start": 5, "end": 8, "highlight": true},
    {"text": "第三句歌词", "start": 7, "end": 11, "highlight": false},
    {"text": "第四句歌词", "start": 11, "end": 15, "highlight": true},
    {"text": "第五句歌词", "start": 15, "end": 20, "highlight": false},
    {"text": "第六句歌词", "start": 20, "end": 24, "highlight": false},
    {"text": "第七句歌词", "start": 24, "end": 28, "highlight": false},
    {"text": "第八句歌词", "start": 28, "end": 32, "highlight": false},
    {"text": "第九句歌词", "start": 32, "end": 37, "highlight": true}
  ],
  "output": "outputs/song-final.mp4"
}
```

| 字段 | 说明 |
|------|------|
| `mv_path` | 原始 MV 路径（相对项目根目录） |
| `audio_path` | 音频片段路径 |
| `canvas` | 画布规格：`w`/`h`/`fps`/`dur`（秒，跟随音频实长） |
| `shots[]` | 分镜：`mv_start`/`mv_end`（MV 秒数）、`crop_x`（1920 宽源画面中竖屏窗口左上角 x，608=居中） |
| `lyrics[]` | 歌词：`text`/`start`/`end`（相对音频 0s）、`highlight`（副歌核心句，触发金色呼吸光晕） |
| `output` | 成片输出路径 |

---

## 一键执行

```bash
# 项目目录下
npx mv-fanedit .
```

或直接用 HyperFrames CLI（已内置预处理）：

```bash
# 1. 预处理：标准化 MV + 固定关键帧 + 裁切分镜片段
# 2. 生成 HyperFrames 合成
# 3. 渲染成片
npx hyperframes render --quality high --output outputs/song-final.mp4
```

---

## 自动化流程（内部）

1. **预处理**
   - `ffmpeg` 探测源视频尺寸 → 自动计算 9:16 裁切宽（`cropH * 9/16`）
   - 标准化 MV：`1920×1080@30fps yuv420p` + 固定关键帧（`-g 30 -keyint_min 30`）
   - 按 `shots[]` 裁切竖屏片段 → `renders/shotN_fixed.mp4`

2. **生成 HyperFrames 合成 `index.html`**
   - 根 `<div data-composition-id="..." data-width="1080" data-height="1920" data-duration="37" data-start="0">`
   - 每个视频片段 = `<video class="clip" data-track-index="0" data-start="..." data-duration="..." src="...">`
   - 音频 = `<audio class="clip" data-track-index="1" data-start="0" data-duration="37" src="...">`
   - 遮罩层：晕影 + 底部渐变 + 顶部渐变
   - 歌词容器 + 每句 `<div class="lyric-line highlight?">`

3. **注册 GSAP Timeline** `window.__timelines["id"] = tl`
   - 视频切换：HyperFrames 原生按 `data-start`/`data-duration` 自动播放
   - 歌词动画（全部写在 timeline）：
     - 入场：`fromTo({opacity:0,y:55,scale:0.88,filter:'blur(12px)'}, {opacity:1,y:0,scale:1,filter:'blur(0px)'}, durIn, 'power3.out')`
     - 弹性微放大：`fromTo({scale:1.08}, {scale:1}, 1.1, 'elastic.out(1,0.45)')`
     - 高亮句呼吸：`fromTo({scale:1}, {scale:1.04}, 1.4, 'sine.inOut', repeat=N, yoyo:true)`
     - 退场：`to({opacity:0,y:-35,scale:0.93,filter:'blur(8px)'}, durOut, 'power3.in')`
   - 署名淡入

4. **HyperFrames 渲染**
   - `npx hyperframes render --quality high --output outputs/song-final.mp4`
   - 内部自动：lint → check → video_extract → capture_streaming → encode → assemble

---

## 设计系统（可微调）

| Token | 值 | 说明 |
|-------|-----|------|
| `canvas` | 1080×1920@30fps | 9:16 竖屏标准 |
| `font` | KaiTi / STKaiti / Inter | 中文楷体最佳阅读 |
| `highlightColor` | #D4A574 | 暖金高亮 |
| `shadowWarm` | rgba(212,165,116,0.6) | 双层发光阴影 |
| `vignette` | radial-gradient(ellipse 80% 60% at 50% 40%) | 中心透明、边缘加深 |
| `lyricGradient` | linear-gradient(to top, 0.9→0.6→0.2→0) | 底部歌词可读性 |
| `topGradient` | linear-gradient(to bottom, 0.45→0) | 顶部平衡画面 |
| `durIn` | 0.55s | 入场时长 |
| `durOut` | 0.35s | 退场时长 |
| `elasticDur` | 1.1s | 弹性时长 |
| `breathDur` | 1.4s | 呼吸周期 |

---

## 导演设计原则（内置）

| 维度 | 规则 |
|------|------|
| **运镜** | 每个分镜对应 MV 真实画面内容，裁切框跟随主体，**非机械左右切** |
| **歌词节奏** | 单句单行，严格对齐音频波形；高亮句触发金色呼吸光晕 |
| **视觉层级** | 底层：视频 → 晕影 → 顶部/底部渐变 → 歌词层 → 署名 |
| **字体** | 楷体 KaiTi（中文歌词最佳阅读），fallback Inter |
| **色彩** | 暖金 `#D4A574` 高亮，白字 + 双层发光阴影保证可读性 |

---

## 依赖

- `ffmpeg`（PATH 可用）
- `node` ≥ 22 + `npx hyperframes@latest`
- HyperFrames 项目已 `init` 并在 `package.json` 里锁定版本

---

## 产出物

| 文件 | 说明 |
|------|------|
| `outputs/song-final.mp4` | 最终成片（H.264 + AAC，37s，1080×1920） |
| `renders/shot*_fixed.mp4` | 中间裁切片段（可删） |
| `index.html` | HyperFrames 合成源文件（可二次编辑） |
| `config.json` | 复用配置（下一首歌只改这个） |

---

## 扩展点

- `references/shot-extractor.js` — 裁切参数计算、ffmpeg 命令生成
- `references/composer.js` — HyperFrames HTML + GSAP Timeline 生成
- `references/style-tokens.json` — 色板、字体、阴影、间距等设计系统 token

---

## 许可

MIT — 随意用于商业/非商业二创。注明技术栈：HyperFrames + GSAP。