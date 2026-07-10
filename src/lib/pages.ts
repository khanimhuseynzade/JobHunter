import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pages as pagesTable } from "@/lib/schema";
import { getMemoryPages, setMemoryPages } from "@/lib/seed";
import type { Page, PageFolder } from "@/types";

function rowToPage(row: typeof pagesTable.$inferSelect): Page {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    folder: row.folder,
    linkedJobId: row.linkedJobId,
    linkedCompany: row.linkedCompany,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function fetchPages(folder?: PageFolder): Promise<Page[]> {
  const db = getDb();
  let list: Page[];

  if (db) {
    const rows = await db.select().from(pagesTable);
    list = rows.map(rowToPage);
  } else {
    list = getMemoryPages();
  }

  if (folder) {
    list = list.filter((p) => p.folder === folder);
  }

  return list.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function fetchPageById(id: string): Promise<Page | null> {
  const db = getDb();

  if (db) {
    const [row] = await db
      .select()
      .from(pagesTable)
      .where(eq(pagesTable.id, id));
    return row ? rowToPage(row) : null;
  }

  return getMemoryPages().find((p) => p.id === id) ?? null;
}

export async function fetchPageByJobId(jobId: string): Promise<Page | null> {
  const pages = await fetchPages();
  return pages.find((p) => p.linkedJobId === jobId) ?? null;
}

export async function upsertPage(data: {
  id?: string;
  title: string;
  body: string;
  folder: PageFolder;
  linkedJobId?: string | null;
  linkedCompany?: string | null;
}): Promise<Page> {
  const now = new Date().toISOString();
  const db = getDb();

  if (db) {
    if (data.id) {
      const [row] = await db
        .update(pagesTable)
        .set({
          title: data.title,
          body: data.body,
          folder: data.folder,
          linkedJobId: data.linkedJobId ?? null,
          linkedCompany: data.linkedCompany ?? null,
          updatedAt: now,
        })
        .where(eq(pagesTable.id, data.id))
        .returning();
      return rowToPage(row);
    }

    const [row] = await db
      .insert(pagesTable)
      .values({
        title: data.title,
        body: data.body,
        folder: data.folder,
        linkedJobId: data.linkedJobId ?? null,
        linkedCompany: data.linkedCompany ?? null,
      })
      .returning();
    return rowToPage(row);
  }

  const pages = getMemoryPages();
  if (data.id) {
    const idx = pages.findIndex((p) => p.id === data.id);
    if (idx === -1) throw new Error("Page not found");
    pages[idx] = {
      ...pages[idx],
      title: data.title,
      body: data.body,
      folder: data.folder,
      linkedJobId: data.linkedJobId ?? null,
      linkedCompany: data.linkedCompany ?? null,
      updatedAt: now,
    };
    setMemoryPages(pages);
    return pages[idx];
  }

  const newPage: Page = {
    id: crypto.randomUUID(),
    title: data.title,
    body: data.body,
    folder: data.folder,
    linkedJobId: data.linkedJobId ?? null,
    linkedCompany: data.linkedCompany ?? null,
    createdAt: now,
    updatedAt: now,
  };
  setMemoryPages([newPage, ...pages]);
  return newPage;
}

export function countPagesByFolder(pages: Page[]): Record<PageFolder, number> {
  return pages.reduce(
    (acc, p) => {
      acc[p.folder] = (acc[p.folder] ?? 0) + 1;
      return acc;
    },
    { inbox: 0, jobs: 0, companies: 0, general: 0 } as Record<
      PageFolder,
      number
    >
  );
}
