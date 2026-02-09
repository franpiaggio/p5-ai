import { useState, useEffect } from 'react';
import { createBlobUrl } from './imageUtils';
import type { ImageAttachment } from '../../types';

export function SafeImage({ img, className, alt, onClick }: {
  img: ImageAttachment;
  className?: string;
  alt: string;
  onClick?: () => void;
}) {
  const [blobUrl, setBlobUrl] = useState('');

  useEffect(() => {
    const url = createBlobUrl(img);
    setBlobUrl(url);
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [img]);

  if (!blobUrl) return null;
  return <img src={blobUrl} alt={alt} className={className} onClick={onClick} />;
}
