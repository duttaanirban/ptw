/*
  Warnings:

  - You are about to drop the column `authorizedPerson` on the `ElectricalLotoDetails` table. All the data in the column will be lost.
  - You are about to drop the column `isolationPoint` on the `ElectricalLotoDetails` table. All the data in the column will be lost.
  - You are about to drop the column `zeroEnergyVerified` on the `ElectricalLotoDetails` table. All the data in the column will be lost.
  - You are about to drop the column `fallProtectionSystem` on the `WorkingAtHeightDetails` table. All the data in the column will be lost.
  - You are about to drop the column `scaffoldInspected` on the `WorkingAtHeightDetails` table. All the data in the column will be lost.
  - Added the required column `entryExitLog` to the `ConfinedSpaceDetails` table without a default value. This is not possible if the table is not empty.
  - Added the required column `earthingApplied` to the `ElectricalLotoDetails` table without a default value. This is not possible if the table is not empty.
  - Added the required column `equipmentTag` to the `ElectricalLotoDetails` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isolationPoints` to the `ElectricalLotoDetails` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lockNumbers` to the `ElectricalLotoDetails` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tagNumbers` to the `ElectricalLotoDetails` table without a default value. This is not possible if the table is not empty.
  - Added the required column `testedDeadBy` to the `ElectricalLotoDetails` table without a default value. This is not possible if the table is not empty.
  - Made the column `voltageLevel` on table `ElectricalLotoDetails` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `barricadingBelow` to the `WorkingAtHeightDetails` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fallArrestEquipment` to the `WorkingAtHeightDetails` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ConfinedSpaceDetails" ADD COLUMN     "atmosphericTestTime" TIMESTAMP(3),
ADD COLUMN     "entryExitLog" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "ElectricalLotoDetails" DROP COLUMN "authorizedPerson",
DROP COLUMN "isolationPoint",
DROP COLUMN "zeroEnergyVerified",
ADD COLUMN     "earthingApplied" BOOLEAN NOT NULL,
ADD COLUMN     "equipmentTag" TEXT NOT NULL,
ADD COLUMN     "isolationPoints" JSONB NOT NULL,
ADD COLUMN     "lockNumbers" JSONB NOT NULL,
ADD COLUMN     "tagNumbers" JSONB NOT NULL,
ADD COLUMN     "testedDeadBy" TEXT NOT NULL,
ALTER COLUMN "isolationMethod" DROP NOT NULL,
ALTER COLUMN "lotoApplied" DROP NOT NULL,
ALTER COLUMN "voltageLevel" SET NOT NULL;

-- AlterTable
ALTER TABLE "Permit" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "completionNotes" TEXT;

-- AlterTable
ALTER TABLE "WorkingAtHeightDetails" DROP COLUMN "fallProtectionSystem",
DROP COLUMN "scaffoldInspected",
ADD COLUMN     "barricadingBelow" BOOLEAN NOT NULL,
ADD COLUMN     "fallArrestEquipment" TEXT NOT NULL;
