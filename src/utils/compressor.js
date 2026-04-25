export async function otimizarImagem(arquivo) {
    const MAX_WIDTH = 1280;
    
    return new Promise((resolve, reject) => {
        // Usar URL.createObjectURL é mais leve para a memória que FileReader.readAsDataURL
        const url = URL.createObjectURL(arquivo);
        const img = new Image();
        
        img.src = url;

        img.onload = () => {
            // Limpa a URL da memória assim que a imagem carrega
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
            
            // Configurações de suavização para melhor qualidade em redimensionamento
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
                // Limpeza manual para ajudar o Garbage Collector do celular
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