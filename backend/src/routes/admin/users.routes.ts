import { Router } from 'express';
import { Role } from '@prisma/client';
import { validate } from '../../middleware/validate.middleware';
import { requireRole } from '../../middleware/auth.middleware';
import { listUsersQuerySchema, updateUserRoleSchema, userIdParamsSchema } from '../../validators/user.validator';
import { listUsers, updateUserRole } from '../../controllers/user.controller';

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

export default router;
