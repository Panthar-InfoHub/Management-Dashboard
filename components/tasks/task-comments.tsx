"use client";


import { useOptimistic, useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { Loader2, MessageSquare, MoreHorizontal } from "lucide-react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { errorMessage } from "@/lib/utils";
import { addCommentAction, deleteCommentAction, updateCommentAction } from "@/lib/actions/comment.actions";

type Author = { id: string; firstName: string; lastName: string; avatarUrl: string | null };
export type TaskComment = {
  id: string;
  content: string;
  createdAt: string | Date;
  editedAt: string | Date | null;
  author: Author;
  pending?: boolean;
};

type CommentChange =
  | { type: "add"; comment: TaskComment }
  | { type: "edit"; id: string; content: string }


function applyChange(list: TaskComment[], change: CommentChange): TaskComment[] {
  switch (change.type) {
    case "add":
      return [...list, change.comment];
    case "edit":
      return list.map((c) => (c.id === change.id ? { ...c, content: change.content, editedAt: new Date() } : c));
  }
}

export function TaskComments({
  taskId,
  comments,
  currentEmployee,
  canModerate,
  canComment,
}: {
  taskId: string;
  comments: TaskComment[];
  currentEmployee: Author | null;
  canModerate: boolean;
  canComment: boolean;
}) {
  const [optimisticComments, applyOptimistic] = useOptimistic(comments, applyChange);
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const submit = () => {
    const content = draft.trim();
    if (!content || !currentEmployee) return;
    setDraft("");
    startTransition(async () => {
      applyOptimistic({
        type: "add",
        comment: { id: `pending-${Date.now()}`, content, createdAt: new Date(), editedAt: null, author: currentEmployee, pending: true },
      });
      try {
        await addCommentAction(taskId, content);
      } catch (err) {
        setDraft(content);
        toast.error(errorMessage(err, "Comment not posted. Try again."));
      }
    });
  };

  const saveEdit = (id: string) => {
    const content = editDraft.trim();
    if (!content) return;
    setEditingId(null);
    startTransition(async () => {
      applyOptimistic({ type: "edit", id, content });
      try {
        await updateCommentAction(id, content);
      } catch (err) {
        toast.error(errorMessage(err, "Comment not updated. Try again."));
      }
    });
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <div className="pt-6 border-t border-border/40">
      <h3 className="text-sm font-medium mb-3 text-foreground flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" /> Comments
        <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{optimisticComments.length}</span>
      </h3>

      {optimisticComments.length === 0 ? (
        <p className="text-xs text-muted-foreground mb-4">No comments yet. Start the discussion below.</p>
      ) : (
        <ul className="space-y-4 mb-4">
          {optimisticComments.map((c) => {
            const isMine = currentEmployee?.id === c.author.id;
            return (
              <li key={c.id} className={c.pending ? "opacity-60" : undefined}>
                <div className="flex gap-3">
                  <Avatar className="h-7 w-7 shrink-0">
                    {c.author.avatarUrl && <AvatarImage src={c.author.avatarUrl} alt="" />}
                    <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">{c.author.firstName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-foreground">{c.author.firstName} {c.author.lastName}</span>
                      <span className="text-muted-foreground" suppressHydrationWarning>
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                        {c.editedAt ? " · edited" : ""}
                      </span>
                      {!c.pending && (isMine || canModerate) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="ml-auto h-6 w-6 text-muted-foreground" aria-label="Comment actions">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isMine && (
                              <DropdownMenuItem className="text-xs" onClick={() => { setEditingId(c.id); setEditDraft(c.content); }}>
                                Edit Comment
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-xs text-red-600" onClick={() => setDeletingId(c.id)}>
                              Delete Comment
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    {editingId === c.id ? (
                      <div className="mt-2 space-y-2">
                        <Textarea value={editDraft} onChange={(e) => setEditDraft(e.target.value)} rows={3} autoFocus maxLength={5000} />
                        <div className="flex gap-2 justify-end">
                          <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                          <Button type="button" size="sm" onClick={() => saveEdit(c.id)} disabled={!editDraft.trim()}>Save Comment</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-foreground/90 whitespace-pre-wrap break-words">{c.content}</p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {deletingId && (
        <DeleteCommentDialog
          onClose={() => setDeletingId(null)}
          onConfirm={async () => { await deleteCommentAction(deletingId); setDeletingId(null); toast.success("Comment deleted"); }}
        />
      )}

      {canComment && currentEmployee && (
        <form
          className="space-y-2"
          onSubmit={(e) => { e.preventDefault(); submit(); }}
        >
          <Textarea
            placeholder="Write a comment…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
            }}
            rows={3}
            maxLength={5000}
            aria-label="New comment"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Ctrl + Enter to post</span>
            <Button type="submit" size="sm" disabled={!draft.trim() || isPending}>Post Comment</Button>
          </div>
        </form>
      )}
    </div>
  );
}

function DeleteCommentDialog({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => Promise<void> }) {
  const [isPending, startTransition] = useTransition();
  return (
    <AlertDialog open onOpenChange={(open) => !open && !isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
          <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => startTransition(async () => {
              try { await onConfirm(); } catch (err) { toast.error(errorMessage(err, "Comment not deleted. Try again.")); }
            })}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? "Deleting…" : "Delete Comment"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
