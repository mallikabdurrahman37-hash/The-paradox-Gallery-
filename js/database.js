// ==========================================================
// DATABASE.JS — Cloudinary Upload Pipeline, Firestore, Like System
// ==========================================================

'use strict';

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  getAuth,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// ----------------------------------------------------------
// FIREBASE INIT (reuse existing app if already initialized)
// ----------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDNDQjRX8Y7j4zZ0mV-m__HyJWrQgTBxYA",
  authDomain: "the-paradox-gallery.firebaseapp.com",
  projectId: "the-paradox-gallery",
  storageBucket: "the-paradox-gallery.firebasestorage.app",
  messagingSenderId: "659400708496",
  appId: "1:659400708496:web:f9a8c5c8ba33f15ce8e315",
  measurementId: "G-GMGTY7W8TW",
};

let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);
const auth = getAuth(app);

// ----------------------------------------------------------
// CLOUDINARY CONFIGURATION
// ----------------------------------------------------------
const CLOUDINARY_CLOUD_NAME = 'divnrv9va';
const CLOUDINARY_UPLOAD_PRESET = 'paradox_art';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// ----------------------------------------------------------
// CLOUDINARY UPLOAD PIPELINE
// Uploads a File object to Cloudinary and returns the secure_url
// ----------------------------------------------------------
async function uploadToCloudinary(file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'paradox-gallery');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', CLOUDINARY_UPLOAD_URL, true);

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && typeof onProgress === 'function') {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch (err) {
          reject(new Error('Failed to parse Cloudinary response.'));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          reject(new Error(errData.error?.message || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.ontimeout = () => reject(new Error('Upload timed out.'));
    xhr.timeout = 120000; // 2 minutes

    xhr.send(formData);
  });
}

// ----------------------------------------------------------
// PUBLISH ARTWORK
// Uploads to Cloudinary then writes to Firestore /artworks
// ----------------------------------------------------------
async function publishArtwork({ file, title, description, onProgress }) {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in to upload artwork.');

  // 1. Fetch current user profile from Firestore
  const userDocRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userDocRef);
  if (!userSnap.exists()) throw new Error('User profile not found.');

  const userData = userSnap.data();

  if (!userData.username || userData.username.trim() === '') {
    throw new Error('You must set a username before uploading artwork.');
  }

  // 2. Upload image to Cloudinary
  const cloudinaryData = await uploadToCloudinary(file, onProgress);
  const imageUrl = cloudinaryData.secure_url;

  if (!imageUrl) throw new Error('Cloudinary did not return a valid URL.');

  // 3. Write artwork document to Firestore
  const artworkDocRef = await addDoc(collection(db, 'artworks'), {
    title: title.trim(),
    description: description.trim(),
    imageUrl: imageUrl,
    artistId: user.uid,
    artistName: userData.name || '',
    artistUsername: userData.username,
    likesCount: 0,
    likedBy: [],
    createdAt: serverTimestamp(),
  });

  return { id: artworkDocRef.id, imageUrl };
}

