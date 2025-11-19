import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../redux/store';
import socketService from '../services/socketService';
import { addMessage, receiveMessage, updateMessage, addTypingUser, removeTypingUser } from '../redux/slices/messageSlice';
import type { Message } from '../redux/slices/messageSlice';
import { v4 as uuidv4 } from 'uuid';

interface ChatWindowProps {
  recipientId: string;
  recipientName: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ recipientId, recipientName }) => {
  const dispatch = useDispatch();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const conversation = useSelector((state: RootState) => 
    state.messages.conversations[recipientId]
  );
  const currentUserId = useSelector((state: RootState) => state.auth.user?.id);

  // Setup Socket.io listeners
  useEffect(() => {
    // Listen for incoming messages
    socketService.onReceiveMessage((message) => {
      dispatch(receiveMessage(message));
      scrollToBottom();
    });

    // Listen for message sent confirmation
    socketService.onMessageSent((data) => {
      dispatch(updateMessage({
        tempId: data.tempId,
        message: data
      }));
    });

    // Listen for typing indicators
    socketService.onUserTyping((data) => {
      if (data.userId === recipientId) {
        dispatch(addTypingUser({
          conversationId: recipientId,
          userId: data.userId
        }));

        // Auto-remove after 3 seconds
        setTimeout(() => {
          dispatch(removeTypingUser({
            conversationId: recipientId,
            userId: data.userId
          }));
        }, 3000);
      }
    });

    socketService.onUserStopTyping((data) => {
      dispatch(removeTypingUser({
        conversationId: recipientId,
        userId: data.userId
      }));
    });

    return () => {
      socketService.removeAllListeners();
    };
  }, [dispatch, recipientId]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);

    // Send typing indicator
    if (!isTyping) {
      setIsTyping(true);
      socketService.startTyping(recipientId);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketService.stopTyping(recipientId);
    }, 2000);
  };

  // Send message
  const sendMessage = () => {
    if (!input.trim()) return;

    const tempId = uuidv4();

    // Optimistic update
    const optimisticMessage = {
      _id: tempId,
      senderId: currentUserId!,
      recipientId,
      content: input,
      type: 'private' as const,
      isRead: false,
      createdAt: new Date().toISOString(),
      tempId
    };

    dispatch(addMessage(optimisticMessage));

    // Send to server via Socket.io
    socketService.sendPrivateMessage(recipientId, input, tempId);

    // Clear input
    setInput('');
    setIsTyping(false);
    socketService.stopTyping(recipientId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ 
        padding: '15px', 
        borderBottom: '1px solid #ddd',
        backgroundColor: '#f5f5f5'
      }}>
        <h3 style={{ margin: 0 }}>{recipientName}</h3>
      </div>

      {/* Messages */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '20px',
        backgroundColor: '#fff'
      }}>
        {conversation?.messages.map((message: Message) => (
          <div
            key={message._id}
            style={{
              display: 'flex',
              justifyContent: message.senderId === currentUserId ? 'flex-end' : 'flex-start',
              marginBottom: '10px'
            }}
          >
            <div
              style={{
                maxWidth: '60%',
                padding: '10px 15px',
                borderRadius: '10px',
                backgroundColor: message.senderId === currentUserId ? '#007bff' : '#e9ecef',
                color: message.senderId === currentUserId ? '#fff' : '#000'
              }}
            >
              <div>{message.content}</div>
              <div style={{ 
                fontSize: '11px', 
                marginTop: '5px',
                opacity: 0.7
              }}>
                {new Date(message.createdAt).toLocaleTimeString()}
                {message.senderId === currentUserId && message.isRead && ' ✓✓'}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {conversation?.typingUsers.length > 0 && (
          <div style={{ 
            fontStyle: 'italic', 
            color: '#888',
            fontSize: '14px',
            marginTop: '10px'
          }}>
            {recipientName} is typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ 
        padding: '15px', 
        borderTop: '1px solid #ddd',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '14px'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              cursor: input.trim() ? 'pointer' : 'not-allowed',
              fontSize: '14px'
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
