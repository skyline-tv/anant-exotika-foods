export function toTitleCase(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/(^|[\s\-/])([a-z0-9])/g, (match, separator, character) => separator + character.toUpperCase());
}
