import "dotenv/config";
import { db } from "./src/db/Client.js";
import { users, organizations, incidents, causalGraphNodes, causalGraphEdges } from "./src/db/schema.js";
import { eq } from "drizzle-orm";

const DRY_RUN = true; // flip to false to execute

const DEMO_OWNER_ID = "00000000-0000-0000-0000-000000000001"; // demo@test.com
const DEMO_USER_ID_FOR_INCIDENTS = "00000000-0000-0000-0000-000000000001"; // incidents.userId

async function main() {
    console.log(DRY_RUN ? "=== DRY RUN (no changes) ===\n" : "=== EXECUTING MIGRATION ===\n");

    const allUsers = await db.select().from(users);

    for (const u of allUsers) {
        const isDemoOwner = u.id === DEMO_OWNER_ID;
        const orgName = isDemoOwner ? "Default Workspace" : `${u.email.split("@")[0]}'s Workspace`;

        console.log(`USER ${u.email}`);
        console.log(`  → create org "${orgName}", make user OWNER`);

        if (!DRY_RUN) {
            const [org] = await db.insert(organizations).values({ name: orgName }).returning();
            await db.update(users).set({ organizationId: org.id, role: "owner" }).where(eq(users.id, u.id));

            if (isDemoOwner) {
                // assign all incidents (they all have userId = demo owner) to this org
                const incRes = await db.update(incidents)
                    .set({ tenantId: org.id })
                    .where(eq(incidents.userId, DEMO_USER_ID_FOR_INCIDENTS))
                    .returning();
                console.log(`  → assigned ${incRes.length} incidents to this org`);

                // move the entire graph from tenantId "default" to this org id (as text)
                const nodeRes = await db.update(causalGraphNodes)
                    .set({ tenantId: org.id })
                    .where(eq(causalGraphNodes.tenantId, "default"))
                    .returning();
                const edgeRes = await db.update(causalGraphEdges)
                    .set({ tenantId: org.id })
                    .where(eq(causalGraphEdges.tenantId, "default"))
                    .returning();
                console.log(`  → moved ${nodeRes.length} graph nodes, ${edgeRes.length} graph edges to this org`);
            }
        } else {
            if (isDemoOwner) {
                const incCount = (await db.select().from(incidents).where(eq(incidents.userId, DEMO_USER_ID_FOR_INCIDENTS))).length;
                const nodeCount = (await db.select().from(causalGraphNodes).where(eq(causalGraphNodes.tenantId, "default"))).length;
                const edgeCount = (await db.select().from(causalGraphEdges).where(eq(causalGraphEdges.tenantId, "default"))).length;
                console.log(`  → WOULD assign ${incCount} incidents, ${nodeCount} graph nodes, ${edgeCount} graph edges to this org`);
            } else {
                console.log(`  → empty org (no data assigned)`);
            }
        }
        console.log("");
    }

    console.log(DRY_RUN ? "=== DRY RUN complete — no changes ===" : "=== MIGRATION complete ===");
    process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
