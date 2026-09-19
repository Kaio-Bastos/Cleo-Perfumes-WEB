import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import Webcam from 'react-webcam';
import Tesseract from 'tesseract.js';
import { salvarProduto, listarProdutos } from '../produtoService';
import './style/CadastroProduto.css';
import { handleImagemComprimida } from '../compressionImage';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';

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
  const [facingMode, setFacingMode] = useState('environment');

  //Verificar se o produto já existe no banco
  const [codigoVerificado, setCodigoVerificado] = useState(null);
  const [openVerifiedModal, setVerificadoModal] = useState(false);
  const [tituloModal, setTitutoModal] = useState("");
  const [contentModal, setContentModal] = useState("");
  const [codModal, setCodModal] = useState("");

  const videoRefProdutos = useRef(null);

  const [carregando, setCarregando] = useState(false)

  const webcamRef = useRef(null);

  useEffect(() => {
  if (!usarCameraCodigo) return;

  // Configurações focadas apenas em códigos de barras de produtos comerciais (EAN_13)
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]);
  hints.set(DecodeHintType.TRY_HARDER, true);

  const codeReader = new BrowserMultiFormatReader(hints);

  codeReader.decodeFromVideoDevice(
    null, // Usa a câmera padrão/ativa do sistema
    videoRefProdutos.current,
    async (result, err) => {
      if (result) {
        const codigo = result.getText();
        console.log("Código EAN_13 detectado:", codigo);

        // Interrompe imediatamente o leitor para evitar chamadas duplicadas à API enquanto processa
        codeReader.reset();

        try {
          const resposta = await VerificarCodigos(codigo);
          
          if (resposta === true) {
            setCodigoVerificado(true);
            abrirModal("Produto já cadastrado.", "O código de barras informado já existe na plataforma.", codigo);
            setUsarCameraCodigo(false);
            localStorage.setItem('produtoParaEditarEAN', codigo);
          } else {
            setCodigoVerificado(false);
            setVerificadoModal(false);
            setFormState(prev => ({ ...prev, codigo_barras: codigo }));
            setUsarCameraCodigo(false);
          }
        } catch (apiError) {
          console.error("Erro ao verificar código:", apiError);
          // Opcional: Trate erros de rede aqui, reativando a câmera se necessário
        }
      }
    }
  ).catch((err) => console.error("Erro ao iniciar câmera de produtos:", err));

  // Cleanup: Desliga a câmera perfeitamente ao fechar ou trocar de rota
  return () => {
    codeReader.reset();
  };
}, [usarCameraCodigo]);

  const fecharModal = () => {
    setVerificadoModal(false)
    setCodigoVerificado(null)
    setTitutoModal("")
    setContentModal("")
    setCodModal("")
  }

  const abrirModal = (titu, desc, cod) => {
    setTitutoModal(titu)
    setContentModal(desc)
    setCodModal(String(cod))
    setVerificadoModal(true)
  }


  const VerificarCodigos = async (cod) => {
    if (cod === null) {
      console.error("Código invalido ou nulo.")
      return
    }
    const response = await listarProdutos()
    const encontrado = response?.find(r => String(r.codigoBarras) === String(cod));
    if (encontrado != null) {
      return true
    }
    else return false
  }

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
      console.log("screenshot: " + screenshot.length)
      const fotoLeve = await handleImagemComprimida(screenshot)
      console.log("fotoLeve: " + fotoLeve.length)
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
      setCarregando(true)
      const produtoSalvo = await salvarProduto(produtoPayload);
      setCarregando(false)
      abrirModal("Produto Publicado!", `Produto "${produtoSalvo.nome}" salvo com sucesso!`, produtoSalvo.codigoBarras)

      setFormState(estadoInicial);
      setFotoLeitura(null);
      setFotoOficial(null);
    } catch (error) {
      console.error(error);
      abrirModal("Falha ao salvar produto.", "Verifique se a API Java está rodando.")
    }
  };

  return (
    <div className="cadastro-container">
      <h2 className="cadastro-title">Novo Produto</h2>

      <form className="cadastro-form" onSubmit={handleSubmit}>

        {/* Código de Barras */}
        <div className="form-box">
          <label className="form-label">Código de Barras (EAN)</label>

          {codigoVerificado === null ? (null)
            : codigoVerificado ? (
              <label className="form-label-res-n">Produto já registrado</label>
            ) :
              (<label className="form-label-res-y">Produto não registrado</label>)
          }

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
  {/* Container visual moderno em alta definição */}
  <div style={{ position: 'relative', width: '100%', height: '300px', overflow: 'hidden', borderRadius: '8px', background: '#000', marginTop: '10px' }}>
    <video
      ref={videoRefProdutos}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
    {/* Linha guia vermelha centralizada para produtos */}
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '20%',
      width: '60%',
      height: '2px',
      backgroundColor: 'red',
      boxShadow: '0 0 8px red',
      opacity: 0.7,
      transform: 'translateY(-50%)',
      pointerEvents: 'none'
    }} />
  </div>

  <button
    type="button"
    className="btn-action-cancel"
    onClick={() => setUsarCameraCodigo(false)}
    style={{ marginTop: '12px', display: 'block', width: '100%' }}
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
              {codModal != "" && (
                <p>EAN: {codModal}</p>
              )}
              <p>{contentModal}</p>

              <button className="modal-btn" onClick={() => {fecharModal();}}>FECHAR</button>

            </div>
          </div>
        )
        }

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
                <button type="button" className="btn-cam-ai" onClick={capturarFotoParaAI}>
                  {processandoOCR ? 'Lendo...' : '🔍 Foto p/ Ler Nome'}
                </button>
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

        </div>
        <div className="form-box two-columns">

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

        <button type="submit" className="btn-submit" disabled={carregando}>
          {!carregando ? ("Salvar no Estoque") : ("Carregando...")}
        </button>
      </form>
    </div>
  );
}