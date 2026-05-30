// ==========================================================
// UI.JS — Entrance Animations, Mobile Navigation, Canvas Watermarking
// ==========================================================

'use strict';

// ----------------------------------------------------------
// ENTRANCE ANIMATION ENGINE
// Orchestrates choreographed page reveal in 4 phases:
//   Phase 0 (0ms)       : bare canvas visible
//   Phase 1 (200ms)     : navbar slides in from top
//   Phase 2 (400ms)     : hero/content elements glide up
//   Phase 3 (600ms+)    : grid cards assemble with stagger
// ----------------------------------------------------------
function runEntranceAnimations() {
  const navbar = document.getElementById('navbar');
  const heroElements = document.querySelectorAll('.anim-hero');
  const contentElements = document.querySelectorAll('.anim-content');
  const cardElements = document.querySelectorAll('.anim-card');

  // Phase 1: Navbar slides down (200ms delay)
  if (navbar) {
    navbar.classList.add('anim-nav-init');
    setTimeout(() => {
      navbar.classList.add('anim-nav-ready');
    }, 200);
  }

  // Phase 2: Hero elements glide up with 100ms stagger
  heroElements.forEach((el, i) => {
    el.classList.add('anim-init');
    setTimeout(() => {
      el.classList.add('anim-ready');
    }, 400 + i * 100);
  });

  // Phase 2b: General content elements
  contentElements.forEach((el, i) => {
    el.classList.add('anim-init');
    setTimeout(() => {
      el.classList.add('anim-ready');
    }, 500 + i * 100);
  });

  // Phase 3: Grid cards assemble in sequence
  cardElements.forEach((el, i) => {
    el.style.animationDelay = `${0.6 + i * 0.08}s`;
  });
}

// ----------------------------------------------------------
// MOBILE NAVIGATION — Drawer System
// ----------------------------------------------------------
function initMobileNav() {
  const menuBtn = document.getElementById('menu-btn');
  const drawer = document.getElementById('mobile-drawer');
  const overlay = document.getElementById('drawer-overlay');
  const closeBtn = document.getElementById('drawer-close');

  if (!menuBtn || !drawer) return;

  function openDrawer() {
    drawer.classList.add('open');
    if (overlay) overlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('visible');
    document.body.style.overflow = '';
  }

  menuBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (overlay) overlay.addEventListener('click', closeDrawer);

  // Close on nav link click
  const drawerLinks = drawer.querySelectorAll('a');
  drawerLinks.forEach(link => {
    link.addEventListener('click', closeDrawer);
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });
}

// ----------------------------------------------------------
// ACTIVE NAV LINK HIGHLIGHTER
// ----------------------------------------------------------
function setActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-links a, .drawer-nav a');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

// ----------------------------------------------------------
// TOAST NOTIFICATION SYSTEM
// ----------------------------------------------------------
function showToast(message, type = 'default') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : type === 'success' ? 'toast-success' : ''}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Auto-remove after animation (3.1s total)
  setTimeout(() => {
    toast.remove();
  }, 3200);
}

// ==============================================
// ADVANCED DYNAMIC WATERMARK ENGINE (Part of js/ui.js)
// Fixed Overlap and Real-Time Contrast Control
// ==============================================

