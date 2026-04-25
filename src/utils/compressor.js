export async function otimizarImagem(arquivo) {
    const MAX_WIDTH = 1280;
    
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(arquivo);
        const img = new Image();
        
        img.src = url;
        img.onload = () => {
            // Liberação imediata da URL de origem
            URL.revokeObjectURL(url);

            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Cálculo de redimensionamento
            if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            
            // Tenta desenhar. Se o celular estiver sem RAM, o try/catch ajuda a não travar tudo
            try {
                ctx.drawImage(img, 0, 0, width, height);
                
                // IMPORTANTE: Limpar o objeto da imagem da memória assim que desenhar no canvas
                img.src = ""; 

                canvas.toBlob((blob) => {
                    // Limpeza absoluta do Canvas para liberar RAM do navegador
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    canvas.width = 0;
                    canvas.height = 0;
                    
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error("Falha ao gerar Blob"));
                    }
                }, 'image/jpeg', 0.7);
            } catch (e) {
                reject(e);
            }
        };

        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };
    });
}