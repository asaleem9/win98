// Minimal, additive write-notification bus for the virtual filesystem. The
// FileSystemContext fires `emitFileWrite` after a successful writeFile/createFile
// so background watchers (e.g. Norton's real-time shield) can react to files
// landing on disk without any coupling to the reducer or provider tree.

export type FileWriteListener = (path: string, content: string) => void;

const listeners = new Set<FileWriteListener>();

/** Subscribe to file writes. Returns an unsubscribe function. */
export function onFileWrite(listener: FileWriteListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Notify subscribers that `path` was written with `content`. */
export function emitFileWrite(path: string, content: string): void {
  // Snapshot so a listener that unsubscribes mid-dispatch can't skip another.
  for (const listener of [...listeners]) listener(path, content);
}
