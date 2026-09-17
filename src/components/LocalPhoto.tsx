import { useEffect, useState } from 'react';
import PhotoViewer from './PhotoViewer';
export default function LocalPhoto({ photo, alt }: { photo: Blob; alt: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const next = URL.createObjectURL(photo);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [photo]);
  return url ? (
    <PhotoViewer src={url} alt={alt}>
      <img className="local-photo" src={url} alt={alt} />
    </PhotoViewer>
  ) : null;
}
