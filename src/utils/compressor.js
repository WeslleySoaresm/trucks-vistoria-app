export async function otimizarImagem(arquivo) {
    const MAX_WIDTH = 1280;
    
    return new Promise((resolve, reject) => {
        // Criar URL temporária é mais leve que ler Base64
        const url = URL.createObjectURL(arquivo);
        const img = new Image();
        
        img.src = url;
        img.onload = () => {
            // Libera a imagem original da memória imediatamente
            URL.revokeObjectURL(url);

            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
                // Limpeza física do canvas para liberar RAM no mobile
                canvas.width = 0;
                canvas.height = 0;
                resolve(blob);
            }, 'image/jpeg', 0.7);
        };

        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };
    });
}