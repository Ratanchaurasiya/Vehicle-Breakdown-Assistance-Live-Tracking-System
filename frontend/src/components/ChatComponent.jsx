import { useState, useEffect, useRef } from 'react';
import { Send, Phone, PhoneOff, Mic, MicOff, Volume2, X } from 'lucide-react';

export default function ChatComponent({ socket, requestId, role, recipientName, recipientAvatar, onClose }) {
  const [messages, setMessages] = useState([
    { sender: 'system', text: `Chat connection initialized with ${recipientName}.`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [inputText, setInputText] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [callState, setCallState] = useState('idle'); // idle, dialing, active, ended
  const [callSeconds, setCallSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  
  const messagesEndRef = useRef(null);
  const timerRef = useRef(null);

  // Listen for incoming chat messages
  useEffect(() => {
    if (!socket) return;

    socket.on('chat_received', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off('chat_received');
    };
  }, [socket]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Timer for active call
  useEffect(() => {
    if (callState === 'active') {
      timerRef.current = setInterval(() => {
        setCallSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      if (callState === 'idle') setCallSeconds(0);
    }

    return () => clearInterval(timerRef.current);
  }, [callState]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;

    const newMsg = {
      requestId,
      sender: role,
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Send via WebSocket
    socket.emit('send_chat', newMsg);

    // Add locally immediately
    setMessages(prev => [...prev, { sender: role, text: inputText, time: newMsg.time }]);
    setInputText('');
  };

  const startCall = () => {
    setIsCalling(true);
    setCallState('dialing');
    
    // Simulate dialing for 2.5 seconds, then connect
    setTimeout(() => {
      setCallState('active');
    }, 2500);
  };

  const endCall = () => {
    setCallState('ended');
    setTimeout(() => {
      setIsCalling(false);
      setCallState('idle');
      setCallSeconds(0);
    }, 1500);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="glass-panel animate-slide-up" style={{ height: '480px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      
      {/* Chat Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={recipientAvatar} alt="avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid var(--border)' }} />
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>{recipientName}</div>
            <div style={{ fontSize: '11px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="status-dot active"></span> Active Messenger
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={startCall} className="btn-secondary" style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Phone size={15} style={{ color: 'var(--success)' }} />
          </button>
          {onClose && (
            <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-secondary)' }}>
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((msg, index) => {
          if (msg.sender === 'system') {
            return (
              <div key={index} style={{ alignSelf: 'center', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', textAlign: 'center' }}>
                {msg.text}
              </div>
            );
          }
          const isOwn = msg.sender === role;
          return (
            <div key={index} style={{ alignSelf: isOwn ? 'flex-end' : 'flex-start', maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
              <div 
                style={{ 
                  background: isOwn ? 'var(--primary)' : 'var(--bg-tertiary)', 
                  color: '#fff', 
                  padding: '10px 14px', 
                  borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  fontSize: '13px',
                  lineHeight: '1.4'
                }}
              >
                {msg.text}
              </div>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', padding: '0 4px' }}>
                {msg.time}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form onSubmit={sendMessage} style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.1)' }}>
        <input 
          type="text" 
          placeholder={`Type message to ${recipientName}...`} 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn-primary" style={{ width: '40px', height: '40px', borderRadius: '8px', flexShrink: 0 }}>
          <Send size={16} />
        </button>
      </form>

      {/* VoIP Calling Overlay */}
      {isCalling && (
        <div 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'var(--bg-primary)', 
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img 
              src={recipientAvatar} 
              alt="avatar" 
              style={{ 
                width: '90px', 
                height: '90px', 
                borderRadius: '50%', 
                border: '3px solid var(--primary)', 
                marginBottom: '16px',
                animation: callState === 'dialing' ? 'pulse-pin 1.5s infinite' : 'none'
              }} 
            />
            <h3 style={{ fontSize: '20px', color: '#fff', marginBottom: '6px' }}>{recipientName}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'capitalize' }}>
              {callState === 'dialing' && 'Ringing...'}
              {callState === 'active' && 'Call Connected'}
              {callState === 'ended' && 'Call Ended'}
            </p>
            {callState === 'active' && (
              <p style={{ color: 'var(--success)', fontFamily: 'monospace', fontSize: '18px', marginTop: '8px', fontWeight: 'bold' }}>
                {formatTime(callSeconds)}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '20px', marginTop: '30px' }}>
            <button 
              onClick={() => setIsMuted(!isMuted)} 
              className="btn-secondary" 
              style={{ width: '50px', height: '50px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              {isMuted ? <MicOff size={20} style={{ color: 'var(--error)' }} /> : <Mic size={20} />}
            </button>
            
            <button 
              onClick={endCall} 
              className="btn-danger" 
              style={{ width: '50px', height: '50px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              <PhoneOff size={20} />
            </button>
            
            <button 
              className="btn-secondary" 
              style={{ width: '50px', height: '50px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              <Volume2 size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
