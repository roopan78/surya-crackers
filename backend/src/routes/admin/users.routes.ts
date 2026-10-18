import { Router } from 'express';
import { Role } from '@prisma/client';
import { validate } from '../../middleware/validate.middleware';
import { requireRole } from '../../middleware/auth.middleware';
import { listUsersQuerySchema, updateUserRoleSchema, userIdParamsSchema } from '../../validators/user.validator';
import {
  deactivateUser,
  deleteUser,
  getUserActiveOrders,
  listUsers,
  reactivateUser,
  updateUserRole,
} from '../../controllers/user.controller';

const router = Router();

// Viewing the customer/user list is an ADMIN-level capability; changing
// roles is reserved for SUPER_ADMIN — applied per-route, same precedent as
// the public auth router mixing differently-guarded routes in one file.
router.get('/', requireRole(Role.ADMIN, Role.SUPER_ADMIN), validate(listUsersQuerySchema, 'query'), listUsers);
router.patch(
  '/:id/role',
  requireRole(Role.SUPER_ADMIN),
  validate(userIdParamsSchema, 'params'),
  validate(updateUserRoleSchema),
  updateUserRole,
);

// Switching an account off is reversible, so ADMIN may do it — though only to a
// customer, a limit enforced in account.service. Deleting is not reversible and
// stays with SUPER_ADMIN.
router.get(
  '/:id/active-orders',
  requireRole(Role.ADMIN, Role.SUPER_ADMIN),
  validate(userIdParamsSchema, 'params'),
  getUserActiveOrders,
);
router.post(
  '/:id/deactivate',
  requireRole(Role.ADMIN, Role.SUPER_ADMIN),
  validate(userIdParamsSchema, 'params'),
  deactivateUser,
);
router.post(
  '/:id/reactivate',
  requireRole(Role.ADMIN, Role.SUPER_ADMIN),
  validate(userIdParamsSchema, 'params'),
  reactivateUser,
);
router.delete('/:id', requireRole(Role.SUPER_ADMIN), validate(userIdParamsSchema, 'params'), deleteUser);

export default router;
