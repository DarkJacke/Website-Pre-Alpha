import React, { useState, useRef } from 'react';
import { api } from '../api';
import { Upload, X, CheckCircle, FileUp } from 'lucide-react';

export default function UploadPage({ onDone }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const inputRef = useRef(null);

  const handleFiles = (fileList) => {
    setFiles(prev => [...prev, ...Array.from(fileList)]);
    setResults([]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const removeFile = (idx) => setFiles(f => f.filter((_, i) => i !== idx));

  const handleUpload = async () => {
    setUploading(true);
    const newResults = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('is_public', isPublic);
      try {
        await api.uploadFile(fd);
        newResults.push({ name: file.name, ok: true });
      } catch (err) {
        newResults.push({ name: file.name, ok: false, error: err.message });
      }
    }
    setResults(newResults);
    setUploading(false);
    if (newResults.every(r => r.ok)) {
      setTimeout(() => { setFiles([]); setResults([]); if (onDone) onDone(); }, 1500);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6" data-testid="upload-page">
      <div className="mb-6 md:mb-8 animate-fade-in-up">
        <h1 className="font-heading text-2xl md:text-3xl font-black tracking-tighter uppercase mb-1">Upload</h1>
        <p className="text-white/40 font-ui text-sm">Drag & drop or select files</p>
      </div>

      <div
        data-testid="upload-dropzone"
        className={`border-2 border-dashed p-8 md:p-12 text-center transition-all duration-300 cursor-pointer mb-4 md:mb-6 ${
          dragging ? 'border-[var(--accent-color)]' : 'border-white/10 hover:border-white/20'
        }`}
        style={dragging ? { boxShadow: '0 0 30px rgba(var(--accent-rgb), 0.15)' } : {}}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <FileUp size={40} className="mx-auto mb-3" style={{ color: dragging ? 'var(--accent-color)' : 'rgba(255,255,255,0.15)' }} />
        <p className="font-ui text-white/50 text-sm">
          {dragging ? 'Drop files here' : 'Click or drag files here'}
        </p>
        <p className="font-body text-[10px] text-white/25 mt-1">Max 100MB per file</p>
        <input ref={inputRef} type="file" multiple className="hidden"
          data-testid="file-input"
          onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} />
      </div>

      <div className="flex items-center gap-3 mb-4 md:mb-6 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
        <button
          data-testid="toggle-public"
          onClick={() => setIsPublic(!isPublic)}
          className={`w-10 h-5 rounded-full transition-colors relative ${isPublic ? '' : 'bg-white/20'}`}
          style={isPublic ? { background: 'var(--accent-color)' } : {}}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isPublic ? 'left-5' : 'left-0.5'}`} />
        </button>
        <span className="font-ui text-xs text-white/50">
          {isPublic ? 'Public (on profile)' : 'Private'}
        </span>
      </div>

      {files.length > 0 && (
        <div className="space-y-1.5 mb-4 md:mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 md:p-3 bg-[#0A0A0A] border border-white/5"
              data-testid={`upload-file-${i}`}>
              <Upload size={14} className="text-white/30 shrink-0" />
              <span className="flex-1 text-xs md:text-sm font-body truncate min-w-0">{file.name}</span>
              <span className="text-[10px] text-white/30 font-ui shrink-0">
                {(file.size / 1048576).toFixed(1)} MB
              </span>
              {results[i] && (
                results[i].ok
                  ? <CheckCircle size={14} className="text-green-400 shrink-0" />
                  : <span className="text-red-400 text-[10px] shrink-0">{results[i].error}</span>
              )}
              {!uploading && (
                <button onClick={() => removeFile(i)} className="text-white/30 hover:text-red-400 transition-colors shrink-0">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <button
          data-testid="upload-submit-button"
          onClick={handleUpload}
          disabled={uploading}
          className="px-6 md:px-8 py-3 uppercase tracking-widest font-bold text-xs md:text-sm transition-all duration-200 active:scale-95 disabled:opacity-50 font-ui"
          style={{ background: 'var(--accent-color)', color: '#000' }}
        >
          {uploading ? 'Uploading...' : `Upload ${files.length} file${files.length > 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  );
}
