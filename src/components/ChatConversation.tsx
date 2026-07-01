import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Video, Phone, MoreVertical, Smile, Paperclip, Camera, Mic, Send, Check, CheckCheck, Square, Reply, X } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { type Chat, type Message } from '../data/mockData';

interface ChatConversationProps {
  chat: Chat;
  username: string;
  onBack: () => void;
  onSendMessage: (chatId: string, text: string, imageUrl?: string, audioUrl?: string, replyTo?: string) => void;
  onEditMessage: (chatId: string, messageId: string, newText: string) => void;
  onDeleteMessage: (chatId: string, messageId: string, type: 'me' | 'everyone') => void;
  onCall: (type: 'video' | 'audio') => void;
  onTyping: (chatId: string, isTyping: boolean) => void;
  onMarkRead: () => void;
}

const ChatConversation: React.FC<ChatConversationProps> = ({ chat, username, onBack, onSendMessage, onEditMessage, onDeleteMessage, onCall, onTyping, onMarkRead }) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [replyingToMessageId, setReplyingToMessageId] = useState<string | null>(null);
  const [menuOpenForMessageId, setMenuOpenForMessageId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [wallpaperUrl, setWallpaperUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    onMarkRead(); // Mark messages read when we open or receive new msg here
  }, [chat.messages, onMarkRead]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('whatsapp_clone_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.wallpaperUrl) setWallpaperUrl(parsed.wallpaperUrl);
      }
    } catch(e) {}
  }, []);

  // Typing debounce
  useEffect(() => {
    if (inputText.length > 0) {
      onTyping(chat.id, true);
      const timeout = setTimeout(() => {
        onTyping(chat.id, false);
      }, 2000);
      return () => clearTimeout(timeout);
    } else {
      onTyping(chat.id, false);
    }
  }, [inputText, chat.id]);

  const handleSendText = () => {
    if (inputText.trim()) {
      if (editingMessageId) {
        onEditMessage(chat.id, editingMessageId, inputText.trim());
        setEditingMessageId(null);
      } else {
        onSendMessage(chat.id, inputText.trim(), undefined, undefined, replyingToMessageId || undefined);
        setReplyingToMessageId(null);
      }
      setInputText('');
      setShowEmojiPicker(false);
      onTyping(chat.id, false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSendText();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onSendMessage(chat.id, '', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          onSendMessage(chat.id, '', undefined, reader.result as string);
        };
        // Clean up tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Could not start recording", err);
      alert("Microphone access is required to send voice notes.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <>
      <div className="app-bar" style={{ padding: '8px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, cursor: 'pointer', minWidth: 0 }} onClick={onBack}>
          <ArrowLeft size={24} style={{ marginRight: '8px', flexShrink: 0 }} />
          <img src={chat.contact.avatarUrl || 'https://i.pravatar.cc/150'} alt={chat.contact.name} style={{ width: '36px', height: '36px', borderRadius: '50%', marginRight: '12px', objectFit: 'cover', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ fontSize: '16px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.contact.name}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {chat.contact.typing ? (chat.isGroup ? `${chat.contact.typing} is typing...` : 'typing...') : chat.contact.lastSeen}
            </div>
          </div>
        </div>
        <div className="app-bar-actions" style={{ gap: '20px' }}>
          <Video size={20} onClick={() => onCall('video')} style={{ cursor: 'pointer' }} />
          <Phone size={20} onClick={() => onCall('audio')} style={{ cursor: 'pointer' }} />
          <MoreVertical size={20} style={{ cursor: 'pointer' }} />
        </div>
      </div>

      <div className="chat-container" style={{ backgroundImage: wallpaperUrl ? `url(${wallpaperUrl})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="chat-messages" onClick={() => { setMenuOpenForMessageId(null); setShowEmojiPicker(false); }}>
          {chat.messages.map((message: Message) => {
            const isMe = message.senderId === username;
            return (
              <div key={message.id} className={`message-bubble ${isMe ? 'message-sent' : 'message-received'}`} style={{ position: 'relative' }}>
                {chat.isGroup && !isMe && <div style={{ fontSize: '12px', color: 'var(--primary-color)', fontWeight: 'bold', marginBottom: 4 }}>{message.senderId}</div>}
                
                {message.isDeleted ? (
                  <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>🚫 {message.text}</div>
                ) : (
                  <>
                    {message.replyTo && (
                      <div style={{ background: 'rgba(0,0,0,0.1)', padding: '4px 8px', borderRadius: 4, marginBottom: 4, borderLeft: '4px solid var(--primary-color)', fontSize: '12px' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                          {chat.messages.find(m => m.id === message.replyTo)?.senderId === username ? 'You' : chat.messages.find(m => m.id === message.replyTo)?.senderId || 'Someone'}
                        </div>
                        <div style={{ color: 'var(--text-primary)', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                           {chat.messages.find(m => m.id === message.replyTo)?.text || 'Photo/Audio'}
                        </div>
                      </div>
                    )}
                    {message.imageUrl && <img src={message.imageUrl} alt="attachment" style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: 8, marginBottom: 4 }} />}
                    {message.audioUrl && <audio controls src={message.audioUrl} style={{ width: 200, height: 40 }} />}
                    {message.text && <div>{message.text}</div>}
                  </>
                )}

                <div className="message-meta">
                  <span className="message-time">{message.timestamp}</span>
                  {message.isEdited && <span style={{ fontSize: '10px', marginLeft: 4, fontStyle: 'italic' }}>(edited)</span>}
                  {isMe && !message.isDeleted && (
                    <span className="read-receipt">
                      {message.status === 'read' ? <CheckCheck size={14} color="#53bdeb" /> : <Check size={14} color="gray" />}
                    </span>
                  )}
                </div>

                {/* Options Icon */}
                {!message.isDeleted && (
                  <div 
                    style={{ position: 'absolute', top: 4, right: isMe ? -24 : 'auto', left: isMe ? 'auto' : -24, cursor: 'pointer', color: 'var(--text-secondary)' }}
                    onClick={(e) => { e.stopPropagation(); setMenuOpenForMessageId(menuOpenForMessageId === message.id ? null : message.id); }}
                  >
                    <MoreVertical size={16} />
                  </div>
                )}

                {/* Options Menu */}
                {menuOpenForMessageId === message.id && !message.isDeleted && (
                  <div style={{
                    position: 'absolute', top: 20, right: isMe ? 0 : 'auto', left: isMe ? 'auto' : 0, background: 'var(--background-color)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)', borderRadius: 4, zIndex: 10, padding: '4px 0', minWidth: 140,
                    color: 'var(--text-primary)', fontSize: 14
                  }}>
                    <div style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={(e) => {
                      e.stopPropagation(); setReplyingToMessageId(message.id); setMenuOpenForMessageId(null);
                    }}><Reply size={16} style={{ marginRight: 8 }} /> Reply</div>
                    {isMe && message.text && (
                      <div style={{ padding: '8px 16px', cursor: 'pointer' }} onClick={(e) => {
                        e.stopPropagation(); setEditingMessageId(message.id); setInputText(message.text || ''); setMenuOpenForMessageId(null);
                      }}>Edit Message</div>
                    )}
                    {isMe && (
                      <div style={{ padding: '8px 16px', cursor: 'pointer' }} onClick={(e) => {
                        e.stopPropagation(); onDeleteMessage(chat.id, message.id, 'me'); setMenuOpenForMessageId(null);
                      }}>Delete for me</div>
                    )}
                    {isMe && (
                      <div style={{ padding: '8px 16px', cursor: 'pointer', color: 'red' }} onClick={(e) => {
                        e.stopPropagation(); onDeleteMessage(chat.id, message.id, 'everyone'); setMenuOpenForMessageId(null);
                      }}>Delete for everyone</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area" style={{ flexDirection: 'column' }}>
          {replyingToMessageId && (
            <div style={{ width: '100%', background: 'var(--panel-background)', padding: '8px 12px', borderLeft: '4px solid var(--primary-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderRadius: 4 }}>
               <div style={{ flex: 1 }}>
                 <div style={{ fontWeight: 'bold', color: 'var(--primary-color)', fontSize: 13 }}>
                   {chat.messages.find(m => m.id === replyingToMessageId)?.senderId === username ? 'You' : chat.messages.find(m => m.id === replyingToMessageId)?.senderId}
                 </div>
                 <div style={{ color: 'var(--text-secondary)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                   {chat.messages.find(m => m.id === replyingToMessageId)?.text || 'Photo/Audio'}
                 </div>
               </div>
               <X size={20} color="var(--text-secondary)" style={{ cursor: 'pointer' }} onClick={() => setReplyingToMessageId(null)} />
            </div>
          )}
          {showEmojiPicker && (
            <div style={{ position: 'absolute', bottom: '60px', left: 0, right: 0, zIndex: 100, maxWidth: '100vw', overflowX: 'hidden' }}>
              <EmojiPicker onEmojiClick={(e) => setInputText(prev => prev + e.emoji)} theme={'auto' as any} style={{ width: '100%' }} />
            </div>
          )}
          <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
            <div className="input-pill" style={{ overflow: 'hidden', flex: 1 }}>
              {isRecording ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 8px', color: 'red', fontWeight: 'bold' }}>
                  <Mic size={20} style={{ marginRight: 8, animation: 'pulse 1s infinite' }} />
                  Recording... {formatTime(recordingTime)}
                </div>
              ) : (
                <>
                  <Smile className="input-icon" size={24} onClick={() => setShowEmojiPicker(!showEmojiPicker)} />
                  <input 
                    type="text" className="input-field" placeholder="Message" 
                    value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={handleKeyDown}
                  />
                  <Paperclip className="input-icon" size={24} style={{ marginRight: '12px' }} onClick={() => fileInputRef.current?.click()} />
                  <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageUpload} />
                  {inputText.length === 0 && <Camera className="input-icon" size={24} onClick={() => fileInputRef.current?.click()} />}
                </>
              )}
            </div>

          
            {isRecording ? (
              <button className="send-button" onClick={stopRecording} style={{ background: 'red' }}>
                <Square size={20} fill="white" />
              </button>
            ) : (
              <button className="send-button" onClick={inputText.length > 0 ? handleSendText : startRecording}>
                {inputText.length > 0 ? <Send size={20} style={{ marginLeft: '4px' }} /> : <Mic size={24} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatConversation;
