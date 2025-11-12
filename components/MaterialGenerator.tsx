

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { generateTextContent, fileToGenerativePart } from '../services/geminiService';
import { GroundingChunk, Part } from '../types';
import { SparklesIcon, DocumentTextIcon, LinkIcon, ClipboardIcon, CheckIcon, DocumentArrowDownIcon, ArrowUpTrayIcon, XCircleIcon, BookOpenIcon, AcademicCapIcon } from './Icons';

// TypeScript declarations for global libraries
declare global {
    interface Window {
        jspdf: any;
        html2canvas: any;
    }
}

type MaterialType = "Kegiatan Kelas" | "Pilihan Ganda" | "Uraian Singkat" | "Penjelasan Panjang" | "Permainan Kelas" | "Penjelasan Materi" | "Rangkuman" | "Studi Kasus";
type GeneratorMode = 'lkpd' | 'soal' | 'materi';

const getDefaultSelectedTypes = (mode: GeneratorMode): MaterialType[] => {
    switch (mode) {
        case 'lkpd': return ['Kegiatan Kelas'];
        case 'soal': return ['Pilihan Ganda'];
        case 'materi': return ['Penjelasan Materi'];
    }
}

export const MaterialGenerator = ({ mode }: { mode: GeneratorMode }) => {
    const gradeLevels = ['SD Kelas 1', 'SD Kelas 2', 'SD Kelas 3', 'SD Kelas 4', 'SD Kelas 5', 'SD Kelas 6'];
    
    const [topic, setTopic] = useState('');
    const [grade, setGrade] = useState('SD Kelas 4');
    const [selectedTypes, setSelectedTypes] = useState<MaterialType[]>(getDefaultSelectedTypes(mode));
    const [itemCount, setItemCount] = useState(5);
    const [useThinkingMode, setUseThinkingMode] = useState(false);
    const [sourceText, setSourceText] = useState('');
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    
    const [isLoading, setIsLoading] = useState(false);
    const [generatedContent, setGeneratedContent] = useState('');
    const [sources, setSources] = useState<GroundingChunk[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [isDownloading, setIsDownloading] = useState<'doc' | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTopic('');
        setGrade('SD Kelas 4');
        setSelectedTypes(getDefaultSelectedTypes(mode));
        setItemCount(5);
        setUseThinkingMode(false);
        setSourceText('');
        setSourceFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsLoading(false);
        setGeneratedContent('');
        setSources([]);
        setError(null);
        setIsCopied(false);
        setIsDownloading(null);
    }, [mode]);

    const handleSourceTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setSourceText(e.target.value);
        if (sourceFile) {
            setSourceFile(null);
            if(fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSourceFile(file);
            setSourceText('');
        }
    };

    const clearSourceFile = () => {
        setSourceFile(null);
        if(fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleGenerate = useCallback(async () => {
        if (!topic) {
            setError('Topik tidak boleh kosong.');
            return;
        }
         if (selectedTypes.length === 0) {
            setError('Pilih setidaknya satu jenis asesmen/materi.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedContent('');
        setSources([]);

        let sourceMaterial: { text?: string; filePart?: Part } = {};
        if (sourceText) {
            sourceMaterial.text = sourceText;
        } else if (sourceFile) {
            try {
                sourceMaterial.filePart = await fileToGenerativePart(sourceFile);
            } catch (err) {
                setError('Gagal memproses file. Coba file lain.');
                setIsLoading(false);
                return;
            }
        }

        try {
            const { text, groundingChunks } = await generateTextContent(topic, grade, selectedTypes, itemCount, useThinkingMode, sourceMaterial);
            setGeneratedContent(text);
            if (groundingChunks) {
                setSources(groundingChunks.filter(chunk => chunk.web));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui');
        } finally {
            setIsLoading(false);
        }
    }, [topic, grade, selectedTypes, itemCount, useThinkingMode, sourceText, sourceFile]);

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedContent);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleDownload = async (format: 'doc') => {
        const fileName = `${selectedTypes.join('_').replace(' ', '_')}_${topic.substring(0, 20)}.doc`;
        setIsDownloading(format);
        try {
            if (format === 'doc') {
                const contentHtml = `<div style="font-family: Arial, sans-serif;">${generatedContent.replace(/\n/g, '<br />')}</div>`;
                const html = `<!DOCTYPE html><html><head><meta charset='utf-8'></head><body>${contentHtml}</body></html>`;
                const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
        } catch(e) {
            console.error("Download failed:", e);
            setError("Gagal mengunduh file.");
        } finally {
            setIsDownloading(null);
        }
    };
    
    const lkpdOptions: MaterialType[] = useMemo(() => ["Kegiatan Kelas", "Permainan Kelas"], []);
    const soalOptions: MaterialType[] = useMemo(() => ["Pilihan Ganda", "Uraian Singkat", "Penjelasan Panjang"], []);
    const materiOptions: MaterialType[] = useMemo(() => ["Penjelasan Materi", "Rangkuman", "Studi Kasus"], []);

    const handleTypeClick = (type: MaterialType) => {
        if (mode === 'soal') {
            // Multi choice for Soal mode
            setSelectedTypes(prev => {
                const newSelection = prev.includes(type)
                    ? prev.filter(t => t !== type)
                    : [...prev, type];
                // Ensure at least one is selected, but not enforced to keep UX simple
                return newSelection.length > 0 ? newSelection : prev;
            });
        } else {
            // Single choice for LKPD and Materi mode
            setSelectedTypes([type]);
        }
    };

    const { icon, title, description, options: currentOptions, typeLabel, buttonLabel } = useMemo(() => {
        switch (mode) {
            case 'lkpd':
                return {
                    icon: <DocumentTextIcon className="w-6 h-6 text-blue-500" />,
                    title: 'Generator Kegiatan Kelas & Permainan',
                    description: 'Buat Kegiatan Kelas atau permainan kelas yang sesuai dengan topik pembelajaran Anda.',
                    options: lkpdOptions,
                    typeLabel: 'Pilihan Kegiatan',
                    buttonLabel: 'Buat Kegiatan Kelas & Permainan'
                };
            case 'soal':
                 return {
                    icon: <BookOpenIcon className="w-6 h-6 text-blue-500" />,
                    title: 'Generator Soal Asesmen',
                    description: 'Buat berbagai jenis soal asesmen. Anda bisa menggabungkan beberapa jenis soal sekaligus.',
                    options: soalOptions,
                    typeLabel: 'Pilihan Asesmen',
                    buttonLabel: 'Buat Soal'
                };
            case 'materi':
                 return {
                    icon: <AcademicCapIcon className="w-6 h-6 text-blue-500" />,
                    title: 'Generator Materi Ajar',
                    description: 'Buat penjelasan, rangkuman, atau studi kasus untuk topik pembelajaran Anda.',
                    options: materiOptions,
                    typeLabel: 'Jenis Materi',
                    buttonLabel: 'Buat Materi'
                };
        }
    }, [mode, lkpdOptions, soalOptions, materiOptions]);

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-950/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    {icon}
                    <h2 className="text-2xl font-bold">{title}</h2>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mb-6">{description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col">
                        <label htmlFor="topic" className="font-semibold mb-2 text-slate-700 dark:text-slate-300">Topik Materi</label>
                        <input
                            id="topic"
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Contoh: Siklus air dan dampaknya"
                            className="w-full p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label htmlFor="grade" className="font-semibold mb-2 text-slate-700 dark:text-slate-300">Jenjang/Kelas</label>
                        <select
                            id="grade"
                            value={grade}
                            onChange={(e) => setGrade(e.target.value)}
                            className="w-full p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        >
                            {gradeLevels.map(level => (
                                <option key={level} value={level}>{level}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mt-4">
                    <label className="font-semibold mb-2 block text-slate-700 dark:text-slate-300">Sumber Materi (Opsional)</label>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                        Tempel atau unggah materi untuk hasil yang lebih sesuai. Jika kosong, AI akan mencari dari web.
                    </p>
                    <textarea
                        value={sourceText}
                        onChange={handleSourceTextChange}
                        placeholder="Tempel materi dari sumber lain di sini..."
                        rows={5}
                        className="w-full p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                    <div className="flex items-center my-2">
                        <div className="flex-grow border-t border-slate-300 dark:border-slate-700"></div>
                        <span className="flex-shrink mx-2 text-slate-400 dark:text-slate-500 text-sm">ATAU</span>
                        <div className="flex-grow border-t border-slate-300 dark:border-slate-700"></div>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".txt,.pdf,.doc,.docx"
                    />
                    {!sourceFile ? (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition"
                        >
                            <ArrowUpTrayIcon className="w-5 h-5" />
                            <span>Unggah File Materi (.txt, .pdf, .docx)</span>
                        </button>
                    ) : (
                        <div className="w-full flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg">
                            <span className="text-sm font-medium truncate">{sourceFile.name}</span>
                            <button onClick={clearSourceFile} className="ml-2 text-slate-400 hover:text-red-500 transition">
                                <XCircleIcon className="w-6 h-6" />
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-6 mb-6">
                    <label className="font-semibold mb-2 block text-slate-700 dark:text-slate-300">{typeLabel}</label>
                    <div className="flex flex-wrap gap-2">
                        {currentOptions.map(type => (
                            <button key={type} onClick={() => handleTypeClick(type)} className={`px-4 py-2 text-sm font-medium rounded-full transition ${selectedTypes.includes(type) ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700'}`}>
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={`flex flex-col sm:flex-row sm:items-center ${mode === 'soal' ? 'sm:justify-between' : 'sm:justify-end'} gap-4 mt-6`}>
                    {mode === 'soal' && (
                        <div className="flex items-center gap-3">
                            <label htmlFor="itemCount" className="font-semibold text-slate-700 dark:text-slate-300">Jumlah Item:</label>
                            <input id="itemCount" type="number" value={itemCount} onChange={(e) => setItemCount(Number(e.target.value))} min="1" max="20" className="w-20 p-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"/>
                        </div>
                    )}
                    <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/50 p-3 rounded-lg">
                        <label htmlFor="thinking-mode" className="font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5"/>
                            Thinking Mode
                        </label>
                        <div className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="thinking-mode" className="sr-only peer" checked={useThinkingMode} onChange={(e) => setUseThinkingMode(e.target.checked)} />
                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="mt-6 w-full flex items-center justify-center gap-3 bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors shadow-lg"
                >
                    {isLoading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Memproses...</span>
                        </>
                    ) : (
                        <>
                            <SparklesIcon className="w-5 h-5"/>
                            <span>{buttonLabel}</span>
                        </>
                    )}
                </button>
                {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
            </div>

            {generatedContent && (
                <div className="bg-white dark:bg-slate-950/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
                    <button onClick={handleCopy} className="absolute top-4 right-4 p-2 bg-slate-200 dark:bg-slate-800 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition no-print">
                       {isCopied ? <CheckIcon className="w-5 h-5 text-green-500" /> : <ClipboardIcon className="w-5 h-5" />}
                    </button>
                    <div className="printable-area">
                        <h3 className="text-xl font-bold mb-4">Hasil Generasi</h3>
                        <pre className="whitespace-pre-wrap font-sans bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg text-sm md:text-base leading-relaxed">{generatedContent}</pre>
                    </div>
                
                    {sources.length > 0 && (
                        <div className="mt-6">
                            <h4 className="font-semibold text-lg mb-2 flex items-center gap-2"><LinkIcon className="w-5 h-5"/> Sumber Informasi</h4>
                            <ul className="space-y-2 text-sm">
                                {sources.map((source, index) => (
                                    <li key={index}>
                                        <a href={source.web?.uri} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">
                                            {index + 1}. {source.web?.title || source.web?.uri}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 no-print">
                         <button onClick={() => handleDownload('doc')} disabled={!!isDownloading} className="flex-1 flex items-center justify-center gap-2 bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-sky-700 transition-colors disabled:bg-slate-400 disabled:cursor-wait">
                            <DocumentArrowDownIcon className="w-5 h-5" />
                            {isDownloading === 'doc' ? 'Mempersiapkan...' : 'Unduh DOC'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};