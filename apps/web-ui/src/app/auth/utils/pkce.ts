/**
 * Generates a high-entropy cryptographic random string for the code verifier.
 * @returns {string} The code verifier.
 */
export function generateCodeVerifier(): string {
  const array = new Uint32Array(56);
  crypto.getRandomValues(array);
  return Array.from(array, (dec) => ('0' + dec.toString(16)).substring(-2)).join('');
}

/**
 * Generates a SHA-256 hash of the code verifier and base64url encodes it.
 * @param {string} codeVerifier The code verifier.
 * @returns {Promise<string>} The code challenge.
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64urlencode(digest);
}

/**
 * Base64URL encodes an ArrayBuffer.
 * @param {ArrayBuffer} a The ArrayBuffer to encode.
 * @returns {string} The base64url encoded string.
 */
function base64urlencode(a: ArrayBuffer): string {
  return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(a))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
