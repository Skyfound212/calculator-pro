import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, FolderOpen, FileText, Trash2, Plus } from 'lucide-react';

const RuangKerja = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('calculatorpro_notes');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentNote, setCurrentNote] = useState({ id: null, title: '', content: '' });
  const [showForm, setShowForm] = useState(false);

  const saveToStorage = (newNotes) => {
    localStorage.setItem('calculatorpro_notes', JSON.stringify(newNotes));
  };

  const handleSave = () => {
    if (!currentNote.title.trim()) return;
    
    let newNotes;
    if (currentNote.id) {
      newNotes = notes.map(n => n.id === currentNote.id ? { ...currentNote, updatedAt: new Date().toISOString() } : n);
    } else {
      newNotes = [...notes, { ...currentNote, id: Date.now(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    }
    
    setNotes(newNotes);
    saveToStorage(newNotes);
    setCurrentNote({ id: null, title: '', content: '' });
    setShowForm(false);
  };

  const handleDelete = (id) => {
    const newNotes = notes.filter(n => n.id !== id);
    setNotes(newNotes);
    saveToStorage(newNotes);
  };

  const handleEdit = (note) => {
    setCurrentNote(note);
    setShowForm(true);
  };

  const handleNew = () => {
    setCurrentNote({ id: null, title: '', content: '' });
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[#00D4FF] hover:text-[#00D4FF]/80">
            <ArrowLeft size={20} />
            <span>Kembali</span>
          </button>
          <h1 className="text-xl font-bold text-[#00D4FF]">Ruang Kerja</h1>
          <button onClick={handleNew} className="flex items-center gap-2 bg-[#00D4FF] text-[#0D0D0D] px-3 py-2 rounded-lg hover:bg-[#00D4FF]/80">
            <Plus size={18} />
            <span>Baru</span>
          </button>
        </div>

        {showForm && (
          <div className="mb-6 bg-[#1A1A1A] rounded-xl p-4 border border-[#00D4FF]/20">
            <input
              type="text"
              placeholder="Judul catatan..."
              value={currentNote.title}
              onChange={(e) => setCurrentNote({ ...currentNote, title: e.target.value })}
              className="w-full bg-[#0D0D0D] border border-[#333] rounded-lg px-3 py-2 mb-3 text-white placeholder-gray-500 focus:border-[#00D4FF] outline-none"
            />
            <textarea
              placeholder="Isi catatan..."
              value={currentNote.content}
              onChange={(e) => setCurrentNote({ ...currentNote, content: e.target.value })}
              rows={6}
              className="w-full bg-[#0D0D0D] border border-[#333] rounded-lg px-3 py-2 mb-3 text-white placeholder-gray-500 focus:border-[#00D4FF] outline-none resize-none"
            />
            <div className="flex gap-2">
              <button onClick={handleSave} className="flex items-center gap-2 bg-[#00D4FF] text-[#0D0D0D] px-4 py-2 rounded-lg hover:bg-[#00D4FF]/80">
                <Save size={18} />
                Simpan
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-400 hover:text-white">
                Batal
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {notes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
              <p>Belum ada catatan</p>
              <p className="text-sm mt-1">Tap "Baru" untuk membuat catatan pertama</p>
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="bg-[#1A1A1A] rounded-xl p-4 border border-[#333] hover:border-[#00D4FF]/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-[#00D4FF]">{note.title}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(note)} className="text-gray-400 hover:text-[#00D4FF]">
                      <FileText size={16} />
                    </button>
                    <button onClick={() => handleDelete(note.id)} className="text-gray-400 hover:text-red-400">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-gray-300 text-sm line-clamp-3">{note.content}</p>
                <p className="text-gray-600 text-xs mt-2">
                  {new Date(note.updatedAt).toLocaleDateString('id-ID')}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RuangKerja;
