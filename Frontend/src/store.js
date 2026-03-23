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
import equalizerReducer from './slices/user/equalizerSlice';
import libraryReducer from './slices/user/librarySlice';

const playerPersistConfig = {
  key: 'player',
  storage,
  blacklist: ['currentTime', 'status'], // Don't persist time (handled manually) or transient status
};

const rootReducer = combineReducers({
  user: userReducer,
  admin: adminReducer,
  modal: modalReducer,
  playlists: playlistReducer,
  album: albumReducer,
  player: persistReducer(playerPersistConfig, playerReducer),   
  equalizer: equalizerReducer,
  library: libraryReducer,
});

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['user', 'admin', 'album', 'equalizer', 'library'], // 'player' is now handled by its own persistReducer
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