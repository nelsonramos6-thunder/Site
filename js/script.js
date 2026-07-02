// --- VARIÁVEL GLOBAL DE CONTEXTO ---
// Mantém a memória da conversa ativa. Iniciada com as diretrizes do sistema.
let chatContext = [
    {
        role: "system",
        content: "Você é a MED HEALTH IA, um assistente virtual exclusivo para atendimento em saúde ambulatorial.\n\nDIRETRIZES DE ESCOPO E SEGURANÇA CRÍTICAS:\n1. Seu foco é estrito e exclusivo a assuntos médicos, saúde ambulatorial, sintomas, especialidades médicas e orientações de bem-estar.\n2. Se o usuário tentar falar sobre qualquer outro assunto fora da saúde (como programação, culinária, história, piadas, matemática, curiosidades gerais, etc.), você deve recusar o atendimento educadamente.\n3. Se o usuário for evasivo ou fizer perguntas hipotéticas fora do contexto de saúde, traga-o de volta ao assunto médico.\n4. Responda APENAS em texto puro e limpo. Nunca utilize formatações Markdown como asteriscos (**), cerquilhas (#), listas com traços (-) ou qualquer tipo de tag. Se precisar listar itens, use números (1., 2., 3.) seguidos de quebras de linha normais.\n\nExemplo de recusa padrão: \"Desculpe, como assistente da MED HEALTH IA, só posso ajudar com dúvidas relacionadas à saúde e atendimento ambulatorial. Como posso ajudar com sua saúde hoje?\""
    }
];

async function askAI() {
    const questionInput = document.getElementById('question');
    const responseDiv = document.getElementById('response');
    
    if (!questionInput || !responseDiv) {
        console.error("Erro: Elementos do HTML não foram encontrados.");
        return;
    }

    const questionText = questionInput.value.trim();

    // 1. Validação simples para não enviar campo vazio
    if (!questionText) {
        alert("Por favor, digite uma pergunta!");
        return;
    }

    // --- ADICIONA A PERGUNTA DO USUÁRIO NO HISTÓRICO DA TELA ---
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'message user-message';
    userMessageDiv.innerHTML = `<strong>👤 Usuário:</strong> <p>${questionText}</p>`;
    responseDiv.appendChild(userMessageDiv);

    // --- CRIA O BALÃO DE RESPOSTA DA IA COM ANIMAÇÃO LOADER ---
    const aiMessageDiv = document.createElement('div');
    aiMessageDiv.className = 'message ai-message';
    aiMessageDiv.innerHTML = `
        <strong>🏥 MED HEALTH IA:</strong> 
        <div class="loader">
            <span></span><span></span><span></span>
        </div>
    `;
    responseDiv.appendChild(aiMessageDiv);

    // Rola a tela automaticamente para a última mensagem
    responseDiv.scrollTop = responseDiv.scrollHeight;

    // Limpa o campo de entrada para a próxima pergunta
    questionInput.value = "";

    // 2. Alimenta a memória/contexto com a nova pergunta do usuário
    chatContext.push({ role: "user", content: questionText });

    // 4. Estrutura da requisição utilizando a memória acumulada (chatContext)
    const data = {
        model: "gpt-5.4", 
        messages: chatContext, 
        max_completion_tokens: 4096
    };

    try {
        // --- EXTRAÇÃO DAS CREDENCIAIS DO ARQUIVO KEYS.JSON ---
        const keysResponse = await fetch('./keys.json');
        if (!keysResponse.ok) {
            throw new Error("Não foi possível carregar as chaves de configuração do arquivo keys.json");
        }
        const keys = await keysResponse.json();
        
        const apiKey = keys.AZURE_OPENAI_KEY;
        const url = keys.AZURE_OPENAI_ENDPOINT;

        // 5. Chamada de rede via Fetch API
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-key": apiKey
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorDetails = await response.text();
            throw new Error(`Erro na API: ${response.status} - ${errorDetails}`);
        }

        const result = await response.json();
        const aiResponse = result.choices[0].message.content;
        
        // --- ADICIONA A RESPOSTA DA IA À MEMÓRIA DO CONTEXTO ---
        chatContext.push({ role: "assistant", content: aiResponse });

        // --- SUBSTITUI O LOADER PELA RESPOSTA REAL DA IA ---
        aiMessageDiv.innerHTML = `<strong>🏥 MED HEALTH IA:</strong> <p></p>`;
        aiMessageDiv.querySelector('p').innerText = aiResponse;

    } catch (error) {
        console.error("Erro detalhado na requisição:", error);
        // Em caso de erro, remove o loader e exibe o aviso
        aiMessageDiv.innerHTML = `<strong>🏥 MED HEALTH IA:</strong> <p></p>`;
        aiMessageDiv.querySelector('p').innerText = "Desculpe, a MED HEALTH IA encontrou um erro ao processar sua solicitação.";
    }

    // Garante que a rolagem acompanhe o fim do texto
    responseDiv.scrollTop = responseDiv.scrollHeight;
}

