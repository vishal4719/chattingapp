export function formatTypingText(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} is typing...`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} other${names.length - 2 > 1 ? "s" : ""} are typing...`;
}
