-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Pattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "difficulty" TEXT NOT NULL DEFAULT 'BEGINNER',
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "hookSizeMm" REAL,
    "yarnWeight" TEXT,
    "finishedWidthCm" REAL,
    "finishedHeightCm" REAL,
    "gaugeStitches" REAL,
    "gaugeRows" REAL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "totalStitches" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PatternSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patternId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PatternSection_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "Pattern" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PatternRow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sectionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "totalStitches" INTEGER NOT NULL,
    "expectedStitches" INTEGER,
    "notes" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "PatternRow_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "PatternSection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PatternRowStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rowId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "stitchCode" TEXT,
    "count" INTEGER NOT NULL,
    "groupJson" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "PatternRowStep_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "PatternRow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PatternMaterial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patternId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "quantity" TEXT NOT NULL DEFAULT '',
    "yarnId" TEXT,
    CONSTRAINT "PatternMaterial_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "Pattern" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PatternMaterial_yarnId_fkey" FOREIGN KEY ("yarnId") REFERENCES "Yarn" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PatternVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patternId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "snapshot" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PatternVersion_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "Pattern" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Design" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "patternId" TEXT,
    "name" TEXT NOT NULL,
    "shape" TEXT NOT NULL DEFAULT 'CYLINDER',
    "widthCm" REAL NOT NULL DEFAULT 20,
    "heightCm" REAL NOT NULL DEFAULT 20,
    "depthCm" REAL NOT NULL DEFAULT 20,
    "stitchCode" TEXT,
    "colorHex" TEXT NOT NULL DEFAULT '#C2603F',
    "params" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Design_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Design_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "Pattern" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "patternId" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "colorHex" TEXT NOT NULL DEFAULT '#C2603F',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Project_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "Pattern" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectRowProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stitches" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProjectRowProgress_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectRowProgress_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "PatternRow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "seconds" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "ProjectSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "rowId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectNote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectPhoto_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Yarn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorName" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL DEFAULT '#C2603F',
    "weight" TEXT NOT NULL DEFAULT 'DK',
    "metersPerSkein" INTEGER,
    "gramsPerSkein" INTEGER NOT NULL DEFAULT 100,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Yarn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Pattern_userId_updatedAt_idx" ON "Pattern"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "PatternSection_patternId_sortOrder_idx" ON "PatternSection"("patternId", "sortOrder");

-- CreateIndex
CREATE INDEX "PatternRow_sectionId_sortOrder_idx" ON "PatternRow"("sectionId", "sortOrder");

-- CreateIndex
CREATE INDEX "PatternRowStep_rowId_sortOrder_idx" ON "PatternRowStep"("rowId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PatternVersion_patternId_version_key" ON "PatternVersion"("patternId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Design_patternId_key" ON "Design"("patternId");

-- CreateIndex
CREATE INDEX "Design_userId_idx" ON "Design"("userId");

-- CreateIndex
CREATE INDEX "Project_userId_status_idx" ON "Project"("userId", "status");

-- CreateIndex
CREATE INDEX "Project_userId_updatedAt_idx" ON "Project"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "ProjectRowProgress_projectId_idx" ON "ProjectRowProgress"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectRowProgress_projectId_rowId_key" ON "ProjectRowProgress"("projectId", "rowId");

-- CreateIndex
CREATE INDEX "ProjectSession_projectId_idx" ON "ProjectSession"("projectId");

-- CreateIndex
CREATE INDEX "ProjectNote_projectId_createdAt_idx" ON "ProjectNote"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectPhoto_projectId_createdAt_idx" ON "ProjectPhoto"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Yarn_userId_idx" ON "Yarn"("userId");
