import "./index.css";
import { Composition, staticFile, getInputProps, CalculateMetadataFunction } from "remotion";
import { AudiobookSubtitle } from "./AudiobookSubtitle";
import { useEffect, useState } from "react";

interface InputProps {
  title?: string;
  audioPath?: string;
  srtContent?: string;
  srtPath?: string;
  tocPath?: string;
  durationFrames?: number;
  [key: string]: unknown;
}

// Dynamically calculate durationInFrames from props
export const calculateMetadata: CalculateMetadataFunction<InputProps> = ({ props }) => {
  const durationInFrames = props.durationFrames ?? 13500;
  return {
    durationInFrames,
    props,
  };
};

// Component to load SRT file at runtime
const AudiobookWithSRT: React.FC = () => {
  const [srtContent, setSrtContent] = useState("");
  const [tocContent, setTocContent] = useState("");
  const inputProps = getInputProps() as InputProps;

  const { title = "有声书" } = inputProps;
  const { audioPath: propsAudioPath, srtContent: propsSrtContent, srtPath: propsSrtPath, tocPath: propsTocPath } = inputProps;

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

  // Load TOC content if tocPath is provided
  useEffect(() => {

    const tocPath = propsTocPath ? staticFile(propsTocPath) : staticFile("example-toc.srt");
    fetch(tocPath)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load TOC: ${res.status}`);
        }
        return res.text();
      })
      .then((text) => {
        console.log('✅ Loaded TOC content, length:', text.length);
        setTocContent(text);
      })
      .catch((err) => {
        console.error("❌ Error loading TOC:", err);
      });
  }, [propsTocPath]);

  const audioPath = propsAudioPath ? staticFile(propsAudioPath) : staticFile("example.wav");

  return (
    <AudiobookSubtitle
      audioPath={audioPath}
      srtContent={srtContent}
      tocContent={tocContent}
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
        calculateMetadata={calculateMetadata}
        durationInFrames={13500} // Default, overridden by calculateMetadata
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
