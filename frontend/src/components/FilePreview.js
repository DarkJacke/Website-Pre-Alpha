import React from 'react';
import { X, Download } from 'lucide-react';
import { api } from '../api';

export default function FilePreview({ file, onClose }) {
  if (!file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      data-testid="file-preview-modal"
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
      <div className="relative z-10 w-full max-w-5xl max-h-[90vh] mx-2 md:mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="font-body text-xs md:text-sm text-white/70 truncate min-w-0 mr-2">{file.filename}</p>
          <div className="flex gap-2 shrink-0">
            <a href={api.getDownloadUrl(file.file_id)}
              data-testid="preview-download-btn"
              className="p-2 bg-white/10 hover:bg-white/20 transition-colors">
              <Download size={16} />
            </a>
            <button onClick={onClose} data-testid="preview-close-btn"
              className="p-2 bg-white/10 hover:bg-white/20 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center">
          {file.file_type === 'image' ? (
            <img src={api.getPreviewUrl(file.file_id)} alt={file.filename}
              className="max-w-full max-h-[80vh] object-contain" data-testid="preview-image" />
          ) : file.file_type === 'video' ? (
            <video src={api.getPreviewUrl(file.file_id)} controls autoPlay
              className="max-w-full max-h-[80vh]" data-testid="preview-video" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
