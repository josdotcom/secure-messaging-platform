import { configureStore } from '@reduxjs/toolkit';
import messagesReducer from './slices/messageSlice';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    messages: messagesReducer,
    auth: authReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
