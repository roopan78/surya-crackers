import { DeactivationSource, OrderStatus, Prisma, Role, User } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';

/**
 * Switching accounts off, back on, and finally deleting them.
 *
 * Three doors, deliberately different:
 *   - a customer may switch their own account off, and switch it back on just
 *     by signing in (see auth.service.login);
 *   - an ADMIN may switch a customer off, and only an admin can undo that;
 *   - a SUPER_ADMIN may delete outright, which is the only irreversible one.
 *
 * None of them may strand work in progress: an account with an order still
 * moving through the shop cannot be switched off at all. A super admin deleting
 * an account cancels those orders in the same transaction, so the decision is
 * explicit rather than a side effect.
 */

/** Orders still moving through the shop — nothing handed over, nothing cancelled. */
const ACTIVE_ORDER_STATUSES: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.READY_FOR_PICKUP];

/** How long a deactivated account is kept before it is deleted for good. */
export const RETENTION_DAYS = 90;

export interface ActiveOrderSummary {
  orderNumber: string;
  status: OrderStatus;
}

function retentionCutoff(now = new Date()): Date {
  return new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

function log(fields: Record<string, unknown>): void {
  console.info(JSON.stringify({ scope: 'account', ...fields }));
}

async function findUserOr404(userId: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return user;
}

/** Orders that must be settled before an account can be switched off. */
export async function listActiveOrders(userId: string): Promise<ActiveOrderSummary[]> {
  return prisma.orderLedger.findMany({
    where: { customerId: userId, status: { in: ACTIVE_ORDER_STATUSES } },
    select: { orderNumber: true, status: true },
    orderBy: { createdAt: 'desc' },
  });
}

function activeOrderConflict(orders: ActiveOrderSummary[], subject: 'You' | 'This customer'): ApiError {
  const numbers = orders.map((o) => o.orderNumber).join(', ');
  const plural = orders.length === 1 ? 'an order' : `${orders.length} orders`;
  const verb = subject === 'You' ? 'have' : 'has';
  return ApiError.conflict(
    `${subject} ${verb} ${plural} still in progress (${numbers}). ` +
      'Those orders must be completed or cancelled first.',
  );
}

async function deactivate(user: User, source: DeactivationSource): Promise<User> {
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isActive: false, deactivatedAt: new Date(), deactivationSource: source },
  });
  log({ event: 'DEACTIVATED', userId: user.id, source, purgeAfterDays: RETENTION_DAYS });
  return updated;
}

/**
 * A customer switching off their own account. Reversible: signing in again
 * within the retention window brings it back, untouched.
 */
export async function deactivateOwnAccount(userId: string): Promise<{ purgeAt: Date }> {
  const user = await findUserOr404(userId);
  if (!user.isActive) {
    throw ApiError.conflict('This account is already deactivated.');
  }

  const activeOrders = await listActiveOrders(userId);
  if (activeOrders.length > 0) {
    throw activeOrderConflict(activeOrders, 'You');
  }

  const updated = await deactivate(user, DeactivationSource.SELF);
  const deactivatedAt = updated.deactivatedAt ?? new Date();
  return { purgeAt: new Date(deactivatedAt.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000) };
}

/**
 * Staff switching a customer off. An ADMIN may only act on customers — letting
 * them switch off a fellow admin, or the super admin, would turn a routine
 * moderation power into a way to lock colleagues out.
 */
export async function adminDeactivateUser(actor: { sub: string; role: Role }, targetId: string): Promise<User> {
  const target = await findUserOr404(targetId);

  if (target.id === actor.sub) {
    throw ApiError.badRequest('Use your own profile page to deactivate your account.');
  }
  if (actor.role !== Role.SUPER_ADMIN && target.role !== Role.CUSTOMER) {
    throw ApiError.forbidden('Only a super admin can deactivate another staff account.');
  }
  if (!target.isActive) {
    throw ApiError.conflict('This account is already deactivated.');
  }

  const activeOrders = await listActiveOrders(targetId);
  if (activeOrders.length > 0) {
    throw activeOrderConflict(activeOrders, 'This customer');
  }

  return deactivate(target, DeactivationSource.ADMIN);
}

/** Staff switching an account back on, whoever switched it off. */
export async function adminReactivateUser(targetId: string): Promise<User> {
  const target = await findUserOr404(targetId);
  if (target.isActive) {
    throw ApiError.conflict('This account is already active.');
  }

  const restored = await prisma.user.update({
    where: { id: target.id },
    data: { isActive: true, deactivatedAt: null, deactivationSource: null },
  });
  log({ event: 'REACTIVATED', userId: target.id, by: 'ADMIN' });
  return restored;
}

