import { useState, useEffect } from "react";
import { useCurrentFrame, interpolate, useVideoConfig } from "remotion";
import { subtitles } from "./subtitles";

interface SubtitleWordProps {
  word: string;
  start: number;
  end: number;
  fps: number;
}

const SubtitleWord: React.FC<SubtitleWordProps> = ({ word, start, end, fps }) => {
  const frame = useCurrentFrame();
  const startTime = start * fps;
  const endTime = end * fps;

  const opacity = interpolate(frame, [startTime - 5, startTime, endTime, endTime + 5], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = interpolate(frame, [startTime - 5, startTime], [0.8, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(frame, [startTime - 5, startTime], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isHighlighted = frame >= startTime && frame <= endTime;

  return (
    <span
      style={{
        display: "inline-block",
        opacity,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        transition: "all 0.1s ease-out",
        padding: "4px 8px",
        margin: "0 4px",
        fontSize: isHighlighted ? "48px" : "40px",
        fontWeight: isHighlighted ? "800" : "600",
        color: isHighlighted ? "#ffffff" : "#e2e8f0",
        textShadow: isHighlighted 
          ? "0 0 30px rgba(59, 130, 246, 0.8), 0 0 60px rgba(59, 130, 246, 0.4)" 
          : "0 2px 10px rgba(0, 0, 0, 0.5)",
        background: isHighlighted 
          ? "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" 
          : "transparent",
        borderRadius: "12px",
        lineHeight: "1.6",
      }}
    >
      {word}
    </span>
  );
};

export const AnimatedSubtitles: React.FC = () => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated background particles */}
      <div
        style={{
          position: "absolute",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
          top: "20%",
          left: "10%",
          animation: "pulse 4s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
          bottom: "20%",
          right: "15%",
          animation: "pulse 5s ease-in-out infinite",
        }}
      />

      {/* Subtitle text */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          maxWidth: "80%",
          padding: "40px",
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(10px)",
          borderRadius: "24px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px" }}>
          {subtitles.map((subtitle, index) => (
            <SubtitleWord
              key={`${subtitle.word}-${index}`}
              word={subtitle.word}
              start={subtitle.start}
              end={subtitle.end}
              fps={fps}
            />
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: "40px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "60%",
          height: "4px",
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${(frame / 180) * 100}%`,
            height: "100%",
            background: "linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)",
            borderRadius: "2px",
            transition: "width 0.1s linear",
          }}
        />
      </div>
    </div>
  );
};
