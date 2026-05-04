// --- APP DATA ---
const ROLES = [
  { id: 'electrician', title: 'Electrician', desc: 'Wiring, Motors, 3-Phase', icon: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>' },
  { id: 'plumber', title: 'Plumber', desc: 'Piping, Pressure, Joints', icon: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM8 13h8v-2H8v2z"></path>' },
  { id: 'welder', title: 'Welder', desc: 'MIG/TIG, Safety, Prep', icon: '<path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"></path>' },
  { id: 'driver', title: 'Commercial Driver', desc: 'Safety, Logistics, Laws', icon: '<path d="M1 3h15v13H1V3zm15 5h4l3 5v3h-7V8zM5.5 18.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm13 0a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"></path>' }
];

const SCENARIOS = {
  electrician: { title: "3-Phase Motor Failure", desc: "A 3-phase motor suddenly stops working on a construction site. There is no burning smell and the circuit breaker hasn't tripped. Walk us through your first 5 diagnostic steps." },
  plumber: { title: "Major Leak Diagnosis", desc: "A luxury apartment reports a sudden pressure drop in the entire B-wing. No surface flooding is visible. What is your sequence of checks to find the underground leak?" },
  welder: { title: "Critical Joint Prep", desc: "You are tasked with a vertical butt joint on 12mm steel plate for a structural column. What are your prep steps, bevel angle, and initial machine settings?" },
  driver: { title: "Brake Fade Crisis", desc: "You are descending a steep ghat road with a full load and notice 'soft' brakes. Describe your immediate safety actions and technical explanation of the failure." }
};

const INTERVIEW_QUESTIONS = {
  electrician: [
    "Good. You mentioned checking the contactor. How do you verify if a coil is burnt out without using a multimeter?",
    "If you find phase imbalance at the isolator, what would be your next check upstream?",
    "Why is it dangerous to simply reset the overload relay without investigating the current draw?"
  ],
  plumber: ["How do you test for hidden leaks using a pressure gauge?", "What are the common signs of cavitation in a booster pump?", "Describe the process of pressure testing a multi-story plumbing system."],
  welder: ["What are the key indicators of a cold lap in a structural weld?", "How do you adjust your technique for welding in high-humidity environments?", "Describe the safety precautions when welding near pressurized gas lines."],
  driver: ["What are the legal driving hour limits for commercial vehicles in your region?", "How do you handle a tire blowout at highway speeds?", "Describe the pre-trip inspection routine for a heavy-duty truck."]
};

// --- APP STATE ---
let state = {
  currentView: 'landing',
  selectedRole: 'electrician',
  selectedLang: 'Hindi',
  assessmentPhase: 0,
  chatStep: 0,
  stream: null,
  flags: 0,
  isTyping: false
};

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
  renderRoles();
  updateView();
});

function renderRoles() {
  const grid = document.getElementById('role-grid');
  if (!grid) return;
  grid.innerHTML = ROLES.map(role => `
    <div class="role-card ${state.selectedRole === role.id ? 'selected' : ''}" onclick="selectRole('${role.id}')">
      <div class="role-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24">${role.icon}</svg></div>
      <div class="role-title">${role.title}</div>
      <div class="role-desc">${role.desc}</div>
    </div>
  `).join('');
}

// --- NAVIGATION ---
function navigateTo(viewId) {
  // Cleanup camera if leaving assessment
  if (state.currentView === 'candidate' && viewId !== 'candidate') {
    stopCamera();
  }

  state.currentView = viewId;
  updateView();
}

function updateView() {
  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  // Show target
  const target = document.getElementById(`view-${state.currentView}`);
  if (target) target.classList.add('active');

  // Update Nav
  document.querySelectorAll('.nav-item').forEach(ni => ni.classList.remove('active'));
  const activeNav = document.getElementById(`nav-${state.currentView}`);
  if (activeNav) activeNav.classList.add('active');
}

