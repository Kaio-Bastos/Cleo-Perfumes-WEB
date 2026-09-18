import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import Webcam from 'react-webcam';
import Tesseract from 'tesseract.js';
import { salvarProduto } from '../produtoService';
import './style/CadastroProduto.css';
import {  handleImagemComprimida  } from '../compressionImage';

export default function CadastroProduto() {
  const estadoInicial = {
    codigo_barras: '',
    nome: '',
    marca: '',
    validade: '',
    valor_compra: '',
    valor_venda: '',
    quantidade: '1'
  };

  const [formState, setFormState] = useState(estadoInicial);
  const [usarCameraCodigo, setUsarCameraCodigo] = useState(false);
  const [fotoLeitura, setFotoLeitura] = useState(null);
  const [fotoOficial, setFotoOficial] = useState(null);
  const [processandoOCR, setProcessandoOCR] = useState(false);
  const [cameraFotosAtiva, setCameraFotosAtiva] = useState(false);
  
  // Novo estado para alternar a câmera (environment = traseira, user = frontal)
  const [facingMode, setFacingMode] = useState('environment');

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
        (codigo) => {
          setFormState(prev => ({ ...prev, codigo_barras: codigo }));
          setUsarCameraCodigo(false);
          scanner.clear();
        },
        () => {}
      );
    }

    return () => {
      if (scanner) scanner.clear().catch(() => {});
    };
  }, [usarCameraCodigo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const alternarCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const capturarFotoParaAI = () => {
    if (webcamRef.current) {
      const screenshot = webcamRef.current.getScreenshot();
      setFotoLeitura(screenshot);
      setCameraFotosAtiva(false);
      executarOCR(screenshot);
    }
  };

  const capturarFotoOficial = async () => {
    if (webcamRef.current) {
      const screenshot = webcamRef.current.getScreenshot();
      console.log("screenshot: "+ screenshot.length)
      const fotoLeve = await handleImagemComprimida(screenshot)
      console.log("fotoLeve: "+ fotoLeve.length )
      setFotoOficial(fotoLeve);
      setCameraFotosAtiva(false);
    }
  };

  const executarOCR = async (imagemBase64) => {
    setProcessandoOCR(true);
    try {
      const { data: { text } } = await Tesseract.recognize(imagemBase64, 'por');
      const textoLimpo = text.trim().replace(/[\r\n]+/g, " ");
      if (textoLimpo) {
        setFormState((prev) => ({ ...prev, nome: textoLimpo }));
      }
    } catch (err) {
      console.error("Erro OCR:", err);
    } finally {
      setProcessandoOCR(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const produtoPayload = {
      codigoBarras: formState.codigo_barras,
      nome: formState.nome,
      fotoUrl: fotoOficial,
      validade: formState.validade ? `${formState.validade}-01` : null,
      valorBruto: 0,
      valorLiquido: parseFloat(formState.valor_venda || 0),
      quantidade: parseInt(formState.quantidade || 0, 10)
    };

    try {
      const produtoSalvo = await salvarProduto(produtoPayload);
      alert(`Produto "${produtoSalvo.nome}" salvo com sucesso!`);

      setFormState(estadoInicial);
      setFotoLeitura(null);
      setFotoOficial(null);
    } catch (error) {
      console.error(error);
      alert("Falha ao salvar produto. Verifique se a API Java está rodando.");
    }
  };

  return (
    <div className="cadastro-container">
      <h2 className="cadastro-title">Novo Produto</h2>

      <form className="cadastro-form" onSubmit={handleSubmit}>
        
        {/* Código de Barras */}
        <div className="form-box">
          <label className="form-label">Código de Barras (EAN)</label>
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
                  🔄 Trocar Câmera
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
                <button type="button" className="btn-cam-ai" onClick={capturarFotoParaAI}>
                  {processandoOCR ? 'Lendo...' : '🔍 Foto p/ Ler Nome'}
                </button>
                <button type="button" className="btn-cam-official" onClick={capturarFotoOficial}>
                  📸 Foto Vitrine
                </button>
              </div>
              <button type="button" className="btn-action-cancel" onClick={() => setCameraFotosAtiva(false)}>
                Cancelar Câmera
              </button>
            </>
          )}

          <div className="previews-status">
            {fotoLeitura && (
              <div className="preview-item">
                <p>Leitura AI</p>
                <img src={fotoLeitura} alt="AI" className="preview-thumb preview-thumb-large" />
              </div>
            )}
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

        {/* Preços: Compra e Venda */}
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

        {/* Quantidade e Validade */}
        <div className="form-box two-columns">
          <div className="field-group">
            <label className="form-label">Quantidade</label>
            <input
              type="number"
              name="quantidade"
              value={formState.quantidade}
              onChange={handleChange}
              placeholder="1"
              className="input-text input-quantidade"
              required
            />
          </div>

          <div className="field-group">
            <label className="form-label">Validade (Mês/Ano)</label>
            <input
              type="month"
              name="validade"
              value={formState.validade}
              onChange={handleChange}
              className="input-text input-validade"
            />
          </div>
        </div>

        <button type="submit" className="btn-submit">
          Salvar no Estoque
        </button>
      </form>
    </div>
  );
}