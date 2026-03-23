/**
 * Centralized API endpoint paths — all versioned under /api/v1/.
 *
 * Import these constants instead of hardcoding URLs in components.
 * When the API version changes, only this file needs updating.
 */

const API_VERSION = '/api/v1';

// ---------------------------------------------------------------------------
// Auth & Users
// ---------------------------------------------------------------------------
export const USERS = {
  LOGIN:              `${API_VERSION}/users/login/`,
  LOGOUT:             `${API_VERSION}/users/logout/`,
  REGISTER_INITIATE:  `${API_VERSION}/users/register/initiate/`,
  REGISTER_VERIFY:    `${API_VERSION}/users/register/verify-otp/`,
  REGISTER_RESEND:    `${API_VERSION}/users/register/resend-otp/`,
  REGISTER_COMPLETE:  `${API_VERSION}/users/register/complete/`,
  REGISTER_STATUS:    `${API_VERSION}/users/register/check-status/`,
  VERIFY_OTP:         `${API_VERSION}/users/verify-otp/`,
  RESEND_OTP:         `${API_VERSION}/users/resend-otp/`,
  GOOGLE_AUTH:        `${API_VERSION}/users/google-auth/`,
  GOOGLE_PRE_REG:     `${API_VERSION}/users/google-pre-register/`,
  GOOGLE_REGISTER:    `${API_VERSION}/users/google-register/`,
  TOKEN_REFRESH:      `${API_VERSION}/users/token/refresh/`,
  PROFILE:            `${API_VERSION}/users/user/`,
  UPDATE_PROFILE:     `${API_VERSION}/users/update-profile/`,
  SETTINGS:           `${API_VERSION}/users/user-settings/`,
};

