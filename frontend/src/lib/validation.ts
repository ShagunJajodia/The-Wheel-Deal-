const LOCAL_PART = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const DOMAIN_PART = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function emailError(value: string): string | null {
  const email = value.trim().toLowerCase();
  const pieces = email.split("@");
  if (
    email.length > 320 ||
    pieces.length !== 2 ||
    !LOCAL_PART.test(pieces[0]) ||
    !DOMAIN_PART.test(pieces[1])
  ) {
    return "Enter a valid email address.";
  }
  return null;
}

export function passwordError(value: string): string | null {
  if (value.length < 8) return "Use at least 8 characters.";
  if (new TextEncoder().encode(value).length > 72) return "Use at most 72 bytes.";
  return null;
}

export function fullNameError(value: string): string | null {
  if (!value.trim()) return "Enter your full name.";
  if (value.length > 255) return "Use at most 255 characters.";
  return null;
}
