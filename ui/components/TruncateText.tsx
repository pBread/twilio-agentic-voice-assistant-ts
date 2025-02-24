import { Text } from "@mantine/core";
import { useState } from "react";

export function TruncatedText({
  text,
  maxLength = 500,
}: {
  text: string;
  maxLength: number;
}) {
  const [showFullText, setShowFullText] = useState(false);

  // Only truncate if needed
  const shouldTruncate = text && text.length > maxLength;
  const displayedText =
    shouldTruncate && !showFullText
      ? text.substring(0, maxLength) + "..."
      : text;

  const toggleText = () => {
    setShowFullText(!showFullText);
  };

  return (
    <>
      {displayedText}
      {shouldTruncate && (
        <Text
          c="blue"
          span
          onClick={toggleText}
          style={{ cursor: "pointer", marginLeft: "4px" }}
        >
          {showFullText ? "show less" : "show more"}
        </Text>
      )}
    </>
  );
}
