import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface Message {
  _id: string;
  senderId: string;
  recipientId?: string;
  groupId?: string;
  content: string;
  type: 'private' | 'group';
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  tempId?: string;
  sender?: {
    id: string;
    username: string;
  };
}

interface Conversation {
  conversationId: string;
  messages: Message[];
  unreadCount: number;
  typingUsers: string[];
}

interface MessagesState {
  conversations: { [key: string]: Conversation };
  activeConversation: string | null;
  onlineUsers: string[];
  loading: boolean;
  error: string | null;
}

const initialState: MessagesState = {
  conversations: {},
  activeConversation: null,
  onlineUsers: [],
  loading: false,
  error: null
};

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    // Add message (optimistic update)
    addMessage: (state: MessagesState, action: PayloadAction<Message>) => {
      const message = action.payload;
      const conversationId = message.recipientId || message.groupId || '';

      if (!state.conversations[conversationId]) {
        state.conversations[conversationId] = {
          conversationId,
          messages: [],
          unreadCount: 0,
          typingUsers: []
        };
      }

      state.conversations[conversationId].messages.push(message);
    },

    // Update message after server confirmation
    updateMessage: (state: MessagesState, action: PayloadAction<{ tempId: string; message: Message }>) => {
      const { tempId, message } = action.payload;
      const conversationId = message.recipientId || message.groupId || '';

      const conversation = state.conversations[conversationId];
      if (conversation) {
        const index = conversation.messages.findIndex((m: Message) => m.tempId === tempId);
        if (index !== -1) {
          conversation.messages[index] = message;
        }
      }
    },

    // Receive message from server
    receiveMessage: (state: MessagesState, action: PayloadAction<Message>) => {
      const message = action.payload;
      const conversationId = message.senderId;

      if (!state.conversations[conversationId]) {
        state.conversations[conversationId] = {
          conversationId,
          messages: [],
          unreadCount: 0,
          typingUsers: []
        };
      }

      state.conversations[conversationId].messages.push(message);
      
      // Increment unread count if not active conversation
      if (state.activeConversation !== conversationId) {
        state.conversations[conversationId].unreadCount++;
      }
    },

    // Mark message as read
    markMessageAsRead: (state: MessagesState, action: PayloadAction<{ messageId: string; conversationId: string }>) => {
      const { messageId, conversationId } = action.payload;
      const conversation = state.conversations[conversationId];

      if (conversation) {
        const message = conversation.messages.find((m: Message) => m._id === messageId);
        if (message) {
          message.isRead = true;
          message.readAt = new Date().toISOString();
        }
      }
    },

    // Set active conversation
    setActiveConversation: (state: MessagesState, action: PayloadAction<string>) => {
      state.activeConversation = action.payload;
      
      // Reset unread count for active conversation
      if (state.conversations[action.payload]) {
        state.conversations[action.payload].unreadCount = 0;
      }
    },

    // Add typing user
    addTypingUser: (state: MessagesState, action: PayloadAction<{ conversationId: string; userId: string }>) => {
      const { conversationId, userId } = action.payload;
      const conversation = state.conversations[conversationId];

      if (conversation && !conversation.typingUsers.includes(userId)) {
        conversation.typingUsers.push(userId);
      }
    },

    // Remove typing user
    removeTypingUser: (state: MessagesState, action: PayloadAction<{ conversationId: string; userId: string }>) => {
      const { conversationId, userId } = action.payload;
      const conversation = state.conversations[conversationId];

      if (conversation) {
        conversation.typingUsers = conversation.typingUsers.filter((id: string) => id !== userId);
      }
    },

    // Update online users
    setOnlineUsers: (state: MessagesState, action: PayloadAction<string[]>) => {
      state.onlineUsers = action.payload;
    },

    // Add online user
    addOnlineUser: (state: MessagesState, action: PayloadAction<string>) => {
      if (!state.onlineUsers.includes(action.payload)) {
        state.onlineUsers.push(action.payload);
      }
    },

    // Remove online user
    removeOnlineUser: (state: MessagesState, action: PayloadAction<string>) => {
      state.onlineUsers = state.onlineUsers.filter((id: string) => id !== action.payload);
    },

    // Load conversation history
    loadConversationHistory: (state: MessagesState, action: PayloadAction<{ conversationId: string; messages: Message[] }>) => {
      const { conversationId, messages } = action.payload;

      if (!state.conversations[conversationId]) {
        state.conversations[conversationId] = {
          conversationId,
          messages: [],
          unreadCount: 0,
          typingUsers: []
        };
      }

      state.conversations[conversationId].messages = messages;
    },

    // Clear error
    clearError: (state: MessagesState) => {
      state.error = null;
    }
  }
});

export const {
  addMessage,
  updateMessage,
  receiveMessage,
  markMessageAsRead,
  setActiveConversation,
  addTypingUser,
  removeTypingUser,
  setOnlineUsers,
  addOnlineUser,
  removeOnlineUser,
  loadConversationHistory,
  clearError
} = messagesSlice.actions;

export default messagesSlice.reducer;
