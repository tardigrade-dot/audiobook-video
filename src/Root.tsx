import "./index.css";
import { Composition, staticFile, useVideoConfig, getInputProps } from "remotion";
import { AudiobookSubtitle } from "./AudiobookSubtitle";
import { useEffect, useState } from "react";

// Component to load SRT file at runtime
const AudiobookWithSRT: React.FC = () => {
  const [srtContent, setSrtContent] = useState("");
  const { title = "有声书" } = getInputProps() as { title?: string };

  useEffect(() => {
    // Use staticFile to get the correct URL for the SRT file
    const srtPath = staticFile("content.srt");
    
    fetch(srtPath)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load SRT: ${res.status}`);
        }
        return res.text();
      })
      .then((text) => {
        console.log('✅ Loaded SRT content, length:', text.length);
        setSrtContent(text);
      })
      .catch((err) => {
        console.error("❌ Error loading SRT:", err);
      });
  }, []);

  return (
    <AudiobookSubtitle
      audioPath={staticFile("audio.wav")}
      srtContent={srtContent}
      title={title}
    />
  );
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Audiobook"
        component={AudiobookWithSRT}
        durationInFrames={13500} // Will be overridden by render scripts
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
