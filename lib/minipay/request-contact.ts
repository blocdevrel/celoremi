import { getAddress, isAddress, type Address } from "viem";
import { getEthereumProvider, isMiniPayRuntime } from "./connect";

export type MiniPayContact = {
  name: string;
  address: Address;
};

/** Normalize MiniPay `minipay_requestContact` payload. */
export function parseMiniPayContact(raw: unknown): MiniPayContact {
  if (!raw || typeof raw !== "object") {
    throw new Error("MiniPay returned no contact");
  }
  const obj = raw as Record<string, unknown>;
  const addressRaw =
    (typeof obj.address === "string" && obj.address) ||
    (typeof obj.walletAddress === "string" && obj.walletAddress) ||
    (typeof obj.addr === "string" && obj.addr) ||
    "";
  if (!isAddress(addressRaw)) {
    throw new Error("Selected contact has no valid wallet address");
  }
  const nameRaw =
    (typeof obj.name === "string" && obj.name.trim()) ||
    (typeof obj.displayName === "string" && obj.displayName.trim()) ||
    "";
  return {
    name: nameRaw || "Friend",
    address: getAddress(addressRaw),
  };
}

/**
 * Opens MiniPay's native contact / "share to friend" picker.
 * Only available inside the MiniPay WebView (`window.ethereum.isMiniPay`).
 */
export async function requestMiniPayContact(): Promise<MiniPayContact> {
  if (!isMiniPayRuntime()) {
    throw new Error("Open Remifi in MiniPay to pick a contact");
  }
  const provider = getEthereumProvider();
  const raw = await provider.request({
    method: "minipay_requestContact",
    params: [],
  });
  return parseMiniPayContact(raw);
}

/** Insert a picked contact into plain-English policy text. */
export function appendContactToEnglish(
  text: string,
  contact: MiniPayContact,
): string {
  const snippet = contact.name
    ? `${contact.name} (${contact.address})`
    : contact.address;
  const trimmed = text.trimEnd();
  if (!trimmed) return snippet;
  const needsSpace = !/\s$/.test(text);
  return `${trimmed}${needsSpace ? " " : ""}${snippet}`;
}