// The institution add/edit payload takes flat arrays, but the
// list returns what's stored: language as { default, supported: [...] } and
// allowed_login_identifiers as { username: true, ... } (lowercase keys).
// Reading only arrays opened every institution with nothing ticked, so a
// save would have wiped its languages and login methods.
export function languageCodes(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  return [...new Set([...(Array.isArray(value.supported) ? value.supported : []), value.default].filter(Boolean))];
}

export function identifierCodes(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).toUpperCase());
  if (!value || typeof value !== "object") return [];
  return Object.keys(value)
    .filter((k) => value[k])
    .map((k) => k.toUpperCase());
}
