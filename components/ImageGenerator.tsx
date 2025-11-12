import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';
import { PhotoIcon, SparklesIcon, ArrowDownTrayIcon, ArrowTopRightOnSquareIcon, MagnifyingGlassIcon } from './Icons';

// TypeScript declarations for global libraries
declare global {
    interface Window {
        jspdf: any;
    }
}

type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export const ImageGenerator = () => {
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
    const [isLoading, setIsLoading] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [googleSearchQuery, setGoogleSearchQuery] = useState('');

    const aspectRatios: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];

    const handleGenerate = async () => {
        if (!prompt) {
            setError('Prompt tidak boleh kosong.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setImageUrl(null);

        try {
            const url = await generateImage(prompt, aspectRatio);
            setImageUrl(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal membuat gambar.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDownloadImage = async (format: 'jpg' | 'png' | 'pdf') => {
        if (!imageUrl) return;
        setIsDownloading(true);
        const fileName = `gambar_${prompt.substring(0, 20).replace(/\s/g, '_')}.${format}`;

        try {
            const link = document.createElement('a');
            
            if (format === 'png') {
                link.href = imageUrl;
                link.download = fileName;
                link.click();
            } else {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = imageUrl;
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

    const handleGoogleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!googleSearchQuery.trim()) return;
        const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(googleSearchQuery)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-950/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <PhotoIcon className="w-6 h-6 text-green-500" />
                    <h2 className="text-2xl font-bold">Generator Gambar</h2>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mb-6">Buat gambar untuk materi pembelajaran Anda dari deskripsi teks sederhana.</p>
                
                <div className="flex flex-col gap-4">
                    <div>
                        <label htmlFor="img-prompt" className="font-semibold mb-2 block text-slate-700 dark:text-slate-300">Deskripsi Gambar (Prompt)</label>
                        <textarea
                            id="img-prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Contoh: Seekor katak sedang mengajar di depan kelas yang berisi katak-katak kecil, gaya kartun, penuh warna"
                            rows={3}
                            className="w-full p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                        />
                    </div>

                    <div>
                        <label className="font-semibold mb-2 block text-slate-700 dark:text-slate-300">Aspek Rasio</label>
                        <div className="flex flex-wrap gap-2">
                           {aspectRatios.map(ratio => (
                               <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`px-4 py-2 text-sm font-medium rounded-full transition ${aspectRatio === ratio ? 'bg-green-600 text-white' : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700'}`}>
                                   {ratio}
                               </button>
                           ))}
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="mt-6 w-full flex items-center justify-center gap-3 bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors shadow-lg"
                >
                    {isLoading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Membuat Gambar...</span>
                        </>
                    ) : (
                        <>
                            <SparklesIcon className="w-5 h-5"/>
                            <span>Buat Gambar</span>
                        </>
                    )}
                </button>
                {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
            </div>

            <div className="bg-white dark:bg-slate-950/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-xl font-bold mb-4">Alat Bantu Lainnya</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <a
                        href="https://www.canva.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-3 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold py-3 px-4 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors"
                    >
                        <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                        <span>Desain Lanjutan di Canva</span>
                    </a>
                    <form onSubmit={handleGoogleSearch} className="flex gap-2">
                        <input
                            type="text"
                            value={googleSearchQuery}
                            onChange={(e) => setGoogleSearchQuery(e.target.value)}
                            placeholder="Cari gambar di Google..."
                            className="w-full p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                        <button
                            type="submit"
                            className="flex-shrink-0 flex items-center justify-center bg-blue-600 text-white font-bold p-3 rounded-lg hover:bg-blue-700 transition-colors"
                            aria-label="Cari gambar di Google"
                        >
                            <MagnifyingGlassIcon className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>

            {isLoading && (
                 <div className="text-center p-6 bg-white dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-center items-center mb-4">
                       <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">AI sedang menggambar... Mohon tunggu sebentar.</p>
                </div>
            )}
            
            {imageUrl && (
                <div className="bg-white dark:bg-slate-950/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-xl font-bold mb-4">Hasil Gambar</h3>
                    <div className="flex justify-center items-center bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden">
                        <img src={imageUrl} alt={prompt} className="max-w-full max-h-[60vh] object-contain" />
                    </div>
                     <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <h4 className="font-semibold text-center mb-3 text-slate-700 dark:text-slate-300">Unduh Gambar</h4>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button onClick={() => handleDownloadImage('jpg')} disabled={isDownloading} className="flex-1 flex items-center justify-center gap-2 bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-sky-700 transition-colors disabled:bg-slate-400 disabled:cursor-wait">
                                <ArrowDownTrayIcon className="w-5 h-5" />
                                <span>Unduh JPG</span>
                            </button>
                            <button onClick={() => handleDownloadImage('png')} disabled={isDownloading} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-slate-400 disabled:cursor-wait">
                                <ArrowDownTrayIcon className="w-5 h-5" />
                                <span>Unduh PNG</span>
                            </button>
                             <button onClick={() => handleDownloadImage('pdf')} disabled={isDownloading} className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:bg-slate-400 disabled:cursor-wait">
                                <ArrowDownTrayIcon className="w-5 h-5" />
                                <span>Unduh PDF</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};