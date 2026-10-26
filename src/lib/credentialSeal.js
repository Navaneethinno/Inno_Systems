import { env } from "../config/env";

// Passwords, PINs and codes never travel as readable text: each is sealed
// with the platform's RSA public key (RSA-OAEP-256, WebCrypto) and the API
// gateway opens it. An envelope works once, for five minutes, so every
// request seals afresh. Only the public half is here; only the server can
// open an envelope.

// The fields the API gateway refuses in plain text.
const SEALED = new Set(["password", "old_password", "new_password", "confirm_password", "current_password", "password_hash", "pin", "current_pin", "new_pin", "confirm_pin", "txn_pin", "signin_pin", "card_pin", "current_card_pin", "otp", "current", "new", "confirm"]);

let credKey = null;
// Server clock minus this device's clock, so a wrong device clock does not
// make every envelope look expired.
let clockOffset = 0;

async function loadKey() {
  // WebCrypto exists only on a secure page (https, or http://localhost).
  if (!globalThis.crypto?.subtle) throw new Error("Sign-in needs a secure connection. Open this page over https or on localhost.");
  const res = await fetch(`${env.apiBaseUrl}/auth/public_key`);
  const k = (await res.json())?.data?.[0];
  if (!k?.spki) throw new Error("The encryption key could not be loaded. Please try again.");
  if (Number(k.server_time)) clockOffset = Number(k.server_time) - Date.now();
  const der = Uint8Array.from(atob(k.spki), (c) => c.charCodeAt(0));
  credKey = { id: k.key_id, key: await crypto.subtle.importKey("spki", der, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]) };
}

async function seal(value) {
  if (!credKey) await loadKey();
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  const plain = new TextEncoder().encode(JSON.stringify({ v: value, ts: Date.now() + clockOffset, n: nonce }));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "RSA-OAEP" }, credKey.key, plain));
  const b64url = btoa(String.fromCharCode(...ct)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `enc:v1:${credKey.id}:${b64url}`;
}

// A copy of a plain-object body with every listed field that holds a value sealed.
export async function sealFields(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) || body instanceof FormData) return body;
  const out = { ...body };
  for (const [key, value] of Object.entries(out)) {
    if (SEALED.has(key) && typeof value === "string" && value !== "") out[key] = await seal(value);
  }
  return out;
}

// Whether a refusal was about the envelope itself; if so, the next seal uses
// a fresh key (key changed) or the server's clock (envelope expired).
export function envelopeRefused(errorCode, serverTime) {
  if (errorCode === "credential.envelope_invalid") credKey = null;
  else if (errorCode === "credential.envelope_expired") {
    if (Number(serverTime)) clockOffset = Number(serverTime) - Date.now();
  } else return false;
  return true;
}
