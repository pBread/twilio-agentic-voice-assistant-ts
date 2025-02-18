export function prettyXML(xml: string): string {
  const maxParameterValueLength = 50;
  const indent = "  ";

  // Remove white spaces between tags
  let formatted = xml.replace(/>\s*</g, "><");

  // Add newline
  formatted = formatted.replace(/</g, "\n<");

  // Handle CDATA and comments
  const cdataAndComments: string[] = [];
  let cdataIndex = 0;

  // Extract CDATA and comments to protect them
  // Using a workaround for the 's' flag for ES2015 compatibility
  formatted = formatted.replace(
    /(<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->)/g,
    (match) => {
      cdataAndComments.push(match);
      return `###CDATA_COMMENT_${cdataIndex++}###`;
    },
  );

  // Handle Parameter values truncation
  const parameterValues: string[] = [];
  let valueIndex = 0;

  formatted = formatted.replace(
    /<Parameter[^>]*\svalue="([^"]*)"[^>]*>/g,
    (match, value) => {
      if (value.length > maxParameterValueLength) {
        parameterValues.push(value);
        return match.replace(value, `[TRUNCATED_VALUE_${valueIndex++}]`);
      }
      return match;
    },
  );

  let result = "";
  let indentLevel = 0;

  // Process each line
  const lines = formatted.split("\n");
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Skip empty lines
    if (line.trim() === "") continue;

    // Check if this line contains a closing tag or a self-closing tag
    const isClosingTag = line.indexOf("</") === 0;
    const isSelfClosingTag = line.indexOf("/>") >= 0;
    const isOpeningAndClosingTag =
      !isSelfClosingTag && line.indexOf("<") === 0 && line.indexOf("</") > 0;

    // Adjust indentation based on tag type
    if (isClosingTag || isOpeningAndClosingTag) {
      indentLevel--;
    }

    // Add current line with proper indentation
    result += `${indent.repeat(Math.max(0, indentLevel))}${line}\n`;

    // Adjust indentation for next line
    if (
      !isClosingTag &&
      !isSelfClosingTag &&
      !isOpeningAndClosingTag &&
      line.indexOf("<") === 0
    ) {
      indentLevel++;
    }
  }

  // Restore truncated Parameter values
  result = result.replace(/\[TRUNCATED_VALUE_(\d+)\]/g, (match, index) => {
    const originalValue = parameterValues[parseInt(index)];
    return `${originalValue.substring(0, maxParameterValueLength)}... (${originalValue.length} chars)`;
  });

  // Restore CDATA and comments
  result = result.replace(/###CDATA_COMMENT_(\d+)###/g, (match, index) => {
    return cdataAndComments[parseInt(index)];
  });

  return result.trim();
}
