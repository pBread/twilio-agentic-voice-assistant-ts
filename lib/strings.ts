/**
 * Splits text into sentences using regex pattern matching.
 *
 * Regex pattern explanation:
 * 1. [.!?] - Matches standard sentence ending punctuation
 * 2. (?=[^a-z]) - Positive lookahead to ensure the next character isn't a lowercase letter
 *    (prevents splitting abbreviations like "Dr." or "Mr.")
 * 3. \n - Matches newline characters
 * 4. | - OR operator to combine multiple patterns
 * 5. (?<=\S) - Positive lookbehind to ensure there's a non-whitespace character before
 *    (prevents empty sentences from multiple newlines)
 *
 * The function will split on:
 * - Sentence ending punctuation (.!?) when not followed by a lowercase letter
 * - Newlines when preceded by a non-whitespace character
 *
 * @param text - The input text to split into sentences
 * @returns Array of sentences, with whitespace trimmed
 */
export function chunkIntoSentences(text: string): string[] {
  // If input is empty or not a string, return empty array
  if (!text || typeof text !== "string") return [];

  // Split the text on our delimiter pattern
  const sentences = text
    .split(/(?<=[.!?])(?=[^a-z])|(?<=\S)\n/)
    // Remove any potential empty strings
    .filter((sentence) => sentence.trim().length > 0)
    // Trim whitespace from each sentence
    .map((sentence) => sentence.trim());

  return sentences;
}

const endPunctuationRegex = /[.!?\n•:;]/;
export function hasEndPunctuation(text: string) {
  return endPunctuationRegex.test(text);
}
