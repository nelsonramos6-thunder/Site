// --- VARIÁVEL GLOBAL DE CONTEXTO ---
let chatContext = [
    {
        role: "system",
        content: "Você é a MED HEALTH IA, um assistente virtual exclusivo para atendimento em saúde ambulatorial.\n\nDIRETRIZES DE ESCOPO E SEGURANÇA CRÍTICAS:\n1. Seu foco é estrito e exclusivo a assuntos médicos, saúde ambulatorial, sintomas, especialidades médicas e orientações de bem-estar.\n2. Se o usuário tentar falar sobre qualquer outro assunto fora da saúde (como programação, culinária, história, piadas, matemática, curiosidades gerais, etc.), você deve recusar o atendimento educadamente.\n3. Se o usuário for evasivo ou fizer perguntas hipotéticas fora do contexto de saúde, traga-o de volta ao assunto médico.\n4. Responda APENAS em texto puro e limpo. Nunca utilize formatações Markdown como asteriscos (**), cerquilhas (#), listas com traços (-) ou qualquer tipo de tag. Se precisar listar itens, use números (1., 2., 3.) seguidos de quebras de linha normais.\n\nExemplo de recusa padrão: \"Desculpe, como assistente da MED HEALTH IA, só posso ajudar com dúvidas relacionadas à saúde e atendimento ambulatorial. Como posso ajudar com sua saúde hoje?\""
    }
];

