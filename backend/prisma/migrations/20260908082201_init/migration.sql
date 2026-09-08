-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('REQUESTER', 'AREA_OWNER', 'SAFETY_OFFICER', 'ADMIN');

-- CreateEnum
CREATE TYPE "PermitType" AS ENUM ('HOT_WORK', 'CONFINED_SPACE', 'WORKING_AT_HEIGHT', 'ELECTRICAL_LOTO');

-- CreateEnum
CREATE TYPE "PermitStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'CLOSED', 'CLOSED_VERIFIED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalRole" AS ENUM ('AREA_OWNER', 'SAFETY_OFFICER');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATED', 'UPDATED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ACTIVATED', 'SUSPENDED', 'RESUMED', 'CLOSED', 'VERIFIED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permit" (
    "id" TEXT NOT NULL,
    "permitNumber" TEXT NOT NULL,
    "type" "PermitType" NOT NULL,
    "status" "PermitStatus" NOT NULL DEFAULT 'DRAFT',
    "requesterId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "equipmentId" TEXT,
    "contractorTeam" TEXT NOT NULL,
    "workDescription" TEXT NOT NULL,
    "plannedStart" TIMESTAMP(3) NOT NULL,
    "plannedEnd" TIMESTAMP(3) NOT NULL,
    "hazards" JSONB NOT NULL,
    "ppe" JSONB NOT NULL,
    "precautions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotWorkDetails" (
    "id" TEXT NOT NULL,
    "permitId" TEXT NOT NULL,
    "hotWorkType" TEXT NOT NULL,
    "fireWatchAssigned" BOOLEAN NOT NULL,
    "fireExtinguisherType" TEXT NOT NULL,
    "combustiblesClearedRadius" DOUBLE PRECISION,
    "lelPercent" DOUBLE PRECISION,
    "oxygenPercent" DOUBLE PRECISION,
    "gasTestTime" TIMESTAMP(3),

    CONSTRAINT "HotWorkDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfinedSpaceDetails" (
    "id" TEXT NOT NULL,
    "permitId" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "entryPoint" TEXT NOT NULL,
    "oxygenPercent" DOUBLE PRECISION,
    "lelPercent" DOUBLE PRECISION,
    "h2sPpm" DOUBLE PRECISION,
    "coPpm" DOUBLE PRECISION,
    "standbyAttendant" TEXT NOT NULL,
    "rescuePlan" TEXT NOT NULL,
    "ventilationMethod" TEXT NOT NULL,

    CONSTRAINT "ConfinedSpaceDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkingAtHeightDetails" (
    "id" TEXT NOT NULL,
    "permitId" TEXT NOT NULL,
    "workHeightMeters" DOUBLE PRECISION NOT NULL,
    "accessMethod" TEXT NOT NULL,
    "fallProtectionSystem" TEXT NOT NULL,
    "anchorPointVerified" BOOLEAN NOT NULL,
    "scaffoldInspected" BOOLEAN NOT NULL,
    "weatherConditions" TEXT,

    CONSTRAINT "WorkingAtHeightDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectricalLotoDetails" (
    "id" TEXT NOT NULL,
    "permitId" TEXT NOT NULL,
    "isolationPoint" TEXT NOT NULL,
    "isolationMethod" TEXT NOT NULL,
    "lotoApplied" BOOLEAN NOT NULL,
    "zeroEnergyVerified" BOOLEAN NOT NULL,
    "authorizedPerson" TEXT NOT NULL,
    "voltageLevel" TEXT,
    "verificationMethod" TEXT,

    CONSTRAINT "ElectricalLotoDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermitApproval" (
    "id" TEXT NOT NULL,
    "permitId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "role" "ApprovalRole" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "actedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermitApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermitAuditLog" (
    "id" TEXT NOT NULL,
    "permitId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "fromStatus" "PermitStatus",
    "toStatus" "PermitStatus",
    "oldValue" JSONB,
    "newValue" JSONB,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermitAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Plant_code_key" ON "Plant"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Area_plantId_code_key" ON "Area"("plantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_areaId_code_key" ON "Equipment"("areaId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Permit_permitNumber_key" ON "Permit"("permitNumber");

-- CreateIndex
CREATE INDEX "Permit_status_idx" ON "Permit"("status");

-- CreateIndex
CREATE INDEX "Permit_type_idx" ON "Permit"("type");

-- CreateIndex
CREATE INDEX "Permit_requesterId_idx" ON "Permit"("requesterId");

-- CreateIndex
CREATE INDEX "Permit_plantId_areaId_idx" ON "Permit"("plantId", "areaId");

-- CreateIndex
CREATE INDEX "Permit_plannedStart_plannedEnd_idx" ON "Permit"("plannedStart", "plannedEnd");

-- CreateIndex
CREATE UNIQUE INDEX "HotWorkDetails_permitId_key" ON "HotWorkDetails"("permitId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfinedSpaceDetails_permitId_key" ON "ConfinedSpaceDetails"("permitId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkingAtHeightDetails_permitId_key" ON "WorkingAtHeightDetails"("permitId");

-- CreateIndex
CREATE UNIQUE INDEX "ElectricalLotoDetails_permitId_key" ON "ElectricalLotoDetails"("permitId");

-- CreateIndex
CREATE INDEX "PermitApproval_approverId_idx" ON "PermitApproval"("approverId");

-- CreateIndex
CREATE UNIQUE INDEX "PermitApproval_permitId_role_key" ON "PermitApproval"("permitId", "role");

-- CreateIndex
CREATE INDEX "PermitAuditLog_permitId_createdAt_idx" ON "PermitAuditLog"("permitId", "createdAt");

-- CreateIndex
CREATE INDEX "PermitAuditLog_actorId_idx" ON "PermitAuditLog"("actorId");

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permit" ADD CONSTRAINT "Permit_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permit" ADD CONSTRAINT "Permit_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permit" ADD CONSTRAINT "Permit_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permit" ADD CONSTRAINT "Permit_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotWorkDetails" ADD CONSTRAINT "HotWorkDetails_permitId_fkey" FOREIGN KEY ("permitId") REFERENCES "Permit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfinedSpaceDetails" ADD CONSTRAINT "ConfinedSpaceDetails_permitId_fkey" FOREIGN KEY ("permitId") REFERENCES "Permit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkingAtHeightDetails" ADD CONSTRAINT "WorkingAtHeightDetails_permitId_fkey" FOREIGN KEY ("permitId") REFERENCES "Permit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectricalLotoDetails" ADD CONSTRAINT "ElectricalLotoDetails_permitId_fkey" FOREIGN KEY ("permitId") REFERENCES "Permit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermitApproval" ADD CONSTRAINT "PermitApproval_permitId_fkey" FOREIGN KEY ("permitId") REFERENCES "Permit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermitApproval" ADD CONSTRAINT "PermitApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermitAuditLog" ADD CONSTRAINT "PermitAuditLog_permitId_fkey" FOREIGN KEY ("permitId") REFERENCES "Permit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermitAuditLog" ADD CONSTRAINT "PermitAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
