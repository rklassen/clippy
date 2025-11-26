async function sendMessage() {
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
                model: 'qwen2:0.5b-q8_0',
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