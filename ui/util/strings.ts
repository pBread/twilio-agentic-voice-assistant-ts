export function redactPhoneNumbers(input: string): string {
  const phoneRegex = /(\+?1[-\s.]?)?\(?(\d{3})\)?[-\s.]?(\d{3})[-\s.]?(\d{4})/g;

  return input.replace(
    phoneRegex,
    (match, countryCode, areaCode, prefix, lastFour) => {
      // Preserve the +1 country code if it exists
      const preservedCountryCode =
        countryCode && countryCode.includes("+") ? countryCode : "";

      // Count how many digits need to be redacted (excluding country code and last four)
      const digitsInAreaCodeAndPrefix = 6; // 3 for area code + 3 for prefix

      // Create bullet points for redacted digits
      const bullets = "•".repeat(digitsInAreaCodeAndPrefix);

      return `${preservedCountryCode}${bullets}${lastFour}`;
    },
  );
}
