import React, { useState, useRef } from 'react';
import { Camera, Search, MoreVertical, MessageSquare, PhoneCall, UserPlus, Edit2 } from 'lucide-react';
import { type Chat, type CallLog, formatRelativeTime } from '../data/mockData';
import { type StatusUpdate } from './StatusView';

interface ChatListProps {
  chats: Chat[];
  statuses: StatusUpdate[];
  calls: CallLog[];
  userProfile: { id: string; name: string; avatarUrl: string; about: string };
  onSelectChat: (chatId: string) => void;
  onOpenProfile: () => void;
  onOpenAddContact: () => void;
  onAddStatus: (type: 'text' | 'image', content: string) => void;
  onViewStatus: (statuses: StatusUpdate[]) => void;
}

type TabType = 'chats' | 'status' | 'calls';

const ChatList: React.FC<ChatListProps> = ({ chats, statuses, calls, userProfile, onSelectChat, onOpenProfile, onOpenAddContact, onAddStatus, onViewStatus }) => {
  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const [menuOpen, setMenuOpen] = useState(false);
  const statusFileRef = useRef<HTMLInputElement>(null);

  const renderChats = () => (
    <div className="list-container">
      {chats.map((chat: Chat) => {
        const lastMessage = chat.messages[chat.messages.length - 1];
        return (
          <div 
            key={chat.id} 
            className="list-item"
            onClick={() => onSelectChat(chat.id)}
          >
            <img src={chat.contact.avatarUrl || 'https://i.pravatar.cc/150'} alt={chat.contact.name} className="avatar" />
            <div className="item-content">
              <div className="item-header">
                <div className="item-title">{chat.contact.name}</div>
                <div className={`item-time ${chat.unreadCount > 0 ? 'unread' : ''}`}>
                  {lastMessage?.timestamp}
                </div>
              </div>
              <div className="item-subtitle-container">
                <div className="item-subtitle" style={{ color: chat.contact.typing ? 'var(--secondary-color)' : 'var(--text-secondary)' }}>
                  {chat.contact.typing ? (
                    <em>{chat.isGroup ? `${chat.contact.typing} is typing...` : 'typing...'}</em>
                  ) : (
                    lastMessage?.text || (lastMessage?.imageUrl ? '📷 Image' : (lastMessage?.audioUrl ? '🎤 Voice note' : ''))
                  )}
                </div>
                {chat.unreadCount > 0 && (
                  <div className="badge">{chat.unreadCount}</div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const handleStatusUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onAddStatus('image', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderStatus = () => {
    // Group statuses by user
    const statusMap = new Map<string, StatusUpdate[]>();
    statuses.forEach(s => {
      if (s.userId !== userProfile.id) {
        if (!statusMap.has(s.userId)) statusMap.set(s.userId, []);
        statusMap.get(s.userId)!.push(s);
      }
    });
    
    const myStatuses = statuses.filter(s => s.userId === userProfile.id);

    return (
      <div className="list-container">
        <div className="list-item" onClick={() => {
          if (myStatuses.length > 0) onViewStatus(myStatuses);
          else statusFileRef.current?.click();
        }}>
          <div className="avatar" style={{ border: myStatuses.length > 0 ? '2px solid var(--secondary-color)' : 'none', position: 'relative' }}>
            <img src={userProfile.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            {myStatuses.length === 0 && (
              <div style={{ position: 'absolute', bottom: -4, right: -4, background: 'var(--secondary-color)', borderRadius: '50%', color: 'white', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>+</div>
            )}
          </div>
          <div className="item-content">
            <div className="item-header">
              <div className="item-title">My Status</div>
            </div>
            <div className="item-subtitle-container">
              <div className="item-subtitle">{myStatuses.length > 0 ? 'Tap to view your status' : 'Tap to add status update'}</div>
            </div>
          </div>
        </div>
        <input type="file" accept="image/*" ref={statusFileRef} style={{ display: 'none' }} onChange={handleStatusUpload} />

        {statusMap.size > 0 && (
          <div style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--background-color)' }}>
            Recent updates
          </div>
        )}
        
        {Array.from(statusMap.entries()).map(([userId, userStatuses]) => {
          const lastStatus = userStatuses[userStatuses.length - 1];
          return (
            <div key={userId} className="list-item" onClick={() => onViewStatus(userStatuses)}>
              <img src={lastStatus.userAvatar} className="avatar" style={{ border: '2px solid var(--secondary-color)', objectFit: 'cover' }} />
              <div className="item-content">
                <div className="item-header">
                  <div className="item-title">{lastStatus.userName}</div>
                </div>
                <div className="item-subtitle-container">
                  <div className="item-subtitle">{formatRelativeTime(lastStatus.timestamp)}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    );
  };

  const renderCalls = () => (
    <div className="list-container">
      <div className="list-item">
        <div className="avatar" style={{ background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PhoneCall size={20} color="white" />
        </div>
        <div className="item-content">
          <div className="item-header">
            <div className="item-title">Create call link</div>
          </div>
          <div className="item-subtitle-container">
            <div className="item-subtitle">Share a link for your WhatsApp call</div>
          </div>
        </div>
      </div>
      <div style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--background-color)' }}>
        Recent
      </div>
      {calls && calls.length > 0 ? calls.map(call => (
        <div key={call.id} className="list-item">
          <img src={call.contactAvatar || `https://ui-avatars.com/api/?name=${call.contactName || 'User'}&background=128C7E&color=fff`} className="avatar" />
          <div className="item-content">
            <div className="item-header">
              <div className="item-title">{call.contactName || call.receiverId}</div>
              <PhoneCall size={18} color="var(--primary-color)" />
            </div>
            <div className="item-subtitle-container">
              <div className="item-subtitle" style={{ color: call.status === 'missed' ? 'red' : 'var(--text-secondary)' }}>
                {call.status === 'missed' ? '↘ Missed' : (call.callerId === userProfile.id ? '↗ Outgoing' : '↙ Incoming')}
              </div>
              <div className="item-time">{formatRelativeTime(call.timestamp)}</div>
            </div>
          </div>
        </div>
      )) : (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>No recent calls</div>
      )}
    </div>
  );

  return (
    <>
      <div className="app-bar">
        <img src={userProfile.avatarUrl} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} onClick={onOpenProfile} />
        <div className="app-bar-actions" style={{ position: 'relative' }}>
          <UserPlus size={20} style={{ cursor: 'pointer' }} onClick={onOpenAddContact} />
          <MoreVertical size={20} style={{ cursor: 'pointer' }} onClick={() => setMenuOpen(!menuOpen)} />
          {menuOpen && (
            <div style={{ position: 'absolute', top: 30, right: 0, background: 'var(--panel-background)', color: 'var(--text-primary)', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', borderRadius: 4, zIndex: 100, minWidth: 150, padding: '8px 0' }}>
              <div style={{ padding: '10px 16px', cursor: 'pointer' }} onClick={() => { setMenuOpen(false); onOpenProfile(); }}>Profile</div>
              <div style={{ padding: '10px 16px', cursor: 'pointer' }} onClick={() => { setMenuOpen(false); onOpenAddContact(); }}>Add Contact</div>
            </div>
          )}
        </div>
      </div>
      
      <div className="tabs">
        <div className={`tab ${activeTab === 'chats' ? 'active' : ''}`} onClick={() => setActiveTab('chats')}>Chats</div>
        <div className={`tab ${activeTab === 'status' ? 'active' : ''}`} onClick={() => setActiveTab('status')}>Status</div>
        <div className={`tab ${activeTab === 'calls' ? 'active' : ''}`} onClick={() => setActiveTab('calls')}>Calls</div>
      </div>

      {activeTab === 'chats' && renderChats()}
      {activeTab === 'status' && renderStatus()}
      {activeTab === 'calls' && renderCalls()}

      {activeTab === 'chats' && (
        <button className="fab" onClick={onOpenAddContact}>
          <MessageSquare size={24} />
        </button>
      )}
      {activeTab === 'status' && (
        <button className="fab" onClick={() => statusFileRef.current?.click()}>
          <Camera size={24} />
        </button>
      )}
      {activeTab === 'calls' && (
        <button className="fab">
          <PhoneCall size={24} />
        </button>
      )}
    </>
  );
};

export default ChatList;
