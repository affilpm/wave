// store.js
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import userReducer from './slices/user/userSlice';
import adminReducer from './slices/admin/adminSlice'; // Import the admin slice
import modalReducer from './slices/artist/modalSlice'
import playlistReducer from './slices/user/playlistSlice';
import playerReducer from './slices/user/playerSlice';
import albumRducer from './slices/user/albumSlice'
import musicPlayerReducer from './slices/user/musicPlayerSlice';

// Root reducer
const rootReducer = combineReducers({
  user: userReducer,
  admin: adminReducer, // Add the admin slice
  modal: modalReducer,
  playlists: playlistReducer,
  player: playerReducer,
  album: albumRducer,
  musicPlayer: musicPlayerReducer,
});

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['user', 'admin', 'album',], // Persist both user and admin slices

};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer, // Use the persisted root reducer
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        ignoredPaths: ['user.image', 'admin.password'], // Ignore sensitive paths
      },
    }),
});

export const persistor = persistStore(store);
export default store;