// ----------------------------------------------------------
// FETCH ALL ARTWORKS (for gallery page)
// ----------------------------------------------------------
async function fetchAllArtworks(limitCount = 50) {
  const q = query(
    collection(db, 'artworks'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
}

// ----------------------------------------------------------
// FETCH ARTWORKS BY ARTIST
// ----------------------------------------------------------
async function fetchArtworksByArtist(artistId) {
  const q = query(
    collection(db, 'artworks'),
    where('artistId', '==', artistId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
}

// ----------------------------------------------------------
// FETCH ALL CREATORS (for creators page)
// ----------------------------------------------------------
async function fetchAllCreators() {
  const snapshot = await getDocs(collection(db, 'users'));
  const creators = snapshot.docs
    .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
    .filter(u => u.username && u.username.trim() !== ''); // Only show users with usernames

  return creators;
}

// ----------------------------------------------------------
// FETCH CREATOR ARTWORK COUNTS
// ----------------------------------------------------------
async function fetchCreatorArtworkCounts(artistIds) {
  const counts = {};
  await Promise.all(
    artistIds.map(async (artistId) => {
      const q = query(
        collection(db, 'artworks'),
        where('artistId', '==', artistId)
      );
      const snapshot = await getDocs(q);
      let totalLikes = 0;
      snapshot.docs.forEach(d => {
        totalLikes += d.data().likesCount || 0;
      });
      counts[artistId] = {
        artworkCount: snapshot.size,
        totalLikes,
      };
    })
  );
  return counts;
}

// ----------------------------------------------------------
// LIKE / UNLIKE ARTWORK
// Full toggle logic with Firestore atomic updates
// ----------------------------------------------------------
async function toggleLike(artworkId, likeBtn, likeIcon, likeCountEl) {
  const user = auth.currentUser;
  if (!user) {
    window.UI?.showToast('Sign in to like artwork.', 'default');
    // Redirect hint
    setTimeout(() => {
      window.location.href = 'auth.html';
    }, 1200);
    return;
  }

  const artworkRef = doc(db, 'artworks', artworkId);

  // Disable button during update
  if (likeBtn) likeBtn.disabled = true;

  try {
    const artworkSnap = await getDoc(artworkRef);
    if (!artworkSnap.exists()) throw new Error('Artwork not found.');

    const artworkData = artworkSnap.data();
    const likedBy = artworkData.likedBy || [];
    const currentLikes = artworkData.likesCount || 0;
    const uid = user.uid;

    if (likedBy.includes(uid)) {
      // CONDITION A: Already liked — UNLIKE
      await updateDoc(artworkRef, {
        likedBy: arrayRemove(uid),
        likesCount: Math.max(0, currentLikes - 1),
      });

      // Update DOM
      if (likeIcon) likeIcon.src = 'assets/icon-like.png';
      if (likeCountEl) likeCountEl.textContent = Math.max(0, currentLikes - 1);

    } else {
      // CONDITION B: Not liked — LIKE
      await updateDoc(artworkRef, {
        likedBy: arrayUnion(uid),
        likesCount: currentLikes + 1,
      });

      // Update DOM
      if (likeIcon) likeIcon.src = 'assets/icon-like-filled.png';
      if (likeCountEl) likeCountEl.textContent = currentLikes + 1;

      // Trigger spring animation
      if (likeBtn) window.UI?.triggerLikeAnimation(likeBtn);
    }

  } catch (err) {
    console.error('Like toggle error:', err);
    window.UI?.showToast('Could not update like. Try again.', 'error');
  } finally {
    if (likeBtn) likeBtn.disabled = false;
  }
}

// ----------------------------------------------------------
// LIVE LISTENER: Real-time artwork updates for a single doc
// ----------------------------------------------------------
function subscribeToArtwork(artworkId, callback) {
  const artworkRef = doc(db, 'artworks', artworkId);
  return onSnapshot(artworkRef, (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() });
    }
  });
}

// ----------------------------------------------------------
// DELETE ARTWORK (only by owner)
// ----------------------------------------------------------
async function deleteArtwork(artworkId) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated.');

  const artworkRef = doc(db, 'artworks', artworkId);
  const snap = await getDoc(artworkRef);
  if (!snap.exists()) throw new Error('Artwork not found.');

  const data = snap.data();
  if (data.artistId !== user.uid) throw new Error('Permission denied.');

  await deleteDoc(artworkRef);
}

// ----------------------------------------------------------
// UPDATE USER PROFILE (settings.html)
// ----------------------------------------------------------
async function updateUserProfile(updates) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated.');

  const userRef = doc(db, 'users', user.uid);
  await updateDoc(userRef, updates);

  // Update in-memory cache
  if (window.currentUser) {
    Object.assign(window.currentUser, updates);
  }
}

// ----------------------------------------------------------
// CHECK USERNAME AVAILABILITY
// ----------------------------------------------------------
async function checkUsernameAvailable(username, currentUid) {
  const trimmed = username.toLowerCase().trim();

  if (!trimmed || trimmed.length < 3) return false;
  if (!/^[a-z0-9_]{3,24}$/.test(trimmed)) return false;

  const q = query(
    collection(db, 'users'),
    where('username', '==', trimmed)
  );
  const snap = await getDocs(q);

  // Available if no docs, OR if the only doc is the current user
  if (snap.empty) return true;
  if (snap.size === 1 && snap.docs[0].id === currentUid) return true;
  return false;
}

// ----------------------------------------------------------
// FETCH USER BY UID
// ----------------------------------------------------------
async function fetchUserById(uid) {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ----------------------------------------------------------
// FETCH SINGLE ARTWORK BY ID
// ----------------------------------------------------------
async function fetchArtworkById(artworkId) {
  const artworkRef = doc(db, 'artworks', artworkId);
  const snap = await getDoc(artworkRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ----------------------------------------------------------
// EXPORT GLOBAL DATABASE MODULE
// ----------------------------------------------------------
window.DB = {
  uploadToCloudinary,
  publishArtwork,
  fetchAllArtworks,
  fetchArtworksByArtist,
  fetchAllCreators,
  fetchCreatorArtworkCounts,
  toggleLike,
  subscribeToArtwork,
  deleteArtwork,
  updateUserProfile,
  checkUsernameAvailable,
  fetchUserById,
  fetchArtworkById,
  db,
};
