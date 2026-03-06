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

  const removeFile = (idx) => {
    setFiles(f => f.filter((_, i) => i !== idx));
  };

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
    <div className="flex-1 overflow-y-auto p-6" data-testid="upload-page">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="font-heading text-3xl font-black tracking-tighter uppercase mb-2">Upload Files</h1>
        <p className="text-white/40 font-ui text-sm">Drag & drop or select files to upload</p>
      </div>

      {/* Drop zone */}
      <div
        data-testid="upload-dropzone"
        className={`border-2 border-dashed p-12 text-center transition-all duration-300 cursor-pointer mb-6 ${
          dragging ? 'border-[var(--accent-color)]' : 'border-white/10 hover:border-white/30'
        }`}
        style={dragging ? { boxShadow: '0 0 30px rgba(var(--accent-rgb), 0.2)' } : {}}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <FileUp size={48} className="mx-auto mb-4" style={{ color: dragging ? 'var(--accent-color)' : 'rgba(255,255,255,0.2)' }} />
        <p className="font-ui text-white/60">
          {dragging ? 'Drop files here' : 'Click or drag files here'}
        </p>
        <p className="font-body text-[11px] text-white/30 mt-2">Any file type supported</p>
        <input ref={inputRef} type="file" multiple className="hidden"
          data-testid="file-input"
          onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} />
      </div>

      {/* Public toggle */}
      <div className="flex items-center gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <button
          data-testid="toggle-public"
          onClick={() => setIsPublic(!isPublic)}
          className={`w-10 h-5 rounded-full transition-colors relative ${isPublic ? '' : 'bg-white/20'}`}
          style={isPublic ? { background: 'var(--accent-color)' } : {}}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isPublic ? 'left-5' : 'left-0.5'}`} />
        </button>
        <span className="font-ui text-sm text-white/60">
          {isPublic ? 'Public (visible on your profile)' : 'Private'}
        </span>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2 mb-6 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-[#0A0A0A] border border-white/5"
              data-testid={`upload-file-${i}`}>
              <Upload size={16} className="text-white/30" />
              <span className="flex-1 text-sm font-body truncate">{file.name}</span>
              <span className="text-[11px] text-white/30 font-ui">
                {(file.size / 1048576).toFixed(1)} MB
              </span>
              {results[i] && (
                results[i].ok
                  ? <CheckCircle size={16} className="text-green-400" />
                  : <span className="text-red-400 text-xs">{results[i].error}</span>
              )}
              {!uploading && (
                <button onClick={() => removeFile(i)} className="text-white/30 hover:text-red-400 transition-colors">
                  <X size={16} />
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
          className="px-8 py-3 uppercase tracking-widest font-bold text-sm transition-all duration-200 active:scale-95 disabled:opacity-50 font-ui"
          style={{ background: 'var(--accent-color)', color: '#000' }}
        >
          {uploading ? 'Uploading...' : `Upload ${files.length} file${files.length > 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  );
}
