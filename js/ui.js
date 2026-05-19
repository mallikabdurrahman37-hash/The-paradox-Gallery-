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

// ----------------------------------------------------------
// CANVAS WATERMARKING ENGINE
// Downloads artwork with The Paradox Gallery watermark overlay
// ----------------------------------------------------------
async function downloadWithWatermark(imageUrl, artworkTitle, artistUsername) {
  showToast('Preparing watermarked download…');

  try {
    // Load image via proxy-friendly fetch to canvas
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      // Add cache-busting + crossorigin workaround for Cloudinary
      img.src = imageUrl.includes('?') ? imageUrl : imageUrl + '?crossorigin=1';
    });

    // Create off-screen canvas at native image dimensions
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');

    // Draw original image
    ctx.drawImage(img, 0, 0);

    // --- WATERMARK OVERLAY ---
    const W = canvas.width;
    const H = canvas.height;
    const footerHeight = 150;

    // Gradient block across footer
    const gradient = ctx.createLinearGradient(0, H - footerHeight, 0, H);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, H - footerHeight, W, footerHeight);

    // Text Line 1: "THE PARADOX GALLERY"
    const fontSize1 = Math.round(W * 0.04);
    ctx.font = `500 ${fontSize1}px 'Playfair Display', Georgia, serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    const line1Y = H - Math.round(footerHeight * 0.22);
    const paddingRight = Math.round(W * 0.03);
    ctx.fillText('THE PARADOX GALLERY', W - paddingRight, line1Y);

    // Text Line 2: "Artwork by @username"
    const fontSize2 = Math.round(W * 0.025);
    ctx.font = `300 ${fontSize2}px 'Inter', -apple-system, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    const username = artistUsername ? `@${artistUsername}` : 'Unknown Artist';
    const line2Y = H - Math.round(footerHeight * 0.06);
    ctx.fillText(`Artwork by ${username}`, W - paddingRight, line2Y);

    // Generate high-quality JPEG download
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const anchor = document.createElement('a');
    const safeTitle = (artworkTitle || 'artwork').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    anchor.href = dataUrl;
    anchor.download = `paradox-gallery-${safeTitle}.jpg`;
    anchor.click();

    showToast('Downloaded successfully!', 'success');
  } catch (err) {
    console.error('Watermark download error:', err);
    // Fallback: attempt direct download without watermark
    try {
      const anchor = document.createElement('a');
      anchor.href = imageUrl;
      anchor.download = `${artworkTitle || 'artwork'}.jpg`;
      anchor.target = '_blank';
      anchor.click();
      showToast('Downloaded (without watermark — CORS restriction)', 'default');
    } catch (fallbackErr) {
      showToast('Download failed. Please try again.', 'error');
    }
  }
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
