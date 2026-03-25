import { z } from "zod";

/**
 * Deposit Wallet Validation
 */
export const depositValidator = z.object({
  amount: z
    .number()
    .min(1, { message: "Amount must be greater than 0" }),

  method_id: z
    .number()
    .optional(),
});

/**
 * Pay Ticket Validation
 */
export const ticketPaymentValidator = z.object({
  amount: z
    .number()
    .min(1, { message: "Amount must be greater than 0" }),
});

/**
 * TypeScript Types
 */
export type DepositInput = z.infer<typeof depositValidator>;
export type TicketPaymentInput = z.infer<typeof ticketPaymentValidator>;