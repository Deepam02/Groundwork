import { useEffect, useRef, useState } from 'react';
import { useQuery } from 'convex/react';
import { ExternalLink, FileText, Loader } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { cn } from '../../lib/utils';
import { findExcerpt, parseMarkdown, trimChrome } from './markdown';
import { hostOf } from './types';

/**
 * Evidence read in place. Authorities almost never allow their pages to be
 * framed, so "Reader" rebuilds the page from the text that was already
 * retrieved and highlights the exact sentence a claim rests on. "Original" is
 * the real PDF, served back from this deployment so the browser will show it.
 */
export function DocumentViewer({
  projectId,
  url,
  excerpt,
}: {
  projectId: Id<'projects'>;
  url: string;
  excerpt?: string;
}) {
  const sourceId = useQuery(api.documents.forUrl, { projectId, url });
  const source = useQuery(
    api.documents.viewer,
    sourceId ? { sourceId } : 'skip',
  );
  const [mode, setMode] = useState<'reader' | 'original'>('reader');

  if (sourceId === undefined || (sourceId && source === undefined))
    return (
      <div className="viewer is-loading">
        <Loader size={16} className="spin" />
        Opening the source…
      </div>
    );

  if (!source)
    return (
      <div className="viewer is-empty">
        <FileText size={18} />
        <p>This page is not stored, so it can only be opened at the authority.</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="viewer-link">
          {hostOf(url)} <ExternalLink size={13} />
        </a>
      </div>
    );

  return (
    <div className="viewer">
      <div className="viewer-bar">
        <span className="viewer-kind">{source.kindLabel}</span>
        <div className="viewer-modes" role="tablist" aria-label="Document view">
          <button
            role="tab"
            aria-selected={mode === 'reader'}
            className={cn(mode === 'reader' && 'active')}
            onClick={() => setMode('reader')}
          >
            Reader
          </button>
          {source.fileUrl && (
            <button
              role="tab"
              aria-selected={mode === 'original'}
              className={cn(mode === 'original' && 'active')}
              onClick={() => setMode('original')}
            >
              Original PDF
            </button>
          )}
        </div>
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="viewer-link">
          {hostOf(source.url)} <ExternalLink size={13} />
        </a>
      </div>
      {mode === 'original' && source.fileUrl ? (
        <iframe className="viewer-frame" src={source.fileUrl} title={source.title} />
      ) : (
        <Reader text={source.text} excerpt={excerpt} title={source.title} />
      )}
    </div>
  );
}

function Reader({ text, excerpt, title }: { text: string; excerpt?: string; title: string }) {
  const markRef = useRef<HTMLElement>(null);
  const blocks = trimChrome(parseMarkdown(text));
  const highlight = findExcerpt(blocks, excerpt);
  useEffect(() => {
    if (!markRef.current) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    markRef.current.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'center',
    });
  }, [excerpt, text]);
  return (
    <div className="viewer-reader">
      <h4 className="reader-title">{title}</h4>
      {blocks.map((block, index) => {
        const parts = highlight?.index === index ? highlight.parts : null;
        const content = parts ? (
          <>
            {parts[0]}
            <mark ref={markRef}>{parts[1]}</mark>
            {parts[2]}
          </>
        ) : (
          block.text
        );
        if (block.kind === 'heading')
          return (
            <h5 key={index} className="reader-heading">
              {content}
            </h5>
          );
        if (block.kind === 'list')
          return (
            <p key={index} className="reader-item">
              {content}
            </p>
          );
        return (
          <p key={index} className="reader-para">
            {content}
          </p>
        );
      })}
      {!blocks.length && <p className="reader-para">No readable text was stored for this page.</p>}
    </div>
  );
}
