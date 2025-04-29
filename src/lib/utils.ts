import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import bs58 from "bs58";
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAddress(address: string, length = 4) {
  if (!address) return ''
  return `${address.slice(0, length)}...${address.slice(-length)}`
}

export function formatAmount(amount: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export const validateAddress = (address: string) => {
  if (!address) return false;

  if (address.length === 44 || address.length === 32) {
    return true;
  } else {
    return false;
  }
};

export const isValidSolanaSignature = (signature: string) => {
  if (typeof signature !== "string") {
    return false;
  }

  // Check typical length for Solana signatures
  if (signature.length !== 88) {
    return false;
  }

  try {
    // Attempt to decode Base58
    const decoded = bs58.decode(signature);

    // After decoding, Solana signatures are 64 bytes
    return decoded.length === 64;
  } catch (error) {
    // bs58 decoding throws an error if invalid
    return false;
  }
}