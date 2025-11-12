
import React, { useState, useRef } from 'react';
import { editImage, fileToGenerativePart } from '../services/geminiService';
import { PencilSquareIcon, SparklesIcon, ArrowUpTrayIcon, ArrowPathIcon, ArrowDownTrayIcon } from './Icons';

// TypeScript declarations for global libraries
declare global {
    interface Window {
        jspdf: any;
    }
}

export const ImageEditor = () => {
    const [prompt, setPrompt] = useState('');
    const [originalImage, setOriginalImage] = useState<File | null>(null);
    const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
    const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setOriginalImage(file);
            setOriginalImageUrl(URL.createObjectURL(file));
            setEditedImageUrl(null);
            setError(null);
        }
    };

    const handleGenerate = async () => {
        if (!prompt || !originalImage) {
            setError('Gambar dan prompt editan harus diisi.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setEditedImageUrl(null);

        try {
            const imagePart = await fileToGenerativePart(originalImage);
            const url = await editImage(prompt, imagePart);
            setEditedImageUrl(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal mengedit gambar.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleReset = () => {
        setOriginalImage(null);
        setOriginalImageUrl(null);
        setEditedImageUrl(null);
        setPrompt('');
        setError(null);
        if(fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDownloadEditedImage = async (format: 'jpg' | 'png' | 'pdf') => {
        if (!editedImageUrl) return;
        setIsDownloading(true);
        const fileName = `gambar-edit_${prompt.substring(0, 20).replace(/\s/g, '_')}.${format}`;

        try {
            const link = document.createElement('a');
            
            if (format === 'png') {
                link.href = editedImageUrl;
                link.download = fileName;
                link.click();
            } else {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = editedImageUrl;
                img.onload = () => {
                    if (format === 'jpg') {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.fillStyle = "#FFFFFF";
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            ctx.drawImage(img, 0, 0);
                            link.href = canvas.toDataURL('image/jpeg', 0.9);
                            link.download = fileName;
                            link.click();
                        }
                    } else if (format === 'pdf') {
                        const { jsPDF } = window.jspdf;
                        const orientation = img.width > img.height ? 'l' : 'p';
                        const pdf = new jsPDF({
                            orientation,
                            unit: 'px',
                            format: [img.width, img.height]
                        });
                        pdf.addImage(img, 'PNG', 0, 0, img.width, img.height);
                        pdf.save(fileName);
                    }
                };
            }
        } catch (e) {
            console.error("Download failed:", e);
            setError("Gagal mengunduh file.");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-950/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <PencilSquareIcon className="w-6 h-6 text-purple-500" />
                    <h2 className="text-2xl font-bold">Editor Gambar AI</h2>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mb-6">Unggah gambar dan berikan instruksi untuk mengeditnya secara ajaib.</p>

                {!originalImageUrl && (
                    <div
                        className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <ArrowUpTrayIcon className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-2"/>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">Klik untuk mengunggah gambar</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">PNG, JPG, WEBP</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>
                )}
                
                {originalImageUrl && (
                     <div className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                 <h3 className="font-semibold mb-2 text-center text-slate-700 dark:text-slate-300">Gambar Asli</h3>
                                 <img src={originalImageUrl} alt="Original" className="w-full h-auto object-contain rounded-lg bg-slate-100 dark:bg-slate-900" />
                             </div>
                              <div className="flex flex-col justify-center items-center">
                                  {editedImageUrl ? (
                                     <div className='w-full'>
                                         <h3 className="font-semibold mb-2 text-center text-slate-700 dark:text-slate-300">Hasil Edit</h3>
                                         <img src={editedImageUrl} alt="Edited" className="w-full h-auto object-contain rounded-lg bg-slate-100 dark:bg-slate-900" />
                                         <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                                            <h4 className="font-semibold text-center mb-3 text-slate-700 dark:text-slate-300">Unduh Hasil Edit</h4>
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <button onClick={() => handleDownloadEditedImage('jpg')} disabled={isDownloading} className="flex-1 flex items-center justify-center gap-2 bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-sky-700 transition-colors disabled:bg-slate-400 disabled:cursor-wait">
                                                    <ArrowDownTrayIcon className="w-5 h-5" />
                                                    <span>Unduh JPG</span>
                                                </button>
                                                <button onClick={() => handleDownloadEditedImage('png')} disabled={isDownloading} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-slate-400 disabled:cursor-wait">
                                                    <ArrowDownTrayIcon className="w-5 h-5" />
                                                    <span>Unduh PNG</span>
                                                </button>
                                                 <button onClick={() => handleDownloadEditedImage('pdf')} disabled={isDownloading} className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:bg-slate-400 disabled:cursor-wait">
                                                    <ArrowDownTrayIcon className="w-5 h-5" />
                                                    <span>Unduh PDF</span>
                                                </button>
                                            </div>
                                        </div>
                                     </div>
                                  ) : (
                                      <div className="w-full h-full flex justify-center items-center bg-slate-100 dark:bg-slate-900 rounded-lg min-h-[200px]">
                                          {isLoading ? (
                                                <div className="text-center p-6">
                                                    <div className="flex justify-center items-center mb-4">
                                                       <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                                    </div>
                                                    <p className="text-slate-600 dark:text-slate-400">AI sedang mengedit...</p>
                                                </div>
                                          ) : (
                                            <div className="text-center text-slate-500">
                                                <PencilSquareIcon className="w-12 h-12 mx-auto mb-2"/>
                                                <p>Hasil editan akan muncul di sini</p>
                                            </div>
                                          )}
                                      </div>
                                  )}
                              </div>
                         </div>
                         <div>
                             <label htmlFor="edit-prompt" className="font-semibold mb-2 block text-slate-700 dark:text-slate-300">Instruksi Edit</label>
                             <textarea
                                 id="edit-prompt"
                                 value={prompt}
                                 onChange={(e) => setPrompt(e.target.value)}
                                 placeholder="Contoh: Tambahkan filter retro"
                                 rows={2}
                                 className="w-full p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                             />
                         </div>
                         <div className="flex flex-col sm:flex-row gap-2">
                             <button
                                 onClick={handleGenerate}
                                 disabled={isLoading}
                                 className="w-full flex items-center justify-center gap-3 bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors shadow-lg flex-grow"
                             >
                                 <SparklesIcon className="w-5 h-5"/>
                                 <span>{isLoading ? 'Mengedit...' : 'Jalankan Edit'}</span>
                             </button>
                              <button
                                 onClick={handleReset}
                                 disabled={isLoading}
                                 className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold py-3 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                             >
                                <ArrowPathIcon className="w-5 h-5"/>
                                <span>Ganti Gambar</span>
                             </button>
                         </div>
                     </div>
                )}
                 {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
            </div>
        </div>
    );
};
