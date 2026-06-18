export function uint8ToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunk = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(offset, offset + chunk)))
  }
  return btoa(binary)
}

export function base64ToString(value: string) {
  const binary = atob(value)
  try {
    return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)))
  } catch {
    return binary
  }
}
