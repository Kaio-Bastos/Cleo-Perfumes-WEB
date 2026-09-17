import React, { useState, useEffect } from 'react';
import './style/Pedidos.css'; // Pode reaproveitar o estilo se quiser

export default function Pagamentos() {
  const [compras, setCompras] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const [compraModalAberta, setCompraModalAberta] = useState(null);
  
  // Estados para o modal de atualizar/adicionar vencimento da parcela
  const [novoValorParcela, setNovoValorParcela] = useState('');
  const [novaDataVencimento, setNovaDataVencimento] = useState('');

  const API_COMPRAS = 'https://cleuperfumesbackend.onrender.com/api/compras';

  useEffect(() => {
    carregarCompras();
  }, []);
  
  const carregarCompras = async () => {
    try {
      const res = await fetch(API_COMPRAS);
      const data = await res.json();
      if (Array.isArray(data)) {
        setCompras(data);
      }
    } catch (err) {
      console.error("Erro ao carregar compras:", err);
    }
  };

  const compraEstaQuitada = (compra) => {
    if (!compra.pagamentos || compra.pagamentos.length === 0) return false;
    
    const maxParcelas = compra.parcelas ? Number(compra.parcelas) : 1;
    const qtdPagamentos = compra.pagamentos.length;
    const IsBigger = qtdPagamentos >= maxParcelas

    return IsBigger;
  };

  // Extrai a lista única de clientes a partir das compras cadastradas
  const clientesUnicos = [...new Set(
    compras
      .filter(compra => !compraEstaQuitada(compra)) // Remove compras quitadas da conta
      .map(c => c.cliente)
  )].filter(Boolean);

  // Filtra as compras do cliente selecionado no select
  const comprasDoCliente = clienteSelecionado 
    ? compras.filter(c => c.cliente === clienteSelecionado) 
    : [];

  const abrirModalParcela = (compra) => {
    setCompraModalAberta(compra);
    setNovoValorParcela('');
    setNovaDataVencimento('');
  };

  const handleSalvarNovaParcela = async (e) => {
    e.preventDefault();
    if (!compraModalAberta) return;

    // Descobre qual será o próximo número da parcela com base nas que já existem
    const proximaParcela = (compraModalAberta.pagamentos?.length || 0) + 1;

    // Estrutura do Payload exigida pelo back-end
    const novoPagamentoPayload = {
      compra: { id: compraModalAberta.id },
      numeroParcela: proximaParcela,
      valorParcela: Number(novoValorParcela),
      dataVencimento: novaDataVencimento,
      status: "Pendente"
    };

    try {
      const response = await fetch('https://cleuperfumesbackend.onrender.com/api/pagamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoPagamentoPayload),
      });

      if (response.ok) {
        alert("Novo vencimento/parcela adicionado com sucesso!");
        setCompraModalAberta(null);
        setNovoValorParcela('');
        setNovaDataVencimento('');
        carregarCompras(); // Atualiza a listagem na tela
      } else {
        alert("Erro ao salvar o vencimento.");
      }
    } catch (error) {
      console.error("Erro de conexão:", error);
      alert("Erro ao conectar com o servidor.");
    }
  };

  return (
    <div className="admin-container">
      <h2>Calendário e Controle de Pagamentos</h2>

      {/* SELECIONAR CLIENTE */}
      <div className="form-box" style={{ margin: '20px 0' }}>
        <label><strong>Selecione a Cliente para ver as compras:</strong></label>
        <select 
          className="input-text"
          value={clienteSelecionado}
          onChange={(e) => setClienteSelecionado(e.target.value)}
          style={{ marginTop: '8px' }}
        >
          <option value="">{clientesUnicos.length > 0 ? "Escolha o cliente!" : "Nenhum cliente sem pagamentos."}</option>
          {clientesUnicos.map((cliente, index) => (
            
            <option key={index} value={cliente}>{cliente}</option>
          ))}
          {console.log(clientesUnicos)}
        </select>
      </div>

      {/* LISTA DE COMPRAS DA CLIENTE SELECIONADA */}
      {clienteSelecionado && (
        <div className="lista-cards">
          <h3>Compras de {clienteSelecionado}</h3>
          
          {comprasDoCliente.length === 0 ? (
            <p>Nenhuma compra encontrada para esta cliente.</p>
          ) : (
            comprasDoCliente.map((compra) => (
              <div key={compra.id} className="pedido-card" style={{ cursor: 'pointer' }} onClick={() => abrirModalParcela(compra)}>
                <div className="card-header">
                  <span className="pedido-id">Compra #{compra.id}</span>
                  <span className="pedido-data">Total: R$ {compra.valorTotal?.toFixed(2)}</span>
                </div>
                <div className="card-body">
                  <p><strong>Status de Entrega:</strong> {compra.statusEntrega}</p>
                  <p style={{ color: '#666', fontSize: '13px' }}>Clique aqui para gerenciar os vencimentos e parcelas desta compra ➔</p>
                  
                  {/* Prévia rápida das parcelas */}
                  <div style={{ marginTop: '8px' }}>
                    <strong>Parcelas registradas:</strong>
                    {compra.pagamentos && compra.pagamentos.length > 0 ? (
                      <ul style={{ paddingLeft: '15px', fontSize: '13px' }}>
                        {compra.pagamentos.map(p => (
                          <li key={p.id}>Parcela #{p.numeroParcela}: R$ {p.valorParcela?.toFixed(2)} - Venc: {p.dataVencimento} ({p.status})</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ fontSize: '12px', color: '#888' }}>Sem parcelas cadastradas.</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL PARA GERENCIAR VALOR E DATA DE VENCIMENTO */}
      {compraModalAberta && (
        <div className="modal-overlay" onClick={() => setCompraModalAberta(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <button className="modal-fechar" onClick={() => setCompraModalAberta(null)}>✕</button>
            <h3>Gerenciar Vencimento</h3>
            <p>Compra #{compraModalAberta.id} - Cliente: {compraModalAberta.cliente}</p>

            <form onSubmit={handleSalvarNovaParcela} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
              <div>
                <label>Valor da Parcela (R$):</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="input-text" 
                  value={novoValorParcela} 
                  onChange={(e) => setNovoValorParcela(e.target.value)} 
                  placeholder="Ex: 50.00"
                  required 
                />
              </div>

              <div>
                <label>Data do Próximo Vencimento:</label>
                <input 
                  type="date" 
                  className="input-text" 
                  value={novaDataVencimento} 
                  onChange={(e) => setNovaDataVencimento(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button type="submit" className="btn-action-primary" style={{ flex: 1 }}>Salvar Vencimento</button>
                <button type="button" className="btn-action-cancel" onClick={() => setCompraModalAberta(null)} style={{ flex: 1, margin: 0 }}>Fechar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}