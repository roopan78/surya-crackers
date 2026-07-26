-- Mobile+OTP login is replaced by email/password + Google Sign-In.
-- (Mobile OTP required TRAI DLT registration, which is being deferred.)

DROP TABLE "otps";
DROP TYPE "OtpPurpose";

-- The only existing row is the smoke-test super-admin created during the
-- previous deploy; no order_ledger row references any user (verified), and
-- there is no email on file to migrate forward. The configured
-- SUPER_ADMIN_EMAIL account is re-provisioned automatically on first login.
DELETE FROM "users";

ALTER TABLE "users" ADD COLUMN "email" TEXT NOT NULL;
ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "users" ADD COLUMN "googleId" TEXT;

-- Mobile becomes optional contact info rather than the login identifier.
DROP INDEX "users_mobile_key";
ALTER TABLE "users" ALTER COLUMN "mobile" DROP NOT NULL;

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
