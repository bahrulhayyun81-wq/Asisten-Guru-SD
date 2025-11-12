
import React, { useState } from 'react';
import { MaterialGenerator } from './components/MaterialGenerator';
import { ImageGenerator } from './components/ImageGenerator';
import { ImageEditor } from './components/ImageEditor';
import { BookOpenIcon, PhotoIcon, PencilSquareIcon, SparklesIcon, DocumentTextIcon, AcademicCapIcon } from './components/Icons';

type Tab = 'lkpd' | 'soal' | 'materi' | 'gambar' | 'edit';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('lkpd');

  const renderContent = () => {
    switch (activeTab) {
      case 'lkpd':
        return <MaterialGenerator mode="lkpd" />;
      case 'soal':
        return <MaterialGenerator mode="soal" />;
      case 'materi':
        return <MaterialGenerator mode="materi" />;
      case 'gambar':
        return <ImageGenerator />;
      case 'edit':
        return <ImageEditor />;
      default:
        return null;
    }
  };

  const TabButton = ({ tab, label, icon }: { tab: Tab; label: string; icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center justify-center sm:justify-start gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
        activeTab === tab
          ? 'bg-blue-600 text-white shadow-lg'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
      <header className="bg-white dark:bg-slate-950/70 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SparklesIcon className="w-8 h-8 text-blue-500" />
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">
              Asisten Guru SD
            </h1>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="md:grid md:grid-cols-12 md:gap-8">
          <aside className="md:col-span-3 lg:col-span-2 mb-6 md:mb-0">
            <nav className="flex md:flex-col gap-2 p-2 bg-white dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800 sticky top-24">
              <TabButton tab="lkpd" label="Buat Kegiatan Kelas dan Permainan Kelas" icon={<DocumentTextIcon className="w-5 h-5" />} />
              <TabButton tab="soal" label="Buat Soal" icon={<BookOpenIcon className="w-5 h-5" />} />
              <TabButton tab="materi" label="Buat Materi" icon={<AcademicCapIcon className="w-5 h-5" />} />
              <TabButton tab="gambar" label="Buat Gambar" icon={<PhotoIcon className="w-5 h-5" />} />
              <TabButton tab="edit" label="Edit Gambar" icon={<PencilSquareIcon className="w-5 h-5" />} />
            </nav>
          </aside>
          
          <div className="md:col-span-9 lg:col-span-10">
            {renderContent()}
          </div>
        </div>
      </main>

      <footer className="text-center p-4 mt-8 text-sm text-slate-500 dark:text-slate-400">
        <p>Dibuat Oleh @Bahrul_Hayyun</p>
      </footer>
    </div>
  );
}