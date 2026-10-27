// FairShift — Progressive Enhancement Client Script
document.addEventListener('DOMContentLoaded', () => {
  // 1. Voice dictation for Grievance & Safety Reports
  const voiceBtn = document.getElementById('voiceBtn');
  const reportText = document.getElementById('reportText');
  const voiceStatus = document.getElementById('voiceStatus');

  if (voiceBtn && reportText) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      
      // Match document language
      const docLang = document.documentElement.lang || 'en';
      recognition.lang = docLang === 'ta' ? 'ta-IN' : (docLang === 'hi' ? 'hi-IN' : 'en-IN');

      let isListening = false;

      voiceBtn.addEventListener('click', () => {
        if (!isListening) {
          try {
            recognition.start();
            isListening = true;
            voiceBtn.classList.add('primary');
            if (voiceStatus) voiceStatus.textContent = 'Listening... Speak now into your microphone.';
          } catch (e) {
            console.error('Speech recognition error', e);
          }
        } else {
          recognition.stop();
        }
      });

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (reportText.value) {
          reportText.value += ' ' + transcript;
        } else {
          reportText.value = transcript;
        }
        if (voiceStatus) voiceStatus.textContent = 'Voice text captured.';
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (voiceStatus) voiceStatus.textContent = 'Could not capture speech. Please type your message.';
        isListening = false;
        voiceBtn.classList.remove('primary');
      };

      recognition.onend = () => {
        isListening = false;
        voiceBtn.classList.remove('primary');
        setTimeout(() => {
          if (voiceStatus && voiceStatus.textContent === 'Listening...') {
            voiceStatus.textContent = '';
          }
        }, 3000);
      };
    } else {
      voiceBtn.style.display = 'none';
    }
  }

  // 2. Audio Narration / Text-to-Speech (TTS) for low-literacy workers
  const ttsButtons = document.querySelectorAll('.tts-btn');
  if ('speechSynthesis' in window) {
    ttsButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-text');
        if (!text) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const docLang = document.documentElement.lang || 'en';
        utterance.lang = docLang === 'ta' ? 'ta-IN' : (docLang === 'hi' ? 'hi-IN' : 'en-IN');
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
      });
    });
  } else {
    ttsButtons.forEach((btn) => (btn.style.display = 'none'));
  }

  // 3. Dispute Confirmation
  const disputeForms = document.querySelectorAll('form[action="/w/payslip/dispute"]');
  disputeForms.forEach((form) => {
    form.addEventListener('submit', (e) => {
      if (!confirm('Flag this shift for review? The disputed hours will be held for manager verification.')) {
        e.preventDefault();
      }
    });
  });
});
