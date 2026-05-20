import { createIssueAttachment } from "../api/issues";
import { normalizePagedList } from "./apiList";

export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export const ATTACHMENT_ACCEPT =
  ".pdf,image/*,.txt,.md,.csv,.json,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx";

export const ATTACHMENT_HELP_FORMATS =
  "Allowed formats: PDF, images, TXT, MD, CSV, JSON, ZIP, DOC, DOCX, XLS, XLSX, PPT and PPTX.";

export const ATTACHMENT_HELP_MAX_SIZE = "Max size: 10 MB.";

export const normalizeAttachmentList = normalizePagedList;

export function isAttachmentOwner(attachment, currentUsername) {
  return attachment.uploaded_by?.username === currentUsername;
}

/**
 * Llegeix el fitxer de l'input, el buida per permetre tornar a triar el mateix fitxer,
 * i retorna el resultat de validació.
 * @returns {{ kind: "noop" } | { kind: "invalid"; message: string } | { kind: "ok"; file: File }}
 */
export function prepareIssueAttachmentUpload(event) {
  const input = event.target;
  const file = input.files?.[0] ?? null;
  input.value = "";
  if (!file) return { kind: "noop" };
  if (file.size > ATTACHMENT_MAX_BYTES) {
    return { kind: "invalid", message: "The file exceeds the 10 MB limit." };
  }
  return { kind: "ok", file };
}

export async function createIssueAttachmentAndReload(
  file,
  { apiKey, issueId, reloadAttachments, reloadActivities }
) {
  await createIssueAttachment(apiKey, issueId, file);
  await Promise.all([reloadAttachments(), reloadActivities()]);
}
