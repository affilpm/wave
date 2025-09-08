// store.js
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import userReducer from './slices/user/userSlice';
import adminReducer from './slices/admin/adminSlice';
import modalReducer from './slices/artist/modalSlice';
import playlistReducer from './slices/user/playlistSlice';
import albumReducer from './slices/user/albumSlice';
import playerReducer from './slices/user/playerSlice';
import playerMiddleware from './middleware/playerMiddleware';
import { activityMiddleware } from './middleware/activityMiddleware';

const rootReducer = combineReducers({
  user: userReducer,
  admin: adminReducer,
  modal: modalReducer,
  playlists: playlistReducer,
  album: albumReducer,
  player: playerReducer,   
});

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['user', 'admin', 'album', 'player'], 

};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        ignoredPaths: ['user.image', 'admin.password'],
      },
    }).concat(playerMiddleware, activityMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);
export default store;