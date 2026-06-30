import React, { useState, useEffect } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { formatRelativeTime } from '../data/mockData';

export interface StatusUpdate {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string; // Base64 image or text
  type: 'image' | 'text';
  timestamp: string;
}

interface StatusViewProps {
  statuses: StatusUpdate[];
  onClose: () => void;
  onReply?: (userId: string, text: string) => void;
}

const StatusView: React.FC<StatusViewProps> = ({ statuses, onClose, onReply }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (statuses.length === 0) {
      onClose();
      return;
    }

    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < statuses.length - 1) {
            setCurrentIndex(c => c + 1);
            return 0;
          } else {
            clearInterval(interval);
            onClose();
            return 100;
          }
        }
        return prev + 2; // 50 * 2 = 100, so roughly 50 ticks of 100ms = 5 seconds
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex, statuses, onClose, replyText]);

  if (statuses.length === 0) return null;

  const currentStatus = statuses[currentIndex];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000000', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
      
      {/* Progress Bars */}
      <div style={{ display: 'flex', gap: '4px', padding: '16px 8px 8px 8px', zIndex: 10 }}>
        {statuses.map((_, idx) => (
          <div key={idx} style={{ flex: 1, height: '3px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              backgroundColor: '#ffffff', 
              width: idx < currentIndex ? '100%' : (idx === currentIndex ? `${progress}%` : '0%'),
              transition: 'width 0.1s linear'
            }} />
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', zIndex: 10 }}>
        <ArrowLeft size={24} color="white" style={{ cursor: 'pointer', marginRight: '16px' }} onClick={onClose} />
        <img src={currentStatus.userAvatar} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '12px' }} />
        <div style={{ color: 'white', flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '16px' }}>{currentStatus.userName}</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
            {formatRelativeTime(currentStatus.timestamp)}
          </div>
        </div>
        <X size={24} color="white" style={{ cursor: 'pointer' }} onClick={onClose} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {currentStatus.type === 'image' ? (
          <img src={currentStatus.content} alt="Status" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#8E24AA', padding: '20px' }}>
            <div style={{ fontSize: '32px', color: 'white', textAlign: 'center', wordBreak: 'break-word', fontFamily: 'sans-serif' }}>
              {currentStatus.content}
            </div>
          </div>
        )}
        
        {/* Transparent tap areas to navigate */}
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: '60px', width: '30%', zIndex: 5 }} onClick={() => {
          if (currentIndex > 0) { setCurrentIndex(c => c - 1); setProgress(0); }
        }} />
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: '60px', width: '30%', zIndex: 5 }} onClick={() => {
          if (currentIndex < statuses.length - 1) { setCurrentIndex(c => c + 1); setProgress(0); } else { onClose(); }
        }} />
      </div>

      {/* Reply Bar */}
      {onReply && (
        <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', backgroundColor: 'transparent', zIndex: 10 }}>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (replyText.trim()) {
                onReply(currentStatus.userId, replyText);
                setReplyText('');
                onClose();
              }
            }}
            style={{ width: '100%', display: 'flex' }}
          >
            <input 
              type="text" 
              placeholder="Reply..." 
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => {
                 // Pause progress when typing
                 setProgress(p => p); 
              }}
              style={{ flex: 1, padding: '12px 20px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.3)', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', outline: 'none' }} 
            />
          </form>
        </div>
      )}
    </div>
  );
};

export default StatusView;
