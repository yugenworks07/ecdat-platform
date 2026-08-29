import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { equalBytes } from "@noble/post-quantum/utils.js";

export type MlKemDemoOutcome = {
  publicKeyBytes: number;
  ciphertextBytes: number;
  sharedSecretBytes: number;
  sharedSecretMatches: boolean;
};

export type MlDsaDemoOutcome = {
  publicKeyBytes: number;
  signatureBytes: number;
  signatureValid: boolean;
  tamperDetected: boolean;
};

/**
 * Runs an in-browser ML-KEM-768 demonstration through the vetted noble
 * implementation. Private key and secret material never leave this function.
 */
export function runMlKemDemo(): MlKemDemoOutcome {
  const recipient = ml_kem768.keygen();
  const encapsulated = ml_kem768.encapsulate(recipient.publicKey);
  const recovered = ml_kem768.decapsulate(encapsulated.cipherText, recipient.secretKey);
  return {
    publicKeyBytes: recipient.publicKey.length,
    ciphertextBytes: encapsulated.cipherText.length,
    sharedSecretBytes: encapsulated.sharedSecret.length,
    sharedSecretMatches: equalBytes(encapsulated.sharedSecret, recovered),
  };
}

/**
 * Runs an in-browser ML-DSA-65 signing and altered-message verification demo.
 * Key and signature bytes are deliberately summarized rather than displayed.
 */
export function runMlDsaDemo(message: string): MlDsaDemoOutcome {
  const encoder = new TextEncoder();
  const signingKey = ml_dsa65.keygen();
  const signature = ml_dsa65.sign(encoder.encode(message), signingKey.secretKey);
  const signatureValid = ml_dsa65.verify(signature, encoder.encode(message), signingKey.publicKey);
  const tamperDetected = !ml_dsa65.verify(signature, encoder.encode(`${message} [modified]`), signingKey.publicKey);
  return {
    publicKeyBytes: signingKey.publicKey.length,
    signatureBytes: signature.length,
    signatureValid,
    tamperDetected,
  };
}
