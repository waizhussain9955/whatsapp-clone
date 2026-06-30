const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const db = require('./database');

const app = express();
// Increase body size limit for base64 images/audio
app.use(express.json({ limit: '50mb' }));
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 5e7 // 50 MB to allow sending base64 strings
});

const users = {}; // socket.id -> { id, username }
const connectedUsers = {}; // username -> socket.id
const groups = {}; // groupId -> { name, members: [] }

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // User joins with a full profile
  socket.on('register', async (profileData) => {
    // profileData: { id, name, avatarUrl, about }
    users[socket.id] = { socketId: socket.id, ...profileData };
    connectedUsers[profileData.id] = socket.id;
    console.log(`${profileData.name} (${profileData.id}) registered`);
    
    // Save/Update user in DB
    await db.saveUser(profileData);

    // Fetch their history, contacts, and statuses
    const history = await db.getChatHistory(profileData.id);
    const contacts = await db.getContacts(profileData.id);
    const statuses = await db.getStatuses(profileData.id);
    const calls = await db.getCalls(profileData.id);
    
    // Send initial data to the user
    socket.emit('initData', { history, contacts, statuses, calls });

    io.emit('users', Object.values(users));
    io.emit('groups', Object.values(groups));
  });

  socket.on('updateProfile', async (profileData) => {
    // profileData: { id, name, avatarUrl, about }
    const updatedUser = await db.updateUserProfile(profileData.id, profileData);
    if (updatedUser) {
      if (users[socket.id]) {
        users[socket.id] = { ...users[socket.id], ...updatedUser };
      }
      io.emit('users', Object.values(users));
    }
  });

  socket.on('addContact', async (data) => {
    // data: { userId, contactId }
    await db.saveContact(data.userId, data.contactId);
  });

  socket.on('postStatus', async (data) => {
    // data: { id, userId, content, type, timestamp }
    await db.saveStatus(data);
    io.emit('newStatus', data);
  });

  // Handle real-time messaging
  socket.on('sendMessage', async (data) => {
    // data: { to: username|groupId, message: { ...message details }, from: username, isGroup: boolean }
    
    await db.saveMessage(data.message, data.to, data.isGroup);

    if (data.isGroup) {
      socket.to(data.to).emit('receiveMessage', data);
    } else {
      const recipientSocket = connectedUsers[data.to];
      if (recipientSocket) {
        io.to(recipientSocket).emit('receiveMessage', data);
      }
    }
  });

  // Typing indicators
  socket.on('typing', (data) => {
    if (data.isGroup) {
      socket.to(data.to).emit('typing', data);
    } else {
      const recipientSocket = connectedUsers[data.to];
      if (recipientSocket) {
        io.to(recipientSocket).emit('typing', data);
      }
    }
  });

  // Read receipts
  socket.on('messageRead', async (data) => {
    // Mark as read in DB. 'data.to' is the original sender who needs the receipt.
    // So messages where senderId = data.to and receiverId = the person who read it (data.reader)
    if (data.messageId) {
      await db.updateMessageStatus(data.messageId, 'read');
    }
    const recipientSocket = connectedUsers[data.to];
    if (recipientSocket) {
      io.to(recipientSocket).emit('messageRead', data);
    }
  });

  // Edit message
  socket.on('editMessage', async (data) => {
    // data: { messageId, newText, to, from, isGroup }
    await db.editMessage(data.messageId, data.newText);

    if (data.isGroup) {
      socket.to(data.to).emit('editMessage', data);
    } else {
      const recipientSocket = connectedUsers[data.to];
      if (recipientSocket) {
        io.to(recipientSocket).emit('editMessage', data);
      }
    }
  });

  // Delete message
  socket.on('deleteMessage', async (data) => {
    // data: { messageId, to, from, isGroup }
    await db.deleteMessage(data.messageId);

    if (data.isGroup) {
      socket.to(data.to).emit('deleteMessage', data);
    } else {
      const recipientSocket = connectedUsers[data.to];
      if (recipientSocket) {
        io.to(recipientSocket).emit('deleteMessage', data);
      }
    }
  });

  // Group Management
  socket.on('createGroup', (data) => {
    // data: { id, name, members }
    groups[data.id] = data;
    data.members.forEach(member => {
      const sockId = connectedUsers[member];
      if (sockId) {
        io.sockets.sockets.get(sockId)?.join(data.id);
      }
    });
    // Creator joins
    socket.join(data.id);
    io.emit('groups', Object.values(groups));
  });

  // --- WebRTC Signaling ---
  socket.on('callUser', (data) => {
    const recipientSocket = connectedUsers[data.userToCall];
    if (recipientSocket) {
      io.to(recipientSocket).emit('callUser', {
        signal: data.signalData,
        from: data.from,
        name: data.name,
        callId: data.callId,
        callType: data.callType
      });
    }
  });

  socket.on('answerCall', (data) => {
    const callerSocket = connectedUsers[data.to];
    if (callerSocket) {
      io.to(callerSocket).emit('callAccepted', data.signal);
    }
  });

  socket.on('endCall', async (data) => {
    // data = { to, callId, callerId, receiverId, type, status }
    const targetSocket = connectedUsers[data.to];
    if (targetSocket) {
      io.to(targetSocket).emit('callEnded');
    }
    
    // Log call to database
    if (data.callId) {
      await db.saveCall(data.callId, data.callerId, data.receiverId, data.type, data.status, new Date().toISOString());
      
      // Broadcast updated calls to both users
      try {
        const callerCalls = await db.getCalls(data.callerId);
        const callerSocket = connectedUsers[data.callerId];
        if (callerSocket) io.to(callerSocket).emit('callHistory', callerCalls);

        const receiverCalls = await db.getCalls(data.receiverId);
        const recvSocket = connectedUsers[data.receiverId];
        if (recvSocket) io.to(recvSocket).emit('callHistory', receiverCalls);
      } catch (err) {
        console.error('Failed to update call history', err);
      }
    }
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      console.log(`${user.name} disconnected`);
      delete connectedUsers[user.id];
      delete users[socket.id];
      io.emit('users', Object.values(users));
    }
  });
});

const PORT = process.env.PORT || 5000;

db.initDb().then(() => {
  console.log('SQLite Database initialized');
  server.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database', err);
});