// Configurações executadas assim que a página carrega totalmente
document.addEventListener("DOMContentLoaded", () => {
    const questionInput = document.getElementById('question');
    const clearBtn = document.getElementById('clear-btn');
    const responseDiv = document.getElementById('response');

    // 1. Vincula a tecla Enter do teclado ao input
    if (questionInput) {
        questionInput.addEventListener("keydown", function(event) {
            if (event.key === "Enter") {
                event.preventDefault(); 
                askAI(); 
            }
        });
    }

    // 2. Função para o botão de limpar histórico e voltar ao início
    if (clearBtn && responseDiv) {
        clearBtn.addEventListener("click", () => {
            // Limpa todas as mensagens da tela
            responseDiv.innerHTML = "";

            // --- RESETA A MEMÓRIA GLOBAL DO CONTEXTO ---
            chatContext = [
                {
                    role: "system",
                    content: "Você é a MED HEALTH IA, um assistente virtual exclusivo para atendimento em saúde ambulatorial.\n\nDIRETRIZES DE ESCOPO E SEGURANÇA CRÍTICAS:\n1. Seu foco é estrito e exclusivo a assuntos médicos, saúde ambulatorial, sintomas, especialidades médicas e orientações de bem-estar.\n2. Se o usuário tentar falar sobre qualquer outro assunto fora da saúde (como programação, culinária, história, piadas, matemática, curiosidades gerais, etc.), você deve recusar o atendimento educadamente.\n3. Se o usuário for evasivo ou fizer perguntas hipotéticas fora do contexto de saúde, traga-o de volta ao assunto médico.\n4. Responda APENAS em texto puro e limpo. Nunca utilize formatações Markdown como asteriscos (**), cerquilhas (#), listas com traços (-) ou qualquer tipo de tag. Se precisar listar itens, use números (1., 2., 3.) seguidos de quebras de linha normais.\n\nExemplo de recusa padrão: \"Desculpe, como assistente da MED HEALTH IA, só posso ajudar com dúvidas relacionadas à saúde e atendimento ambulatorial. Como posso ajudar com sua saúde hoje?\""
                }
            ];

            // Adiciona uma mensagem acolhedora de reinício da IA
            const welcomeMessage = document.createElement('div');
            welcomeMessage.className = 'message ai-message';
            welcomeMessage.innerHTML = `<strong>🏥 MED HEALTH IA:</strong> <p>Histórico limpo! Como posso ajudar você agora?</p>`;
            responseDiv.appendChild(welcomeMessage);
            
            // Foca novamente o campo de texto para o usuário digitar
            if (questionInput) questionInput.focus();
        });
    }
});

// --- FUNÇÃO PARA ENVIAR RESPOSTA RÁPIDA ---
function sendQuickReply(text) {
    const questionInput = document.getElementById('question');
    if (questionInput) {
        // 1. Preenche o campo de texto com a pergunta do botão
        questionInput.value = text;
        
        // 2. Dispara a função principal que envia para a IA
        askAI();
    }
}