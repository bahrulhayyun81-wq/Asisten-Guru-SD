import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { GroundingChunk, Part } from '../types';

const getGenAI = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API_KEY environment variable is not set.");
    }
    return new GoogleGenAI({ apiKey });
}

export async function generateTextContent(
    topic: string, 
    grade: string, 
    materialTypes: string[], 
    itemCount: number,
    useThinkingMode: boolean,
    sourceMaterial?: { text?: string; filePart?: Part }
): Promise<{ text: string; groundingChunks: GroundingChunk[] | undefined }> {
    const ai = getGenAI();

    const useGoogleSearch = !(sourceMaterial?.text || sourceMaterial?.filePart);
    const modelName = useThinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    
    const config = {
        ...(useThinkingMode && { thinkingConfig: { thinkingBudget: 32768 } }),
        ...(useGoogleSearch && { tools: [{ googleSearch: {} }] }),
    };
    
    let prompt = '';
    const selectedType = materialTypes[0];

    if (["Penjelasan Materi", "Rangkuman", "Studi Kasus"].includes(selectedType)) {
        let taskInstruction = '';
        switch (selectedType) {
            case "Penjelasan Materi":
                taskInstruction = 'Buat penjelasan materi yang lengkap dan mendalam. Fokus hanya pada penjelasan konsep. Jika menggunakan web, sertakan sumber informasinya di bagian akhir. Jangan pernah menambahkan rangkuman, studi kasus, atau soal evaluasi.';
                break;
            case "Rangkuman":
                taskInstruction = 'Buat rangkuman atau daftar poin-poin penting dari materi. Hasilnya harus singkat, padat, dan jelas. Fokus hanya pada inti materi.';
                break;
            case "Studi Kasus":
                taskInstruction = 'Berikan contoh studi kasus atau penerapan materi dalam kehidupan sehari-hari. Jelaskan dengan contoh yang konkret dan mudah dipahami oleh siswa.';
                break;
        }

        const sourceInstruction = useGoogleSearch 
            ? 'Gunakan pengetahuan Anda dan informasi relevan dari web.' 
            : 'Gunakan hanya materi yang saya berikan.';

        prompt = `
Anda adalah asisten AI yang ahli dalam membuat konten pendidikan untuk guru SD di Indonesia.
Tugas Anda: ${taskInstruction}

Spesifikasi Konten:
- Topik: "${topic}"
- Jenjang/Kelas: ${grade}
- Sumber Informasi: ${sourceInstruction}

Aturan Format Output:
- Gunakan format teks biasa (plain text).
- JANGAN gunakan format markdown (seperti tanda bintang '*' untuk tebal atau list).
- Pastikan output bersih dan mudah dibaca.
`;
    } else {
        const sourceInstruction = useGoogleSearch
            ? `berdasarkan topik: "${topic}". Gunakan pengetahuan Anda dan informasi dari web.`
            : `berdasarkan materi yang saya berikan.`;

        if (materialTypes.includes("Kegiatan Kelas")) {
             prompt = `
Anda adalah asisten AI yang ahli dalam merancang kegiatan pembelajaran untuk guru SD di Indonesia.
Tugas Anda: Buatlah "Langkah-langkah Pembelajaran" yang detail dan terstruktur ${sourceInstruction}

Spesifikasi:
- Topik: "${topic}"
- Jenjang/Kelas: ${grade}
- Fokus: Buat urutan kegiatan pembelajaran yang jelas (pendahuluan, kegiatan inti, penutup) yang sesuai dengan topik dan jenjang kelas.

Aturan Format Output:
- Gunakan format teks biasa (plain text).
- JANGAN gunakan format markdown (seperti tanda bintang '*' untuk tebal atau list).
- Pastikan output bersih, terstruktur, dan mudah diikuti.
`;
        } else if (materialTypes.includes("Permainan Kelas")) {
             prompt = `
Anda adalah asisten AI yang kreatif dan ahli dalam merancang permainan edukatif untuk guru SD di Indonesia.
Tugas Anda: Buatlah "Langkah-langkah Permainan Kelas" yang menarik dan menyenangkan ${sourceInstruction}

Spesifikasi:
- Topik: "${topic}"
- Jenjang/Kelas: ${grade}
- Fokus: Rancang sebuah permainan yang relevan dengan materi. Jelaskan tujuan permainan, aturan main, alat/bahan yang dibutuhkan, dan langkah-langkah pelaksanaannya di kelas.

Aturan Format Output:
- Gunakan format teks biasa (plain text).
- JANGAN gunakan format markdown (seperti tanda bintang '*' untuk tebal atau list).
- Pastikan output bersih, terstruktur, dan mudah dipahami.
`;
        } else { // Handles 'Buat Soal'
            const itemUnit = materialTypes.some(type => ["Pilihan Ganda", "Uraian Singkat"].includes(type)) ? 'soal' : 'item';
            const materialTypesString = materialTypes.length > 1
                ? materialTypes.slice(0, -1).join(', ') + ' dan ' + materialTypes.slice(-1)
                : materialTypes[0];

            prompt = `
Anda adalah asisten AI yang ahli dalam membuat materi pendidikan untuk guru di Indonesia.
Tugas Anda adalah membuat "${materialTypesString}" ${sourceInstruction}

Spesifikasi:
- Topik: "${topic}" (gunakan sebagai konteks jika ada materi yang diberikan)
- Jenjang/Kelas: ${grade}
- Jumlah: ${itemCount} ${itemUnit} untuk setiap jenis soal jika digabungkan.

Aturan Format Output:
- Gunakan format teks biasa (plain text).
- JANGAN gunakan format markdown (seperti tanda bintang '*' untuk tebal atau list).
- Jika membuat soal pilihan ganda, sertakan kunci jawabannya di bagian akhir.
`;
        }
    }

    const parts: Part[] = [{ text: prompt }];

    if (sourceMaterial?.text) {
        parts.push({ text: `\n\n--- MATERI SUMBER ---\n${sourceMaterial.text}` });
    } else if (sourceMaterial?.filePart) {
        parts.push(sourceMaterial.filePart);
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: parts }],
        config: config,
    });
    
    let text = response.text;
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (!text) {
        throw new Error("Gagal menghasilkan konten. Coba lagi.");
    }

    // Post-processing to remove any lingering asterisks from all text generation modes
    text = text.replace(/\*/g, ''); 
    
    return { text, groundingChunks };
}

export async function generateImage(prompt: string, aspectRatio: string): Promise<string> {
    const ai = getGenAI();
    
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
        },
    });

    const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (!base64ImageBytes) {
        throw new Error("Gagal membuat gambar. Tidak ada data gambar yang diterima.");
    }

    return `data:image/png;base64,${base64ImageBytes}`;
}

export async function editImage(prompt: string, imagePart: Part): Promise<string> {
    const ai = getGenAI();

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                imagePart,
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const imagePartResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
    if (imagePartResponse?.inlineData) {
        const base64ImageBytes: string = imagePartResponse.inlineData.data;
        return `data:image/png;base64,${base64ImageBytes}`;
    }

    throw new Error("Gagal mengedit gambar. Respons tidak mengandung gambar.");
}


// Helper to convert File to a Gemini Part
export const fileToGenerativePart = async (file: File): Promise<Part> => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};