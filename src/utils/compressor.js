export async function otimizarImagem(arquivo) {
    // Reduzi para 1024 para salvar a RAM do celular
    const MAX_WIDTH = 1024; 
    
    return new Promise((resolve, reject) => {
        // Se o arquivo for maior que 15MB, o navegador vai travar de qualquer jeito
        if (arquivo.size > 15 * 1024 * 1024) {
            return reject(new Error("A foto é muito grande. Tire fotos com menor resolução no celular."));
        }

        const url = URL.createObjectURL(arquivo);
        const img = new Image();
        
        img.src = url;
        img.onload = () => {
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
            
            const ctx = canvas.getContext('2d', { alpha: false }); // Desativar alpha economiza RAM
            
            try {
                // Configuração para melhorar performance do desenho
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'low'; // 'low' gasta menos memória que 'high'
                
                ctx.drawImage(img, 0, 0, width, height);
                
                // Limpeza agressiva da imagem original
                img.onload = null;
                img.onerror = null;
                img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="; // Esvazia a imagem

                canvas.toBlob((blob) => {
                    // Limpeza total do canvas
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    canvas.width = 0;
                    canvas.height = 0;
                    
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error("Falha no processamento"));
                    }
                }, 'image/jpeg', 0.6); // 0.6 de qualidade reduz muito o peso final sem perder nitidez
            } catch (e) {
                reject(e);
            }
        };

        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(new Error("Erro ao carregar imagem"));
        };
    });
}