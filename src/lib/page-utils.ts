import type { Page, PageFolder } from "@/types";

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
