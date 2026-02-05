import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Icons } from '../components/Icons';
import { COMPANY_NAME } from '../constants';

const AdminConfig: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-crm-text">Configurações</h1>
        <p className="text-sm text-crm-muted">
          Ajustes gerais do sistema e preferências do painel.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aparência */}
        <div className="crm-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-crm-bg border border-crm-border flex items-center justify-center">
              <Icons.Moon size={18} className="text-crm-muted" />
            </div>
            <div>
              <h3 className="font-extrabold text-crm-text">Aparência</h3>
              <p className="text-sm text-crm-muted">
                Tema visual do painel administrativo.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between bg-white border border-crm-border rounded-xl p-4">
            <div>
              <p className="font-extrabold text-crm-text">
                Modo {theme === 'dark' ? 'Escuro' : 'Claro'}
              </p>
              <p className="text-xs text-crm-muted">
                Altera a aparência geral do CRM
              </p>
            </div>

            <button
              onClick={toggleTheme}
              className="crm-btn-primary px-4 py-2"
            >
              {theme === 'dark' ? (
                <span className="flex items-center gap-2">
                  <Icons.Sun size={16} />
                  Claro
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Icons.Moon size={16} />
                  Escuro
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Sistema */}
        <div className="crm-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-crm-bg border border-crm-border flex items-center justify-center">
              <Icons.Settings size={18} className="text-crm-muted" />
            </div>
            <div>
              <h3 className="font-extrabold text-crm-text">Sistema</h3>
              <p className="text-sm text-crm-muted">
                Informações gerais da aplicação.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-crm-muted">Aplicação</span>
              <span className="font-extrabold text-crm-text">{COMPANY_NAME}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-crm-muted">Versão</span>
              <span className="font-extrabold text-crm-text">v1.0.0</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-crm-muted">Ambiente</span>
              <span className="px-2 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Produção
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="crm-card p-5 border border-rose-200 bg-rose-50/30">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center">
            <Icons.AlertTriangle size={18} className="text-rose-600" />
          </div>

          <div className="flex-1">
            <h3 className="font-extrabold text-rose-700">Zona de Atenção</h3>
            <p className="text-sm text-rose-600 mt-1">
              Ações sensíveis do sistema. Use com cuidado.
            </p>

            <div className="mt-4 flex gap-3">
              <button
                disabled
                className="px-4 py-2 rounded-xl border border-rose-200 text-rose-400 font-extrabold cursor-not-allowed"
              >
                Limpar cache
              </button>

              <button
                disabled
                className="px-4 py-2 rounded-xl border border-rose-200 text-rose-400 font-extrabold cursor-not-allowed"
              >
                Resetar dados
              </button>
            </div>

            <p className="text-[11px] text-rose-500 mt-3 italic">
              Essas opções ficam disponíveis em versões futuras do sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminConfig;
