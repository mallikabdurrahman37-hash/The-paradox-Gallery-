// ==========================================
// THE PARADOX AI - MODAL LOGIC & CHAT ENGINE
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const aiFab = document.getElementById('ai-fab');
    const aiModal = document.getElementById('ai-modal');
    const aiOverlay = document.getElementById('ai-modal-overlay');
    const aiCloseBtn = document.getElementById('ai-close-btn');
    const aiInput = document.getElementById('ai-chat-input');
    const aiSendBtn = document.getElementById('ai-send-btn');
    const aiChatBox = document.getElementById('ai-chat-box');
    
    if(!aiFab || !aiModal) return; // Prevent errors on pages without the chatbot

    // Yahan tumhara Vercel backend URL hai
    const AI_API_URL = "https://paradox-gallery-backend.vercel.app/api/chat";
    let aiChatHistory = [];

    // Toggle Modal Function
    const toggleAiModal = () => {
        aiModal.classList.toggle('active');
        aiOverlay.classList.toggle('active');
        if (aiModal.classList.contains('active')) {
            aiInput.focus();
        }
    };

    // Event Listeners for Opening/Closing
    aiFab.addEventListener('click', toggleAiModal);
    aiCloseBtn.addEventListener('click', toggleAiModal);
    aiOverlay.addEventListener('click', toggleAiModal);

    // Send Message on 'Enter' or Click
    aiInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAiSend();
    });
    aiSendBtn.addEventListener('click', handleAiSend);

    async function handleAiSend() {
        const userText = aiInput.value.trim();
        if (!userText) return;

        // 1. Add User Message
        appendAiMessage(userText, 'wrapper-user', 'msg-user', 'You');
        aiInput.value = '';

        // 2. Lock UI (Prevent Spam)
        aiInput.disabled = true;
        aiSendBtn.disabled = true;

        // 3. Show Typing Indicator
        const typingId = 'typing-' + Date.now();
        const typingDiv = document.createElement("div");
        typingDiv.className = `ai-message-wrapper wrapper-ai`;
        typingDiv.id = typingId;
        typingDiv.innerHTML = `
            <span class="ai-message-sender">The Paradox AI</span>
            <div class="ai-typing-indicator" style="font-family: var(--font-serif); font-style: italic; color: #666; font-size: 0.85rem; padding: 10px 0; animation: aiPulse 1.5s infinite;">Analyzing...</div>
        `;
        aiChatBox.appendChild(typingDiv);
        aiChatBox.scrollTop = aiChatBox.scrollHeight;

        try {
            // 4. Fetch Response from Backend
            const response = await fetch(AI_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userText, history: aiChatHistory })
            });

            const data = await response.json();
            document.getElementById(typingId).remove(); // Remove typing indicator

            if (response.ok) {
                let cssClass = "msg-ai";
                if (data.is_exhausted) cssClass += " msg-support"; // Highlight for UPI message
                
                await aiTypewriterEffect(data.reply, "wrapper-ai", cssClass, "The Paradox AI");
                
                // Save context
                aiChatHistory.push({ role: "user", parts: [{ text: userText }] });
                aiChatHistory.push({ role: "model", parts: [{ text: data.reply }] });
            } else {
                appendAiMessage("System Error: Connection disrupted.", 'wrapper-ai', 'msg-ai msg-support', "System");
            }
        } catch (error) {
            if(document.getElementById(typingId)) document.getElementById(typingId).remove();
            appendAiMessage("Network Error: Unable to reach AI core.", 'wrapper-ai', 'msg-ai msg-support', "System");
        } finally {
            // 5. Unlock UI
            aiInput.disabled = false;
            aiSendBtn.disabled = false;
            aiInput.focus();
        }
    }

    // HTML Escaper for Security
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.innerText = text;
        return div.innerHTML;
    }

    function appendAiMessage(text, wrapperClass, msgClass, senderName) {
        const wrapperDiv = document.createElement("div");
        wrapperDiv.className = `ai-message-wrapper ${wrapperClass}`;
        wrapperDiv.innerHTML = `
            <span class="ai-message-sender">${senderName}</span>
            <div class="ai-message ${msgClass}">${escapeHtml(text)}</div>
        `;
        aiChatBox.appendChild(wrapperDiv);
        aiChatBox.scrollTop = aiChatBox.scrollHeight;
    }

    // Typewriter + Copy Button
    function aiTypewriterEffect(text, wrapperClass, msgClass, senderName) {
        return new Promise((resolve) => {
            const wrapperDiv = document.createElement("div");
            wrapperDiv.className = `ai-message-wrapper ${wrapperClass}`;
            
            const senderSpan = document.createElement("span");
            senderSpan.className = "ai-message-sender";
            senderSpan.innerText = senderName;
            
            const msgDiv = document.createElement("div");
            msgDiv.className = `ai-message ${msgClass}`;
            
            // Hover-to-Copy Button
            const copyBtn = document.createElement("button");
            copyBtn.className = "ai-copy-btn";
            copyBtn.innerText = "[ COPY ]";
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(text);
                copyBtn.innerText = "[ COPIED ✓ ]";
                copyBtn.style.background = "#C84B31";
                setTimeout(() => {
                    copyBtn.innerText = "[ COPY ]";
                    copyBtn.style.background = "#1A1A1A";
                }, 2000);
            };

            wrapperDiv.appendChild(senderSpan);
            wrapperDiv.appendChild(msgDiv);
            wrapperDiv.appendChild(copyBtn);
            aiChatBox.appendChild(wrapperDiv);
            
            let i = 0;
            const speed = 12;

            function type() {
                if (i < text.length) {
                    msgDiv.innerHTML += text.charAt(i);
                    i++;
                    aiChatBox.scrollTop = aiChatBox.scrollHeight;
                    setTimeout(type, speed);
                } else {
                    resolve();
                }
            }
            type();
        });
    }
});
