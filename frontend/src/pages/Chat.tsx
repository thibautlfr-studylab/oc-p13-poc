import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import { createSocket } from '../socket';

interface Message {
  id: string;
  content: string;
  senderEmail: string;
  senderRole: string;
  sentAt: string;
}

interface WaitingSession {
  sessionId: string;
  clientEmail: string;
  startedAt: string;
}

export default function Chat() {
  const navigate = useNavigate();
  const role = localStorage.getItem('role') ?? '';
  const email = localStorage.getItem('email') ?? '';

  const socketRef = useRef<ReturnType<typeof createSocket> | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'waiting' | 'active' | 'ended'>('idle');
  const [waitingSessions, setWaitingSessions] = useState<WaitingSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket: Socket = createSocket() as Socket;
    socketRef.current = socket as ReturnType<typeof createSocket>;
    socket.connect();

    socket.on('session_created', ({ sessionId: id }: { sessionId: string }) => {
      setSessionId(id);
      setSessionStatus('waiting');
    });

    socket.on('session_available', (session: WaitingSession) => {
      if (role === 'agent') {
        setWaitingSessions((prev) => [...prev, session]);
      }
    });

    socket.on('session_taken', ({ sessionId: id }: { sessionId: string }) => {
      setWaitingSessions((prev) => prev.filter((s) => s.sessionId !== id));
    });

    socket.on('session_started', ({ agentEmail }: { agentEmail?: string; sessionId: string }) => {
      setSessionStatus('active');
      const info: Message = {
        id: 'sys-started',
        content: role === 'client'
          ? `Un agent (${agentEmail ?? ''}) a rejoint la session.`
          : 'Vous avez rejoint la session.',
        senderEmail: 'système',
        senderRole: 'system',
        sentAt: new Date().toISOString(),
      };
      setMessages([info]);
    });

    socket.on('receive_message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('session_ended', () => {
      setSessionStatus('ended');
      setMessages((prev) => [
        ...prev,
        {
          id: 'sys-ended',
          content: 'La session a été terminée.',
          senderEmail: 'système',
          senderRole: 'system',
          sentAt: new Date().toISOString(),
        },
      ]);
    });

    // Agent : récupère les sessions en attente au moment de la connexion
    if (role === 'agent') {
      fetch('/api/auth/sessions', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
        .then((r) => r.json())
        .then((data: Array<{ id: string; user: { email: string }; startedAt: string }>) => {
          setWaitingSessions(
            data.map((s) => ({
              sessionId: s.id,
              clientEmail: s.user.email,
              startedAt: s.startedAt,
            }))
          );
        })
        .catch(() => {});
    }

    return () => {
      socket.disconnect();
    };
  }, [role]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startSession = () => {
    socketRef.current?.emit('start_session');
  };

  const joinSession = (id: string) => {
    setSessionId(id);
    socketRef.current?.emit('join_session', { sessionId: id });
    setWaitingSessions((prev) => prev.filter((s) => s.sessionId !== id));
  };

  const sendMessage = () => {
    if (!input.trim() || !sessionId) return;
    socketRef.current?.emit('send_message', { sessionId, content: input.trim() });
    setInput('');
  };

  const endSession = () => {
    if (!sessionId) return;
    socketRef.current?.emit('end_session', { sessionId });
  };

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <span style={styles.headerTitle}>Your Car Your Way — Support Chat PoC</span>
        <span style={styles.headerUser}>
          {email} ({role})
        </span>
        <button onClick={logout} style={styles.logoutBtn}>Déconnexion</button>
      </header>

      <main style={styles.main}>
        {/* Vue CLIENT */}
        {role === 'client' && (
          <div style={styles.container}>
            {sessionStatus === 'idle' && (
              <div style={styles.centered}>
                <p>Bienvenue dans le support chat.</p>
                <button onClick={startSession} style={styles.primaryBtn}>
                  Démarrer un chat avec le support
                </button>
              </div>
            )}

            {sessionStatus === 'waiting' && (
              <div style={styles.centered}>
                <p>En attente d'un agent disponible…</p>
                <div style={styles.spinner} />
              </div>
            )}

            {(sessionStatus === 'active' || sessionStatus === 'ended') && (
              <ChatWindow
                messages={messages}
                input={input}
                setInput={setInput}
                onSend={sendMessage}
                onEnd={endSession}
                canSend={sessionStatus === 'active'}
                messagesEndRef={messagesEndRef}
                currentEmail={email}
              />
            )}
          </div>
        )}

        {/* Vue AGENT */}
        {role === 'agent' && (
          <div style={styles.agentLayout}>
            <aside style={styles.sidebar}>
              <h3 style={{ margin: '0 0 12px' }}>Sessions en attente</h3>
              {waitingSessions.length === 0 ? (
                <p style={{ color: '#888', fontSize: '0.85rem' }}>Aucune session en attente.</p>
              ) : (
                waitingSessions.map((s) => (
                  <div key={s.sessionId} style={styles.sessionCard}>
                    <span style={{ fontSize: '0.85rem' }}>{s.clientEmail}</span>
                    <button onClick={() => joinSession(s.sessionId)} style={styles.joinBtn}>
                      Rejoindre
                    </button>
                  </div>
                ))
              )}
            </aside>

            <div style={{ flex: 1 }}>
              {!sessionId ? (
                <div style={styles.centered}>
                  <p>Sélectionnez une session à rejoindre.</p>
                </div>
              ) : (sessionStatus === 'active' || sessionStatus === 'ended') ? (
                <ChatWindow
                  messages={messages}
                  input={input}
                  setInput={setInput}
                  onSend={sendMessage}
                  onEnd={endSession}
                  canSend={sessionStatus === 'active'}
                  messagesEndRef={messagesEndRef}
                  currentEmail={email}
                />
              ) : (
                <div style={styles.centered}>
                  <p>Connexion à la session…</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ChatWindow({
  messages,
  input,
  setInput,
  onSend,
  onEnd,
  canSend,
  messagesEndRef,
  currentEmail,
}: {
  messages: Message[];
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onEnd: () => void;
  canSend: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  currentEmail: string;
}) {
  return (
    <div style={styles.chatWindow}>
      <div style={styles.messageList}>
        {messages.map((msg) => {
          const isSelf = msg.senderEmail === currentEmail;
          const isSystem = msg.senderRole === 'system';
          return (
            <div
              key={msg.id}
              style={{
                ...styles.messageBubble,
                alignSelf: isSystem ? 'center' : isSelf ? 'flex-end' : 'flex-start',
                background: isSystem ? '#f0f0f0' : isSelf ? '#e63946' : '#2a9d8f',
                color: isSystem ? '#555' : '#fff',
                fontStyle: isSystem ? 'italic' : 'normal',
              }}
            >
              {!isSystem && (
                <span style={styles.sender}>{isSelf ? 'Vous' : msg.senderEmail}</span>
              )}
              <span>{msg.content}</span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {canSend && (
        <div style={styles.inputRow}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSend()}
            placeholder="Écrivez un message…"
            style={styles.chatInput}
          />
          <button onClick={onSend} style={styles.sendBtn}>Envoyer</button>
          <button onClick={onEnd} style={styles.endBtn}>Terminer</button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif', background: '#f5f5f5' },
  header: {
    display: 'flex', alignItems: 'center', gap: '1rem',
    padding: '12px 20px', background: '#1a1a2e', color: '#fff',
  },
  headerTitle: { fontWeight: 700, fontSize: '1rem', flex: 1 },
  headerUser: { fontSize: '0.85rem', color: '#ccc' },
  logoutBtn: { padding: '6px 12px', background: 'transparent', color: '#fff', border: '1px solid #fff', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' },
  main: { flex: 1, display: 'flex', overflow: 'hidden' },
  container: { flex: 1, display: 'flex', flexDirection: 'column' },
  centered: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' },
  primaryBtn: { padding: '12px 24px', background: '#e63946', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '1rem', cursor: 'pointer', fontWeight: 600 },
  spinner: { width: 32, height: 32, border: '3px solid #ccc', borderTop: '3px solid #e63946', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  agentLayout: { display: 'flex', flex: 1, overflow: 'hidden' },
  sidebar: { width: 260, background: '#fff', borderRight: '1px solid #ddd', padding: '16px', overflowY: 'auto' },
  sessionCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', marginBottom: '8px', background: '#f9f9f9', borderRadius: '6px', border: '1px solid #e0e0e0' },
  joinBtn: { padding: '4px 10px', background: '#2a9d8f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 },
  chatWindow: { flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: '8px' },
  messageList: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' },
  messageBubble: { maxWidth: '65%', padding: '8px 12px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '2px' },
  sender: { fontSize: '0.7rem', opacity: 0.75, marginBottom: '2px' },
  inputRow: { display: 'flex', gap: '8px' },
  chatInput: { flex: 1, padding: '10px 14px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.95rem' },
  sendBtn: { padding: '10px 16px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 },
  endBtn: { padding: '10px 16px', background: '#e63946', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 },
};
