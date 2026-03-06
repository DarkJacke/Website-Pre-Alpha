import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Image, Film, FileText, File, Download, Trash2, Eye, Grid, List, Clock, HardDrive, Link2, FolderPlus, Folder, CheckSquare, Square, X } from 'lucide-react';

const typeIcons = { image: Image, video: Film, document: FileText, other: File };
function formatSize(b) { return b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':(b/1048576).toFixed(1)+' MB'; }

export default function Dashboard({ onPreview, onShare }) {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [filter, setFilter] = useState('all');
  const [activeFolder, setActiveFolder] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const loadFiles = useCallback(async () => {
    try {
      const [f, fld] = await Promise.all([api.getMyFiles(), api.getFolders()]);
      setFiles(f); setFolders(fld);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const handleDelete = async (fileId) => {
    try { await api.deleteFile(fileId); setFiles(f=>f.filter(x=>x.file_id!==fileId)); } catch {}
  };

  const handleBulkDelete = async () => {
    if (selected.size===0) return;
    try { await api.bulkDelete(Array.from(selected)); setFiles(f=>f.filter(x=>!selected.has(x.file_id))); setSelected(new Set()); setSelectMode(false); } catch {}
  };

  const createFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try { await api.createFolder(newFolderName.trim()); const fld = await api.getFolders(); setFolders(fld); setNewFolderName(''); setShowNewFolder(false); } catch {}
  };

  const deleteFolder = async (folderId) => {
    try { await api.deleteFolder(folderId); setFolders(f=>f.filter(x=>x.folder_id!==folderId)); if(activeFolder===folderId) setActiveFolder(null); } catch {}
  };

  const moveToFolder = async (fileId, folderId) => {
    try { await api.moveFile(fileId, folderId); const f = await api.getMyFiles(); setFiles(f); } catch {}
  };

  const toggleSelect = (id) => {
    setSelected(prev => { const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  };

  let filtered = filter === 'all' ? files : files.filter(f => f.file_type === filter);
  if (activeFolder) filtered = filtered.filter(f => f.folder_id === activeFolder);
  else if (activeFolder === null && folders.length > 0) {
    // Show all files (including unfoldered)
  }

  const totalSize = files.reduce((s, f) => s + f.file_size, 0);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6" data-testid="dashboard-page">
      <div className="mb-5 animate-fade-in-up">
        <h1 className="font-heading text-2xl md:text-3xl font-black tracking-tighter uppercase mb-1">Dashboard</h1>
        <p className="text-white/40 font-ui text-sm">Welcome, <span style={{color:'var(--accent-color)'}}>{user?.display_name}</span></p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-3 mb-5 animate-fade-in-up" style={{animationDelay:'0.05s'}}>
        {[
          {icon:File,label:'Files',value:files.length,tid:'stat-files'},
          {icon:HardDrive,label:'Storage',value:formatSize(totalSize),tid:'stat-storage'},
          {icon:Folder,label:'Folders',value:folders.length,tid:'stat-folders'},
        ].map(s=>(
          <div key={s.tid} className="bg-[#0A0A0A] border border-white/5 p-3 hover:border-white/20 transition-colors" data-testid={s.tid}>
            <div className="flex items-center gap-2 mb-1"><s.icon size={14} className="text-white/40"/>
              <span className="font-ui text-[10px] uppercase tracking-widest text-white/40 hidden sm:inline">{s.label}</span>
            </div>
            <p className="font-heading text-lg md:text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Folders bar */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto animate-fade-in-up" style={{animationDelay:'0.08s'}}>
        <button onClick={()=>setActiveFolder(null)}
          className={`px-2.5 py-1.5 text-[10px] uppercase tracking-widest font-ui transition-all whitespace-nowrap flex items-center gap-1 shrink-0 ${!activeFolder?'text-black font-bold':'text-white/40 border border-white/10'}`}
          style={!activeFolder?{background:'var(--accent-color)'}:{}} data-testid="folder-all">
          All
        </button>
        {folders.map(f=>(
          <div key={f.folder_id} className="flex items-center shrink-0">
            <button onClick={()=>setActiveFolder(f.folder_id)}
              className={`px-2.5 py-1.5 text-[10px] uppercase tracking-widest font-ui transition-all whitespace-nowrap flex items-center gap-1 ${activeFolder===f.folder_id?'text-black font-bold':'text-white/40 border border-white/10'}`}
              style={activeFolder===f.folder_id?{background:'var(--accent-color)'}:{}} data-testid={`folder-${f.folder_id}`}>
              <Folder size={11}/>{f.name}
            </button>
            <button onClick={()=>deleteFolder(f.folder_id)} className="text-white/20 hover:text-red-400 ml-0.5 p-0.5 transition-colors"><X size={10}/></button>
          </div>
        ))}
        <button onClick={()=>setShowNewFolder(!showNewFolder)}
          className="px-2 py-1.5 text-white/30 hover:text-white border border-white/10 hover:border-white/30 transition-colors shrink-0" data-testid="new-folder-btn">
          <FolderPlus size={14}/>
        </button>
        {showNewFolder && (
          <form onSubmit={createFolder} className="flex gap-1 shrink-0">
            <input value={newFolderName} onChange={e=>setNewFolderName(e.target.value)} placeholder="Name" data-testid="new-folder-input"
              className="w-24 bg-white/5 border border-white/10 px-2 py-1 text-xs text-white font-body focus:outline-none focus:border-[var(--accent-color)]" autoFocus/>
            <button type="submit" className="px-2 py-1 text-[9px] uppercase font-ui font-bold" style={{background:'var(--accent-color)',color:'#000'}}>Add</button>
          </form>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4 gap-2 animate-fade-in-up" style={{animationDelay:'0.1s'}}>
        <div className="flex gap-1 overflow-x-auto shrink-0">
          {['all','image','video','document','other'].map(t=>(
            <button key={t} data-testid={`filter-${t}`} onClick={()=>setFilter(t)}
              className={`px-2 md:px-3 py-1.5 text-[10px] uppercase tracking-widest font-ui transition-all whitespace-nowrap ${filter===t?'text-black font-bold':'text-white/40 border border-white/10'}`}
              style={filter===t?{background:'var(--accent-color)'}:{}}>{t}</button>
          ))}
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={()=>{setSelectMode(!selectMode);setSelected(new Set())}}
            className={`p-2 transition-colors ${selectMode?'text-white':'text-white/30'}`} data-testid="select-mode-btn"
            title="Bulk select">
            <CheckSquare size={15}/>
          </button>
          {selectMode && selected.size>0 && (
            <button onClick={handleBulkDelete} className="px-2 py-1 text-[10px] bg-red-500/20 text-red-400 hover:bg-red-500/30 font-ui" data-testid="bulk-delete-btn">
              Delete {selected.size}
            </button>
          )}
          <button data-testid="view-grid" onClick={()=>setViewMode('grid')} className={`p-2 ${viewMode==='grid'?'text-white':'text-white/30'}`}><Grid size={15}/></button>
          <button data-testid="view-list" onClick={()=>setViewMode('list')} className={`p-2 ${viewMode==='list'?'text-white':'text-white/30'}`}><List size={15}/></button>
        </div>
      </div>

      {/* Files */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-white/10 border-t-[var(--accent-color)] rounded-full animate-spin"/></div>
      ) : filtered.length===0 ? (
        <div className="text-center text-white/25 py-14 font-ui" data-testid="empty-state">
          <File size={36} className="mx-auto mb-3 opacity-20"/><p>No files{activeFolder?' in this folder':''}</p>
        </div>
      ) : viewMode==='grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3 animate-fade-in-up" style={{animationDelay:'0.12s'}}>
          {filtered.map(file=>{
            const Icon = typeIcons[file.file_type]||File;
            const sel = selected.has(file.file_id);
            return (
              <div key={file.file_id} data-testid={`file-card-${file.file_id}`}
                className={`group bg-[#0A0A0A] border transition-all ${sel?'border-[var(--accent-color)]':'border-white/5 hover:border-white/20'}`}
                onClick={selectMode?()=>toggleSelect(file.file_id):undefined}>
                <div className="aspect-square relative overflow-hidden bg-black flex items-center justify-center">
                  {selectMode && (
                    <div className="absolute top-1.5 left-1.5 z-10">
                      {sel?<CheckSquare size={16} style={{color:'var(--accent-color)'}}/>:<Square size={16} className="text-white/30"/>}
                    </div>
                  )}
                  {file.file_type==='image'?<img src={api.getPreviewUrl(file.file_id)} alt="" className="w-full h-full object-cover" loading="lazy"/>
                    :file.file_type==='video'?<video src={api.getPreviewUrl(file.file_id)} className="w-full h-full object-cover" muted preload="metadata"/>
                    :<Icon size={30} className="text-white/15"/>}
                  {!selectMode && (
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                      {(file.file_type==='image'||file.file_type==='video') && (
                        <button onClick={()=>onPreview(file)} className="p-1.5 bg-white/10 hover:bg-white/20"><Eye size={14}/></button>
                      )}
                      <button onClick={()=>onShare&&onShare(file)} className="p-1.5 bg-white/10 hover:bg-white/20"><Link2 size={14}/></button>
                      <a href={api.getDownloadUrl(file.file_id)} className="p-1.5 bg-white/10 hover:bg-white/20"><Download size={14}/></a>
                      <button onClick={()=>handleDelete(file.file_id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400"><Trash2 size={14}/></button>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-body truncate">{file.filename}</p>
                  <p className="text-[10px] text-white/30 font-ui mt-0.5">{formatSize(file.file_size)}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1 animate-fade-in-up" style={{animationDelay:'0.12s'}}>
          {filtered.map(file=>{
            const Icon = typeIcons[file.file_type]||File;
            const sel = selected.has(file.file_id);
            return (
              <div key={file.file_id} data-testid={`file-row-${file.file_id}`}
                className={`flex items-center gap-3 p-2.5 bg-[#0A0A0A] border transition-colors group ${sel?'border-[var(--accent-color)]':'border-white/5 hover:border-white/20'}`}
                onClick={selectMode?()=>toggleSelect(file.file_id):undefined}>
                {selectMode && (sel?<CheckSquare size={14} style={{color:'var(--accent-color)'}}/>:<Square size={14} className="text-white/30"/>)}
                <Icon size={14} className="text-white/30 shrink-0"/>
                <span className="flex-1 text-xs font-body truncate min-w-0">{file.filename}</span>
                <span className="text-[10px] text-white/30 font-ui hidden sm:inline shrink-0">{formatSize(file.file_size)}</span>
                {!selectMode && (
                  <div className="flex gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                    {(file.file_type==='image'||file.file_type==='video') && <button onClick={()=>onPreview(file)} className="p-1.5 hover:bg-white/10"><Eye size={13}/></button>}
                    <button onClick={()=>onShare&&onShare(file)} className="p-1.5 hover:bg-white/10"><Link2 size={13}/></button>
                    <a href={api.getDownloadUrl(file.file_id)} className="p-1.5 hover:bg-white/10"><Download size={13}/></a>
                    <button onClick={()=>handleDelete(file.file_id)} className="p-1.5 hover:bg-red-500/10 text-red-400"><Trash2 size={13}/></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
