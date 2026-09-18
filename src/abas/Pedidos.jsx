import React, { useState, useEffect } from 'react';
import './style/Pedidos.css';

export default function Pedidos() {
  const [compras, setCompras] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [imagemZoom, setImagemZoom] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);

  // Estados para o Modal de Exclusão de Compra
  const [compraParaDeletar, setCompraParaDeletar] = useState(null);

  // Estados do formulário de nova compra
  const [clienteNome, setClienteNome] = useState('');
  const [qtdParcelas, setQtdParcelas] = useState(1);
  const [itensCarrinho, setItensCarrinho] = useState([]);
  
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState('');
  const [quantidadeItem, setQuantidadeItem] = useState(1);

  const API_COMPRAS = 'https://cleuperfumesbackend.onrender.com/api/compras';
  const API_PRODUTOS = 'https://cleuperfumesbackend.onrender.com/api/produtos';

  useEffect(() => {
    carregarCompras();
    carregarProdutos();
  }, []);

  const carregarCompras = async () => {
    try {
      const res = await fetch(API_COMPRAS);
      const data = await res.json();
      setCompras(data);
    } catch (err) {
      console.error("Erro ao carregar compras:", err);
    }
  };

  const carregarProdutos = async () => {
    try {
      const res = await fetch(API_PRODUTOS);
      const data = await res.json();
      setProdutos(data);
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
    }
  };

  const confirmarExclusaoCompra = async () => {
    if (!compraParaDeletar) return;

    try {
      const response = await fetch(`${API_COMPRAS}/${compraParaDeletar.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCompras(compras.filter(c => c.id !== compraParaDeletar.id));
        setCompraParaDeletar(null);
        carregarProdutos(); // Atualiza o estoque caso o back-end estorne
        alert("Compra excluída com sucesso!");
      } else {
        alert("Erro ao excluir a compra.");
      }
    } catch (error) {
      console.error("Erro de conexão ao excluir:", error);
      alert("Falha de conexão com o servidor.");
    }
  };

  const adicionarItemAoCarrinho = () => {
    if (!produtoSelecionadoId) return alert("Selecione um produto.");
    const produtoObj = produtos.find(p => p.id === Number(produtoSelecionadoId));
    if (!produtoObj) return;

    if (produtoObj.quantidade < quantidadeItem) {
      alert(`Estoque insuficiente! Disponível: ${produtoObj.quantidade}`);
      return;
    }

    const novoItem = {
      produto: produtoObj,
      quantidade: Number(quantidadeItem),
      precoUnitario: produtoObj.valorLiquido
    };

    setItensCarrinho([...itensCarrinho, novoItem]);
    setProdutoSelecionadoId('');
    setQuantidadeItem(1);
  };

  const removerItemCarrinho = (index) => {
    setItensCarrinho(itensCarrinho.filter((_, i) => i !== index));
  };

  const calcularValorTotal = () => {
    return itensCarrinho.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);
  };

  const handleSalvarCompra = async (e) => {
    e.preventDefault();
    if (!clienteNome.trim()) return alert("Informe o nome da cliente.");
    if (itensCarrinho.length === 0) return alert("Adicione pelo menos um produto à compra.");

    const novaCompraPayload = {
      cliente: clienteNome,
      parcelas: Number(qtdParcelas),
      valorTotal: calcularValorTotal(),
      itens: itensCarrinho.map(item => ({
        produto: { id: item.produto.id },
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario
      }))
    };

    try {
      const response = await fetch(API_COMPRAS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaCompraPayload),
      });

      if (response.ok) {
        alert("Compra registrada e estoque atualizado com sucesso!");
        setModalAberto(false);
        setClienteNome('');
        setQtdParcelas(1);
        setItensCarrinho([]);
        carregarCompras();
        carregarProdutos();
      } else {
        alert("Erro ao registrar a compra.");
      }
    } catch (error) {
      console.error("Erro de conexão:", error);
    }
  };

  const formatarDataParaExibicao = (dataStr) => {
    if (!dataStr) return "";
    const [ano, mes, dia] = dataStr.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const alterarStatusEntrega = async (compraId, novoStatus) => {
    try {
      const response = await fetch(`${API_COMPRAS}/${compraId}/status-entrega`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusEntrega: novoStatus }),
      });

      if (response.ok) {
        setCompras((prev) =>
          prev.map((c) => (c.id === compraId ? { ...c, statusEntrega: novoStatus } : c))
        );
      }
    } catch (error) {
      console.error("Erro de conexão:", error);
    }
  };

  const alterarStatusParcela = async (pagamentoId, novoStatus) => {
    try {
      const response = await fetch(`https://cleuperfumesbackend.onrender.com/api/pagamentos/${pagamentoId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      });

      if (response.ok) {
        carregarCompras();
      } else {
        alert("Erro ao alterar o status do pagamento.");
      }
    } catch (error) {
      console.error("Erro de conexão:", error);
    }
  };

  return (
    <div className="admin-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Gestão de Compras e Crediário</h2>
        <button 
          className="btn-action-primary" 
          onClick={() => setModalAberto(true)}
          style={{ padding: '10px 16px', cursor: 'pointer' }}
        >
          Nova Compra / Venda
        </button>
      </div>
      
      {/* LISTAGEM DE COMPRAS */}
      <div className="lista-cards">
        {Array.isArray(compras) && compras.length === 0 ? (
          <p>Carregando...</p>
        ) : (
          Array.isArray(compras) && compras.map((compra) => (
            <div key={compra.id} className="pedido-card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="pedido-id">Compra #{compra.id}</span>
                  <span className="pedido-data" style={{ marginLeft: '10px' }}>
                    {compra.dataCompra ? new Date(compra.dataCompra).toLocaleDateString() : ''}
                  </span>
                </div>
                {/* Botão para abrir o Modal de Exclusão */}
                <button 
                  onClick={() => setCompraParaDeletar(compra)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
                  title="Excluir Compra"
                >
                  🗑️
                </button>
              </div>

              <div className="card-body">
                <div className="cliente-info-box">
                  <p><strong>Cliente:</strong> {compra.cliente}</p>
                </div>

                <div className="itens-pedido-box">
                  <strong>Itens Solicitados:</strong>
                  <ul className="lista-itens">
                    {compra.itens && compra.itens.map((item, index) => {
                      const fotoItem = item.produto?.fotoUrl;
                      return (
                        <li key={index} className="item-linha">
                          {fotoItem && (
                            <img 
                              src={fotoItem} 
                              alt="Produto" 
                              className="thumb-img clickable" 
                              onClick={() => setImagemZoom(fotoItem)}
                            />
                          )}
                          <span className="item-descricao">{item.quantidade}x {item.produto?.nome || 'Produto'}</span>
                          <span className="item-sub">R$ {+(item.precoUnitario * item.quantidade).toFixed(2)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="financeiro-box">
                  <p><strong>Valor Total:</strong> R$ {compra.valorTotal?.toFixed(2)}</p>
                  <div style={{ marginTop: '8px' }}>
                    <strong>Parcelas:</strong>
                    {(!compra.pagamentos || compra.pagamentos.length === 0) ? (
                      <p style={{ fontSize: '13px', color: '#888' }}>Nenhuma parcela gerada.</p>
                    ) : (
                      <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', fontSize: '13px' }}>
                        {compra.pagamentos.map((pag) => (
                          <li key={pag.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span><strong>#{pag.id}</strong> - R$ {pag.valorParcela?.toFixed(2)} (Vence dia: {formatarDataParaExibicao(pag.dataVencimento)})</span>
                            
                            <div>
                              <span className={`badge ${pag.status === 'Pago' ? 'badge-verde' : 'badge-amarelo'}`} style={{ marginRight: '6px' }}>
                                {pag.status}
                              </span>
                              {pag.status !== 'Pago' ? (
                                <button 
                                  onClick={() => alterarStatusParcela(pag.id, "Pago")}
                                  style={{ fontSize: '11px', padding: '2px 6px', background: '#27AE60', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                  Dar Baixa
                                </button>
                              ) : (
                                <button 
                                  onClick={() => alterarStatusParcela(pag.id, "Pendente")}
                                  style={{ fontSize: '11px', padding: '2px 6px', background: '#ff0000', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="entrega-box">
                  <label><strong>Status:</strong></label>
                  <select 
                    value={compra.statusEntrega || 'Pendente'}
                    onChange={(e) => alterarStatusEntrega(compra.id, e.target.value)}
                    className="select-status"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Em Separação">Em Separação</option>
                    <option value="Enviado">Enviado</option>
                    <option value="Entregue">Entregue</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DA COMPRA */}
      {compraParaDeletar && (
        <div className="modal-overlay" onClick={() => setCompraParaDeletar(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', width: '100%', flexDirection: 'column', textAlign: 'center', gap: '15px' }}>
            <button className="modal-fechar" onClick={() => setCompraParaDeletar(null)}>✕</button>
            <h3 style={{ color: '#C0392B' }}>Excluir Compra #{compraParaDeletar.id}</h3>
            <p style={{ fontSize: '14px', color: '#4A3728' }}>
              Tem certeza que deseja apagar a compra da cliente <strong>{compraParaDeletar.cliente}</strong> no valor de <strong>R$ {compraParaDeletar.valorTotal?.toFixed(2)}</strong>?
            </p>
            <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '10px' }}>
              <button 
                type="button" 
                onClick={confirmarExclusaoCompra} 
                style={{ flex: 1, padding: '10px', background: '#C0392B', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Sim, Excluir
              </button>
              <button 
                type="button" 
                onClick={() => setCompraParaDeletar(null)} 
                style={{ flex: 1, padding: '10px', background: '#E2D8D2', color: '#4A3728', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE NOVA COMPRA */}
      {modalAberto && (
        <div className="modal-overlay" onClick={() => setModalAberto(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '100%', flexDirection: 'column', alignItems: 'stretch' }}>
            <button className="modal-fechar" onClick={() => setModalAberto(false)}>✕</button>
            <h3>Registrar Nova Compra</h3>

            <form onSubmit={handleSalvarCompra} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
              <div>
                <label>Nome da Cliente:</label>
                <input 
                  type="text" 
                  className="input-text" 
                  value={clienteNome} 
                  onChange={(e) => setClienteNome(e.target.value)} 
                  placeholder="Ex: Maria Silva"
                  required 
                />
              </div>

              <div>
                <label>Número de Parcelas:</label>
                <input 
                  type="number" 
                  className="input-text" 
                  min="1" 
                  max="12" 
                  value={qtdParcelas} 
                  onChange={(e) => setQtdParcelas(e.target.value)} 
                  required 
                />
              </div>

              <hr />

              <h4>Adicionar Produtos</h4>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select 
                  className="input-text" 
                  value={produtoSelecionadoId} 
                  onChange={(e) => setProdutoSelecionadoId(e.target.value)}
                  style={{ flex: 2 }}
                >
                  <option value="">Selecione um produto...</option>
                  {produtos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome} (Estoque: {p.quantidade} | R$ {p.valorLiquido})
                    </option>
                  ))}
                </select>

                <input 
                  type="number" 
                  className="input-text" 
                  min="1" 
                  value={quantidadeItem} 
                  onChange={(e) => setQuantidadeItem(e.target.value)} 
                  style={{ width: '70px' }}
                />

                <button type="button" onClick={adicionarItemAoCarrinho} className="btn-action-primary" style={{ padding: '0 12px' }}>+</button>
              </div>

              <ul style={{ maxHeight: '120px', overflowY: 'auto', paddingLeft: '15px', margin: '0' }}>
                {itensCarrinho.map((item, index) => (
                  <li key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                    <span>{item.quantidade}x {item.produto.nome} (R$ {item.precoUnitario})</span>
                    <button type="button" onClick={() => removerItemCarrinho(index)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>Remover</button>
                  </li>
                ))}
              </ul>

              <p><strong>Total Geral:</strong> R$ {calcularValorTotal().toFixed(2)}</p>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button type="submit" className="btn-action-primary" style={{ flex: 1 }}>Salvar Compra</button>
                <button type="button" className="btn-action-cancel" onClick={() => setModalAberto(false)} style={{ flex: 1, margin: 0 }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ZOOM DA IMAGEM */}
      {imagemZoom && (
        <div className="modal-overlay" onClick={() => setImagemZoom(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-fechar" onClick={() => setImagemZoom(null)}>✕</button>
            <img src={imagemZoom} alt="Ampliada" className="modal-img-ampliada" />
          </div>
        </div>
      )}
    </div>
  );
}