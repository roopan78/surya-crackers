-- Account deactivation: a reversible off-switch with a 90-day countdown to
-- permanent deletion. deactivatedAt is null while the account is live and
-- doubles as the countdown clock; the source records who switched it off,
-- because a customer may undo their own deactivation by signing in while an
-- admin's decision must stick.
CREATE TYPE "DeactivationSource" AS ENUM ('SELF', 'ADMIN');

ALTER TABLE "users" ADD COLUMN "deactivatedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "deactivationSource" "DeactivationSource";

-- The purge job scans for accounts past their 90 days.
CREATE INDEX "users_deactivatedAt_idx" ON "users"("deactivatedAt");
