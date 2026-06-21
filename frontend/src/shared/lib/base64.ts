export function encodeTextBase64(text: string) {
  return btoa(String.fromCodePoint(...new TextEncoder().encode(text)))
}

export function decodeTextBase64(payload: string) {
  const binary = atob(payload)
  const bytes = Uint8Array.from(binary, (char) => char.codePointAt(0) ?? 0)
  return new TextDecoder().decode(bytes)
}
