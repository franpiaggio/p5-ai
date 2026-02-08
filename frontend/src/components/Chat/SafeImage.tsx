import { useMemo, useEffect } from 'react';
import { createBlobUrl } from './imageUtils';
import type { ImageAttachment } from '../../types';

export function SafeImage({ img, className, alt, onClick }: {
  img: ImageAttachment;
  className?: string;
  alt: string;
  onClick?: () => void;
}) {
  const blobUrl = useMemo(() => createBlobUrl(img), [img]);

  useEffect(() => {
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [blobUrl]);

  if (!blobUrl) return null;
  return <img src={blobUrl} alt={alt} className={className} onClick={onClick} />;
}
