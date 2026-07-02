# MED HEALTH IA 🏥

O **MED HEALTH IA** é um assistente virtual interativo focado exclusivamente no atendimento em saúde ambulatorial. Desenvolvido em JavaScript puro (Vanilla JS), o sistema se conecta à API do Azure OpenAI utilizando modelos avançados de linguagem para simular uma triagem médica humanizada e segura.

## ✨ Funcionalidades

*   **Foco Estrito em Saúde:** Configurado para rejeitar educadamente qualquer assunto fora do escopo médico (programação, culinária, curiosidades, etc.).
*   **Memória de Conversa Continuada:** Mantém o histórico completo do diálogo ativo (`chatContext`) para contextualizar as respostas.
*   **Interface Dinâmica:** Inclui balões de conversa estilizados, indicador de digitação por animação (*loader*) e rolagem automática para a última mensagem.
*   **Segurança de Credenciais:** Carregamento dinâmico de chaves de API locais via arquivo `keys.json` apartado do código-fonte.
*   **Respostas Rápidas:** Suporte a atalhos rápidos clicáveis para envio imediato de dúvidas comuns.
*   **Respostas Limpas:** Retornos formatados exclusivamente em texto puro, sem marcações Markdown poluindo a leitura do usuário.

---

## 🚀 Como Configurar e Rodar o Projeto

Como o projeto faz requisições assíncronas locais (`fetch('./keys.json')`), você precisará rodar o projeto por meio de um servidor local para evitar bloqueios de segurança do navegador (erros de política CORS).

### 1. Clonar o Repositório
```bash
git clone [https://github.com/seu-usuario/seu-repositorio.git](https://github.com/seu-usuario/seu-repositorio.git)
cd seu-repositorio