// --- FUNÇÃO DE SÍNTESE DE VOZ (AZURE TEXT-TO-SPEECH) ---
async function synthesizeSpeech(textToSpeak) {
    try {
        // 1. Carrega as credenciais do keys.json
        const keysResponse = await fetch('./keys.json');
        if (!keysResponse.ok) throw new Error("Erro ao carregar keys.json para síntese");
        const keys = await keysResponse.json();

        // 2. Configura o serviço de voz da Azure
        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(keys.AZURE_SPEECH_KEY, keys.AZURE_SPEECH_REGION);
        
        // Configura uma voz profissional em Português do Brasil (Ex: Francisca ou Antonio)
        speechConfig.speechSynthesisVoiceName = "pt-BR-FranciscaNeural"; 

        const audioConfig = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput();
        const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);

        // 3. Executa a fala
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
        // 1. Carrega as credenciais do keys.json
        const keysResponse = await fetch('./keys.json');
        if (!keysResponse.ok) throw new Error("Erro ao carregar keys.json");
        const keys = await keysResponse.json();

        // 2. Configura o serviço de fala da Azure (padrão em Português do Brasil)
        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(keys.AZURE_SPEECH_KEY, keys.AZURE_SPEECH_REGION);
        speechConfig.speechRecognitionLanguage = "pt-BR";

        const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

        // Feedback visual no botão enquanto ele escuta
        if (voiceBtn) {
            voiceBtn.innerText = "Ouvindo...";
            voiceBtn.disabled = true;
        }

        // 3. Inicia a captura da fala (reconhece uma única frase longa)
        recognizer.recognizeOnceAsync(
            result => {
                if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                    console.log(`Texto reconhecido: ${result.text}`);
                    
                    if (questionInput) {
                        questionInput.value = result.text; // Coloca o texto no input
                        askAI(); // Dispara automaticamente a resposta da IA
                    }
                } else {
                    alert("Não entendi o que você disse. Por favor, tente novamente.");
                }

                // Reseta o estado do botão
                if (voiceBtn) {
                    voiceBtn.innerText = "🎤 Falar";
                    voiceBtn.disabled = false;
                }
                recognizer.close();
            },
            err => {
                console.error("Erro no reconhecimento de voz:", err);
                if (voiceBtn) {
                    voiceBtn.innerText = "🎤 Falar";
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

    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'message user-message';
    userMessageDiv.innerHTML = `<strong>👤 Usuário:</strong> <p>${questionText}</p>`;
    responseDiv.appendChild(userMessageDiv);

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

    const data = {
        model: "gpt-5.4", 
        messages: chatContext, 
        max_completion_tokens: 4096
    };

    try {
        const keysResponse = await fetch('./keys.json');
        if (!keysResponse.ok) throw new Error("Não foi possível carregar o arquivo keys.json");
        const keys = await keysResponse.json();
        
        const apiKey = keys.AZURE_OPENAI_KEY;
        const url = keys.AZURE_OPENAI_ENDPOINT;

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

        aiMessageDiv.innerHTML = `<strong>🏥 MED HEALTH IA:</strong> <p></p>`;
        aiMessageDiv.querySelector('p').innerText = aiResponse;

        // --- INTEGRAÇÃO DA FALA: Ativa a escuta assim que o texto é exibido ---
        synthesizeSpeech(aiResponse);

    } catch (error) {
        console.error("Erro detalhado na requisição:", error);
        aiMessageDiv.innerHTML = `<strong>🏥 MED HEALTH IA:</strong> <p></p>`;
        aiMessageDiv.querySelector('p').innerText = "Desculpe, a MED HEALTH IA encontrou um erro ao processar sua solicitação.";
        
        // Fala o aviso de erro para manter a acessibilidade por voz ativa
        synthesizeSpeech("Desculpe, a MED HEALTH IA encontrou um erro ao processar sua solicitação.");
    }

    responseDiv.scrollTop = responseDiv.scrollHeight;
}

// Configurações executadas assim que a página carrega totalmente
document.addEventListener("DOMContentLoaded", () => {
    const questionInput = document.getElementById('question');
    const clearBtn = document.getElementById('clear-btn');
    const responseDiv = document.getElementById('response');
    const voiceBtn = document.getElementById('voice-btn'); // Elemento do botão de voz

    // 1. Vincula o botão de voz à função do Azure Speech
    if (voiceBtn) {
        voiceBtn.addEventListener("click", startVoiceRecognition);
    }

    // 2. Vincula a tecla Enter do teclado ao input
    if (questionInput) {
        questionInput.addEventListener("keydown", function(event) {
            if (event.key === "Enter") {
                event.preventDefault(); 
                askAI(); 
            }
        });
    }

    // 3. Função para o botão de limpar histórico
    if (clearBtn && responseDiv) {
        clearBtn.addEventListener("click", () => {
            responseDiv.innerHTML = "";
            chatContext = [
                {
                    role: "system",
                    content: "Você é a MED HEALTH IA, um assistente virtual exclusivo para atendimento em saúde ambulatorial.\n\nDIRETRIZES DE ESCOPO E SEGURANÇA CRÍTICAS:\n1. Seu foco é estrito e exclusivo a assuntos médicos, saúde ambulatorial, sintomas, especialidades médicas e orientações de bem-estar.\n2. Se o usuário tentar falar sobre qualquer outro assunto fora da saúde (como programação, culinária, história, piadas, matemática, curiosidades gerais, etc.), você deve recusar o atendimento educadamente.\n3. Se o usuário for evasivo ou fizer perguntas hipotéticas fora do contexto de saúde, traga-o de volta ao assunto médico.\n4. Responda APENAS em texto puro e limpo. Nunca utilize formatações Markdown como asteriscos (**), cerquilhas (#), listas com traços (-) ou qualquer tipo de tag. Se precisar listar itens, use números (1., 2., 3.) seguidos de quebras de linha normais.\n\nExemplo de recusa padrão: \"Desculpe, como assistente da MED HEALTH IA, só posso ajudar com dúvidas relacionadas à saúde e atendimento ambulatorial. Como posso ajudar com sua saúde hoje?\""
                }
            ];

            const welcomeMessage = document.createElement('div');
            welcomeMessage.className = 'message ai-message';
            welcomeMessage.innerHTML = `<strong>🏥 MED HEALTH IA:</strong> <p>Histórico limpo! Como posso ajudar você agora?</p>`;
            responseDiv.appendChild(welcomeMessage);
            
            // Fala a mensagem de boas-vindas ao limpar o chat
            synthesizeSpeech("Histórico limpo! Como posso ajudar você agora?");
            
            if (questionInput) questionInput.focus();
        });
    }
});

function sendQuickReply(text) {
    const questionInput = document.getElementById('question');
    if (questionInput) {
        questionInput.value = text;
        askAI();
    }
}