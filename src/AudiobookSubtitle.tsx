import { useCurrentFrame, useVideoConfig, Audio, interpolate, staticFile } from "remotion";
import { parseSRT } from "./srtData";

interface AudiobookProps {
  audioPath?: string;
  srtContent?: string;
  title?: string;
}

interface ScrollingSubtitleProps {
  srtContent: string;
}

const ScrollingSubtitle: React.FC<ScrollingSubtitleProps> = ({ srtContent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;
  const subtitles = parseSRT(srtContent);

  // Layout constants
  const containerHeight = 1080 - 120; // top 60 + bottom 60
  const containerWidth = 1920 - 200; // left 100 + right 100
  const fontSize = 32;
  const lineHeight = 1.6;
  const paddingY = 0; // Removed extra padding to unify internal and external gaps

  const estimateHeight = (text: string): number => {
    // Assuming 1.0 factor for Chinese characters
    const estimationSize = fontSize; // Use 32 for packing
    const charsPerLine = Math.floor(containerWidth / estimationSize);
    const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
    // Add a small 4px buffer per line to account for the single highlighted line's expansion
    return lines * (estimationSize * lineHeight + 4);
  };

  // Build a "page": greedily pack subtitles until container is full
  const buildPage = (startIdx: number): { startIndex: number; endIndex: number } => {
    // Subtract safe zone (mask areas at top and bottom)
    const fadeZone = containerHeight * 0.10; // 5% top + 5% bottom
    const safeHeight = containerHeight - fadeZone;
    
    let currentHeight = 0;
    let end = startIdx;
    for (let i = startIdx; i < subtitles.length; i++) {
      const h = estimateHeight(subtitles[i].text);
      if (currentHeight + h > safeHeight && i > startIdx) break;
      currentHeight += h;
      end = i + 1;
    }
    return { startIndex: startIdx, endIndex: end };
  };

  // Determine which page we are on based on current time
  // Walk through pages sequentially to find which one contains the current time
  let pageIndex = 0;
  let pageStart = 0;
  let page = buildPage(0);

  // Walk forward: if the current time is beyond this page's last subtitle, advance to next page
  while (page.endIndex < subtitles.length) {
    const lastInPage = subtitles[page.endIndex - 1];
    if (currentTime > lastInPage.endTime) {
      // Move to next page
      pageStart = page.endIndex;
      page = buildPage(pageStart);
      pageIndex++;
    } else {
      break;
    }
  }

  // Find active subtitle within the current page
  let activeIndex = -1;
  for (let i = page.startIndex; i < page.endIndex; i++) {
    if (currentTime >= subtitles[i].startTime && currentTime <= subtitles[i].endTime) {
      activeIndex = i;
      break;
    }
  }

  // If no active subtitle in range, find the last passed one within this page
  if (activeIndex === -1) {
    for (let i = page.endIndex - 1; i >= page.startIndex; i--) {
      if (currentTime >= subtitles[i].endTime) {
        activeIndex = i;
        break;
      }
    }
    // If nothing has started yet, use the first subtitle in the page
    if (activeIndex === -1) {
      activeIndex = page.startIndex;
    }
  }

  const visibleSubtitles = subtitles.slice(page.startIndex, page.endIndex);

  // Calculate the total height of the current page for vertical centering
  let totalPageHeight = 0;
  visibleSubtitles.forEach((sub) => {
    totalPageHeight += estimateHeight(sub.text);
  });

  // Calculate a fixed vertical offset to center the entire page block
  const pageVerticalOffset = Math.max(0, (containerHeight - totalPageHeight) / 2);

  console.log(
    `[Page] page=${pageIndex}, start=${page.startIndex}, end=${page.endIndex}, active=${activeIndex}, pageHeight=${totalPageHeight.toFixed(0)}`
  );

  // Page transition animations
  const firstInPage = subtitles[page.startIndex];
  const pageStartTime = firstInPage.startTime;
  
  // Fade in the new page
  const pageFadeIn = interpolate(
    frame,
    [pageStartTime * fps - 10, pageStartTime * fps],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Slide up transition for the page turn
  const pageSlideUp = interpolate(
    frame,
    [pageStartTime * fps - 15, pageStartTime * fps],
    [40, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        position: "absolute",
        top: "60px",
        bottom: "60px",
        left: "100px",
        right: "100px",
        overflow: "hidden",
        maskImage: "linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)",
        fontFamily: '"PingFang SC", "PingFangSC-Regular", "Microsoft YaHei", sans-serif',
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          transform: `translateY(${pageVerticalOffset + pageSlideUp}px)`,
          opacity: pageFadeIn,
        }}
      >
        {visibleSubtitles.map((sub, index) => {
          const globalIndex = index + page.startIndex;
          const isCurrent = globalIndex === activeIndex;
          const isPast = activeIndex !== -1 && globalIndex < activeIndex;
          const isFuture = activeIndex === -1 || globalIndex > activeIndex;

          // Use the same height calculation for stationary positioning
          const baseFontSize = fontSize;
          const baseHeight = estimateHeight(subtitles[globalIndex].text);

          // Visual styles
          const visualFontSize = isCurrent ? 36 : baseFontSize;

          let color = "#e8e8e8";
          let fontWeight = 400;
          let textShadow = "0 1px 3px rgba(0, 0, 0, 0.2)";
          let itemOpacity = isFuture ? 0.65 : 0.75;

          if (isCurrent) {
            color = "#ffffff";
            fontWeight = 600;
            itemOpacity = 1;
            textShadow =
              "0 0 15px rgba(255, 255, 255, 0.4), 0 0 30px rgba(96, 165, 250, 0.2), 0 2px 8px rgba(0, 0, 0, 0.3)";
          } else if (isPast) {
            color = "#c0c0c0";
          } else {
            color = "#a8a8a8";
          }

          // Fade in/out animation for the current subtitle
          const fadeIn = isCurrent
            ? interpolate(
                frame,
                [sub.startTime * fps - 5, sub.startTime * fps],
                [0, 1],
                { extrapolateRight: "clamp" }
              )
            : 1;

          const fadeOut = isCurrent
            ? interpolate(
                frame,
                [sub.endTime * fps - 5, sub.endTime * fps],
                [1, 0],
                { extrapolateLeft: "clamp" }
              )
            : 1;

          const finalOpacity = itemOpacity * fadeIn * fadeOut * pageFadeIn;

          return (
            <div
              key={sub.index}
              style={{
                fontSize: visualFontSize,
                lineHeight: `${lineHeight}`,
                color,
                textAlign: "left",
                fontWeight,
                textShadow,
                opacity: finalOpacity,
                padding: `${paddingY}px 0`,
                minHeight: `${baseHeight}px`,
                letterSpacing: "0.03em",
              }}
            >
              {sub.text}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const AudiobookSubtitle: React.FC<AudiobookProps> = ({
  audioPath = staticFile("example.wav"),
  srtContent = "",
  title = "有声书",
  duration = 460
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const currentTime = frame / fps;

  // Background animation
  const bgOffset1 = interpolate(Math.sin(currentTime * 0.3), [-1, 1], [-50, 50]);
  const bgOffset2 = interpolate(Math.cos(currentTime * 0.2), [-1, 1], [-30, 30]);

  // Show loading state if no subtitles yet
  if (!srtContent || srtContent.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1429 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: "48px",
            color: "#64748b",
            fontWeight: 300,
            letterSpacing: "0.1em",
            fontFamily: '"PingFang SC", "PingFangSC-Regular", "Microsoft YaHei", sans-serif',
          }}
        >
          正在加载字幕...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1429 100%)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Animated background orbs */}
      <div
        style={{
          position: "absolute",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(96, 165, 250, 0.12) 0%, transparent 70%)",
          top: "10%",
          left: "15%",
          transform: `translate(${bgOffset1}px, ${bgOffset2}px)`,
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)",
          bottom: "15%",
          right: "10%",
          transform: `translate(${-bgOffset2}px, ${-bgOffset1}px)`,
          filter: "blur(40px)",
        }}
      />

      {/* Title area */}
      <div
        style={{
          position: "absolute",
          top: "30px",
          left: 0,
          right: 0,
          textAlign: "center",
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontSize: "28px",
            fontWeight: 300,
            color: "#64748b",
            letterSpacing: "0.15em",
            opacity: 0.6,
            fontFamily: '"PingFang SC", "PingFangSC-Regular", "Microsoft YaHei", sans-serif',
          }}
        >
          {title}
        </div>
      </div>

      {/* Scrolling subtitles */}
      <ScrollingSubtitle srtContent={srtContent} />

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "80%",
          height: "4px",
          background: "rgba(255, 255, 255, 0.08)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min((currentTime / duration) * 100, 100)}%`,
            height: "100%",
            background: "linear-gradient(90deg, #60a5fa 0%, #8b5cf6 50%, #ec4899 100%)",
            borderRadius: "2px",
            transition: "width 0.1s linear",
            boxShadow: "0 0 15px rgba(96, 165, 250, 0.6)",
          }}
        />
      </div>

      {/* Time indicator */}
      <div
        style={{
          position: "absolute",
          bottom: "35px",
          right: "80px",
          fontSize: "18px",
          color: "#475569",
          fontFamily: "monospace",
          opacity: 0.5,
        }}
      >
        {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")}
      </div>

      {/* Audio element */}
      {audioPath && <Audio src={audioPath} volume={1} />}
    </div>
  );
};
