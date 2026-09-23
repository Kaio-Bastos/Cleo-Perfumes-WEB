import { useState, useEffect } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { listarProdutos, deletarProduto, atualizarProduto } from '../produtoService';
import './style/Estoque.css';

export default function Estoque() {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [produtoEditando, setProdutoEditando] = useState(null);
  const [busca, setBusca] = useState('');

  // Estados temporários para adicionar novos lotes dentro da edição
  const [novoQtdLote, setNovoQtdLote] = useState('1');
  const [novoValidadeLote, setNovoValidadeLote] = useState('');

  // Estado para o mini-modal de confirmação quando o lote chegar a 0 (última unidade)
  const [loteParaConfirmarRemocao, setLoteParaConfirmarRemocao] = useState(null);

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
          setBusca(codigo);
          setUsarCameraBusca(false);
          scanner.clear();

          const encontrado = produtos.find(p => p.codigoBarras === codigo);
          if (encontrado) {
            setProdutoEncontradoModal(encontrado);
          } else {
            alert(`Nenhum produto cadastrado com o código: ${codigo}`);
          }
        },
        () => { }
      );
    }

    return () => {
      if (scanner) scanner.clear().catch(() => { });
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

  const formatarDataParaExibicao = (dataStr) => {
    if (!dataStr) return "";
    // Se vier no formato yyyy-mm-dd
    const partes = dataStr.split("-");
    if (partes.length >= 2) {
      return `${partes[1]}/${partes[0]}`;
    }
    return dataStr;
  };

  const handleDeletar = async (id, nome) => {
    if (window.confirm(`Tem certeza que deseja apagar "${nome}"?`)) {
      try {
        await deletarProduto(id);
        setProdutos(produtos.filter(p => p.id !== id));
      } catch (err) {
        alert(err);
      }
    }
  };

  // Funções de manipulação dos lotes dentro da Edição
  const adicionarLoteEdicao = () => {
    if (!novoQtdLote || parseInt(novoQtdLote) <= 0) {
      alert("Informe uma quantidade válida.");
      return;
    }
    if (!novoValidadeLote) {
      alert("Informe a validade do lote.");
      return;
    }

    const loteFormatado = {
      quantidade: parseInt(novoQtdLote, 10),
      validade: `${novoValidadeLote}-01`
    };

    setProdutoEditando(prev => ({
      ...prev,
      lotes: [...(prev.lotes || []), loteFormatado]
    }));

    setNovoQtdLote('1');
    setNovoValidadeLote('');
  };

  const decrementarUnidadeLote = (index) => {
    const lotesAtuais = [...(produtoEditando.lotes || [])];
    const loteAlvo = lotesAtuais[index];

    if (loteAlvo.quantidade <= 1) {
      // Se tem apenas 1 unidade, abre o modal de confirmação para apagar o lote
      setLoteParaConfirmarRemocao(index);
    } else {
      // Se tem mais de 1, apenas subtrai 1 unidade
      loteAlvo.quantidade -= 1;
      setProdutoEditando(prev => ({ ...prev, lotes: lotesAtuais }));
    }
  };

  const AdicionarUnidadeLote = (index) => {
    const lotesAtuais = [...(produtoEditando.lotes || [])];
    const loteAlvo = lotesAtuais[index];

    loteAlvo.quantidade += 1;
    setProdutoEditando(prev => ({ ...prev, lotes: lotesAtuais }));

  };

  const confirmarRemocaoOuZero = (index) => {
    const lotesAtuais = [...(produtoEditando.lotes || [])];
    lotesAtuais.splice(index, 1); // Remove o lote inteiro
    setProdutoEditando(prev => ({ ...prev, lotes: lotesAtuais }));
    setLoteParaConfirmarRemocao(null);
  };

  const handleSalvarEdicao = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nome: produtoEditando.nome,
        valorLiquido: produtoEditando.valorLiquido,
        codigoBarras: produtoEditando.codigoBarras,
        fotoUrl: produtoEditando.fotoUrl,
        lotes: produtoEditando.lotes || []
      };

      await atualizarProduto(produtoEditando.id, payload);
      alert("Produto atualizado com sucesso!");
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

  const OpenEditModal = (produto) => {
    console.log(produto)
    // Garante que o produto editado possua uma lista de lotes estruturada
    let lotesMapeados = produto.lotes;
    if (!lotesMapeados && produto.quantidade !== undefined) {
      lotesMapeados = [{
        quantidade: produto.quantidade,
        validade: produto.validade || "2026-12-01"
      }];
    }
    setProdutoEditando({
      ...produto,
      lotes: lotesMapeados || []
    });
  };

  // Calcula a quantidade total somando todos os lotes em edição
  const quantidadeTotalEdicao = produtoEditando?.lotes?.reduce((acc, l) => acc + (l.quantidade || 0), 0) || 0;

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
            <div style={{ textAlign: 'center', margin: '12px 0' }}>
              {produtoEncontradoModal.fotoUrl && (
                <img src={produtoEncontradoModal.fotoUrl} alt="" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }} />
              )}
              <p><strong>{produtoEncontradoModal.nome}</strong></p>
              <p>EAN: {produtoEncontradoModal.codigoBarras}</p>
              <p>Preço de Venda: R$ {produtoEncontradoModal.valorLiquido?.toFixed(2)}</p>
              <p>Qtd Total: <strong>{produtoEncontradoModal.lotes ? produtoEncontradoModal.lotes.reduce((acc, l) => acc + l.quantidade, 0) : produtoEncontradoModal.quantidade}</strong></p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn-action-primary"
                onClick={() => {
                  OpenEditModal(produtoEncontradoModal);
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

      {/* FORMULÁRIO DE EDIÇÃO COM LOTES */}
      {produtoEditando && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h4>Editar Produto #{produtoEditando.id}</h4>
            {produtoEditando.fotoUrl && <img src={produtoEditando.fotoUrl} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px' }} />}

            <form onSubmit={handleSalvarEdicao} className="cadastro-form" style={{ marginTop: '10px' }}>
              <input
                type="text"
                className="input-text input-nome-produto"
                value={produtoEditando.nome}
                onChange={e => setProdutoEditando({ ...produtoEditando, nome: e.target.value })}
                placeholder="Nome"
                required
              />

              <input
                type="number"
                step="0.01"
                className="input-text input-preco-venda"
                value={produtoEditando.valorLiquido}
                onChange={e => setProdutoEditando({ ...produtoEditando, valorLiquido: parseFloat(e.target.value) })}
                placeholder="Venda (R$)"
              />

              <input
                type="text"
                className="input-text input-codigo-barras"
                value={produtoEditando.codigoBarras || ''}
                onChange={e => setProdutoEditando({ ...produtoEditando, codigoBarras: e.target.value })}
                placeholder="EAN"
              />

              {/* BLOCO DE ADIÇÃO E LISTAGEM DE LOTES NO MODAL */}
              <div style={{ border: '1px dashed #a87b68', padding: '10px', borderRadius: '8px', marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Gerenciar Lotes</span>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#a87b68' }}>Total: {quantidadeTotalEdicao}</span>
                </div>

                <div className="two-columns" style={{ gap: '6px', marginBottom: '8px' }}>
                  <input
                    type="number"
                    value={novoQtdLote}
                    onChange={(e) => setNovoQtdLote(e.target.value)}
                    placeholder="Qtd"
                    className="input-text"
                  />
                  <input
                    type="month"
                    value={novoValidadeLote}
                    onChange={(e) => setNovoValidadeLote(e.target.value)}
                    className="input-text"
                  />
                </div>

                <button
                  type="button"
                  className="btn-action-primary"
                  onClick={adicionarLoteEdicao}
                  style={{ width: '100%', marginBottom: '10px', padding: '6px' }}
                >
                  + Adicionar Lote
                </button>

                {/* Lista de Lotes existentes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {produtoEditando.lotes?.map((lote, index) => (
                    <div className='lote-item' key={index}>
                      <span>Qtd: <strong>{lote.quantidade}</strong> | Val: <strong>{formatarDataParaExibicao(lote.validade?.substring(0, 7))}</strong></span>

                      <div className="lote-acoes">
                        <button
                          className='btn-lote'
                          type="button"
                          onClick={() => decrementarUnidadeLote(index)}
                          title="Remover 1 unidade"
                        >
                          -1
                        </button>
                        <button
                          className='btn-lote'
                          type="button"
                          onClick={() => AdicionarUnidadeLote(index)}
                          title="Adicionar 1 unidade"
                        >
                          +1
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* MINI MODAL DE CONFIRMAÇÃO CASO O LOTE CHEGUE A 0 */}
              {loteParaConfirmarRemocao !== null && (
                <div className="modal-overlay" style={{ zIndex: 9999 }}>
                  <div className="modal-content" style={{ padding: '15px', width: '80%', maxWidth: '300px' }}>
                    <p style={{ fontSize: '14px', marginBottom: '10px' }}>Este lote tem apenas 1 unidade. Deseja remover o lote inteiro?</p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn-action-primary"
                        style={{ padding: '6px', fontSize: '12px', flex: 1 }}
                        onClick={() => confirmarRemocaoOuZero(loteParaConfirmarRemocao)}
                      >
                        Sim, remover
                      </button>
                      <button
                        type="button"
                        className="btn-action-cancel"
                        style={{ padding: '6px', fontSize: '12px', margin: 0, flex: 1 }}
                        onClick={() => setLoteParaConfirmarRemocao(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button type="submit" className="btn-action-primary" style={{ flex: 1 }}>Salvar Alterações</button>
                <button type="button" className="btn-action-cancel" style={{ margin: 0, flex: 1 }} onClick={() => setProdutoEditando(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LISTAGEM DOS PRODUTOS FILTRADOS */}
      {produtosFiltrados.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#888' }}>Nenhum produto encontrado.</p>
      ) : (
        produtosFiltrados.map((p) => {
          // Soma total dos lotes para exibir no card da listagem principal
          const qtdTotalCard = p.lotes ? p.lotes.reduce((acc, l) => acc + (l.quantidade || 0), 0) : (p.quantidade ?? 0);

          // Pega a validade mais próxima para mostrar no card
          const validadeMaisProxima = p.lotes && p.lotes.length > 0
            ? [...p.lotes].sort((a, b) => a.validade.localeCompare(b.validade))[0].validade
            : p.validade;

          return (
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
                  <span>Vencimento: {formatarDataParaExibicao(validadeMaisProxima?.substring(0, 7))}</span>
                  <span className="preco-venda"> Venda: R$ {p.valorLiquido?.toFixed(2)}</span>
                </div>
              </div>

              <div className="qtd-badge">
                <span className="qtd-label">QTD</span>
                <strong className="qtd-valor">{qtdTotalCard}</strong>
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
          );
        })
      )}
    </div>
  );
}