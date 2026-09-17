import { useState, useEffect } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { listarProdutos, deletarProduto, atualizarProduto } from '../produtoService';
import './style/Estoque.css';

export default function Estoque() {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [produtoEditando, setProdutoEditando] = useState(null);
  const [busca, setBusca] = useState('');
  
  // Novos estados para a leitura por câmera e modal do produto encontrado
  const [usarCameraBusca, setUsarCameraBusca] = useState(false);
  const [produtoEncontradoModal, setProdutoEncontradoModal] = useState(null);

  useEffect(() => {
    carregarEstoque();
  }, []);

  // Configuração do Scanner de Código de Barras na Pesquisa
  useEffect(() => {
    let scanner = null;

    if (usarCameraBusca) {
      scanner = new Html5QrcodeScanner("reader-busca-barras", {
        fps: 15,
        qrbox: { width: 250, height: 120 },
        formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13]
      }, false);

      scanner.render(
        (codigo) => {
          setBusca(codigo); // Preenche o input de busca com o código lido
          setUsarCameraBusca(false);
          scanner.clear();

          // Procura se o produto existe na lista carregada
          const encontrado = produtos.find(p => p.codigoBarras === codigo);
          if (encontrado) {
            setProdutoEncontradoModal(encontrado);
          } else {
            alert(`Nenhum produto cadastrado com o código: ${codigo}`);
          }
        },
        () => {}
      );
    }

    return () => {
      if (scanner) scanner.clear().catch(() => {});
    };
  }, [usarCameraBusca, produtos]);

  const carregarEstoque = async () => {
    try {
      const data = await listarProdutos();
      setProdutos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const handleDeletar = async (id, nome) => {
    if (window.confirm(`Tem certeza que deseja apagar "${nome}"?`)) {
      try {
        await deletarProduto(id);
        setProdutos(produtos.filter(p => p.id !== id));
      } catch (err) {
        alert("Erro ao excluir o produto.");
      }
    }
  };

  const handleSalvarEdicao = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nome: produtoEditando.nome,
        validade: produtoEditando.validade + "-01",
        valorBruto: produtoEditando.valorBruto,
        valorLiquido: produtoEditando.valorLiquido,
        quantidade: produtoEditando.quantidade,
        codigoBarras: produtoEditando.codigoBarras,
        fotoUrl: produtoEditando.fotoUrl
      }
      console.log(payload)
      await atualizarProduto(produtoEditando.id, payload);
      alert("Produto atualizado!");
      setProdutoEditando(null);
      carregarEstoque();
    } catch (err) {
      alert("Erro ao atualizar o produto.");
    }
  };

  const produtosFiltrados = produtos.filter((p) => {
    const termoBusca = busca.toLowerCase();
    const nomeCorresponde = p.nome?.toLowerCase().includes(termoBusca);
    const eanCorresponde = p.codigoBarras?.toLowerCase().includes(termoBusca);
    return nomeCorresponde || eanCorresponde;
  });

  if (carregando) return <p className="estoque-loading">Carregando...</p>;

  const Separar = (data) =>{
    let values = data.split("-");
    let finalData = values[0] +"-" + values[1]
    return finalData
  }

  const OpenEditModal = (produto) =>{
    setProdutoEditando({...produto, validade: Separar(produto.validade)})
  }


  return (
    <div className="estoque-container">
      <h3 className="estoque-title">Produtos em Estoque ({produtosFiltrados.length})</h3>

      {/* CAMPO DE PESQUISA E BOTÃO DE CÂMERA */}
      <div className="form-box" style={{ marginBottom: '16px' }}>
        <input
          type="text"
          className="input-text"
          placeholder="Pesquisar por nome ou código EAN..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        {!usarCameraBusca ? (
          <button
            type="button"
            className="btn-action-primary"
            onClick={() => setUsarCameraBusca(true)}
            style={{ marginTop: '8px' }}
          >
            Escanear Código p/ Buscar
          </button>
        ) : (
          <div style={{ marginTop: '10px' }}>
            <div id="reader-busca-barras" />
            <button
              type="button"
              className="btn-action-cancel"
              onClick={() => setUsarCameraBusca(false)}
              style={{ marginTop: '8px' }}
            >
              Fechar Câmera
            </button>
          </div>
        )}
      </div>

      {/* MODAL DO PRODUTO ENCONTRADO VIA CÂMERA */}
      {produtoEncontradoModal && (
        <div className="modal-overlay" onClick={() => setProdutoEncontradoModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-fechar" onClick={() => setProdutoEncontradoModal(null)}>✕</button>
            <h4>Produto Encontrado</h4>
            {}
            <div style={{ textAlign: 'center', margin: '12px 0' }}>
              {produtoEncontradoModal.fotoUrl && (
                <img src={produtoEncontradoModal.fotoUrl} alt="" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }} />
              )}
              <p><strong>{produtoEncontradoModal.nome}</strong></p>
              <p>EAN: {produtoEncontradoModal.codigoBarras}</p>
              <p>Preço de Venda: R$ {produtoEncontradoModal.valorLiquido?.toFixed(2)}</p>
              <p>Quantidade em Estoque: <strong>{produtoEncontradoModal.quantidade}</strong></p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn-action-primary" 
                onClick={() => {
                  setProdutoEditando(produtoEncontradoModal);
                  setProdutoEncontradoModal(null);
                }}
              >
                Editar Este Produto
              </button>
              <button 
                className="btn-action-cancel" 
                onClick={() => setProdutoEncontradoModal(null)}
                style={{ margin: 0 }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORMULÁRIO DE EDIÇÃO */}
      {produtoEditando && (
        <div className="form-box" style={{ marginBottom: '20px', border: '2px solid #a87b68' }}>
          <h4>Editar Produto #{produtoEditando.id}</h4>
         
          <form onSubmit={handleSalvarEdicao} className="cadastro-form">
            <div className="two-columns">
            <input
              type="text"
              className="input-text input-nome-produto"
              value={produtoEditando.nome}
              onChange={e => setProdutoEditando({ ...produtoEditando, nome: e.target.value })}
              placeholder="Nome"
              required
            />
            <input
              type="month"
              className="input-text input-nome-produto"
              value={produtoEditando.validade}
              onChange={e => setProdutoEditando({ ...produtoEditando, validade: e.target.value })}
              placeholder="Nome"
              required
            />
            </div>
            
            <div className="two-columns">
              <input
                type="number"
                step="0.01"
                className="input-text input-preco-compra"
                value={produtoEditando.valorBruto}
                onChange={e => setProdutoEditando({ ...produtoEditando, valorBruto: parseFloat(e.target.value) })}
                placeholder="Compra (R$)"
              />
              <input
                type="number"
                step="0.01"
                className="input-text input-preco-venda"
                value={produtoEditando.valorLiquido}
                onChange={e => setProdutoEditando({ ...produtoEditando, valorLiquido: parseFloat(e.target.value) })}
                placeholder="Venda (R$)"
              />
            </div>

            <div className="two-columns">
              <input
                type="number"
                className="input-text input-quantidade"
                value={produtoEditando.quantidade}
                onChange={e => setProdutoEditando({ ...produtoEditando, quantidade: parseInt(e.target.value) })}
                placeholder="Quantidade"
              />
              <input
                type="text"
                className="input-text input-codigo-barras"
                value={produtoEditando.codigoBarras || ''}
                onChange={e => setProdutoEditando({ ...produtoEditando, codigoBarras: e.target.value })}
                placeholder="EAN"
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button type="submit" className="btn-action-primary" style={{ flex: 1 }}>Salvar Alterações</button>
              <button type="button" className="btn-action-cancel" style={{ margin: 0, flex: 1 }} onClick={() => setProdutoEditando(null)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* LISTAGEM DOS PRODUTOS FILTRADOS */}
      {produtosFiltrados.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#888' }}>Nenhum produto encontrado.</p>
      ) : (
        produtosFiltrados.map((p) => (
          <div key={p.id} className="card-produto">
            <div className="thumb-container">
              {p.fotoUrl ? (
                <img src={p.fotoUrl} alt={p.nome} className="thumb-img" />
              ) : (
                <span className="thumb-placeholder">Sem foto</span>
              )}
            </div>

            <div className="info-container">
              <strong className="produto-nome">{p.nome}</strong>
              <span className="produto-ean">EAN: {p.codigoBarras || 'N/A'}</span>
              <div className="precos-row">
                <span>Compra: R$ {p.valorBruto?.toFixed(2)}</span>
                <span className="preco-venda"> Venda: R$ {p.valorLiquido?.toFixed(2)}</span>
              </div>
            </div>

            <div className="qtd-badge">
              <span className="qtd-label">QTD</span>
              <strong className="qtd-valor">{p.quantidade ?? 0}</strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginLeft: '8px' }}>
              <button 
                onClick={() => OpenEditModal(p)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
                title="Editar"
              >
                ✏️
              </button>
              <button 
                onClick={() => handleDeletar(p.id, p.nome)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
                title="Excluir"
              >
                🗑️
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}