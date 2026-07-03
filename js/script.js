// --- VARIÁVEL GLOBAL DE CONTEXTO (PRESERVA O HISTÓRICO DO CHAT) ---
let chatContext = [
    {
        role: "system",
        content: "Você é a MED HEALTH IA, um assistente virtual exclusivo para atendimento em saúde ambulatorial.\n\nDIRETRIZES DE ESCOPO E SEGURANÇA CRÍTICAS:\n1. Seu foco é estrito e exclusivo a assuntos médicos, saúde ambulatorial, sintomas, especialidades médicas e orientações de bem-estar.\n2. Se o usuário tentar falar sobre qualquer outro assunto fora da saúde (como programação, culinária, história, piadas, matemática, curiosidades gerais, etc.), você deve recusar o atendimento educadamente.\n3. Se o usuário for evasivo ou fizer perguntas hipotéticas fora do contexto de saúde, traga-o de volta ao assunto médico.\n4. Responda APENAS em texto puro e limpo. Nunca utilize formatações Markdown como asteriscos (**), cerquilhas (#), listas com traços (-) ou qualquer tipo de tag. Se precisar listar itens, use números (1., 2., 3.) seguidos de quebras de linha normais.\n\nExemplo de recusa padrão: \"Desculpe, como assistente da MED HEALTH IA, só posso ajudar com dúvidas relacionadas à saúde e atendimento ambulatorial. Como posso ajudar com sua saúde hoje?\""
    }
];

// --- FUNÇÃO PRINCIPAL DE ENVIO PARA O AZURE OPENAI ---
async function askAI() {
    const questionInput = document.getElementById('question');
    const responseDiv = document.getElementById('response');
    
    if (!questionInput || !responseDiv) {
        console.error("Erro: Elementos do HTML não foram encontrados.");
        return;
    }

    const questionText = questionInput.value.trim();

    if (!questionText) {
        alert("Por favor, digite uma pergunta!");
        return;
    }

    // Adiciona a mensagem do usuário na tela
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'message user-message';
    userMessageDiv.innerHTML = `<strong>👤 Usuário:</strong> <p>${questionText}</p>`;
    responseDiv.appendChild(userMessageDiv);

    // Cria o container da resposta com o Loader animado
    const aiMessageDiv = document.createElement('div');
    aiMessageDiv.className = 'message ai-message';
    aiMessageDiv.innerHTML = `
        <strong>🏥 MED HEALTH IA:</strong> 
        <div class="loader">
            <span></span><span></span><span></span>
        </div>
    `;
    responseDiv.appendChild(aiMessageDiv);
    responseDiv.scrollTop = responseDiv.scrollHeight;

    questionInput.value = "";
    chatContext.push({ role: "user", content: questionText });

    // Payload enviado para a Azure OpenAI
    const data = {
        messages: chatContext, 
        max_completion_tokens: 4096
    };

    try {
        const keysResponse = await fetch('./keys.json');
        if (!keysResponse.ok) throw new Error("Não foi possível carregar o arquivo keys.json. Verifique se ele está na raiz.");
        const keys = await keysResponse.json();
        
        const apiKey = keys.AZURE_API_KEY; // Corrigido para bater com a chave do keys.json
        let url = keys.AZURE_OPENAI_ENDPOINT; // CORREÇÃO: Pega a URL do JSON para evitar erro de variável indefinida

        if (!url) throw new Error("Endpoint da Azure não configurado no keys.json");

        // Ajusta a URL injetando a versão da API caso não tenha sido adicionada no JSON
        if (!url.includes('api-version')) {
            const separator = url.includes('?') ? '&' : '?';
            url = `${url}${separator}api-version=2024-02-15-preview`;
        }

        // Chamada à API da Azure configurada com as credenciais oficiais corrigidas
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
        
        chatContext.push({ role: "assistant", content: aiResponse });

        // Limpa o loader e injeta a resposta da inteligência artificial
        aiMessageDiv.innerHTML = `<strong>🏥 MED HEALTH IA:</strong> <p class="message-content"></p>`;
        aiMessageDiv.querySelector('.message-content').innerText = aiResponse;

        // Inicia a síntese de voz (conversão de texto em fala)
        synthesizeSpeech(aiResponse);

    } catch (error) {
        console.error("Erro detalhado na requisição:", error);
        
        const errorMessage = "Desculpe, a MED HEALTH IA encontrou um erro ao processar sua solicitação.";
        
        // Substitui o loader com o aviso padrão em caso de erro na rede
        aiMessageDiv.innerHTML = `<strong>🏥 MED HEALTH IA:</strong> <p class="message-content"></p>`;
        aiMessageDiv.querySelector('.message-content').innerText = errorMessage;
        
        synthesizeSpeech(errorMessage);
    }

    responseDiv.scrollTop = responseDiv.scrollHeight;
}

