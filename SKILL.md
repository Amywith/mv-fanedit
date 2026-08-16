# MV Fan-Edit Skill — HyperFrames Music Video Remix

将任意 MV + 音频片段，按**导演视角**设计分镜，输出 **9:16 竖屏短视频**（HyperFrames 合成，含 GSAP 动态歌词、音频轨道）。

---

## 适用场景

- 有一首歌的 **MV 视频**（横屏 16:9）+ **音频片段**（30-60s）
- 想做 **微信视频号/抖音/小红书** 竖屏二创
- 需要**导演级运镜设计**（非机械裁切）、**动态歌词**（弹性入场/呼吸光晕/模糊淡入淡出）
- 产物必须是**真视频文件**（非图片序列），走 HyperFrames 标准渲染管线

---

## 输入

| 字段 | 说明 | 例 |
|------|------|----|
| `mv_path` | 原始 MV 文件路径 | `D:\AI音乐\歌曲\assets\mv.mp4` |
| `audio_path` | 配乐片段（已按歌词对齐好） | `assets\song-30s.mp3` |
| `lyrics[]` | 歌词数组：`{text, start, end, highlight?}` | 见下文 |
| `shots[]` | 分镜设计：`{mv_start, mv_end, crop_x, label}` | 见下文 |
| `output` | 输出路径 | `outputs\song-final.mp4` |
| `canvas` | 画布规格（默认 1080×1920 @30fps） | `{w:1080, h:1920, fps:30, dur:30}` |

**歌词数组例：**
```json
[
  {"text":"我唱出心里话时眼泪会流","start":0,"end":6},
  {"text":"要是怕难过抱住我手","start":5.5,"end":11.5},
  {"text":"我只得千语万言放在你心","start":10.5,"end":16.5},
  {"text":"比渴望地老天荒更簡單未算罕有","start":16,"end":22},
  {"text":"谁人又相信一世一生这肤浅对白","start":22,"end":28,"highlight":true}
]
```

**分镜数组例：**
```json
[
  {"mv_start":137,"mv_end":143,"crop_x":600,"label":"暖色Eason特写"},
  {"mv_start":143,"mv_end":149,"crop_x":600,"label":"冷色Eason+合唱团"},
  {"mv_start":149,"mv_end":155,"crop_x":600,"label":"乐团弦乐/Eason"},
  {"mv_start":155,"mv_end":161,"crop_x":600,"label":"Eason投入演唱特写"},
  {"mv_start":161,"mv_end":167,"crop_x":1200,"label":"乐团全景/余韵"}
]
```
> `crop_x` 是在 3840 宽源画面中，竖屏裁切窗口左上角 x 坐标（裁切宽=1215=2160×9/16）。

---

## 流程（全自动，一条命令）

```
mv-fanedit <project_dir>
```

内部自动完成：

1. **素材准备** — 用 ffmpeg 从 `mv_path` 按 `shots[]` 时间码裁切出竖屏片段（`-vf crop=1215:2160:x:0,scale=1080:1920`），输出到 `renders/shot{N}.mp4`
2. **生成 HyperFrames 合成** — 写 `index.html`：
   - 根 `<div data-composition-id="…" data-width="1080" data-height="1920" data-duration="30" data-start="0">`
   - 每个视频片段 = `<video class="clip" data-track-index="0" data-start="…" data-duration="…" src="…">`
   - 音频 = `<audio class="clip" data-track-index="1" data-start="0" data-duration="30" src="…">`
   - 歌词容器 + 每句 `<div class="lyric-line" id="lN">`
3. **注册 GSAP Timeline** — `window.__timelines["id"] = tl`，包含：
   - 视频切换：`tl.add(() => {…}, shot.start)`
   - 歌词动画：
     - 入场：`fromTo({opacity:0,y:40,scale:0.9,filter:'blur(8px)'}, {opacity:1,y:0,scale:1,filter:'blur(0px)'}, durIn, 'power2.out')`
     - 弹性放大：`fromTo({scale:1.1}, {scale:1}, 1.2, 'elastic.out(1,0.5)')`
     - 高亮句呼吸：`fromTo({scale:1}, {scale:1.05}, 1.5, 'sine.inOut', repeat=N, yoyo:true)`
     - 退场：`to({opacity:0,y:-30,scale:0.95,filter:'blur(6px)'}, durOut, 'power2.in')`
   - 署名淡入
4. **HyperFrames 管线** — `lint → check → render --quality high`，产出最终 mp4（含音频）

---

## 导演设计原则（内置，不可改）

| 维度 | 规则 |
|------|------|
| **运镜** | 每个分镜对应 MV 真实画面内容（Eason在左/中/右、乐团、合唱团），裁切框跟随主体，**非机械左右切** |
| **歌词节奏** | 歌词进退严格对齐音频波形；高亮句（副歌核心句）触发呼吸光晕 |
| **视觉层级** | 底层：视频 → 晕影 → 歌词渐变遮罩 → 歌词层 → 署名 |
| **字体** | 楷体 KaiTi（中文歌词最佳阅读），fallback Inter |
| **色彩** | 暖金 `#D4A574` 高亮，白字 + 双层阴影保证可读性 |

---

## CLI 使用

```bash
# 项目目录结构（由 init 生成）
my-song/
├── assets/
│   ├── mv.mp4
│   └── song-30s.mp3
├── config.json          # 见下文
└── outputs/

# 一键执行
npx mv-fanedit my-song
```

**config.json 模板：**
```json
{
  "mv_path": "assets/mv.mp4",
  "audio_path": "assets/song-30s.mp3",
  "canvas": { "w": 1080, "h": 1920, "fps": 30, "dur": 30 },
  "shots": [
    {"mv_start":137,"mv_end":143,"crop_x":600,"label":"..."},
    {"mv_start":143,"mv_end":149,"crop_x":600,"label":"..."},
    {"mv_start":149,"mv_end":155,"crop_x":600,"label":"..."},
    {"mv_start":155,"mv_end":161,"crop_x":600,"label":"..."},
    {"mv_start":161,"mv_end":167,"crop_x":1200,"label":"..."}
  ],
  "lyrics": [
    {"text":"...","start":0,"end":6},
    {"text":"...","start":5.5,"end":11.5},
    {"text":"...","start":10.5,"end":16.5},
    {"text":"...","start":16,"end":22},
    {"text":"...","start":22,"end":28,"highlight":true}
  ],
  "output": "outputs/song-final.mp4"
}
```

---

## 依赖

- `ffmpeg`（PATH 可用）
- `node` ≥ 22 + `npx hyperframes@latest`
- HyperFrames 项目已 `init` 并在 `package.json` 里锁定版本

---

## 产出物

| 文件 | 说明 |
|------|------|
| `outputs/song-final.mp4` | 最终成片（H.264 + AAC，30s，1080×1920） |
| `renders/shot*.mp4` | 中间裁切片段（可删） |
| `index.html` | HyperFrames 合成源文件（可二次编辑） |

---

## 扩展点（如需二次开发）

- `references/shot-extractor.js` — 裁切参数计算、ffmpeg 命令生成
- `references/composer.js` — HyperFrames HTML + GSAP Timeline 生成
- `references/lyric-animator.js` — 歌词动画预设库（弹性/呼吸/模糊/打字机/逐字高光）
- `references/style-tokens.json` — 色板、字体、阴影、间距等设计系统 token

---

## 许可

MIT — 随意用于商业/非商业二创。注明技术栈：HyperFrames + GSAP。