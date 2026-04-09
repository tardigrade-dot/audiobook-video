# Audiobook Video Generator

使用 Remotion 将有声书音频（WAV）和字幕（SRT）合成为精美的字幕视频。

## 功能特点

- ✅ 自动解析 SRT 字幕文件
- ✅ 支持 WAV 音频播放
- ✅ 当前字幕高亮显示（蓝色发光）
- ✅ 自动滚动显示上下文
- ✅ 精美渐变背景和动画效果
- ✅ 批量渲染支持

## 安装

```bash
npm install
```

需要系统依赖：
- **Node.js** 18+
- **ffprobe** (用于检测音频时长): `brew install ffmpeg`

## 使用方法

### 准备工作

将音频和字幕文件放到 `public/` 目录：

```
public/
├── audio.wav      # 音频文件
└── content.srt    # SRT 字幕文件
```

### 1. 预览（开发模式）

启动 Remotion Studio 进行预览和调试：

```bash
npm run dev
```

打开浏览器访问 `http://localhost:3000`

### 2. 单个文件渲染（调试用）

渲染单个音频+字幕文件进行测试：

```bash
# 语法
node render-single.js <wav文件> <srt文件> [输出名称]

# 示例
node render-single.js audio.wav subtitles.srt test-video
```

这会在 `out/` 目录生成 `test-video.mp4` 文件。

### 3. 批量渲染（生产用）

渲染整个目录中的所有音频+字幕文件对：

```bash
# 语法
node render-all.js <包含wav和srt文件的目录>

# 示例
node render-all.js /Users/larry/Downloads/wenhuaquanliyuguojia/
```

脚本会：
- 自动扫描目录中所有 `.wav` 和 `.srt` 文件
- 按文件名自动配对（如 `chapter1.wav` + `chapter1.srt`）
- 自动检测每个音频的时长
- 逐个渲染成 MP4 视频
- 输出到 `out/` 目录

### 4. 直接渲染（使用默认文件）

如果只想渲染当前配置的默认文件：

```bash
npx remotion render Audiobook out/video.mp4
```

## 项目结构

```
├── src/
│   ├── AudiobookSubtitle.tsx    # 主要字幕组件
│   ├── Root.tsx                  # Remotion 入口（从 public 读取文件）
│   └── srtData.ts                # SRT/TXT 解析器
├── public/
│   ├── audio.wav                 # 当前渲染使用的音频
│   └── content.srt               # 当前渲染使用的字幕
├── out/                          # 输出目录
├── render-single.js              # 单文件渲染脚本
├── render-all.js                 # 批量渲染脚本
└── package.json
```

## 自定义样式

编辑 `src/AudiobookSubtitle.tsx` 可以调整：

- **字体大小**: 修改 `fontSize` 值（当前字幕 42px，其他 36px）
- **高亮颜色**: 修改 `color: "#60a5fa"` 
- **背景渐变**: 修改 `background` 属性
- **滚动速度**: 调整 `itemHeight` 和容器高度
- **显示数量**: 修改 `startIndex` 和 `endIndex` 计算

## 渲染参数

- **分辨率**: 1920x1080 (Full HD)
- **帧率**: 30 fps
- **编码**: H.264
- **音频**: 直接从 WAV 文件播放

## 故障排除

### 预览时没有声音

这是浏览器安全策略，需要用户交互才能播放音频。在 Remotion Studio 中点击播放按钮即可。

### 渲染时音频路径 404 错误

确保音频文件已复制到 `public/` 目录，并使用 `staticFile()` 引用。

### 渲染速度慢

Remotion 会自动下载 Chrome Headless Shell（首次约 300MB），后续渲染会更快。

可以调整并发数来加快速度：

```bash
# 使用更多并行进程（需要更多 CPU）
npx remotion render Audiobook out/video.mp4 --concurrency 8
```

### 字幕显示位置不对

调整 `src/AudiobookSubtitle.tsx` 中的滚动计算逻辑，特别是 `targetOffset` 和 `clampedOffset`。

## 许可证

Private