// --- FUNÇÃO DE SÍNTESE DE VOZ (AZURE TEXT-TO-SPEECH) ---
async function synthesizeSpeech(textToSpeak) {
    try {
        const keysResponse = await fetch('./keys.json');
        if (!keysResponse.ok) throw new Error("Erro ao carregar keys.json para síntese");
        const keys = await keysResponse.json();

        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(keys.AZURE_VOICE_KEY, keys.AZURE_VOICE_REGION);
        speechConfig.speechSynthesisVoiceName = "pt-BR-FranciscaNeural"; 

        const audioConfig = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput();
        const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);

        synthesizer.speakTextAsync(
            textToSpeak,
            result => {
                if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                    console.log("Síntese de voz concluída com sucesso.");
                } else {
                    console.error("Falha na síntese de voz:", result.errorDetails);
                }
                synthesizer.close();
            },
            err => {
                console.error("Erro na síntese de voz Azure:", err);
                synthesizer.close();
            }
        );

    } catch (error) {
        console.error("Erro ao configurar a síntese de voz da Azure:", error);
    }
}

// --- FUNÇÃO DE RECONHECIMENTO DE VOZ (AZURE SPEECH) ---
async function startVoiceRecognition() {
    const voiceBtn = document.getElementById('voice-btn');
    const questionInput = document.getElementById('question');

    try {
        const keysResponse = await fetch('./keys.json');
        if (!keysResponse.ok) throw new Error("Erro ao carregar keys.json");
        const keys = await keysResponse.json();

        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(keys.AZURE_VOICE_KEY, keys.AZURE_VOICE_REGION);
        speechConfig.speechRecognitionLanguage = "pt-BR";

        const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

        if (voiceBtn) {
            voiceBtn.innerText = "⏳";
            voiceBtn.disabled = true;
        }

        recognizer.recognizeOnceAsync(
            result => {
                if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                    console.log(`Texto reconhecido: ${result.text}`);
                    if (questionInput) {
                        questionInput.value = result.text;
                        askAI();
                    }
                } else {
                    alert("Não entendi o que você disse. Por favor, tente novamente.");
                }

                if (voiceBtn) {
                    voiceBtn.innerText = "🎤";
                    voiceBtn.disabled = false;
                }
                recognizer.close();
            },
            err => {
                console.error("Erro no reconhecimento de voz:", err);
                if (voiceBtn) {
                    voiceBtn.innerText = "🎤";
                    voiceBtn.disabled = false;
                }
                recognizer.close();
            }
        );

    } catch (error) {
        console.error("Erro ao configurar o Azure Speech:", error);
        alert("Erro ao iniciar o serviço de voz.");
    }
}

// --- RESPOSTAS RÁPIDAS ---
function sendQuickReply(text) {
    const questionInput = document.getElementById('question');
    if (questionInput) {
        questionInput.value = text;
        askAI();
    }
}

// --- CONFIGURAÇÃO DOM CONTENT LOADED ---
document.addEventListener("DOMContentLoaded", () => {
    const questionInput = document.getElementById('question');
    const clearBtn = document.getElementById('clear-btn');
    const responseDiv = document.getElementById('response');
    const voiceBtn = document.getElementById('voice-btn');

    if (voiceBtn) {
        voiceBtn.addEventListener("click", startVoiceRecognition);
    }

    if (questionInput) {
        questionInput.addEventListener("keydown", function(event) {
            if (event.key === "Enter") {
                event.preventDefault(); 
                askAI(); 
            }
        });
    }

    if (clearBtn && responseDiv) {
        clearBtn.addEventListener("click", () => {
            responseDiv.innerHTML = "";
            chatContext = [
                {
                    role: "system",
                    content: "Você é a MED HEALTH IA, um assistente virtual exclusivo para atendimento em saúde ambulatorial..."
                }
            ];

            const welcomeMessage = document.createElement('div');
            welcomeMessage.className = 'message ai-message';
            welcomeMessage.innerHTML = `<strong>🏥 MED HEALTH IA:</strong> <p>Histórico limpo! Como posso ajudar você agora?</p>`;
            responseDiv.appendChild(welcomeMessage);
            
            synthesizeSpeech("Histórico limpo! Como posso ajudar você agora?");
            if (questionInput) questionInput.focus();
        });
    }
});