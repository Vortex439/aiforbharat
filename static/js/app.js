let selectedRole = null;
let selectedLanguage = 'Hindi'; // Default

document.addEventListener('DOMContentLoaded', () => {
    console.log("SkillFit Pro initialized.");
});

function selectLanguage(lang) {
    selectedLanguage = lang;
    
    // Update UI
    document.querySelectorAll('.lang-pill').forEach(pill => {
        pill.classList.remove('selected');
        if (pill.textContent.trim() === lang) {
            pill.classList.add('selected');
        }
    });
    
    console.log("Selected language:", lang);
}

function selectRole(roleId) {
    selectedRole = roleId;
    
    // Update UI
    document.querySelectorAll('.role-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Find the card and add selected class
    // This assumes the card has an onclick that passes the ID
    const cards = document.querySelectorAll('.role-card');
    cards.forEach(card => {
        if (card.getAttribute('onclick').includes(roleId)) {
            card.classList.add('selected');
        }
    });
    
    console.log("Selected role:", roleId);
}

function startAssessment() {
    if (!selectedRole) {
        alert("Please select a role first!");
        return;
    }
    
    // Switch to assessment view
    navigateTo('candidate');
    
    // Initialize assessment
    goToPhase(0);
}

function goToPhase(phaseIndex) {
    // Hide all phases
    document.getElementById('phase-scenario').classList.add('hidden');
    document.getElementById('phase-interview').classList.add('hidden');
    document.getElementById('phase-results').classList.add('hidden');
    
    // Show target phase
    if (phaseIndex === 0) {
        document.getElementById('phase-scenario').classList.remove('hidden');
        loadScenario();
    } else if (phaseIndex === 1) {
        document.getElementById('phase-interview').classList.remove('hidden');
        startCamera();
        
        // Initial AI greeting in selected language
        const greetings = {
            'Hindi': 'नमस्ते! मैं आपका एआई तकनीकी मूल्यांकनकर्ता हूं। कृपया ऊपर बताए गए परिदृश्य के बारे में अपना दृष्टिकोण बताएं।',
            'Kannada': 'ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಎಐ ತಾಂತ್ರಿಕ ಮೌಲ್ಯಮಾಪಕ. ದಯವಿಟ್ಟು ಮೇಲಿನ ಸನ್ನಿವೇಶಕ್ಕೆ ನಿಮ್ಮ ಪ್ರತಿಕ್ರಿಯೆಯನ್ನು ವಿವರಿಸಿ.',
            'English': 'Hello! I am your AI technical evaluator. Please describe your step-by-step approach to the scenario above.',
            'Marathi': 'नमस्कार! मी तुमचा एआय तांत्रिक मूल्यमापनकर्ता आहे. कृपया वरील परिस्थितीबद्दल तुमचा दृष्टिकोन सांगा.'
        };
        addMessage('ai', greetings[selectedLanguage] || greetings['English']);
    } else if (phaseIndex === 2) {
        document.getElementById('phase-results').classList.remove('hidden');
    }
    
    // Update progress steps
    document.querySelectorAll('.step-item').forEach((step, idx) => {
        if (idx <= phaseIndex) step.classList.add('active');
        else step.classList.remove('active');
    });
}

function loadScenario() {
    const scenarios = {
        'electrician': 'A 3-phase motor suddenly stops on a factory floor. The breaker is fine, but the motor is hot. Walk through your diagnostic steps.',
        'plumber': 'A luxury hotel reports a sudden pressure drop in the top 3 floors. The pumps are running. What do you check first?',
        'welder': 'You are welding a critical support beam for a bridge. You notice porosity in your root pass. What do you do?',
        'driver': 'You are driving a 20-ton truck and notice the brake pedal feels spongy on a descent. Describe your immediate safety response.'
    };
    
    document.getElementById('scenario-title').textContent = `Practical Challenge: ${selectedRole.toUpperCase()}`;
    document.getElementById('scenario-desc').textContent = scenarios[selectedRole] || 'Select a role to see the challenge.';
}

async function startCamera() {
    const video = document.getElementById('webcam');
    const placeholder = document.getElementById('camera-placeholder');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        video.srcObject = stream;
        placeholder.classList.add('hidden');
    } catch (err) {
        console.error("Error accessing camera:", err);
        placeholder.innerHTML = "<span>Camera Access Denied</span>";
    }
}

function navigateTo(viewId) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Show target view
    const target = document.getElementById(`view-${viewId}`);
    if (target) {
        target.classList.add('active');
    }
    
    // Update sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const navItem = document.getElementById(`nav-${viewId}`);
    if (navItem) {
        navItem.classList.add('active');
    }
    
    if (viewId === 'admin-login') {
        // Option to actually redirect or keep as SPA
        // For now let's keep it as SPA for demo
    }
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if (!text) return;
    
    // Add user message
    addMessage('user', text);
    input.value = '';
    
    // Show typing indicator
    const typing = document.getElementById('typing-indicator');
    typing.classList.remove('hidden');
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: text,
                language: selectedLanguage
            })
        });
        
        const data = await response.json();
        
        // Hide typing indicator
        typing.classList.add('hidden');
        
        // Add AI message
        addMessage('ai', data.response);
        
        // If it's the 3rd message or something, show results button
        // For demo, let's just show it after 2 messages
        const msgs = document.querySelectorAll('.message-bubble').length;
        if (msgs >= 4) {
            document.getElementById('view-results-btn').classList.remove('hidden');
        }
        
    } catch (err) {
        console.error("Chat error:", err);
        typing.classList.add('hidden');
        addMessage('ai', "Error connecting to AI. Please try again.");
    }
}

function addMessage(sender, text) {
    const container = document.getElementById('chat-msgs');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;
    msgDiv.innerHTML = `<div class="message-bubble">${text}</div>`;
    container.appendChild(msgDiv);
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}
