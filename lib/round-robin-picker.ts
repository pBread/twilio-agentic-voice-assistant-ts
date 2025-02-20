export function createRoundRobinPicker() {
  let counters: { [key: string]: number } = {};

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
