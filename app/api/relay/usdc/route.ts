import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";
import { serviceDiscover } from "@/lib/service-discover";
import { relayTaggedTransferWithAuthorization } from "@/lib/usdc/relay-authorization";
import type { SignedTransferAuthorization } from "@/lib/usdc/eip3009-types";

export async function GET() {
  return serviceDiscover({
    name: "relayUsdcTransfer",
    method: "POST",
    path: "/api/relay/usdc",
    description:
      "Relay an EIP-3009 USDC transferWithAuthorization. Agent wallet pays gas (Web3 UI). MiniPay sends directly and should not use this.",
    body: {
      authorization: {
        from: "0x…",
        to: "0x…",
        value: "1000000",
        validAfter: "…",
        validBefore: "…",
        nonce: "0x…",
      },
      signature: "0x…",
    },
  });
}

const bodySchema = z.object({
  authorization: z.object({
    from: z.string().regex(/^0x[a-fA-F0-9]{40}$/i),
    to: z.string().regex(/^0x[a-fA-F0-9]{40}$/i),
    value: z.string().regex(/^\d+$/),
    validAfter: z.string().regex(/^\d+$/),
    validBefore: z.string().regex(/^\d+$/),
    nonce: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  }),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());
    const signed = body as SignedTransferAuthorization;
    const result = await relayTaggedTransferWithAuthorization(signed);
    return jsonOk({
      txHash: result.txHash,
      explorer: result.explorer,
      sponsored: true,
    });
  } catch (err) {
    return jsonError(err);
  }
}
