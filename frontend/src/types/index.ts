export type DocumentType = 'BUG_REPORT' | 'CHECKLIST' | 'TEST_CASE' | 'TEST_LIST' | 'TEST_PLAN';

export type BlockType =
  | 'TEXT'
  | 'HEADING'
  | 'INPUT'
  | 'TEXTAREA'
  | 'SELECT'
  | 'CHECKBOX'
  | 'RADIO'
  | 'STEP'
  | 'STEP_GROUP'
  | 'SECTION'
  | 'TABLE'
  | 'IMAGE'
  | 'ATTACHMENT'
  | 'SEVERITY'
  | 'PRIORITY'
  | 'ENVIRONMENT'
  | 'STATUS'
  | 'COMMENT'
  | 'RUN_INFO';

export type Severity = 'Blocker' | 'Critical' | 'Major' | 'Minor' | 'Trivial';
export type Priority = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
export type CheckStatus = 'none' | 'passed' | 'failed' | 'blocked' | 'skipped';

export interface AttachmentFile {
  id: string;
  name: string;
  size: number;
  mimeType?: string;
  url: string;
}

export interface RunResult {
  status: CheckStatus;
  comment?: string;
}

/** A test run / environment — becomes a status column in checklist tables. */
export interface TestRun {
  id: string;
  environment?: string;
  date?: string;
  build?: string;
  testType?: string;
}

interface Labeled {
  label?: string;
}

/** Content shape of every block type. Must stay in sync with backend CONTENT_SCHEMAS. */
export interface BlockContentMap {
  TEXT: { text?: string };
  HEADING: { text?: string; level?: 1 | 2 | 3 };
  INPUT: Labeled & { value?: string; placeholder?: string };
  TEXTAREA: Labeled & { value?: string; placeholder?: string };
  SELECT: Labeled & { options?: string[]; value?: string };
  RADIO: Labeled & { options?: string[]; value?: string };
  CHECKBOX: Labeled & {
    checked?: boolean;
    /** Result of the first (or only) run */
    status?: CheckStatus;
    comment?: string;
    /** Results of the other runs, keyed by run id */
    results?: Record<string, RunResult>;
    requirement?: string;
    testType?: string;
    bugId?: string;
  };
  STEP: { action?: string; expected?: string };
  STEP_GROUP: { title?: string };
  SECTION: { title?: string; description?: string };
  TABLE: Labeled & { columns?: string[]; rows?: string[][] };
  IMAGE: Labeled & { src?: string; caption?: string; attachmentId?: string };
  ATTACHMENT: Labeled & { files?: AttachmentFile[] };
  SEVERITY: Labeled & { value?: Severity | '' };
  PRIORITY: Labeled & { value?: Priority | '' };
  ENVIRONMENT: Labeled & { items?: { key: string; value: string }[] };
  STATUS: Labeled & { options?: string[]; value?: string };
  COMMENT: { author?: string; text?: string };
  RUN_INFO: { project?: string; tester?: string; runs?: TestRun[] };
}

export interface BlockSettings {
  collapsed?: boolean;
  required?: boolean;
  hideLabel?: boolean;
}

export interface BlockOf<T extends BlockType> {
  id: string;
  type: T;
  parentId: string | null;
  order: number;
  content: BlockContentMap[T];
  settings: BlockSettings;
}

/** Discriminated union of all blocks — narrowing on `type` narrows `content`. */
export type Block = { [K in BlockType]: BlockOf<K> }[BlockType];

export type BlockTree = Block & { children: BlockTree[] };

export type Role = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface DocumentSummary {
  id: string;
  title: string;
  type: DocumentType;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  blocksCount: number;
}

export interface DocumentDetails extends DocumentSummary {
  blocks: Block[];
  latestVersion: number;
}

export interface SaveResult {
  id: string;
  title: string;
  updatedAt: string;
  latestVersion: number;
  versionCreatedAt: string;
}

export interface VersionSummary {
  id: string;
  number: number;
  title: string;
  createdAt: string;
  authorName: string | null;
}

export interface VersionDetails {
  id: string;
  number: number;
  title: string;
  createdAt: string;
  blocks: Block[];
}

export interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  docType: DocumentType;
  isSystem: boolean;
  isDefault: boolean;
  ownerId: string | null;
  blocksCount: number;
  canEdit: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateDetails extends TemplateSummary {
  blocks: Block[];
}

export type ExportFormat = 'xlsx' | 'pdf' | 'docx' | 'markdown' | 'json';

export interface AdminStats {
  users: number;
  documents: number;
  documentsByType: Record<DocumentType, number>;
  systemTemplates: number;
  customTemplates: number;
  versions: number;
}

export interface AdminUser extends User {
  createdAt: string;
  documentsCount: number;
  templatesCount: number;
}
