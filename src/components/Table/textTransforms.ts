// Ported from noviq-hrms-ui's utils/commonFunctions.js — tiny, pure, no HRMS coupling.

export function capitalize(sentence?: string): string {
  return (
    sentence
      ?.toLowerCase()
      .replace(
        /(^\s*[a-z])|([.!?]\s+[a-z])|([:\n]\s*[a-z])|((?:^|\n)\s*[-•]\s*[a-z])/g,
        (match) => match.toUpperCase()
      ) ?? ""
  );
}

export function capitalizeEveryWord(text = ""): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

export function capitalizeUpToThree(sentence?: string): string {
  if (!sentence || sentence.length < 4) return sentence?.toUpperCase() ?? "";
  return capitalize(sentence);
}
