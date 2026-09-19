import { useState } from 'react';
import CadastroProduto from './abas/CadastroProduto';
import Estoque from './abas/Estoque';
import Pedidos from './abas/Pedidos';
import Pagamentos from './abas/Pagamentos';
import './App.css';

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState('estoque');

  return (
    <div className="app-container">
      <header className="main-header">
        <h1 className="brand-title">Cléo Perfumes</h1>
        <p className="brand-subtitle">Perfumaria & Cosméticos</p>

        <nav className="nav-tabs">
          <button
            className={`tab-button ${abaAtiva === 'cadastro' ? 'active' : 'disable'}`}
            onClick={() => setAbaAtiva('cadastro')}
          >
            Inserir
          </button>

          <button
            className={`tab-button ${abaAtiva === 'estoque' ? 'active' : 'disable'}`}
            onClick={() => setAbaAtiva('estoque')}
          >
            Estoque
          </button>

          <button
            className={`tab-button ${abaAtiva === 'pedidos' ? 'active' : 'disable'}`}
            onClick={() => setAbaAtiva('pedidos')}
          >
            Pedidos
          </button>

          <button
            className={`tab-button ${abaAtiva === 'pagamento' ? 'active' : 'disable'}`}
            onClick={() => setAbaAtiva('pagamento')}
          >
            Pagamento
          </button>
          
          <button
            className={`tab-button ${abaAtiva === 'boleto' ? 'active' : 'disable'}`}
            onClick={() => setAbaAtiva('boleto')}
          >
            Boletos
          </button>
        </nav>
      </header>

      <main className="main-content">
        {abaAtiva === 'cadastro' && <CadastroProduto/>}

        {abaAtiva === 'estoque' && <Estoque />}

        {abaAtiva === 'pedidos' && <Pedidos/>}

        {abaAtiva === 'pagamento' && <Pagamentos/>}
        
        {abaAtiva === 'boleto' && null}
      </main>
    </div>
  );
}

/*
Para os boletos, precisamos de:
  id int,
  codigo de barras int(50) unique,
  vencimento date,
  valor decimal(10,2),
*/