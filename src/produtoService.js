const API_URL = 'https://cleuperfumesbackend.onrender.com/api/produtos';

export const listarProdutos = async () => {
  const response = await fetch(API_URL);
  return await response.json();
};

export const salvarProduto = async (produtoData) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(produtoData),
  });
  return await response.json();
};

export const atualizarProduto = async (id, produtoData) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(produtoData),
  });
  return await response.json();
};

export const deletarProduto = async (id) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error("Erro ao deletar");
};