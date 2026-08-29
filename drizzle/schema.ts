import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const ecdatScans = mysqlTable(
  "ecdatScans",
  {
    id: int("id").autoincrement().primaryKey(),
    scanKey: varchar("scanKey", { length: 32 }).notNull(),
    userId: int("userId").notNull(),
    displayName: varchar("displayName", { length: 160 }).notNull(),
    repositoryUrl: text("repositoryUrl"),
    scenario: mysqlEnum("scenario", [
      "python-web",
      "java-enterprise",
      "container-mesh",
      "compliance-heavy",
      "repository-static",
    ]).notNull(),
    status: mysqlEnum("status", ["completed", "processing", "failed"]).default("completed").notNull(),
    totalAssets: int("totalAssets").notNull(),
    criticalCount: int("criticalCount").notNull(),
    quantumVulnerableCount: int("quantumVulnerableCount").notNull(),
    hndlCount: int("hndlCount").notNull(),
    quantumReadiness: int("quantumReadiness").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [unique("ecdatScans_scanKey_unique").on(table.scanKey), index("ecdatScans_userId_idx").on(table.userId)]
);

export const ecdatFindings = mysqlTable(
  "ecdatFindings",
  {
    id: int("id").autoincrement().primaryKey(),
    findingKey: varchar("findingKey", { length: 48 }).notNull(),
    scanKey: varchar("scanKey", { length: 32 }).notNull(),
    assetName: varchar("assetName", { length: 160 }).notNull(),
    assetType: varchar("assetType", { length: 64 }).notNull(),
    algorithm: varchar("algorithm", { length: 128 }).notNull(),
    cryptoRole: varchar("cryptoRole", { length: 96 }).notNull(),
    library: varchar("library", { length: 128 }),
    version: varchar("version", { length: 64 }),
    sourceLocation: varchar("sourceLocation", { length: 255 }).notNull(),
    usageContext: varchar("usageContext", { length: 255 }).notNull(),
    dataState: varchar("dataState", { length: 64 }).notNull(),
    environment: varchar("environment", { length: 64 }).notNull(),
    sensitivity: varchar("sensitivity", { length: 64 }).notNull(),
    criticality: varchar("criticality", { length: 64 }).notNull(),
    riskLevel: varchar("riskLevel", { length: 32 }).notNull(),
    classicalRisk: varchar("classicalRisk", { length: 32 }).notNull(),
    quantumRisk: varchar("quantumRisk", { length: 32 }).notNull(),
    quantumVulnerable: boolean("quantumVulnerable").notNull(),
    hndlExposure: boolean("hndlExposure").notNull(),
    dataLifetimeYears: int("dataLifetimeYears").notNull(),
    migrationMonths: int("migrationMonths").notNull(),
    confidence: int("confidence").notNull(),
    evidence: text("evidence").notNull(),
    provenance: text("provenance").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [unique("ecdatFindings_scanKey_findingKey_unique").on(table.scanKey, table.findingKey)]
);

export const ecdatAssumptions = mysqlTable(
  "ecdatAssumptions",
  {
    id: int("id").autoincrement().primaryKey(),
    scanKey: varchar("scanKey", { length: 32 }).notNull(),
    assumptionKey: varchar("assumptionKey", { length: 96 }).notNull(),
    label: varchar("label", { length: 160 }).notNull(),
    value: varchar("value", { length: 64 }).notNull(),
    unit: varchar("unit", { length: 48 }).notNull(),
    source: varchar("source", { length: 160 }).notNull(),
    confidence: int("confidence").notNull(),
    userConfirmed: boolean("userConfirmed").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("ecdatAssumptions_scanKey_idx").on(table.scanKey)]
);

export const ecdatRecommendations = mysqlTable(
  "ecdatRecommendations",
  {
    id: int("id").autoincrement().primaryKey(),
    scanKey: varchar("scanKey", { length: 32 }).notNull(),
    findingKey: varchar("findingKey", { length: 48 }).notNull(),
    recommendationType: varchar("recommendationType", { length: 64 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    candidate: varchar("candidate", { length: 255 }).notNull(),
    migrationNotes: text("migrationNotes").notNull(),
    compatibility: text("compatibility").notNull(),
    indicativeEffort: varchar("indicativeEffort", { length: 128 }).notNull(),
    indicativeLatency: varchar("indicativeLatency", { length: 128 }).notNull(),
    priority: int("priority").notNull(),
    status: mysqlEnum("status", ["open", "planned", "accepted"]).default("open").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("ecdatRecommendations_scanKey_idx").on(table.scanKey), index("ecdatRecommendations_findingKey_idx").on(table.findingKey)]
);

export const ecdatRelationships = mysqlTable(
  "ecdatRelationships",
  {
    id: int("id").autoincrement().primaryKey(),
    scanKey: varchar("scanKey", { length: 32 }).notNull(),
    sourceNode: varchar("sourceNode", { length: 96 }).notNull(),
    targetNode: varchar("targetNode", { length: 96 }).notNull(),
    relationship: varchar("relationship", { length: 96 }).notNull(),
    evidence: text("evidence").notNull(),
    confidence: int("confidence").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("ecdatRelationships_scanKey_idx").on(table.scanKey)]
);

export const ecdatMigrationWaves = mysqlTable(
  "ecdatMigrationWaves",
  {
    id: int("id").autoincrement().primaryKey(),
    scanKey: varchar("scanKey", { length: 32 }).notNull(),
    wave: int("wave").notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    rationale: text("rationale").notNull(),
    scope: text("scope").notNull(),
    indicativeEffort: varchar("indicativeEffort", { length: 128 }).notNull(),
    dependencies: text("dependencies").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("ecdatMigrationWaves_scanKey_idx").on(table.scanKey)]
);

export type EcdatScan = typeof ecdatScans.$inferSelect;
export type InsertEcdatScan = typeof ecdatScans.$inferInsert;
export type EcdatFinding = typeof ecdatFindings.$inferSelect;
export type InsertEcdatFinding = typeof ecdatFindings.$inferInsert;
