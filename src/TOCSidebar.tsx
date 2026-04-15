import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { useRef, useEffect } from "react";

interface TOCEntry {
  index: number;
  startTime: number;
  endTime: number;
  text: string;
}

const parseTOCTime = (timeStr: string): number => {
  const [hours, minutes, secondsAndMs] = timeStr.split(":");
  const [seconds, milliseconds] = secondsAndMs.split(",");
  return (
    parseInt(hours, 10) * 3600 +
    parseInt(minutes, 10) * 60 +
    parseInt(seconds, 10) +
    parseInt(milliseconds, 10) / 1000
  );
};

/**
 * Parse TOC SRT format (without index numbers)
 * Format:
 * 00:00:00,402 --> 00:00:40,241
 * ## 根目录1
 */
const parseTOCSRT = (tocContent: string): TOCEntry[] => {
  const entries: TOCEntry[] = [];
  const blocks = tocContent.trim().split(/\n\s*\n/);

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    const lines = block.split("\n");

    // Try standard SRT format first (with index)
    if (lines.length >= 3) {
      const index = parseInt(lines[0], 10);
      const timeMatch = lines[1].match(
        /(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/
      );
      if (timeMatch && !isNaN(index)) {
        const startTime = parseTOCTime(timeMatch[1]);
        const endTime = parseTOCTime(timeMatch[2]);
        const text = lines.slice(2).join(" ");
        entries.push({ index: isNaN(index) ? i + 1 : index, startTime, endTime, text });
        continue;
      }
    }

    // Try TOC format (without index, just time and text)
    if (lines.length >= 2) {
      const timeMatch = lines[0].match(
        /(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/
      );
      if (timeMatch) {
        const startTime = parseTOCTime(timeMatch[1]);
        const endTime = parseTOCTime(timeMatch[2]);
        const text = lines.slice(1).join(" ");
        entries.push({ index: i + 1, startTime, endTime, text });
      }
    }
  }

  return entries;
};

interface TOCSidebarProps {
  tocContent: string;
}

export const TOCSidebar: React.FC<TOCSidebarProps> = ({ tocContent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;
  const tocEntries = parseTOCSRT(tocContent);
  const containerRef = useRef<HTMLDivElement>(null);

  console.log('[TOC] Parsed entries:', tocEntries.length, 'Current time:', currentTime.toFixed(2));

  // Find the current active TOC entry
  let activeIndex = -1;
  for (let i = 0; i < tocEntries.length; i++) {
    if (currentTime >= tocEntries[i].startTime && currentTime <= tocEntries[i].endTime) {
      activeIndex = i;
      break;
    }
  }

  // If no active entry, find the last one that has passed
  if (activeIndex === -1) {
    for (let i = tocEntries.length - 1; i >= 0; i--) {
      if (currentTime >= tocEntries[i].endTime) {
        activeIndex = i;
        break;
      }
    }
  }

  // Auto-scroll to active entry
  useEffect(() => {
    if (activeIndex >= 0 && containerRef.current) {
      const activeElement = containerRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeIndex]);

  // Extract chapter title from text (remove markdown ## or ###)
  const extractTitle = (text: string): string => {
    return text.replace(/^#{1,6}\s*/, "").trim();
  };

  // Determine heading level from text
  const getHeadingLevel = (text: string): number => {
    const match = text.match(/^(#{1,6})\s/);
    return match ? match[1].length : 2; // Default to level 2
  };

  return (
    <div
      style={{
        width: "400px",
        height: "100%",
        position: "absolute",
        left: 0,
        top: 0,
        background: "rgba(0, 0, 0, 0.3)",
        borderRight: "1px solid rgba(255, 255, 255, 0.1)",
        padding: "60px 20px 80px 20px",
        overflow: "hidden",
        fontFamily: '"PingFang SC", "PingFangSC-Regular", "Microsoft YaHei", sans-serif',
      }}
    >
      {/* TOC Title */}
      <div
        style={{
          fontSize: "20px",
          fontWeight: 600,
          color: "#64748b",
          letterSpacing: "0.1em",
          marginBottom: "12px",
          paddingBottom: "12px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        目录
      </div>

      {/* TOC Entries - Scrollable container */}
      <div
        ref={containerRef}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          overflowY: "auto",
          height: "calc(100% - 60px)",
          paddingBottom: "20px",
        }}
      >
        {tocEntries.map((entry, index) => {
          const isActive = index === activeIndex;
          const isPast = activeIndex !== -1 && index < activeIndex;
          const isFuture = activeIndex === -1 || index > activeIndex;

          const level = getHeadingLevel(entry.text);
          const title = extractTitle(entry.text);

          // Calculate opacity for fade-in/fade-out
          const fadeIn = isActive
            ? interpolate(
                frame,
                [entry.startTime * fps - 5, entry.startTime * fps],
                [0, 1],
                { extrapolateRight: "clamp" }
              )
            : 1;

          const fadeOut = isActive
            ? interpolate(
                frame,
                [entry.endTime * fps - 5, entry.endTime * fps],
                [1, 0],
                { extrapolateLeft: "clamp" }
              )
            : 1;

          // Visual styles
          let color = "#52525b";
          let fontSize = "22px";
          let fontWeight = 400;
          let itemOpacity = isFuture ? 0.4 : 0.6;
          let paddingLeft = (level - 2) * 16; // Indent for sub-chapters

          if (isActive) {
            color = "#55aa8b";
            fontSize = "24px";
            fontWeight = 600;
            itemOpacity = 1;
          } else if (isPast) {
            color = "#3f3f46";
          }

          const finalOpacity = itemOpacity * fadeIn * fadeOut;

          // Format time as MM:SS
          const formatTime = (seconds: number): string => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${String(secs).padStart(2, "0")}`;
          };

          return (
            <div
              key={entry.index}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "8px",
                paddingLeft: `${paddingLeft}px`,
                opacity: finalOpacity,
                transition: "all 0.2s ease",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  color,
                  fontFamily: "monospace",
                  opacity: 0.6,
                  minWidth: "45px",
                }}
              >
                {formatTime(entry.startTime)}
              </span>
              <span
                style={{
                  fontSize,
                  color,
                  fontWeight,
                  flex: 1,
                }}
              >
                {title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