// ---------------------------------------------------------------------------
// Artists
// ---------------------------------------------------------------------------
export const ARTISTS = {
  CHECK_STATUS:       `${API_VERSION}/artists/check-artist-status/`,
  REQUEST_VERIFY:     `${API_VERSION}/artists/request_verification/`,
  VERIFY_STATUS:      `${API_VERSION}/artists/verification_status/`,
  UPDATE_PROFILE:     `${API_VERSION}/artists/update_profile/`,
  TRACK_COUNT:        `${API_VERSION}/artists/track-count/`,
  ALBUM_COUNT:        `${API_VERSION}/artists/album-count/`,
  LISTENERS:          `${API_VERSION}/artists/listeners/`,
  TOTAL_PLAYS:        `${API_VERSION}/artists/total-plays/`,
  RECENT_PLAYS:       `${API_VERSION}/artists/artist-recent-plays/`,
  HAS_ALBUMS:         `${API_VERSION}/artists/has-albums/`,
  FOLLOW:             (id) => `${API_VERSION}/artists/${id}/follow/`,
  FOLLOWERS:          (id) => `${API_VERSION}/artists/${id}/followers/`,
  FOLLOWERS_COUNT:    (id) => `${API_VERSION}/artists/${id}/followers-count/`,
  FOLLOWING:          `${API_VERSION}/artists/me/following/`,
  FOLLOWING_COUNT:    `${API_VERSION}/artists/me/following-count/`,
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export const ADMINS = {
  LOGIN:              `${API_VERSION}/admins/login/`,
  LIST_ARTISTS:       `${API_VERSION}/admins/list-artists/`,
  UPDATE_STATUS:      (id) => `${API_VERSION}/admins/${id}/update-status/`,
  USER_TABLE:         `${API_VERSION}/admins/user-table/`,
  USER_TABLE_DETAIL:  (id) => `${API_VERSION}/admins/user-table/${id}/`,
  TRANSACTIONS:       `${API_VERSION}/admins/transactions/`,
  TRANSACTION_STATS:  `${API_VERSION}/admins/transaction-stats/`,
  TOTAL_USERS:        `${API_VERSION}/admins/total-users/`,
  PREMIUM_STATS:      `${API_VERSION}/admins/premium-stats/`,
  TOP_SONGS:          `${API_VERSION}/admins/top-songs/`,
  TOP_ARTISTS:        `${API_VERSION}/admins/top-artists/`,
};

// ---------------------------------------------------------------------------
// Music
// ---------------------------------------------------------------------------
export const MUSIC = {
  LIST:               `${API_VERSION}/music/music/`,
  DETAIL:             (id) => `${API_VERSION}/music/music/${id}/`,
  STREAM:             (id) => `${API_VERSION}/music/${id}/stream/`,
  CHECK_NAME:         `${API_VERSION}/music/music/check_name/`,
  TOGGLE_VISIBILITY:  (id) => `${API_VERSION}/music/music/${id}/toggle_visibility/`,
  GENRES:             `${API_VERSION}/music/genres/`,
  VERIFICATION:       `${API_VERSION}/music/music-verification/`,
  APPROVE:            (id) => `${API_VERSION}/music/music-verification/${id}/approve/`,
  REJECT:             (id) => `${API_VERSION}/music/music-verification/${id}/reject/`,
};

// ---------------------------------------------------------------------------
// Albums
// ---------------------------------------------------------------------------
export const ALBUMS = {
  LIST:               `${API_VERSION}/album/albums/`,
  DETAIL:             (id) => `${API_VERSION}/album/albums/${id}/`,
  TOGGLE_PUBLIC:      (id) => `${API_VERSION}/album/albums/${id}/update_is_public/`,
  AVAILABLE_TRACKS:   `${API_VERSION}/album/tracks/available_tracks/`,
  CHECK_EXISTS:       `${API_VERSION}/album/albums/check_album_existence/`,
  ALBUM_DATA:         (id) => `${API_VERSION}/album/album-data/${id}/`,
};

// ---------------------------------------------------------------------------
// Playlists
// ---------------------------------------------------------------------------
export const PLAYLISTS = {
  LIST:               `${API_VERSION}/playlist/playlists/`,
  DETAIL:             (id) => `${API_VERSION}/playlist/playlists/${id}/`,
  DATA:               `${API_VERSION}/playlist/playlist-data/`,
  MUSIC_SEARCH:       `${API_VERSION}/playlist/music/`,
  PUBLIC_DATA:        `${API_VERSION}/playlist/public-playlist-data/`,
  ADD_TRACKS:         (id) => `${API_VERSION}/playlist/playlists/${id}/add_tracks/`,
  REMOVE_TRACKS:      (id) => `${API_VERSION}/playlist/playlists/${id}/remove_tracks/`,
  IS_LIKED:           `${API_VERSION}/playlist/playlists/is_liked/`,
  LIKE_SONGS:         `${API_VERSION}/playlist/playlists/like_songs/`,
};

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------
export const HOME = {
  MUSIC:              `${API_VERSION}/home/music/`,
  PLAYLISTS:          `${API_VERSION}/home/playlists/`,
  ALBUMS:             `${API_VERSION}/home/albums/`,
  ARTISTS:            `${API_VERSION}/home/artists/`,
  ARTIST_DETAIL:      (id) => `${API_VERSION}/home/artists/${id}/`,
  ALL_ARTISTS:        `${API_VERSION}/home/all-artists/`,
  GENRES:             `${API_VERSION}/home/genres/`,
  GENRE_MUSIC:        (id) => `${API_VERSION}/home/genre/${id}/tracks/`,
  SEARCH:             `${API_VERSION}/home/search/`,
  HOME_PLAYLISTS:     `${API_VERSION}/home/home-playlist/`,
};

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------
export const LIBRARY = {
  PLAYLISTS:          `${API_VERSION}/library/library/playlists/`,
  CHECK_PLAYLIST:     (id) => `${API_VERSION}/library/library/check-playlist/${id}/`,
  ADD_PLAYLIST:       `${API_VERSION}/library/library/add_playlist/`,
  REMOVE_PLAYLIST:    `${API_VERSION}/library/remove-playlist/`,
  CHECK_ALBUM:        (id) => `${API_VERSION}/library/library/check-album/${id}/`,
  ADD_ALBUM:          `${API_VERSION}/library/library/add-album/`,
  REMOVE_ALBUM:       `${API_VERSION}/library/remove-album/`,
};

// ---------------------------------------------------------------------------
// Premium
// ---------------------------------------------------------------------------
export const PREMIUM = {
  PLANS:              `${API_VERSION}/premium/plans/`,
  PLAN_DETAIL:        (id) => `${API_VERSION}/premium/plans/${id}/`,
  CREATE_ORDER:       `${API_VERSION}/premium/create-order/`,
  VERIFY_PAYMENT:     `${API_VERSION}/premium/verify-payment/`,
  SUBSCRIPTION:       `${API_VERSION}/premium/subscription/`,
  CHECK_STATUS:       `${API_VERSION}/premium/check-subscription/`,
  TRANSACTIONS:       `${API_VERSION}/premium/transactions/`,
  EXPORT_CSV:         `${API_VERSION}/premium/transactions/export_csv/`,
  SUMMARY:            `${API_VERSION}/premium/transactions/summary/`,
};

// ---------------------------------------------------------------------------
// Listening History
// ---------------------------------------------------------------------------
export const LISTENING = {
  RECORD:             (id) => `${API_VERSION}/listening-history/record-activity/${id}/`,
};

export default {
  USERS, ARTISTS, ADMINS, MUSIC, ALBUMS, PLAYLISTS, HOME, LIBRARY, PREMIUM, LISTENING,
};
