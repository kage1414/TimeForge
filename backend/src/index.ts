import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import db from "./db";
import { typeDefs } from "./graphql/schema";
import { resolvers } from "./graphql/resolvers";
import {
  ensureExportsReady,
  readExportFile,
  resetStaleGeneratingStatus,
} from "./exports/generator";
import { startBackupScheduler } from "./backup/scheduler";

export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export interface Context {
  user: { id: number; email: string; role: string; name: string | null } | null;
}

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

async function authenticateUser(req: Request): Promise<{ id: number } | null> {
  const headerToken = req.headers.authorization?.replace("Bearer ", "");
  const queryToken =
    typeof req.query.token === "string" ? req.query.token : undefined;
  const token = headerToken || queryToken;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const user = await db("users")
      .where("id", decoded.userId)
      .select("id")
      .first();
    return user || null;
  } catch {
    return null;
  }
}

async function requireUser(req: Request, res: Response, next: NextFunction) {
  const user = await authenticateUser(req);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  (req as any).userId = user.id;
  next();
}

async function serveInvoiceExport(
  kind: "pdf" | "csv",
  req: Request,
  res: Response,
) {
  const userId = (req as any).userId as number;
  const invoiceId = Number(req.params.id);
  if (!Number.isFinite(invoiceId)) {
    res.status(400).json({ error: "Invalid invoice id" });
    return;
  }
  const invoice = await db("invoices")
    .where({ id: invoiceId, user_id: userId })
    .first();
  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  await ensureExportsReady(invoiceId);
  const fresh = await db("invoices").where("id", invoiceId).first();
  if (fresh.export_status !== "ready") {
    res
      .status(409)
      .json({
        error: "Export is still being generated",
        status: fresh.export_status,
      });
    return;
  }
  const buf = await readExportFile(invoice.user_id, invoice.client_id, invoiceId, kind);
  if (!buf) {
    res.status(404).json({ error: "Export file missing" });
    return;
  }
  const filename = `Invoice-${invoice.invoice_number}.${kind}`;
  res.setHeader(
    "Content-Type",
    kind === "pdf" ? "application/pdf" : "text/csv",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buf);
}

app.get("/api/invoices/:id/export.pdf", requireUser, (req, res) => {
  serveInvoiceExport("pdf", req, res).catch((err) => {
    console.error("export pdf error:", err);
    if (!res.headersSent)
      res.status(500).json({ error: "Failed to serve PDF" });
  });
});

app.get("/api/invoices/:id/export.csv", requireUser, (req, res) => {
  serveInvoiceExport("csv", req, res).catch((err) => {
    console.error("export csv error:", err);
    if (!res.headersSent)
      res.status(500).json({ error: "Failed to serve CSV" });
  });
});

async function seedAdmin() {
  const existing = await db("users").where("role", "admin").first();
  if (!existing) {
    const email = process.env.ADMIN_EMAIL || "admin@example.com";
    const password = process.env.ADMIN_PASSWORD || "admin123";
    const password_hash = await bcrypt.hash(password, 10);
    const [admin] = await db("users")
      .insert({ email, password_hash, role: "admin", name: "Admin" })
      .returning("id");
    const adminId = typeof admin === "object" ? admin.id : admin;
    await db("user_settings").insert({ user_id: adminId });
    console.log(`Admin user seeded: ${email}`);
  }
}

const isCompiled = __filename.endsWith(".js");

async function start() {
  try {
    // Fix any knex_migrations entries whose extension doesn't match the current runtime.
    // Compiled JS: rewrite .ts → .js. Dev (tsx): rewrite .js → .ts.
    const migrationsDir = path.resolve(__dirname, "db/migrations");
    const expectedExt = isCompiled ? ".js" : ".ts";
    await db.schema.hasTable("knex_migrations").then(async (exists) => {
      if (!exists) return;
      if (isCompiled) {
        await db("knex_migrations")
          .whereRaw("name LIKE '%.ts'")
          .update({ name: db.raw("REPLACE(name, '.ts', '.js')") });
      } else {
        await db("knex_migrations")
          .whereRaw("name LIKE '%.js'")
          .update({ name: db.raw("REPLACE(name, '.js', '.ts')") });
      }
      // Drop knex_migrations rows that reference files no longer on disk — happens
      // when a branch that introduced its own migrations gets deleted/reset while
      // the DB volume persists. Without this, knex's strict validation refuses to
      // run any further migrations.
      if (fs.existsSync(migrationsDir)) {
        const onDisk = new Set(
          fs.readdirSync(migrationsDir).filter((f) => f.endsWith(expectedExt)),
        );
        const recorded = await db("knex_migrations").select("name");
        const orphans = recorded
          .map((r) => r.name as string)
          .filter((n) => !onDisk.has(n));
        if (orphans.length > 0) {
          console.warn(
            `Dropping ${orphans.length} orphan knex_migrations row(s): ${orphans.join(", ")}`,
          );
          await db("knex_migrations").whereIn("name", orphans).del();
        }
      }
    });

    await db.migrate.latest();
    console.log("Migrations complete");

    await resetStaleGeneratingStatus();
    await seedAdmin();
    startBackupScheduler();

    const server = new ApolloServer({ typeDefs, resolvers });
    await server.start();

    app.use(
      "/graphql",
      cors(),
      express.json({ limit: "50mb" }),
      expressMiddleware(server, {
        context: async ({ req }): Promise<Context> => {
          const token = req.headers.authorization?.replace("Bearer ", "");
          if (!token) return { user: null };
          try {
            const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
            const user = await db("users")
              .where("id", decoded.userId)
              .select("id", "email", "role", "name")
              .first();
            return { user: user || null };
          } catch {
            return { user: null };
          }
        },
      }),
    );

    const publicDir = path.join(__dirname, "../public");
    app.use(express.static(publicDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(publicDir, "index.html"));
    });

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