// --- LANDING LOGIC ---
function selectRole(roleId) {
  state.selectedRole = roleId;
  renderRoles();
}

function selectLanguage(lang) {
  state.selectedLang = lang;
  document.querySelectorAll('.lang-pill').forEach(p => {
    p.classList.toggle('selected', p.textContent === lang);
  });
}

function startAssessment() {
  navigateTo('candidate');
  goToPhase(0);
}

// --- ASSESSMENT LOGIC ---
function goToPhase(phaseIndex) {
  state.assessmentPhase = phaseIndex;
  
  // Update Step UI
  document.querySelectorAll('.step-item').forEach((item, idx) => {
    item.classList.toggle('active', idx === phaseIndex);
    item.classList.toggle('done', idx < phaseIndex);
  });

  // Show/Hide Phase Containers
  document.getElementById('phase-scenario').classList.toggle('hidden', phaseIndex !== 0);
  document.getElementById('phase-interview').classList.toggle('hidden', phaseIndex !== 1);
  document.getElementById('phase-results').classList.toggle('hidden', phaseIndex !== 2);

  if (phaseIndex === 0) {
    const scenario = SCENARIOS[state.selectedRole];
    document.getElementById('scenario-title').textContent = scenario.title;
    document.getElementById('scenario-desc').textContent = scenario.desc;
  }

  if (phaseIndex === 1) {
    startInterviewFlow();
  }

  if (phaseIndex === 2) {
    renderSkillBars();
  }
}

// --- CAMERA LOGIC ---
async function startCamera() {
  const video = document.getElementById('webcam');
  const placeholder = document.getElementById('camera-placeholder');
  
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 1280, height: 720 }, 
      audio: true 
    });
    video.srcObject = state.stream;
    placeholder.classList.add('hidden');
    console.log("Camera started successfully");
  } catch (err) {
    console.error("Error accessing camera:", err);
    placeholder.innerHTML = `<svg style="color:var(--accent-danger)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                             <span style="color:var(--accent-danger)">Camera Access Denied</span>`;
  }
}

function stopCamera() {
  if (state.stream) {
    state.stream.getTracks().forEach(track => track.stop());
    state.stream = null;
  }
}

// --- INTERVIEW FLOW ---
function startInterviewFlow() {
  startCamera();
  document.getElementById('chat-msgs').innerHTML = '';
  state.chatStep = 0;
  state.flags = 0;
  updateFlags();

  setTimeout(() => {
    addMessage('ai', `Welcome to your ${state.selectedRole} interview. I've analyzed your initial scenario response. Let's dive deeper.`);
    setTimeout(() => askNextQuestion(), 1500);
  }, 1000);

  // Start fake monitoring
  startSimulation();
}

function askNextQuestion() {
  const qs = INTERVIEW_QUESTIONS[state.selectedRole] || INTERVIEW_QUESTIONS.electrician;
  if (state.chatStep < qs.length) {
    addMessage('ai', qs[state.chatStep]);
  } else {
    addMessage('ai', "Thank you. I have sufficient data for your assessment. You may now view your results.");
    document.getElementById('view-results-btn').classList.remove('hidden');
  }
}

function sendMessage() {
  const input = document.getElementById('user-input');
  const text = input.value.trim();
  if (!text || state.isTyping) return;

  addMessage('user', text);
  input.value = '';
  
  state.chatStep++;
  
  // AI thinking delay
  showTyping(true);
  setTimeout(() => {
    showTyping(false);
    askNextQuestion();
  }, 1500 + Math.random() * 1000);
}

