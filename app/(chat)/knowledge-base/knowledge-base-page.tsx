"use client";

import { format } from "date-fns";
import DOMPurify from "dompurify";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { marked } from "marked";
import Link from "next/link";
import { useCallback, useState } from "react";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { KnowledgeBase } from "@/lib/db/schema";

// Configure marked for safe HTML output
marked.setOptions({
  breaks: true,
  gfm: true,
});

type KnowledgeBaseEntry = KnowledgeBase;

// Safely render markdown content with DOMPurify sanitization
function renderMarkdown(content: string): string {
  const html = marked.parse(content) as string;
  return DOMPurify.sanitize(html);
}

export function KnowledgeBasePage({
  initialEntries,
}: {
  initialEntries: KnowledgeBaseEntry[];
}) {
  const [entries, setEntries] = useState<KnowledgeBaseEntry[]>(initialEntries);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newContent, setNewContent] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = useCallback(async () => {
    if (!newContent.trim() || isSubmitting) return;

    setIsSubmitting(true);

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticEntry: KnowledgeBaseEntry = {
      id: tempId,
      userId: "",
      content: newContent.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setEntries((prev) => [optimisticEntry, ...prev]);
    setNewContent("");
    setIsCreating(false);

    try {
      const response = await fetch("/api/knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent.trim() }),
      });

      if (response.ok) {
        const created = await response.json();
        setEntries((prev) => prev.map((e) => (e.id === tempId ? created : e)));
      } else {
        // Rollback on error
        setEntries((prev) => prev.filter((e) => e.id !== tempId));
        setNewContent(optimisticEntry.content);
        setIsCreating(true);
      }
    } catch {
      // Rollback on error
      setEntries((prev) => prev.filter((e) => e.id !== tempId));
      setNewContent(optimisticEntry.content);
      setIsCreating(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [newContent, isSubmitting]);

  const handleUpdate = useCallback(
    async (id: string) => {
      if (!editContent.trim() || isSubmitting) return;

      setIsSubmitting(true);

      const entry = entries.find((e) => e.id === id);
      if (!entry) return;

      // Optimistic update
      const originalContent = entry.content;
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, content: editContent.trim(), updatedAt: new Date() }
            : e,
        ),
      );
      setEditingId(null);
      setEditContent("");

      try {
        const response = await fetch(`/api/knowledge-base?id=${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: editContent.trim() }),
        });

        if (response.ok) {
          const updated = await response.json();
          setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
        } else {
          // Rollback on error
          setEntries((prev) =>
            prev.map((e) =>
              e.id === id ? { ...e, content: originalContent } : e,
            ),
          );
          setEditingId(id);
          setEditContent(editContent);
        }
      } catch {
        // Rollback on error
        setEntries((prev) =>
          prev.map((e) =>
            e.id === id ? { ...e, content: originalContent } : e,
          ),
        );
        setEditingId(id);
        setEditContent(editContent);
      } finally {
        setIsSubmitting(false);
      }
    },
    [editContent, entries, isSubmitting],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (isSubmitting) return;

      setIsSubmitting(true);

      const entry = entries.find((e) => e.id === id);
      if (!entry) return;

      // Optimistic update
      setEntries((prev) => prev.filter((e) => e.id !== id));

      try {
        const response = await fetch(`/api/knowledge-base?id=${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          // Rollback on error
          setEntries((prev) => {
            const newEntries = [...prev, entry];
            return newEntries.sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            );
          });
        }
      } catch {
        // Rollback on error
        setEntries((prev) => {
          const newEntries = [...prev, entry];
          return newEntries.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [entries, isSubmitting],
  );

  const startEdit = useCallback((entry: KnowledgeBaseEntry) => {
    setEditingId(entry.id);
    setEditContent(entry.content);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditContent("");
  }, []);

  const cancelCreate = useCallback(() => {
    setIsCreating(false);
    setNewContent("");
  }, []);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border/40 bg-background/90 px-3 py-3 backdrop-blur-md md:gap-3 md:px-4">
        <SidebarToggle />
        <Button asChild className="h-10 rounded-xl px-3" variant="ghost">
          <Link href="/">
            <ArrowLeft className="size-4" />
            <span className="ml-2">Back to Chat</span>
          </Link>
        </Button>
        <h1 className="flex-1 text-center font-semibold text-lg">
          Knowledge Base
        </h1>
        <Button
          className="h-10 rounded-xl px-3"
          disabled={isSubmitting}
          onClick={() => setIsCreating(true)}
        >
          <Plus className="size-4" />
          <span className="ml-2 hidden sm:inline">New Entry</span>
        </Button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {/* Create new entry form */}
          {isCreating && (
            <Card className="border-primary/50">
              <CardHeader className="pb-2">
                <span className="font-medium text-sm text-muted-foreground">
                  New Entry
                </span>
              </CardHeader>
              <CardContent>
                <Textarea
                  autoFocus
                  className="min-h-[120px] resize-none"
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Write your entry here using Markdown..."
                  value={newContent}
                />
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button
                  disabled={isSubmitting}
                  onClick={cancelCreate}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!newContent.trim() || isSubmitting}
                  onClick={handleCreate}
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Empty state */}
          {entries.length === 0 && !isCreating && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-muted p-4">
                <Plus className="size-8 text-muted-foreground" />
              </div>
              <h2 className="mb-2 font-semibold text-lg">No entries yet</h2>
              <p className="mb-4 max-w-md text-muted-foreground">
                Add facts and information about yourself that you want the
                assistant to remember during your conversations.
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="size-4" />
                <span className="ml-2">Create your first entry</span>
              </Button>
            </div>
          )}

          {/* Entries list */}
          {entries.map((entry) => {
            const createdDate = new Date(entry.createdAt);
            const updatedDate = entry.updatedAt
              ? new Date(entry.updatedAt)
              : null;
            const wasEdited =
              updatedDate && updatedDate.getTime() !== createdDate.getTime();

            return (
              <Card key={entry.id}>
                <CardHeader className="pb-2">
                  <span className="font-medium text-sm text-muted-foreground">
                    {format(createdDate, "yyyy-MM-dd")}
                    {wasEdited && updatedDate && (
                      <span className="ml-2 text-muted-foreground/60">
                        (edited {format(updatedDate, "yyyy-MM-dd")})
                      </span>
                    )}
                  </span>
                </CardHeader>
                <CardContent>
                  {editingId === entry.id ? (
                    <Textarea
                      autoFocus
                      className="min-h-[120px] resize-none"
                      onChange={(e) => setEditContent(e.target.value)}
                      value={editContent}
                    />
                  ) : (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(entry.content),
                      }}
                    />
                  )}
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  {editingId === entry.id ? (
                    <>
                      <Button
                        disabled={isSubmitting}
                        onClick={cancelEdit}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                      <Button
                        disabled={!editContent.trim() || isSubmitting}
                        onClick={() => handleUpdate(entry.id)}
                      >
                        {isSubmitting ? "Saving..." : "Save"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        disabled={isSubmitting}
                        onClick={() => startEdit(entry)}
                        size="sm"
                        variant="outline"
                      >
                        <Pencil className="size-4" />
                        <span className="ml-2 hidden sm:inline">Edit</span>
                      </Button>
                      <Button
                        disabled={isSubmitting}
                        onClick={() => handleDelete(entry.id)}
                        size="sm"
                        variant="outline"
                      >
                        <Trash2 className="size-4" />
                        <span className="ml-2 hidden sm:inline">Delete</span>
                      </Button>
                    </>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
