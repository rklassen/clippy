let isReady = false;

async function checkStatus() {
    try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (response.ok) {
            const data = await response.json();
            const hasModel = data.models.some(m => m.name.includes('qwen2:0.5b'));
            if (hasModel) {
                document.getElementById('status').textContent = 'Status: r2r = ready 2 roll';
                document.getElementById('message').disabled = false;
                document.getElementById('sendBtn').disabled = false;
                isReady = true;
            } else {
                document.getElementById('status').textContent = 'Status: Model not found';
                document.getElementById('downloadBtn').style.display = 'inline';
            }
        } else {
            document.getElementById('status').textContent = 'Status: Ollama not running';
        }
    } catch (error) {
        document.getElementById('status').textContent = 'Status: Error - ' + error.message;
    }
}

async function downloadModel() {
    document.getElementById('downloadBtn').style.display = 'none';
    document.getElementById('progress').style.display = 'block';
    document.getElementById('status').textContent = 'Status: Downloading...';

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
        checkStatus();
    } catch (error) {
        document.getElementById('status').textContent = 'Status: Download failed - ' + error.message;
        document.getElementById('downloadBtn').style.display = 'inline';
    }
}

async function sendMessage() {
    if (!isReady) return;

    const message = document.getElementById('message').value;
    if (!message) return;

    // Add user message to chat
    const chat = document.getElementById('chat');
    chat.innerHTML += `<p class="user"><strong>You:</strong> ${message}</p>`;
    document.getElementById('message').value = '';

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
        chat.innerHTML += `<p class="bot"><strong>Bot:</strong> ${botMessage}</p>`;
        chat.scrollTop = chat.scrollHeight;
    } catch (error) {
        chat.innerHTML += `<p class="bot"><strong>Bot:</strong> Error: ${error.message}</p>`;
    }
}

// Allow sending with Enter key
document.getElementById('message').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Check status on load
window.onload = checkStatus;