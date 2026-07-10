"use client";

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Page, PageFolder } from "@/types";
import { FOLDER_LABELS } from "@/types";
import { countPagesByFolder } from "@/lib/page-utils";

const FOLDERS: PageFolder[] = ["inbox", "jobs", "companies", "general"];

interface PagesViewProps {
  initialPages: Page[];
  linkedJobId?: string | null;
  linkedJobTitle?: string | null;
}

export function PagesView({
  initialPages,
  linkedJobId,
  linkedJobTitle,
}: PagesViewProps) {
  const [pages, setPages] = useState(initialPages);
  const [activeFolder, setActiveFolder] = useState<PageFolder | null>(
    linkedJobId ? "jobs" : null
  );
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);

  const counts = countPagesByFolder(pages);

  const openPage = useCallback((page: Page) => {
    setSelectedPage(page);
    setEditTitle(page.title);
    setEditBody(page.body);
    setEditing(false);
  }, []);

  useEffect(() => {
    if (linkedJobId) {
      const existing = pages.find((p) => p.linkedJobId === linkedJobId);
      if (existing) {
        openPage(existing);
        setActiveFolder("jobs");
      } else if (linkedJobTitle) {
        const newTitle = linkedJobTitle;
        setSelectedPage(null);
        setEditTitle(newTitle);
        setEditBody(`# ${newTitle}\n\n`);
        setEditing(true);
        setActiveFolder("jobs");
      }
    }
  }, [linkedJobId, linkedJobTitle, pages, openPage]);

  const folderPages = activeFolder
    ? pages.filter((p) => p.folder === activeFolder)
    : [];

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/pages", {
      method: selectedPage ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selectedPage?.id,
        title: editTitle,
        body: editBody,
        folder: activeFolder ?? "inbox",
        linkedJobId: linkedJobId ?? selectedPage?.linkedJobId ?? null,
        linkedCompany: selectedPage?.linkedCompany ?? null,
      }),
    });
    if (res.ok) {
      const saved = await res.json();
      setPages((prev) => {
        const idx = prev.findIndex((p) => p.id === saved.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [saved, ...prev];
      });
      setSelectedPage(saved);
      setEditing(false);
    }
    setSaving(false);
  }

  async function handleNewPage() {
    setSelectedPage(null);
    setEditTitle("Untitled");
    setEditBody("");
    setEditing(true);
    if (!activeFolder) setActiveFolder("inbox");
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-0 lg:rounded-lg lg:border lg:border-gray-200">
      {/* Folder tree */}
      <aside className="w-full shrink-0 lg:w-48 lg:border-r lg:border-gray-200 lg:p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
          Folders
        </p>
        <ul className="space-y-1">
          {FOLDERS.map((folder) => (
            <li key={folder}>
              <button
                type="button"
                onClick={() => {
                  setActiveFolder(folder);
                  setSelectedPage(null);
                  setEditing(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  activeFolder === folder
                    ? "bg-blue-50 font-medium text-blue-800"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span>{FOLDER_LABELS[folder]}</span>
                <span className="text-xs text-gray-400">{counts[folder]}</span>
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={handleNewPage}
          className="mt-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          + New page
        </button>
      </aside>

      {/* Page list */}
      {activeFolder && (
        <div className="w-full shrink-0 border-t border-gray-200 pt-4 lg:w-56 lg:border-t-0 lg:border-r lg:pt-0 lg:p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
            {FOLDER_LABELS[activeFolder]}
          </p>
          {folderPages.length === 0 ? (
            <p className="text-sm text-gray-400">No pages yet</p>
          ) : (
            <ul className="space-y-1">
              {folderPages.map((page) => (
                <li key={page.id}>
                  <button
                    type="button"
                    onClick={() => openPage(page)}
                    className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedPage?.id === page.id
                        ? "bg-gray-100 font-medium text-black"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {page.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Editor / preview */}
      <div className="min-h-[400px] flex-1 lg:p-6">
        {!activeFolder && (
          <div className="flex h-full items-center justify-center text-gray-400">
            Select a folder to get started
          </div>
        )}

        {activeFolder && !selectedPage && !editing && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
            <p>Select a page or create a new one</p>
            <button
              type="button"
              onClick={handleNewPage}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + New page
            </button>
          </div>
        )}

        {(selectedPage || editing) && (
          <div className="flex h-full flex-col">
            <div className="mb-4 flex items-center justify-between gap-2">
              {editing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-lg font-semibold text-black outline-none focus:border-blue-500"
                />
              ) : (
                <h2 className="text-lg font-semibold text-black">
                  {selectedPage?.title}
                </h2>
              )}
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedPage) {
                          setEditTitle(selectedPage.title);
                          setEditBody(selectedPage.body);
                          setEditing(false);
                        } else {
                          setEditing(false);
                        }
                      }}
                      className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            {editing ? (
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="min-h-[320px] flex-1 resize-y rounded-lg border border-gray-200 p-4 font-mono text-sm text-gray-800 outline-none focus:border-blue-500"
                placeholder="Write markdown…"
              />
            ) : (
              <div className="markdown-body flex-1 overflow-y-auto">
                <ReactMarkdown>{selectedPage?.body ?? ""}</ReactMarkdown>
              </div>
            )}

            {selectedPage?.linkedCompany && (
              <p className="mt-4 text-xs text-gray-400">
                Linked: {selectedPage.linkedCompany}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
