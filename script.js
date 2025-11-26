let isReady = false;
let emojiInterval = null;

const statusConfig = {
    noModel: { text: 'No model', emoji: ['🌑'], class: 'error' },
    downloading: { text: 'Downloading model', emoji: ['📡', '🛰️'], class: '' },
    initializing: { text: 'Initializing', emoji: ['⏳', '🛠️'], class: '' },
    ready: { text: 'Ready', emoji: ['🟢'], class: 'ready' },
    working: { text: 'Working', emoji: ['🧠', '💭', '✍️', '📝'], class: '' },
    error: { text: 'Error', emoji: ['❌'], class: 'error' }
};

function updateStatus(statusKey, customText = null) {
    const statusEl = document.getElementById('status');
    const config = statusConfig[statusKey];
    
    if (!config) return;
    
    // Clear any existing emoji interval
    if (emojiInterval) {
        clearInterval(emojiInterval);
        emojiInterval = null;
    }
    
    const text = customText || config.text;
    statusEl.className = config.class;
    
    if (config.emoji.length === 1) {
        // Static emoji
        statusEl.innerHTML = `<span class="status-emoji">${config.emoji[0]}</span>${text}`;
    } else {
        // Cycling emojis at 80 bpm (750ms per beat)
        let index = 0;
        statusEl.innerHTML = `<span class="status-emoji">${config.emoji[0]}</span>${text}`;
        
        emojiInterval = setInterval(() => {
            index = (index + 1) % config.emoji.length;
            const emojiSpan = statusEl.querySelector('.status-emoji');
            if (emojiSpan) {
                emojiSpan.textContent = config.emoji[index];
            }
        }, 750); // 80 bpm = 750ms per beat
    }
}

async function checkStatus() {
    try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (response.ok) {
            const data = await response.json();
            const hasModel = data.models.some(m => m.name.includes('qwen2:0.5b'));
            if (hasModel) {
                updateStatus('ready');
                document.getElementById('message').disabled = false;
                document.getElementById('sendBtn').disabled = false;
                isReady = true;
            } else {
                updateStatus('noModel');
                document.getElementById('downloadBtn').style.display = 'inline-block';
            }
        } else {
            updateStatus('error', 'Ollama not running');
        }
    } catch (error) {
        updateStatus('error', error.message);
    }
}

async function downloadModel() {
    document.getElementById('downloadBtn').style.display = 'none';
    document.getElementById('progress').style.display = 'block';
    updateStatus('downloading');

    try {
        const response = await fetch('http://localhost:11434/api/pull', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'qwen2:0.5b' })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const data = JSON.parse(line);
                        if (data.status === 'pulling') {
                            const percent = data.completed ? Math.round((data.completed / data.total) * 100) : 0;
                            document.getElementById('progressText').textContent = percent + '%';
                        }
                    } catch (e) {}
                }
            }
        }

        document.getElementById('progress').style.display = 'none';
        updateStatus('initializing');
        setTimeout(() => checkStatus(), 1000);
    } catch (error) {
        updateStatus('error', 'Download failed - ' + error.message);
        document.getElementById('downloadBtn').style.display = 'inline';
    }
}

async function sendMessage() {
    if (!isReady) return;

    const messageInput = document.getElementById('message');
    const message = messageInput.value.trim();
    if (!message) return;

    const chat = document.getElementById('chat');
    
    // Remove empty state if it exists
    const emptyState = chat.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    // Add user message to chat
    const userMsg = document.createElement('div');
    userMsg.className = 'message user';
    userMsg.innerHTML = `<strong>You</strong><div class="text">${escapeHtml(message)}</div>`;
    chat.appendChild(userMsg);
    
    messageInput.value = '';
    messageInput.disabled = true;
    document.getElementById('sendBtn').disabled = true;
    
    chat.scrollTop = chat.scrollHeight;

    // Set working status
    updateStatus('working');

    try {
        const response = await fetch('http://localhost:11434/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'qwen2:0.5b',
                messages: [{ role: 'user', content: message }],
                stream: false
            })
        });

        const data = await response.json();
        const botMessage = data.message.content;

        // Add bot response to chat
        const botMsg = document.createElement('div');
        botMsg.className = 'message bot';
        botMsg.innerHTML = `<strong>Bot</strong><div class="text">${escapeHtml(botMessage)}</div>`;
        chat.appendChild(botMsg);
        chat.scrollTop = chat.scrollHeight;
        
        // Return to ready status
        updateStatus('ready');
    } catch (error) {
        const errorMsg = document.createElement('div');
        errorMsg.className = 'message bot error';
        errorMsg.innerHTML = `<strong>Error</strong><div class="text">${escapeHtml(error.message)}</div>`;
        chat.appendChild(errorMsg);
        updateStatus('error', error.message);
    } finally {
        messageInput.disabled = false;
        document.getElementById('sendBtn').disabled = false;
        messageInput.focus();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Allow sending with Enter key
document.getElementById('message').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Check status on load
window.onload = checkStatus;