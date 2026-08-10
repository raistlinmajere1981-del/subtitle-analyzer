import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactElement } from 'react';
import type { CSSProperties } from 'react';

interface ThumbnailPreviewProps {
  alt: string;
  className?: string;
  style: CSSProperties;
}

export function ThumbnailPreview({ alt, className = '', style }: ThumbnailPreviewProps): ReactElement {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [previewPosition, setPreviewPosition] = useState<CSSProperties | null>(null);

  useEffect(() => {
    if (!isPreviewVisible) {
      return;
    }

    const updatePosition = (): void => {
      const anchor = anchorRef.current;
      if (!anchor) {
        return;
      }

      const rect = anchor.getBoundingClientRect();
      const previewWidth = Math.min(360, Math.max(240, window.innerWidth * 0.42));
      const previewHeight = (previewWidth * 9) / 16 + 12;
      const gap = 12;
      const horizontalPadding = 12;
      const centeredLeft = rect.left + rect.width / 2 - previewWidth / 2;
      const left = Math.min(
        Math.max(horizontalPadding, centeredLeft),
        Math.max(horizontalPadding, window.innerWidth - previewWidth - horizontalPadding)
      );
      const hasSpaceAbove = rect.top >= previewHeight + gap;
      const top = hasSpaceAbove ? rect.top - previewHeight - gap : rect.bottom + gap;

      setPreviewPosition({
        left,
        top: Math.min(Math.max(horizontalPadding, top), Math.max(horizontalPadding, window.innerHeight - previewHeight - horizontalPadding)),
        width: previewWidth,
        '--thumbnail-preview-arrow-left': `${rect.left + rect.width / 2 - left}px`,
        '--thumbnail-preview-arrow-y': hasSpaceAbove ? 'bottom' : 'top'
      } as CSSProperties);
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isPreviewVisible]);

  return (
    <span
      className={`thumbnail-preview ${className}`.trim()}
      onBlur={() => setIsPreviewVisible(false)}
      onFocus={() => setIsPreviewVisible(true)}
      onMouseEnter={() => setIsPreviewVisible(true)}
      onMouseLeave={() => setIsPreviewVisible(false)}
      ref={anchorRef}
    >
      <span aria-label={alt} className="thumb" role="img" style={style} />
      {isPreviewVisible && previewPosition
        ? createPortal(
            <span aria-hidden="true" className="thumbnail-preview-popover" style={previewPosition}>
              <span className="thumbnail-preview-image" style={style} />
            </span>,
            document.body
          )
        : null}
    </span>
  );
}