import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import Webcam from 'react-webcam';
import Tesseract from 'tesseract.js';
import { salvarProduto, listarProdutos } from '../produtoService';
import './style/CadastroProduto.css';
import { handleImagemComprimida } from '../compressionImage';

export default function CadastroProduto() {
  const estadoInicial = {
    codigo_barras: '',
    nome: '',
    valor_venda: ''
  };

  const [formState, setFormState] = useState(estadoInicial);
  
  // Novos estados para gerenciar a lista de lotes
  const [lotes, setLotes] = useState([]);
  const [novoQtd, setNovoQtd] = useState('1');
  const [novoValidade, setNovoValidade] = useState('');

  const [usarCameraCodigo, setUsarCameraCodigo] = useState(false);
  const [fotoOficial, setFotoOficial] = useState(null);
  const [cameraFotosAtiva, setCameraFotosAtiva] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');

  // Verificar se o produto já existe no banco
  const [codigoVerificado, setCodigoVerificado] = useState(null);
  const [openVerifiedModal, setVerificadoModal] = useState(false);
  const [tituloModal, setTitutoModal] = useState("");
  const [contentModal, setContentModal] = useState("");
  const [codModal, setCodModal] = useState("");

  const [carregando, setCarregando] = useState(false);
  const webcamRef = useRef(null);

  useEffect(() => {
    let scanner = null;

    if (usarCameraCodigo) {
      scanner = new Html5QrcodeScanner("reader-barras", {
        fps: 15,
        qrbox: { width: 250, height: 120 },
        formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13]
      }, false);

      scanner.render(
        async (codigo) => {
          const resposta = await VerificarCodigos(codigo);
          if (resposta == true) {
            setCodigoVerificado(true);
            abrirModal("Produto já cadastrado.", "O código de barras informado já existe na plataforma.", codigo);
            setUsarCameraCodigo(false);
            localStorage.setItem('produtoParaEditarEAN', codigo);
          } else {  
            setCodigoVerificado(false);
            setVerificadoModal(false);
            setFormState(prev => ({ ...prev, codigo_barras: codigo }));
            setUsarCameraCodigo(false);
            scanner.clear();
          }
        },
        () => { }
      );
    }

    return () => {
      if (scanner) scanner.clear().catch(() => { });
    };
  }, [usarCameraCodigo]);

  const fecharModal = () => {
    setVerificadoModal(false);
    setCodigoVerificado(null);
    setTitutoModal("");
    setContentModal("");
    setCodModal("");
  };

  const abrirModal = (titu, desc, cod) => {
    setTitutoModal(titu);
    setContentModal(desc);
    setCodModal(String(cod));
    setVerificadoModal(true);
  };

  const VerificarCodigos = async (cod) => {
    if (cod === null) return false;
    const response = await listarProdutos();
    const encontrado = response?.find(r => String(r.codigoBarras) === String(cod));
    return encontrado != null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const alternarCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const capturarFotoOficial = async () => {
    if (webcamRef.current) {
      const screenshot = webcamRef.current.getScreenshot();
      const fotoLeve = await handleImagemComprimida(screenshot);
      setFotoOficial(fotoLeve);
      setCameraFotosAtiva(false);
    }
  };

  // Funções para gerenciar os lotes dinâmicos
  const adicionarLote = () => {
    if (!novoQtd || parseInt(novoQtd) <= 0) {
      alert("Informe uma quantidade válida.");
      return;
    }
    if (!novoValidade) {
      alert("Informe a data de validade do lote.");
      return;
    }

    setLotes(prev => [...prev, { quantidade: parseInt(novoQtd, 10), validade: novoValidade }]);
    setNovoQtd('1');
    setNovoValidade('');
  };

  const removerLote = (index) => {
    setLotes(prev => prev.filter((_, i) => i !== index));
  };

  // Soma total calculada dinamicamente de todos os lotes
  const quantidadeTotalGeral = lotes.reduce((acc, item) => acc + item.quantidade, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (lotes.length === 0) {
      alert("Adicione pelo menos um lote com quantidade e validade!");
      return;
    }

    const produtoPayload = {
      codigoBarras: formState.codigo_barras,
      nome: formState.nome,
      fotoUrl: fotoOficial,
      valorBruto: 0,
      valorLiquido: parseFloat(formState.valor_venda || 0),
      lotes: lotes.map(l => ({
        quantidade: l.quantidade,
        validade: `${l.validade}-01` // Padroniza para o dia 01 do mês
      }))
    };

    try {
      setCarregando(true);
      const produtoSalvo = await salvarProduto(produtoPayload);
      setCarregando(false);
      abrirModal("Produto Publicado!", `Produto "${produtoSalvo.nome}" salvo com sucesso!`, produtoSalvo.codigoBarras);

      setFormState(estadoInicial);
      setLotes([]);
      setFotoOficial(null);
    } catch (error) {
      console.error(error);
      setCarregando(false);
      abrirModal("Falha ao salvar produto.", "Verifique se a API Java está rodando.");
    }
  };

  return (
    <div className="cadastro-container">
      <h2 className="cadastro-title">Novo Produto</h2>

      <form className="cadastro-form" onSubmit={handleSubmit}>

        {/* Código de Barras */}
        <div className="form-box">
          <label className="form-label">Código de Barras (EAN)</label>
          {codigoVerificado === null ? null : codigoVerificado ? (
            <label className="form-label-res-n">Produto já registrado</label>
          ) : (
            <label className="form-label-res-y">Produto não registrado</label>
          )}

          <div className="input-row">
            <input
              type="text"
              name="codigo_barras"
              value={formState.codigo_barras}
              onChange={handleChange}
              placeholder="Digite ou escaneie o código"
              className="input-text input-codigo-barras"
            />
          </div>

          {!usarCameraCodigo ? (
            <button
              type="button"
              className="btn-action-primary"
              onClick={() => setUsarCameraCodigo(true)}
              style={{ marginTop: '8px' }}
            >
              Ler Código pela Câmera
            </button>
          ) : (
            <div>
              <div id="reader-barras" style={{ marginTop: '10px' }} />
              <button
                type="button"
                className="btn-action-cancel"
                onClick={() => setUsarCameraCodigo(false)}
              >
                Cancelar Câmera de Barras
              </button>
            </div>
          )}
        </div>

        {openVerifiedModal && (
          <div className='modal-overlay'>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>{tituloModal}</h3>
              {codModal !== "" && <p>EAN: {codModal}</p>}
              <p>{contentModal}</p>
              <button className="modal-btn" onClick={() => fecharModal()}>FECHAR</button>
            </div>
          </div>
        )}

        {/* Fotos do Produto */}
        <div className="form-box webcam-box">
          <label className="form-label">Fotos do Produto</label>
          {!cameraFotosAtiva ? (
            <button
              type="button"
              className="btn-action-primary"
              onClick={() => setCameraFotosAtiva(true)}
            >
              Abrir Câmera para Fotos
            </button>
          ) : (
            <>
              <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>
                  Câmera: {facingMode === 'environment' ? 'Traseira' : 'Frontal'}
                </span>
                <button
                  type="button"
                  onClick={alternarCamera}
                  style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}
                >
                  Trocar Câmera
                </button>
              </div>

              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: facingMode }}
                className="webcam-stream"
              />
              <div className="webcam-actions">
                <button type="button" className="btn-cam-official" onClick={capturarFotoOficial}>
                  Foto Vitrine
                </button>
              </div>
              <button type="button" className="btn-action-cancel" onClick={() => setCameraFotosAtiva(false)}>
                Cancelar Câmera
              </button>
            </>
          )}

          <div className="previews-status">
            {fotoOficial && (
              <div className="preview-item">
                <p>Foto Vitrine</p>
                <img src={fotoOficial} alt="Vitrine" className="preview-thumb preview-thumb-large" />
              </div>
            )}
          </div>
        </div>

        {/* Nome do Produto */}
        <div className="form-box">
          <label className="form-label">Nome do Produto</label>
          <input
            type="text"
            name="nome"
            value={formState.nome}
            onChange={handleChange}
            placeholder="Ex: Kaiak Natura 100ml"
            className="input-text input-nome-produto"
            required
          />
        </div>

        {/* Preço de Venda */}
        <div className="form-box two-columns">
          <div className="field-group">
            <label className="form-label">Preço Venda (R$)</label>
            <input
              type="number"
              step="0.01"
              name="valor_venda"
              value={formState.valor_venda}
              onChange={handleChange}
              placeholder="Venda"
              className="input-text input-preco-venda"
              required
            />
          </div>
        </div>

        {/* GERENCIAMENTO DE LOTES */}
        <div className="form-box" style={{ border: '1px dashed #a87b68', padding: '12px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label className="form-label" style={{ margin: 0 }}>Gerenciar Lotes e Validades</label>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#a87b68' }}>
              Total: {quantidadeTotalGeral}
            </span>
          </div>

          <div className="two-columns" style={{ gap: '8px', marginBottom: '10px' }}>
            <input
              type="number"
              value={novoQtd}
              onChange={(e) => setNovoQtd(e.target.value)}
              placeholder="Qtd"
              className="input-text input-quantidade"
            />
            <input
              type="month"
              value={novoValidade}
              onChange={(e) => setNovoValidade(e.target.value)}
              className="input-text input-validade"
            />
          </div>

          <button
            type="button"
            className="btn-action-primary"
            onClick={adicionarLote}
            style={{ width: '100%', marginBottom: '12px' }}
          >
            + Adicionar Lote
          </button>

          {/* Lista de lotes adicionados */}
          {lotes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {lotes.map((lote, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9f6f0', padding: '8px', borderRadius: '6px', fontSize: '14px' }}>
                  <span>Qtd: <strong>{lote.quantidade}</strong> | Validade: <strong>{lote.validade}</strong></span>
                  <button
                    type="button"
                    onClick={() => removerLote(index)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b' }}
                    title="Remover lote"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" className="btn-submit" disabled={carregando}>
          {!carregando ? "Salvar no Estoque" : "Carregando..."}
        </button>
      </form>
    </div>
  );
}