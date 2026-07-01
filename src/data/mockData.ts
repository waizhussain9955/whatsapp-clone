export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  about?: string;
  lastSeen?: string;
  isOnline?: boolean;
  typing?: string | boolean;
}

export interface CallLog {
  id: string;
  callerId: string;
  receiverId: string;
  contactName?: string;
  contactAvatar?: string;
  type: 'video' | 'audio';
  status: 'answered' | 'missed';
  timestamp: string;
}

export const formatRelativeTime = (dateString: string) => {
  if (!dateString) return 'Unknown time';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Unknown time';
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  
  return date.toLocaleDateString();
};

export interface Message {
  id: string;
  senderId: string;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  isEdited?: boolean;
  isDeleted?: boolean;
  replyTo?: string; // id of the message this is replying to
}

export interface Chat {
  id: string;
  contact: User;
  messages: Message[];
  unreadCount: number;
  isGroup?: boolean;
}

const currentUser = {
  id: 'user1',
  name: 'Me',
  avatarUrl: ''
};

export const chatsData: Chat[] = [
  {
    id: 'chat1',
    contact: {
      id: 'contact1',
      name: 'John Doe',
      avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026024d',
      lastSeen: 'today at 10:30 AM',
      isOnline: false
    },
    unreadCount: 2,
    messages: [
      {
        id: 'm1',
        senderId: 'contact1',
        text: 'Hey! Are we still meeting tomorrow?',
        timestamp: '10:00 AM',
        status: 'read'
      },
      {
        id: 'm2',
        senderId: 'user1',
        text: 'Yes, absolutely. Same place?',
        timestamp: '10:15 AM',
        status: 'read'
      },
      {
        id: 'm3',
        senderId: 'contact1',
        text: 'Perfect. See you there!',
        timestamp: '10:28 AM',
        status: 'read'
      },
      {
        id: 'm4',
        senderId: 'contact1',
        text: 'Oh, don\'t forget to bring the documents.',
        timestamp: '10:30 AM',
        status: 'delivered'
      }
    ]
  },
  {
    id: 'chat2',
    contact: {
      id: 'contact2',
      name: 'Jane Smith',
      avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
      lastSeen: 'online',
      isOnline: true
    },
    unreadCount: 0,
    messages: [
      {
        id: 'm5',
        senderId: 'contact2',
        text: 'Can you send me the latest design files?',
        timestamp: 'Yesterday',
        status: 'read'
      },
      {
        id: 'm6',
        senderId: 'user1',
        text: 'Sure, emailing them right now.',
        timestamp: 'Yesterday',
        status: 'read'
      }
    ]
  },
  {
    id: 'chat3',
    contact: {
      id: 'contact3',
      name: 'Family Group',
      avatarUrl: 'https://i.pravatar.cc/150?u=a04258114e29026702d',
      lastSeen: 'yesterday'
    },
    unreadCount: 5,
    messages: [
      {
        id: 'm7',
        senderId: 'contact3',
        text: 'Mom: Dinner is at 7 tomorrow!',
        timestamp: 'Sunday',
        status: 'read'
      }
    ]
  }
];
