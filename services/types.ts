
import type { DocumentSnapshot, DocumentData } from 'firebase/firestore';

export interface PaginatedDocsResponse<T> {
  items: T[];
  lastVisibleDoc: DocumentSnapshot<DocumentData> | null;
}
