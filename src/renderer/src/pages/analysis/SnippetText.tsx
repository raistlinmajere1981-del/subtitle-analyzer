import type { ReactElement } from 'react';

export function SnippetText({ value }: { value: string }): ReactElement {
  const parts = value.split(/(<mark>|<\/mark>)/g);
  let highlighted = false;

  return (
    <>
      {parts.map((part, index) => {
        if (part === '<mark>') {
          highlighted = true;
          return null;
        }

        if (part === '</mark>') {
          highlighted = false;
          return null;
        }

        return highlighted ? <mark key={`${part}-${index}`}>{part}</mark> : <span key={`${part}-${index}`}>{part}</span>;
      })}
    </>
  );
}
