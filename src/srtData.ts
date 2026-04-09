interface SubtitleEntry {
  index: number;
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string;
}

const parseSRTTime = (timeStr: string): number => {
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
 * Parse SRT format subtitles (with timestamps)
 */
export const parseSRT = (srtContent: string): SubtitleEntry[] => {
  const entries: SubtitleEntry[] = [];
  const blocks = srtContent.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length >= 3) {
      const index = parseInt(lines[0], 10);
      const timeMatch = lines[1].match(
        /(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/
      );
      if (timeMatch) {
        const startTime = parseSRTTime(timeMatch[1]);
        const endTime = parseSRTTime(timeMatch[2]);
        const text = lines.slice(2).join(" ");
        entries.push({ index, startTime, endTime, text });
      }
    }
  }

  return entries;
};

/**
 * Parse plain text subtitles (without timestamps)
 * Automatically divides time based on text length
 */
export const parseTXT = (
  txtContent: string,
  totalDuration: number
): SubtitleEntry[] => {
  // Split by sentence endings or newlines
  const segments = txtContent
    .replace(/\s+/g, " ")
    .split(/(?<=[。！？；.!?;])\s*/)
    .filter((s) => s.trim().length > 0);

  // Calculate time per segment based on character count
  const totalChars = segments.reduce((sum, s) => sum + s.length, 0);
  const secondsPerChar = totalDuration / totalChars;

  const entries: SubtitleEntry[] = [];
  let currentTime = 0;

  segments.forEach((text, index) => {
    const trimmedText = text.trim();
    if (trimmedText.length === 0) return;

    const duration = trimmedText.length * secondsPerChar;
    const startTime = currentTime;
    const endTime = currentTime + duration;

    entries.push({
      index: index + 1,
      startTime,
      endTime,
      text: trimmedText,
    });

    currentTime = endTime;
  });

  return entries;
};

export type { SubtitleEntry };
