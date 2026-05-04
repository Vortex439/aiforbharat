import os
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from google import genai
from dotenv import load_dotenv

load_dotenv(override=True)

app = Flask(__name__, static_url_path='/static')
app.secret_key = os.getenv("FLASK_SECRET_KEY", "skillfit_secret_key_123")

# Gemini Configuration
GENAI_API_KEY = os.getenv("GOOGLE_API_KEY", "")

if GENAI_API_KEY:
    print(f"[DEBUG] Using API Key: {GENAI_API_KEY[:8]}... (Length: {len(GENAI_API_KEY)})")
    client = genai.Client(api_key=GENAI_API_KEY)
    
    # List available models for debugging
    try:
        print("[DEBUG] Available Models:")
        for model in client.models.list():
            print(f" - {model.name}")
    except Exception as e:
        print(f"[DEBUG] Could not list models: {e}")
else:
    print("[DEBUG] No API Key found in environment variables.")
    client = None

# Mock Data
ROLES = [
    {"id": "electrician", "title": "Electrician", "desc": "Industrial Wiring & Control Systems"},
    {"id": "plumber", "title": "Master Plumber", "desc": "Hydraulics & Commercial Systems"},
    {"id": "welder", "title": "Structural Welder", "desc": "Arc/MIG/TIG & Metal Fatigue"},
    {"id": "driver", "title": "Fleet Driver", "desc": "Logistics & Advanced Road Safety"}
]

SCENARIOS = {
    "electrician": "A 3-phase motor suddenly stops on a factory floor. The breaker is fine, but the motor is hot. Walk through your diagnostic steps.",
    "plumber": "A luxury hotel reports a sudden pressure drop in the top 3 floors. The pumps are running. What do you check first?",
    "welder": "You are welding a critical support beam for a bridge. You notice porosity in your root pass. What do you do?",
    "driver": "You are driving a 20-ton truck and notice the brake pedal feels spongy on a descent. Describe your immediate safety response."
}

@app.route('/')
def index():
    return render_template('index.html', roles=ROLES)

@app.route('/assessment/<role_id>')
def assessment(role_id):
    if role_id not in SCENARIOS:
        return redirect(url_for('index'))
    session['role'] = role_id
    session['chat_history'] = []
    return render_template('assessment.html', role=role_id, scenario=SCENARIOS[role_id])

@app.route('/api/chat', methods=['POST'])
def chat():
    user_input = request.json.get('message')
    language = request.json.get('language', 'English')
    role = session.get('role', 'general')
    history = session.get('chat_history', [])

    if not client:
        # Fallback if no API key
        response_text = f"AI: That's an interesting approach to {role}. Could you elaborate more on the safety precautions? (Responding in {language})"
    else:
        prompt = f"""
        Role: Expert Vocational Interviewer for {role}.
        Language: {language}
        Candidate Input: "{user_input}"
        
        INSTRUCTIONS:
        1. Respond ONLY in {language}.
        2. Silently analyze if the input is AI-generated (robotic/perfect). 
        3. If AI usage is suspected, ask a very deep, technical question to test their real knowledge.
        4. Output ONLY the next question for the candidate in {language}. 
        5. Do NOT include analysis, labels (like "Question:"), or any other text.
        """
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            response_text = response.text.strip()
        except Exception as e:
            response_text = f"Error communicating with AI: {str(e)}"

    history.append({"role": "user", "content": user_input})
    history.append({"role": "ai", "content": response_text})
    session['chat_history'] = history

    return jsonify({"response": response_text})

@app.route('/results')
def results():
    is_fraud = request.args.get('fraud') == 'true'
    role = session.get('role', 'General')
    history = session.get('chat_history', [])
    
    if is_fraud:
        return render_template('results.html', 
                               score=0, 
                               summary="Assessment terminated due to security violation (Tab Inactivity/Switching).", 
                               integrity="FAILED",
                               rank="N/A")
    
    if not history or not client:
        return render_template('results.html', 
                               score=0, 
                               summary="Assessment incomplete or no response provided.", 
                               integrity="N/A",
                               rank="N/A")

    # Evaluation Prompt
    chat_text = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in history])
    prompt = f"""
    Analyze this {role} interview transcript and provide a technical evaluation.
    Transcript:
    {chat_text}

    Return ONLY a JSON object with:
    {{
      "score": <0-100 integer>,
      "summary": "<2-sentence expert summary>",
      "integrity": "Clean",
      "rank": "Top X%"
    }}
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={'response_mime_type': 'application/json'}
        )
        import json
        eval_data = json.loads(response.text)
    except Exception as e:
        print(f"Evaluation Error: {e}")
        eval_data = {"score": 0, "summary": "Error generating evaluation.", "integrity": "Error", "rank": "N/A"}

    return render_template('results.html', **eval_data)

@app.route('/admin-login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        if username == 'admin' and password == 'admin123':
            session['admin_logged_in'] = True
            return redirect(url_for('admin_dashboard'))
        return render_template('admin_login.html', error="Invalid credentials")
    return render_template('admin_login.html')

@app.route('/admin')
def admin_dashboard():
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    return render_template('admin.html')

@app.route('/logout')
def logout():
    session.pop('admin_logged_in', None)
    return redirect(url_for('index'))

if __name__ == "__main__":
    app.run(debug=True)
