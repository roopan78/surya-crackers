import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import { getAvailableMethods } from '../services/payment.service';

// GET /api/payments/methods — public
export const listPaymentMethods = asyncHandler(async (_req: Request, res: Response) => {
  return sendSuccess(res, getAvailableMethods());
});
