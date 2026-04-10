import "./index.css";
import { Composition, staticFile, getInputProps } from "remotion";
import { AudiobookSubtitle } from "./AudiobookSubtitle";
import { useEffect, useState } from "react";

// Component to load SRT file at runtime
const AudiobookWithSRT: React.FC = () => {
  const [srtContent, setSrtContent] = useState("");
  const inputProps = getInputProps() as {
    title?: string;
    audioPath?: string;
    srtContent?: string;
    srtPath?: string;
  };

  const { title = "有声书" } = inputProps;
  const { audioPath: propsAudioPath, srtContent: propsSrtContent, srtPath: propsSrtPath } = inputProps;

  // Use srtContent from props if provided, otherwise fetch from srtPath or default
  useEffect(() => {
    if (propsSrtContent) {
      setSrtContent(propsSrtContent);
      return;
    }

    const srtPath = propsSrtPath ? staticFile(propsSrtPath) : staticFile("example.srt");
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
  }, [propsSrtContent, propsSrtPath]);

  const audioPath = propsAudioPath ? staticFile(propsAudioPath) : staticFile("example.wav");

  return (
    <AudiobookSubtitle
      audioPath={audioPath}
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
