import { createContext, useContext } from 'react';
import type { TestRun } from '@/types';

interface BlockRenderContext {
  /** Step numbers by block id, computed once per render of the canvas */
  stepNumbers: Map<string, number>;
  /** Document id for uploads (null while editing a template) */
  documentId: string | null;
  /** Runs declared by a RUN_INFO block (null → checks have a single status) */
  runs: TestRun[] | null;
}

export const BlockRenderContext = createContext<BlockRenderContext>({ stepNumbers: new Map(), documentId: null, runs: null });

export const useBlockRenderContext = () => useContext(BlockRenderContext);
