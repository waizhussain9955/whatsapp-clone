import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Moon, Sun } from 'lucide-react';
import ChatList from './components/ChatList';
import ChatConversation from './components/ChatConversation';
import CallScreen from './components/CallScreen';
import ProfileSettings from './components/ProfileSettings';
import AddContactModal from './components/AddContactModal';
import StatusView, { type StatusUpdate } from './components/StatusView';
import { type Chat, type Message, type CallLog } from './data/mockData';

const SERVER_URL = 'http://localhost:5000';

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userProfile, setUserProfile] = useState({ id: '', name: '', avatarUrl: '', about: 'Available' });
  const [isRegistered, setIsRegistered] = useState(false);
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  
  const [statuses, setStatuses] = useState<StatusUpdate[]>([]);
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [statusViewData, setStatusViewData] = useState<StatusUpdate[] | null>(null);

  const selectedChatIdRef = useRef(selectedChatId);
  const userProfileRef = useRef(userProfile);

  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);
  
  const [darkMode, setDarkMode] = useState(false);

  // WebRTC Call State
  const [callState, setCallState] = useState<'idle' | 'calling' | 'receiving' | 'accepted'>('idle');
  const [caller, setCaller] = useState('');
  const [callerSignal, setCallerSignal] = useState<any>(null);
  const [callType, setCallType] = useState<'video' | 'audio'>('video');
  const [currentCallId, setCurrentCallId] = useState('');

  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const connectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    if (!isRegistered) return;

    const newSocket = io(SERVER_URL);
    setSocket(newSocket);
    newSocket.on('connect', () => {
      // Generate avatar if none provided
      const up = userProfileRef.current;
      const finalProfile = { ...up, avatarUrl: up.avatarUrl || `https://ui-avatars.com/api/?name=${up.name}&background=075E54&color=fff` };
      setUserProfile(finalProfile);
      newSocket.emit('register', finalProfile);
    });

    newSocket.on('initData', (data: { history: Message[], contacts: any[], statuses: StatusUpdate[], calls: CallLog[] }) => {
      const restoredChats: Chat[] = data.contacts.map(contact => {
        const contactMessages = data.history.filter(m => m.senderId === contact.id || m.receiverId === contact.id);
        return {
          id: contact.id,
          contact: { ...contact, isOnline: false, lastSeen: 'offline' },
          messages: contactMessages,
          unreadCount: contactMessages.filter(m => m.senderId === contact.id && m.status !== 'read').length
        };
      });

      data.history.forEach(m => {
        const up = userProfileRef.current;
        const otherId = m.senderId === up.id ? m.receiverId : m.senderId;
        if (!restoredChats.find(c => c.id === otherId)) {
          const contactMessages = data.history.filter(msg => msg.senderId === otherId || msg.receiverId === otherId);
          restoredChats.push({
            id: otherId,
            contact: { id: otherId, name: otherId, avatarUrl: `https://ui-avatars.com/api/?name=${otherId}&background=075E54&color=fff`, isOnline: false, lastSeen: 'offline' },
            messages: contactMessages,
            unreadCount: contactMessages.filter(msg => msg.senderId === otherId && msg.status !== 'read').length
          });
        }
      });

      setChats(restoredChats);
      setStatuses(data.statuses || []);
      setCalls(data.calls || []);
    });

    newSocket.on('callHistory', (newCalls: CallLog[]) => {
      setCalls(newCalls);
    });

    newSocket.on('newStatus', (status: StatusUpdate) => {
      setStatuses(prev => [...prev, status]);
    });

    newSocket.on('users', (users) => {
      setChats(prev => {
        const nextChats = [...prev];
        nextChats.forEach(c => {
          if (!c.isGroup && !c.id.startsWith('chat')) {
            const onlineUser = users.find((u: any) => u.id === c.id);
            c.contact.isOnline = !!onlineUser;
            c.contact.lastSeen = onlineUser ? 'online' : 'offline';
            if (onlineUser) {
               // Sync profile changes
               c.contact.name = onlineUser.name;
               c.contact.avatarUrl = onlineUser.avatarUrl;
               c.contact.about = onlineUser.about;
            }
          }
        });
        return nextChats;
      });
    });

    newSocket.on('groups', (groups) => {
      setChats(prev => {
        const nextChats = [...prev];
        groups.forEach((g: any) => {
          if (g.members.includes(userProfileRef.current.id)) {
            const existingIdx = nextChats.findIndex(c => c.id === g.id);
            if (existingIdx === -1) {
              nextChats.push({
                id: g.id,
                contact: { id: g.id, name: g.name, avatarUrl: `https://ui-avatars.com/api/?name=${g.name}&background=128C7E&color=fff` },
                messages: [],
                unreadCount: 0,
                isGroup: true
              });
            }
          }
        });
        return nextChats;
      });
    });

    newSocket.on('receiveMessage', (data) => {
      setChats(prevChats => {
        const targetChatId = data.isGroup ? data.to : data.from;
        let chatExists = prevChats.find(c => c.id === targetChatId);
        
        let nextChats = [...prevChats];
        
        if (!chatExists && !data.isGroup) {
          // Unsaved contact sent us a message, add them!
          // We can try to pull their profile from onlineUsers, but since we don't have access to the `users` array here, 
          // we'll rely on the next `users` event broadcast to sync their real name.
          nextChats.push({
            id: data.from,
            contact: { id: data.from, name: data.from, avatarUrl: `https://ui-avatars.com/api/?name=${data.from}&background=075E54&color=fff`, isOnline: true, lastSeen: 'online' },
            messages: [],
            unreadCount: 0
          });
        }

        return nextChats.map(chat => {
          if (chat.id === targetChatId) {
            // Send read receipt if we are looking at this chat
            if (selectedChatIdRef.current === targetChatId) {
              newSocket.emit('messageRead', { to: data.from, messageId: data.message.id });
            }
            return {
              ...chat,
              messages: [...chat.messages, data.message],
              unreadCount: selectedChatIdRef.current === targetChatId ? 0 : chat.unreadCount + 1,
              contact: { ...chat.contact, typing: false }
            };
          }
          return chat;
        });
      });
    });

    newSocket.on('typing', (data) => {
      setChats(prev => prev.map(chat => {
        const targetChatId = data.isGroup ? data.to : data.from;
        if (chat.id === targetChatId) {
          return {
            ...chat,
            contact: { ...chat.contact, typing: data.isTyping ? data.from : false }
          };
        }
        return chat;
      }));
    });

    newSocket.on('messageRead', (data) => {
      setChats(prevChats => prevChats.map(chat => {
        if (chat.id === data.from) {
          return {
            ...chat,
            messages: chat.messages.map(msg => 
              // Mark all older messages as read just to be safe
              msg.status !== 'read' ? { ...msg, status: 'read' as const } : msg
            )
          };
        }
        return chat;
      }));
    });

    newSocket.on('editMessage', (data) => {
      setChats(prevChats => prevChats.map(chat => {
        const targetChatId = data.isGroup ? data.to : data.from;
        if (chat.id === targetChatId) {
          return { ...chat, messages: chat.messages.map(msg => msg.id === data.messageId ? { ...msg, text: data.newText, isEdited: true } : msg) };
        }
        return chat;
      }));
    });

    newSocket.on('deleteMessage', (data) => {
      setChats(prevChats => prevChats.map(chat => {
        const targetChatId = data.isGroup ? data.to : data.from;
        if (chat.id === targetChatId) {
          return { ...chat, messages: chat.messages.map(msg => msg.id === data.messageId ? { ...msg, isDeleted: true, text: 'This message was deleted.', imageUrl: undefined, audioUrl: undefined } : msg) };
        }
        return chat;
      }));
    });

    // WebRTC Signaling handlers...
    newSocket.on('callUser', async (data) => {
      setCallState('receiving');
      setCaller(data.from);
      setCallerSignal(data.signal);
      setCallType(data.callType || 'video');
      setCurrentCallId(data.callId || '');
    });

    newSocket.on('callAccepted', async (signal) => {
      setCallState('accepted');
      if (connectionRef.current) {
        await connectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
      }
    });

    newSocket.on('callEnded', () => {
      endCallLocally();
    });

    return () => {
      newSocket.close();
    };
  }, [isRegistered]);

  const handleSendMessage = (chatId: string, text: string, imageUrl?: string, audioUrl?: string) => {
    const chat = chats.find(c => c.id === chatId);
    const isGroup = chat?.isGroup || false;

    const newMessage: Message = {
      id: `m${Date.now()}`,
      senderId: userProfile.id,
      text,
      imageUrl,
      audioUrl,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };

    if (socket) {
      socket.emit('sendMessage', { to: chatId, message: newMessage, from: userProfile.id, isGroup });
    }

    setChats(prevChats => prevChats.map(c => {
      if (c.id === chatId) {
        return { ...c, messages: [...c.messages, newMessage] };
      }
      return c;
    }));
  };

  const handleEditMessage = (chatId: string, messageId: string, newText: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (socket && chat) {
      socket.emit('editMessage', { to: chatId, from: userProfile.id, messageId, newText, isGroup: chat.isGroup });
    }
    setChats(prevChats => prevChats.map(c => {
      if (c.id === chatId) {
        return { ...c, messages: c.messages.map(m => m.id === messageId ? { ...m, text: newText, isEdited: true } : m) };
      }
      return c;
    }));
  };

  const handleDeleteMessage = (chatId: string, messageId: string, type: 'me' | 'everyone') => {
    const chat = chats.find(c => c.id === chatId);
    if (type === 'everyone' && socket && chat) {
      socket.emit('deleteMessage', { to: chatId, from: userProfile.id, messageId, isGroup: chat.isGroup });
    }
    setChats(prevChats => prevChats.map(c => {
      if (c.id === chatId) {
        if (type === 'everyone') {
           return { ...c, messages: c.messages.map(m => m.id === messageId ? { ...m, isDeleted: true, text: 'You deleted this message.', imageUrl: undefined, audioUrl: undefined } : m) };
        } else {
           return { ...c, messages: c.messages.filter(m => m.id !== messageId) };
        }
      }
      return c;
    }));
  };

  const handleTyping = (chatId: string, isTyping: boolean) => {
    const chat = chats.find(c => c.id === chatId);
    if (socket && chat) {
      socket.emit('typing', { to: chatId, from: userProfile.id, isGroup: chat.isGroup, isTyping });
    }
  };

  const handleUpdateProfile = (updates: any) => {
    if (socket) {
      const updatedProfile = { ...userProfile, ...updates };
      setUserProfile(updatedProfile);
      socket.emit('updateProfile', updatedProfile);
    }
  };

  const handleAddContactSubmit = (contactId: string, contactName: string) => {
    if (socket) {
      socket.emit('addContact', { userId: userProfile.id, contactId });
    }
    setChats(prev => {
      const exists = prev.find(c => c.id === contactId);
      if (exists) {
        return prev.map(c => c.id === contactId ? { ...c, contact: { ...c.contact, name: contactName } } : c);
      }
      return [...prev, {
        id: contactId,
        contact: { id: contactId, name: contactName, avatarUrl: `https://ui-avatars.com/api/?name=${contactName}&background=075E54&color=fff`, isOnline: false, lastSeen: 'offline' },
        messages: [],
        unreadCount: 0
      }];
    });
    setShowAddContact(false);
  };

  const handleAddStatus = (type: 'text' | 'image', content: string) => {
    if (socket) {
      const newStatus = {
        id: `s${Date.now()}`,
        userId: userProfile.id,
        userName: userProfile.name,
        userAvatar: userProfile.avatarUrl,
        content,
        type,
        timestamp: new Date().toISOString()
      };
      socket.emit('postStatus', newStatus);
    }
  };

  const handleCreateGroup = () => {
    const groupName = prompt("Enter group name:");
    if (groupName && socket) {
      const groupId = `group_${Date.now()}`;
      // Basic group with all currently online users for demo purposes
      const onlineMembers = chats.filter(c => c.contact.isOnline && !c.isGroup).map(c => c.id);
      socket.emit('createGroup', { id: groupId, name: groupName, members: [userProfile.id, ...onlineMembers] });
    }
  };

  // WebRTC Methods
  const setupMediaStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideo.current) localVideo.current.srcObject = stream;
      return stream;
    } catch (err) {
      console.error('Failed to get media stream', err);
      return null;
    }
  };

  const initCall = async (userToCall: string, type: 'video' | 'audio') => {
    setCallType(type);
    setCallState('calling');
    setCaller(userToCall);
    const newCallId = 'call_' + Date.now().toString();
    setCurrentCallId(newCallId);

    const stream = await setupMediaStream();
    if (!stream) return;

    const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    connectionRef.current = peer;
    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    peer.onicecandidate = (e) => {
      if (e.candidate && socket) socket.emit('callUser', { userToCall, signalData: { type: 'candidate', candidate: e.candidate }, from: userProfile.id, name: userProfile.name });
    };

    peer.ontrack = (e) => {
      if (remoteVideo.current) remoteVideo.current.srcObject = e.streams[0];
    };

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket?.emit('callUser', { userToCall, signalData: offer, from: userProfile.id, name: userProfile.name, callType: type, callId: newCallId });
  };

  const answerCall = async () => {
    setCallState('accepted');
    const stream = await setupMediaStream();
    if (!stream) return;

    const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    connectionRef.current = peer;
    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    peer.onicecandidate = (e) => {
      if (e.candidate && socket) socket.emit('answerCall', { to: caller, signal: { type: 'candidate', candidate: e.candidate } });
    };

    peer.ontrack = (e) => {
      if (remoteVideo.current) remoteVideo.current.srcObject = e.streams[0];
    };

    if (callerSignal.type === 'offer') {
      await peer.setRemoteDescription(new RTCSessionDescription(callerSignal));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket?.emit('answerCall', { to: caller, signal: answer });
    }
  };

  const endCallLocally = () => {
    setCallState('idle');
    if (connectionRef.current) { connectionRef.current.close(); connectionRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(track => track.stop()); localStreamRef.current = null; }
  };

  const handleEndCall = () => {
    if (socket && caller) {
      socket.emit('endCall', { 
        to: caller, 
        callId: currentCallId, 
        callerId: userProfile.id, 
        receiverId: caller, 
        type: callType, 
        status: callState === 'accepted' ? 'answered' : 'missed' 
      });
    }
    endCallLocally();
  };

  if (!isRegistered) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--background-color)' }}>
        <h1 style={{ color: 'var(--primary-color)', marginBottom: 20 }}>Profile Setup</h1>
        <div style={{ background: 'var(--background-color)', padding: 30, borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'var(--text-primary)', width: '90%', maxWidth: 350 }}>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
             <img src={userProfile.avatarUrl || `https://ui-avatars.com/api/?name=${userProfile.name || 'User'}&background=075E54&color=fff`} alt="Avatar" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
          </div>

          <label style={{ fontSize: 12, fontWeight: 'bold' }}>Mobile Number / ID</label>
          <input 
            type="text" 
            value={userProfile.id}
            onChange={(e) => setUserProfile({...userProfile, id: e.target.value})}
            style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid var(--divider-color)', background: 'transparent', color: 'var(--text-primary)' }}
            placeholder="e.g. 03001234567"
          />

          <label style={{ fontSize: 12, fontWeight: 'bold' }}>Display Name</label>
          <input 
            type="text" 
            value={userProfile.name}
            onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
            style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '4px', border: '1px solid var(--divider-color)', background: 'transparent', color: 'var(--text-primary)' }}
            placeholder="e.g. Waiz"
          />

          <button 
            onClick={() => userProfile.id && userProfile.name && setIsRegistered(true)}
            style={{ width: '100%', padding: '12px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Connect
          </button>
        </div>
        <button onClick={() => setDarkMode(!darkMode)} style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
          {darkMode ? <Sun size={24} /> : <Moon size={24} />}
        </button>
      </div>
    );
  }

  const selectedChat = chats.find(c => c.id === selectedChatId);

  return (
    <>
      {callState !== 'idle' && (
        <CallScreen 
          isReceivingCall={callState === 'receiving'} callerName={caller} isCallAccepted={callState === 'accepted'}
          localVideoRef={localVideo} remoteVideoRef={remoteVideo} onAccept={answerCall} onReject={handleEndCall} onEndCall={handleEndCall} callType={callType}
        />
      )}

      <div className={`left-pane ${selectedChatId ? 'hide-on-mobile' : ''}`}>
        <div style={{ position: 'absolute', top: 12, right: 120, zIndex: 100, color: 'white', cursor: 'pointer' }} onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </div>
        <ChatList 
          chats={chats}
          statuses={statuses}
          calls={calls}
          userProfile={userProfile}
          onSelectChat={(id) => { setSelectedChatId(id); setChats(prev => prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c)); }}
          onOpenProfile={() => setShowProfile(true)}
          onOpenAddContact={() => setShowAddContact(true)}
          onAddStatus={handleAddStatus}
          onViewStatus={setStatusViewData}
        />
        {showProfile && (
          <ProfileSettings 
            userProfile={userProfile} 
            onClose={() => setShowProfile(false)} 
            onUpdateProfile={handleUpdateProfile} 
          />
        )}
      </div>

      <div className={`right-pane ${!selectedChatId ? 'hide-on-mobile' : ''}`}>
            {selectedChatId ? (
              <ChatConversation 
                chat={chats.find(c => c.id === selectedChatId)!} 
                username={userProfile.id}
                onBack={() => setSelectedChatId(null)}
                onSendMessage={handleSendMessage}
                onEditMessage={(chatId, msgId, newText) => {
                  socket?.emit('editMessage', { to: chatId, messageId: msgId, newText, from: userProfile.id, isGroup: chats.find(c => c.id === chatId)?.isGroup });
                }}
                onDeleteMessage={(chatId, msgId, type) => {
                  socket?.emit('deleteMessage', { to: chatId, messageId: msgId, type, from: userProfile.id, isGroup: chats.find(c => c.id === chatId)?.isGroup });
                }}
                onCall={type => initCall(selectedChatId, type)}
                onTyping={(chatId, isTyping) => {
                  socket?.emit('typing', { to: chatId, from: userProfile.id, isTyping, isGroup: chats.find(c => c.id === chatId)?.isGroup });
                }}
                onMarkRead={() => {
                  // Wait a short delay to mark messages read when opening chat
                  setTimeout(() => {
                    const c = chats.find(x => x.id === selectedChatId);
                    if (c && c.unreadCount > 0) {
                      socket?.emit('messageRead', { to: selectedChatId });
                      setChats(prev => prev.map(ch => ch.id === selectedChatId ? { ...ch, unreadCount: 0 } : ch));
                    }
                  }, 500);
                }}
              />
            ) : (
              <div className="empty-state">
                <img src="https://web.whatsapp.com/img/intro-connection-hq-light_9466a20e6d2921a21ac7ab82419be157.jpg" alt="WhatsApp Web" style={{ width: '80%', maxWidth: 300, marginBottom: 20 }} />
                <h1>WhatsApp for Web</h1>
                <p>Send and receive messages without keeping your phone online.</p>
                <p>Use WhatsApp on up to 4 linked devices and 1 phone at the same time.</p>
              </div>
            )}
      </div>

      {showAddContact && (
        <AddContactModal 
          currentUserPhone={userProfile.id} 
          onClose={() => setShowAddContact(false)} 
          onAdd={handleAddContactSubmit} 
        />
      )}

      {statusViewData && (
        <StatusView 
          statuses={statusViewData} 
          onClose={() => setStatusViewData(null)} 
        />
      )}
    </>
  );
}

export default App;
