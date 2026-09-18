import imageCompression from 'browser-image-compression';

// Função auxiliar para converter Base64 em File
export async function base64ToFile(base64String, filename = 'foto.jpg') {
  const res = await fetch(base64String);
  const buf = await res.arrayBuffer();
  return new File([buf], filename, { type: 'image/jpeg' });
}

// Função principal de compressão
export async function handleImagemComprimida(inputImage) {
  if (!inputImage) return null;

  let arquivo = inputImage;

  // Se for uma string Base64 (vinda da Webcam), converte para File primeiro
  if (typeof inputImage === 'string' && inputImage.startsWith('data:image')) {
    arquivo = await base64ToFile(inputImage);
  }

  const opcoes = {
    maxSizeMB: 0.15,         // Reduz para cerca de 150 KB
    maxWidthOrHeight: 800,   // Limita a resolução máxima
    useWebWorker: true,
  };

  try {
    const arquivoComprimido = await imageCompression(arquivo, opcoes);
    
    // Converte de volta para Base64 para salvar no seu estado atual sem quebrar o layout
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(arquivoComprimido);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  } catch (error) {
    console.error("Erro ao comprimir imagem:", error);
    return inputImage; // Retorna a original se der algum erro
  }
}