async function downloadWithWatermark(originalImageUrl, artworkTitle) {
    // 1. established branding colors
    const CREAM = "#F9F8F5";
    const INK = "#1A1A1A";
    const RUST = "#C84B31";
    const WATERMARK_TEXT = `The Paradox Gallery - CJP // ${artworkTitle}`;

    // Show established smooth loading UI on the button (Part of Master Logic)
    const activeBtn = document.querySelector('.btn-artwork-download'); // Ensure correct class
    if (activeBtn) simulateProgress(activeBtn, "DOWNLOADING", () => {}); // Just for UI feel

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Crucial for Firestore URLs

        img.onload = () => {
            const originalW = img.width;
            const originalH = img.height;
            const barHeight = 80; // The new dedicated curator bar at bottom

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            // Set new larger dimensions (H + barHeight)
            canvas.width = originalW;
            canvas.height = originalH + barHeight;

            // --- Dynamic Contrast Analysis Start ---
            // Calculate pixel brightness to choose best theme
            let totalLuminance = 0;
            let sampleCount = 0;
            ctx.drawImage(img, 0, 0, originalW, originalH);
            const imageData = ctx.getImageData(0, 0, originalW, originalH).data;

            // Sample every 20th pixel to save Main Thread blocking
            for (let i = 0; i < imageData.length; i += 80) {
                const r = imageData[i];
                const g = imageData[i+1];
                const b = imageData[i+2];
                // W3C standard formula for perceived luminance
                const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
                totalLuminance += luminance;
                sampleCount++;
            }
            const avgLuminance = totalLuminance / sampleCount;

            // Define bar themes
            let barTheme = {};
            // Threshold 128 is mid-way between 0 (black) and 255 (white)
            if (avgLuminance > 140) { 
                // Image is mostly light/minimalist.
                // Apply 'Heavy Subsurface' theme: Black bar, Cream text.
                barTheme = { bg: INK, text: CREAM };
            } else {
                // Image is mostly dark/heavy.
                // Apply 'Curator Premium' theme: Cream bar, Rust Orange text.
                barTheme = { bg: CREAM, text: RUST };
            }
            // --- Dynamic Contrast Analysis End ---

            // Draw final curated border and original image
            ctx.fillStyle = barTheme.bg; // Fill the entire canvas with base color
            ctx.fillRect(0, 0, canvas.width, canvas.height); 
            
            ctx.drawImage(img, 0, 0); // Draw original image on top section

            // Add professional typography (using Playfair Display - from previous context)
            ctx.fillStyle = barTheme.text;
            ctx.font = "italic 600 28px 'Playfair Display', serif"; // Large luxury font
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.letterSpacing = "2px"; // Brutalist touch

            // Text ke piche koi sasta shadow nahi, sirf direct professional contrast bar
            const textX = originalW / 2;
            const textY = originalH + (barHeight / 2);
            ctx.fillText(WATERMARK_TEXT, textX, textY);

            // Trigger premium lossless download (PNG is REQUIRED for steganography compatibility)
            const downloadLink = document.createElement("a");
            const safeTitle = artworkTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            downloadLink.href = canvas.toDataURL("image/png", 1.0);
            downloadLink.download = `paradox-art_${safeTitle}.png`;
            downloadLink.click();

            resolve();
        };

        img.onerror = () => {
            reject(new Error("Image download failed. Ensure CORS is active on Firestore storage."));
            if (activeBtn) activeBtn.classList.remove('lab-btn-loading'); // Reset UI
        };

        img.src = originalImageUrl;
    });
}

// ----------------------------------------------------------
// LIKE BUTTON SPRING ANIMATION
// ----------------------------------------------------------
function triggerLikeAnimation(buttonEl) {
  buttonEl.classList.remove('liked');
  // Force reflow to restart animation
  void buttonEl.offsetWidth;
  buttonEl.classList.add('liked');
}

// ----------------------------------------------------------
// IMAGE LAZY LOADING OBSERVER
// ----------------------------------------------------------
function initLazyLoading() {
  const lazyImages = document.querySelectorAll('img[data-src]');
  if (!lazyImages.length) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    }, { rootMargin: '200px' });

    lazyImages.forEach(img => observer.observe(img));
  } else {
    // Fallback for older browsers
    lazyImages.forEach(img => {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    });
  }
}

// ----------------------------------------------------------
// FILTER BADGE LOGIC (Gallery Page)
// ----------------------------------------------------------
function initFilterBadges(onFilterChange) {
  const badges = document.querySelectorAll('.filter-badge');

  badges.forEach(badge => {
    badge.addEventListener('click', () => {
      // Remove active from all
      badges.forEach(b => b.classList.remove('active'));
      badge.classList.add('active');

      const filter = badge.dataset.filter || 'all';
      if (typeof onFilterChange === 'function') {
        onFilterChange(filter);
      }
    });
  });
}

