import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
// Importa o validador e decodificador correto
import { isBoleto } from 'validation-br'; 
import { Boleto } from 'validation-br/boleto'

export default function Boletos() {
  const [usarCameraBoleto, setUsarCameraBoleto] = useState(false);
  const videoRef = useRef(null);
  
  // Estado para armazenar o resultado traduzido
  const [dadosBoleto, setDadosBoleto] = useState({
    codigo: "",
    valor: 0,
    vencimento: "",
    tipo: ""
  });

  useEffect(() => {
    if (!usarCameraBoleto) return;

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.ITF, BarcodeFormat.CODE_128]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const codeReader = new BrowserMultiFormatReader(hints);

    codeReader.decodeFromVideoDevice(
      null,
      videoRef.current,
      (result, err) => {
        if (result) {
          const codigoLido = result.getText();
          

          // Interrompe a câmera imediatamente ao detectar
          codeReader.reset();
          setUsarCameraBoleto(false);

          // Verifica se o código capturado é estruturalmente um boleto válido
          if (isBoleto(codigoLido)) {
            // Extrai valor, vencimento e tipo de convênio
            const bol = Boleto.fromBarcode(String(codigoLido))
            setDadosBoleto({
              codigo: codigoLido,
              valor: bol.amount,             // Retorna um número float limpo (ex: 250.50)
              vencimento: bol.expiresAt 
            });
          } else {
            alert("Código de barras lido com sucesso, mas não corresponde a um padrão de boleto brasileiro válido.");
          }
        }
      }
    ).catch((err) => console.error("Erro na câmera:", err));

    return () => {
      codeReader.reset();
    };
  }, [usarCameraBoleto]);

  return (
    <div className="form-box" style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <label className="form-label" style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
        Leitor e Decodificador de Boleto
      </label>

      {/* Box de resultado formatado na tela */}
      {dadosBoleto.codigo && (
        <div style={{ backgroundColor: '#f0f4f9', padding: '15px', borderRadius: '8px', marginBottom: '20px', borderLeft: '5px solid #1a73e8' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#1a73e8' }}>📋 Informações Extraídas</h4>
          
          <p style={{ margin: '5px 0' }}>
            <strong>Valor:</strong> {dadosBoleto.valor > 0 
              ? dadosBoleto.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
              : 'Não identificado ou dinâmico'}
          </p>
          
          <p style={{ margin: '5px 0' }}>
            <strong>Vencimento:</strong> {dadosBoleto.vencimento ? new Date(dadosBoleto.vencimento).toLocaleDateString('pt-BR') : 'Imediato / Não consta'}
          </p>
          
          <p style={{ wordBreak: 'break-all', fontSize: '12px', color: '#666', marginTop: '10px', fontFamily: 'monospace' }}>
            <strong>Código de Barras:</strong> {dadosBoleto.codigo}
          </p>
        </div>
      )}

      {!usarCameraBoleto ? (
        <button
          type="button"
          className="btn-action-primary"
          onClick={() => {
            setDadosBoleto({ codigo: "", valor: 0, vencimento: "", tipo: "" });
            setUsarCameraBoleto(true);
          }}
          style={{ width: '100%', padding: '12px', cursor: 'pointer' }}
        >
          {dadosBoleto.codigo ? "Escanear Outro Boleto" : "Abrir Leitor de Boleto"}
        </button>
      ) : (
        <div>
          <div style={{ position: 'relative', width: '100%', height: '300px', overflow: 'hidden', borderRadius: '8px', background: '#000' }}>
            <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {/* Guia visual */}
            <div style={{
              position: 'absolute', top: '50%', left: '5%', width: '90%', height: '2px',
              backgroundColor: 'red', boxShadow: '0 0 8px red', opacity: 0.7, transform: 'translateY(-50%)'
            }} />
          </div>
          
          <button
            type="button"
            className="btn-action-cancel"
            onClick={() => setUsarCameraBoleto(false)}
            style={{ marginTop: '12px', display: 'block', width: '100%', padding: '10px' }}
          >
            Fechar Câmera
          </button>
        </div>
      )}
    </div>
  );
}