/**
 * Brings back an account the customer switched off themselves, on a successful
 * sign-in. Returns the account unchanged when there is nothing to restore, so
 * callers can run it unconditionally.
 *
 * An account an *admin* switched off is left alone — sign-in still refuses it.
 */
export async function restoreIfSelfDeactivated(user: User): Promise<User> {
  if (user.isActive || user.deactivationSource !== DeactivationSource.SELF) {
    return user;
  }

  const restored = await prisma.user.update({
    where: { id: user.id },
    data: { isActive: true, deactivatedAt: null, deactivationSource: null },
  });
  log({ event: 'REACTIVATED', userId: user.id, by: 'SELF_SIGN_IN' });
  return restored;
}

/**
 * Severs a departing account from its orders without destroying them.
 *
 * An order row only carries `customerId` for a registered customer — the name
 * and mobile live on the account. Deleting the account would leave the order
 * with no one's name on it, so the identity is copied into the guest fields the
 * order already has for walk-in buyers, and the link is cut. The sale survives
 * as a readable record; the account does not.
 */
async function detachOrders(tx: Prisma.TransactionClient, user: User): Promise<number> {
  const { count } = await tx.orderLedger.updateMany({
    where: { customerId: user.id },
    data: {
      customerId: null,
      guestName: user.name ?? 'Deleted account',
      guestMobile: user.mobile,
    },
  });
  return count;
}

export interface DeleteUserResult {
  cancelledOrders: number;
  detachedOrders: number;
}

/**
 * SUPER_ADMIN deleting an account for good, cancelling anything still in
 * progress as part of the same click. Everything happens in one transaction:
 * a half-deleted account with live orders pointing at it would be worse than
 * either outcome.
 */
export async function deleteUserPermanently(
  actor: { sub: string },
  targetId: string,
): Promise<DeleteUserResult> {
  const target = await findUserOr404(targetId);

  if (target.id === actor.sub) {
    throw ApiError.badRequest('You cannot delete your own account.');
  }
  if (target.role === Role.SUPER_ADMIN) {
    const superAdmins = await prisma.user.count({ where: { role: Role.SUPER_ADMIN } });
    if (superAdmins <= 1) {
      throw ApiError.conflict('This is the only super admin account and cannot be deleted.');
    }
  }

  return prisma.$transaction(async (tx) => {
    const { count: cancelledOrders } = await tx.orderLedger.updateMany({
      where: { customerId: target.id, status: { in: ACTIVE_ORDER_STATUSES } },
      data: { status: OrderStatus.CANCELLED },
    });
    const detachedOrders = await detachOrders(tx, target);
    await tx.user.delete({ where: { id: target.id } });

    log({
      event: 'DELETED',
      userId: target.id,
      role: target.role,
      by: 'SUPER_ADMIN',
      cancelledOrders,
      detachedOrders,
    });
    return { cancelledOrders, detachedOrders };
  });
}

/**
 * Deletes accounts whose retention window has run out. Returns how many went,
 * so the caller can log a quiet run as quietly as a busy one.
 *
 * Deliberately not a bulk deleteMany: each account's orders have to be detached
 * with that account's own name before the row disappears.
 */
export async function purgeExpiredAccounts(now = new Date()): Promise<number> {
  const expired = await prisma.user.findMany({
    where: { isActive: false, deactivatedAt: { lt: retentionCutoff(now) } },
    select: { id: true },
  });

  let purged = 0;
  for (const { id } of expired) {
    try {
      await prisma.$transaction(async (tx) => {
        // Re-read inside the transaction: an account restored since the scan
        // must not be deleted on the strength of a stale list.
        const user = await tx.user.findUnique({ where: { id } });
        if (!user || user.isActive || !user.deactivatedAt || user.deactivatedAt >= retentionCutoff(now)) {
          return;
        }
        const detachedOrders = await detachOrders(tx, user);
        await tx.user.delete({ where: { id } });
        purged += 1;
        log({ event: 'PURGED', userId: id, detachedOrders, afterDays: RETENTION_DAYS });
      });
    } catch (error) {
      // One bad row must not strand the rest of the sweep.
      log({
        event: 'PURGE_FAILED',
        userId: id,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (purged > 0) {
    log({ event: 'PURGE_RUN', purged, candidates: expired.length });
  }
  return purged;
}
