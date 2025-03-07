/**
 * Creates a stateful function that selects phrases in a round-robin fashion,
 * ensuring even distribution across multiple calls.
 *
 * @returns {Function} A picker function that selects the least used phrase from an array
 *
 * @example
 * const picker = createRoundRobinPicker();
 *
 * const greetings = ["Hello", "Howdy"];
 *
 * picker(greetings); // first call - both phrases have 0 usage count, so one will be randomly selected
 * picker(greetings); // second call - selects the phrase that wasn't chosen in the first call
 * picker(greetings); // third call - both phrases now have usage count of 1, so selection is random again
 */

export function createRoundRobinPicker() {
  let counters: { [key: string]: number } = {};

  /**
   * Selects the phrase that has been used the least number of times.
   * If multiple phrases are tied for least used, one is randomly selected.
   *
   * @param {string[]} items - Array of phrases to choose from
   * @returns {string} The selected phrase (least frequently used)
   */
  return function pickLeastUsedPhrase(items: string[]): string {
    const minUsage = Math.min(...items.map((phrase) => counters[phrase] ?? 0));

    const leastUsedPhrases = items.filter(
      (phrase) => (counters[phrase] ?? 0) === minUsage,
    );

    const selected =
      leastUsedPhrases[Math.floor(Math.random() * leastUsedPhrases.length)];

    counters[selected] = (counters[selected] ?? 0) + 1;

    return selected;
  };
}