function addMessage(sender, text) {
  const container = document.getElementById('chat-msgs');
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${sender}`;
  
  const avatar = sender === 'ai' ? 'AI' : 'YOU';
  
  msgDiv.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-bubble">${text}</div>
  `;
  
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function showTyping(show) {
  state.isTyping = show;
  const indicator = document.getElementById('typing-indicator');
  if (indicator) indicator.classList.toggle('hidden', !show);
  const container = document.getElementById('chat-msgs');
  if (container) container.scrollTop = container.scrollHeight;
}

// --- SIMULATION (INTEGRITY) ---
function startSimulation() {
  const events = [
    { time: 10000, type: 'gaze', msg: 'Looking away', status: 'status-warn' },
    { time: 25000, type: 'audio', msg: 'Background noise', status: 'status-warn' },
    { time: 40000, type: 'gaze', msg: 'Multiple faces?', status: 'status-warn' }
  ];

  events.forEach(ev => {
    setTimeout(() => {
      if (state.assessmentPhase !== 1) return;
      state.flags++;
      updateFlags();
      const target = ev.type === 'gaze' ? 'stat-gaze' : 'stat-audio';
      const el = document.getElementById(target);
      if (!el) return;
      const originalText = el.textContent;
      const originalClass = el.className;
      
      el.textContent = ev.msg;
      el.className = `monitor-status ${ev.status}`;
      
      setTimeout(() => {
        el.textContent = originalText;
        el.className = originalClass;
      }, 4000);
    }, ev.time);
  });
}

function updateFlags() {
  const el = document.getElementById('fraud-count');
  if (el) el.textContent = state.flags;
}

// --- RESULTS RENDERING ---
function renderSkillBars() {
  const container = document.getElementById('skill-results-container');
  if (!container) return;
  const skills = [
    { name: 'Technical Knowledge', val: 88, tag: 'Strong' },
    { name: 'Safety Protocols', val: 92, tag: 'Excellent' },
    { name: 'Problem Solving', val: 76, tag: 'Good' },
    { name: 'Communication', val: 81, tag: 'Strong' }
  ];

  container.innerHTML = `<h3 style="margin-bottom: 16px; font-size: 14px; text-transform: uppercase; color: var(--text-dim);">Competency Breakdown</h3>` + 
    skills.map(s => `
      <div class="skill-row">
        <span class="skill-name">${s.name}</span>
        <div class="skill-bar-outer"><div class="skill-bar-inner" style="width: 0" data-target="${s.val}"></div></div>
        <span class="skill-tag status-ok">${s.tag}</span>
      </div>
    `).join('');

  // Animate bars
  setTimeout(() => {
    container.querySelectorAll('.skill-bar-inner').forEach(bar => {
      bar.style.width = bar.dataset.target + '%';
    });
  }, 100);
}

// --- ADMIN LOGIC ---
function tryAdminLogin() {
  const user = document.getElementById('admin-user').value;
  const pass = document.getElementById('admin-pass').value;
  
  if (user === 'admin' && pass === 'admin123') {
    navigateTo('admin');
    renderCandidateTable();
  } else {
    const err = document.getElementById('login-error');
    if (err) err.classList.remove('hidden');
  }
}

function logout() {
  navigateTo('landing');
}

function renderCandidateTable() {
  const rows = [
    { name: 'Ramesh Kumar', trade: 'Electrician', skill: 84, trust: 98, risk: 'Low' },
    { name: 'Suresh Raina', trade: 'Welder', skill: 91, trust: 94, risk: 'Low' },
    { name: 'Anita Desai', trade: 'Electrician', skill: 62, trust: 45, risk: 'High' },
    { name: 'Priya Singh', trade: 'Plumber', skill: 77, trust: 92, risk: 'Low' }
  ];

  const tbody = document.getElementById('candidate-rows');
  if (!tbody) return;
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td><strong>${r.name}</strong></td>
      <td>${r.trade}</td>
      <td><span class="badge" style="margin:0; background:rgba(79,127,255,0.1)">${r.skill}%</span></td>
      <td>${r.trust}%</td>
      <td><span class="skill-tag ${r.risk === 'High' ? 'status-warn' : 'status-ok'}">${r.risk}</span></td>
      <td><button class="lang-pill" style="padding:4px 12px; font-size:11px" onclick="navigateTo('scorecard')">Details</button></td>
    </tr>
  `).join('');
}