// ----------------------------------------------------------
// ARTWORK MODAL
// ----------------------------------------------------------
function openArtworkModal(artwork, currentUserId) {
  const modal = document.getElementById('artwork-modal');
  if (!modal) return;

  const img = modal.querySelector('.modal-artwork-img');
  const title = modal.querySelector('.modal-artwork-title');
  const description = modal.querySelector('.modal-artwork-description');
  const artistName = modal.querySelector('.modal-artwork-artist');
  const likesCount = modal.querySelector('.modal-artwork-likes-count');
  const downloadBtn = modal.querySelector('.modal-download-btn');
  const likeBtn = modal.querySelector('.modal-like-btn');
  const likeIcon = modal.querySelector('.modal-like-icon');

  if (img) img.src = artwork.imageUrl;
  if (title) title.textContent = artwork.title;
  if (description) description.textContent = artwork.description || 'No description provided.';
  if (artistName) artistName.textContent = `${artwork.artistName || 'Unknown'} · @${artwork.artistUsername || 'unknown'}`;
  if (likesCount) likesCount.textContent = artwork.likesCount || 0;

  // Update like icon state
  if (likeIcon && currentUserId) {
    const liked = (artwork.likedBy || []).includes(currentUserId);
    likeIcon.src = liked ? 'assets/icon-like-filled.png' : 'assets/icon-like.png';
  }

  // Download button handler
  if (downloadBtn) {
    downloadBtn.onclick = () => {
      downloadWithWatermark(artwork.imageUrl, artwork.title, artwork.artistUsername);
    };
  }

  // Like button — actual Firestore logic handled via database.js
  if (likeBtn) {
    likeBtn.dataset.artworkId = artwork.id;
  }

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeArtworkModal() {
  const modal = document.getElementById('artwork-modal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

function initModalCloseHandlers() {
  const backdrop = document.querySelector('.modal-backdrop');
  const closeBtn = document.querySelector('.modal-close');

  if (backdrop) backdrop.addEventListener('click', closeArtworkModal);
  if (closeBtn) closeBtn.addEventListener('click', closeArtworkModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeArtworkModal();
  });
}

// ----------------------------------------------------------
// SCROLL POSITION TRACKER — Navbar shadow on scroll
// ----------------------------------------------------------
function initNavbarScroll() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (window.scrollY > 20) {
          navbar.style.boxShadow = '0 2px 24px rgba(0,0,0,0.07)';
        } else {
          navbar.style.boxShadow = 'none';
        }
        ticking = false;
      });
      ticking = true;
    }
  });
}

// ----------------------------------------------------------
// AVATAR INITIALS HELPER
// Generates initials string from a full name
// ----------------------------------------------------------
function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0] || '')
    .join('')
    .toUpperCase();
}

// ----------------------------------------------------------
// DEBOUNCE UTILITY
// ----------------------------------------------------------
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ----------------------------------------------------------
// INITIALIZE UI ON DOM READY
// ----------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  runEntranceAnimations();
  initMobileNav();
  setActiveNavLink();
  initLazyLoading();
  initNavbarScroll();
  initModalCloseHandlers();
});

// Export for use in other modules
window.UI = {
  showToast,
  downloadWithWatermark,
  triggerLikeAnimation,
  openArtworkModal,
  closeArtworkModal,
  initFilterBadges,
  getInitials,
  debounce,
};
// Register Service Worker for PWA - Auto-registered on all pages

if ("serviceWorker" in navigator) {

    window.addEventListener("load", () => {

        navigator.serviceWorker
            .register("sw.js")

            .then((reg) => {
                console.log(
                    "Paradox App: Service Worker Registered!",
                    reg
                );
            })

            .catch((err) => {
                console.log(
                    "Paradox App: Registration failed:",
                    err
                );
            });

    });

}
