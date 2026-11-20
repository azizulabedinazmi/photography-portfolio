/**
 * Azmi Photography & Digital Art Portfolio - Smart Features & Interactions
 * Features:
 * - 55-Item Unified Gallery Renderer (Photography + PicsArt Digital Artworks)
 * - Dynamic Rotating Headline Animation (Soul & Light, PicsArt Digital Art, etc.)
 * - Cinematic Continuous Horizontal Highlights Marquee
 * - 3D Card Hover Tilt with Dynamic Specular Reflection
 * - Staggered Scroll Reveal Animations (Intersection Observer)
 * - DSLR Shutter Audio Synthesizer & Camera Flash Burst
 * - Dark / Light Theme Engine with localStorage & System sync
 * - Client Moodboard / Favorites with pre-filled inquiry integration
 * - Instant Category & Keyword Search filtering
 * - Adaptive Layout Switcher (Fluid Masonry, Editorial Magazine, Contact Sheet)
 * - Fullscreen Zen Exhibition Slideshow Mode
 * - Keyboard Shortcuts & Micro-interactions
 */

(function () {
  'use strict';

  // --- 0. GALLERY RENDERER ---
  const GalleryRenderer = {
    render() {
      const container = document.getElementById('portfolio-gallery');
      if (!container || !window.GALLERY_DATA) return;

      if (container.children.length === 0) {
        container.innerHTML = window.GALLERY_DATA.map((item, index) => {
          const isSeries = item.isSeries;
          const isArt = item.category === 'art';
          
          let badge = '';
          if (isSeries) {
            badge = `
              <div class="absolute top-3 left-3 pointer-events-none z-10">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide bg-black/60 dark:bg-black/75 backdrop-blur-md text-white border border-white/10 shadow-lg">
                  <svg class="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/></svg>
                  Series (${item.seriesCount})
                </span>
              </div>`;
          } else if (isArt) {
            badge = `
              <div class="absolute top-3 left-3 pointer-events-none z-10">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide bg-gradient-to-r from-purple-600/80 to-pink-600/80 backdrop-blur-md text-white border border-white/15 shadow-lg">
                  <span>🎨</span> PicsArt Art
                </span>
              </div>`;
          }

          const extraLinks = (isSeries && item.seriesExtra) ? item.seriesExtra.map(extra => `
            <a href="${extra}" data-fancybox="gallery" ${item.seriesGroup}="true" data-caption="<strong>${item.title}</strong> (Series)" style="display: none;"></a>
          `).join('') : '';

          const seriesAttr = isSeries ? `${item.seriesGroup}="true"` : '';

          const categoryText = {
            portraits: 'Portrait',
            events: 'Event / Street',
            nature: 'Nature / Detail',
            art: 'PicsArt Digital Art'
          }[item.category] || 'Fine Art';

          return `
            <div class="gallery-item tilt-card break-inside-avoid mb-4 group relative overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800/80 opacity-0 translate-y-8 transition-all duration-500 hover:shadow-2xl hover:border-neutral-400 dark:hover:border-neutral-600"
                 data-category="${item.category}"
                 data-title="${item.title}"
                 data-tags="${item.tags}"
                 data-camera="${item.camera}"
                 data-location="${item.location}"
                 data-photo-id="${item.id}"
                 data-photo-src="${item.src}"
                 data-is-series="${isSeries ? 'true' : 'false'}">
              
              <a href="${item.src}" 
                 data-fancybox="gallery" 
                 ${seriesAttr}
                 data-caption="<strong>${item.title}</strong><br><span class='text-xs opacity-75'>${item.camera} · ${item.location}</span>"
                 class="block w-full h-full overflow-hidden cursor-zoom-in">
                <img src="${item.src}" 
                     alt="${item.title}" 
                     loading="lazy"
                     class="w-full h-auto object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700 ease-out" />
              </a>

              ${badge}

              <button type="button"
                      class="favorite-btn absolute top-3 right-3 z-10 p-2.5 rounded-full bg-black/40 hover:bg-black/75 backdrop-blur-md border border-white/15 text-white transition-all duration-300 opacity-90 sm:opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 hover:scale-110 focus:opacity-100"
                      data-photo-id="${item.id}"
                      data-photo-src="${item.src}"
                      data-photo-title="${item.title}"
                      data-photo-category="${item.category}"
                      data-photo-camera="${item.camera}"
                      title="Add to Client Moodboard (♡)">
                <svg class="heart-icon w-4 h-4 text-white text-opacity-90 fill-transparent transition-colors" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/>
                </svg>
              </button>

              <div class="absolute inset-x-0 bottom-0 p-4 pt-12 photo-card-overlay opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex flex-col justify-end">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-white/20 backdrop-blur-sm text-white font-semibold">${categoryText}</span>
                  <span class="text-[11px] text-white/70 font-mono truncate">${item.location.split(',')[0]}</span>
                </div>
                <h3 class="text-white text-base font-semibold tracking-tight drop-shadow-sm truncate">${item.title}</h3>
                <p class="text-[11px] text-white/80 font-mono mt-0.5 flex items-center gap-1.5 truncate">
                  <svg class="w-3 h-3 text-neutral-300 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"/></svg>
                  ${item.camera}
                </p>
              </div>

              ${extraLinks}
            </div>
          `;
        }).join('');
      }

      // Initialize Staggered Scroll Animations & 3D Tilt
      CardAnimations.init();
      // Render Highlights Filmstrip Marquee
      FilmstripMarquee.render();
    }
  };

  // --- CARD ANIMATIONS & 3D TILT ---
  const CardAnimations = {
    init() {
      // 1. Intersection Observer for Smooth Scroll Reveal
      const items = document.querySelectorAll('.gallery-item');
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries, obs) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.remove('opacity-0', 'translate-y-8');
              entry.target.classList.add('opacity-100', 'translate-y-0');
              obs.unobserve(entry.target);
            }
          });
        }, { threshold: 0.08, rootMargin: '0px 0px 50px 0px' });

        items.forEach(el => observer.observe(el));
      } else {
        items.forEach(el => {
          el.classList.remove('opacity-0', 'translate-y-8');
          el.classList.add('opacity-100', 'translate-y-0');
        });
      }

      // 2. Interactive 3D Perspective Tilt on Mousemove
      items.forEach(card => {
        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const rotateX = ((y - centerY) / centerY) * -6;
          const rotateY = ((x - centerX) / centerX) * 6;
          card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
        });

        card.addEventListener('mouseleave', () => {
          card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        });
      });
    }
  };

  // --- DYNAMIC ROTATING HEADLINE WORDS ---
  const RotatingHeadline = {
    words: ['Soul & Light', 'Untold Stories', 'PicsArt Digital Art', 'Emotive Portraits', 'Cultural Heritage'],
    currentIndex: 0,

    init() {
      const el = document.getElementById('rotating-headline-word');
      if (!el) return;

      setInterval(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(-10px)';

        setTimeout(() => {
          this.currentIndex = (this.currentIndex + 1) % this.words.length;
          el.textContent = this.words[this.currentIndex];
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        }, 300);
      }, 3000);
    }
  };

  // --- CONTINUOUS FILMSTRIP MARQUEE ---
  const FilmstripMarquee = {
    render() {
      const marqueeInner = document.getElementById('filmstrip-marquee-inner');
      if (!marqueeInner || !window.GALLERY_DATA) return;

      // Select top 10 diverse highlight items (photography + picsart)
      const highlights = window.GALLERY_DATA.slice(0, 10);
      const allItems = [...highlights, ...highlights]; // duplicate for seamless loop

      marqueeInner.innerHTML = allItems.map(item => `
        <a href="${item.src}" data-fancybox="gallery" class="inline-block flex-shrink-0 w-36 sm:w-48 aspect-[3/4] rounded-xl overflow-hidden relative group border border-neutral-200/60 dark:border-neutral-800 shadow-md transform hover:scale-105 transition-all duration-300">
          <img src="${item.src}" alt="${item.title}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
            <span class="text-[10px] font-mono uppercase text-amber-400 font-semibold truncate">${item.category === 'art' ? '🎨 Digital Art' : '📷 Photography'}</span>
            <span class="text-xs font-serif text-white font-bold truncate">${item.title}</span>
          </div>
        </a>
      `).join('');
    }
  };

  // --- 1. THEME MANAGER ---
  const ThemeManager = {
    init() {
      const storedTheme = localStorage.getItem('portfolio_theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialDark = storedTheme ? storedTheme === 'dark' : prefersDark;
      
      this.setTheme(initialDark ? 'dark' : 'light', false);

      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('portfolio_theme')) {
          this.setTheme(e.matches ? 'dark' : 'light', false);
        }
      });

      document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => this.toggle());
      });
    },

    setTheme(theme, save = true) {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
      if (save) {
        localStorage.setItem('portfolio_theme', theme);
      }
      this.updateIcons(theme === 'dark');
    },

    toggle() {
      const isDark = document.documentElement.classList.contains('dark');
      const nextTheme = isDark ? 'light' : 'dark';
      this.setTheme(nextTheme, true);
      SoundFX.playShutter();
    },

    updateIcons(isDark) {
      document.querySelectorAll('.theme-icon-moon').forEach(el => {
        el.classList.toggle('hidden', isDark);
      });
      document.querySelectorAll('.theme-icon-sun').forEach(el => {
        el.classList.toggle('hidden', !isDark);
      });
    }
  };

  // --- 2. SOUND FX SYNTHESIZER & FLASH BURST ---
  const SoundFX = {
    audioCtx: null,
    enabled: localStorage.getItem('portfolio_sound') === 'true',

    init() {
      this.updateUI();
      document.querySelectorAll('.sound-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => this.toggle());
      });
    },

    toggle() {
      this.enabled = !this.enabled;
      localStorage.setItem('portfolio_sound', this.enabled);
      this.updateUI();
      if (this.enabled) {
        this.playShutter();
      }
    },

    updateUI() {
      document.querySelectorAll('.sound-icon-on').forEach(el => {
        el.classList.toggle('hidden', !this.enabled);
      });
      document.querySelectorAll('.sound-icon-off').forEach(el => {
        el.classList.toggle('hidden', this.enabled);
      });
      document.querySelectorAll('.sound-toggle-btn').forEach(btn => {
        btn.setAttribute('aria-pressed', this.enabled ? 'true' : 'false');
        btn.title = this.enabled ? 'Mute Shutter Sounds (S)' : 'Enable Shutter Sounds (S)';
      });
    },

    triggerFlash() {
      let flash = document.getElementById('camera-flash-overlay');
      if (!flash) {
        flash = document.createElement('div');
        flash.id = 'camera-flash-overlay';
        flash.className = 'fixed inset-0 bg-white pointer-events-none z-[100] opacity-0';
        document.body.appendChild(flash);
      }
      flash.classList.remove('camera-flash-active');
      void flash.offsetWidth; // trigger reflow
      flash.classList.add('camera-flash-active');
    },

    playShutter() {
      // Trigger flash burst visual animation
      this.triggerFlash();

      if (!this.enabled) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!this.audioCtx) {
          this.audioCtx = new AudioCtx();
        }
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }

        const t = this.audioCtx.currentTime;

        // Stage 1: Mirror Up
        const osc1 = this.audioCtx.createOscillator();
        const gain1 = this.audioCtx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(160, t);
        osc1.frequency.exponentialRampToValueAtTime(35, t + 0.035);
        gain1.gain.setValueAtTime(0.3, t);
        gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
        osc1.connect(gain1);
        gain1.connect(this.audioCtx.destination);
        osc1.start(t);
        osc1.stop(t + 0.035);

        // Stage 2: Curtain Sweep Noise
        const bufferSize = Math.floor(this.audioCtx.sampleRate * 0.04);
        const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = this.audioCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2400;
        filter.Q.value = 2.5;
        const noiseGain = this.audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.18, t + 0.008);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
        whiteNoise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.audioCtx.destination);
        whiteNoise.start(t + 0.008);
        whiteNoise.stop(t + 0.045);

        // Stage 3: Mirror Drop Click
        const osc2 = this.audioCtx.createOscillator();
        const gain2 = this.audioCtx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(220, t + 0.06);
        osc2.frequency.exponentialRampToValueAtTime(30, t + 0.1);
        gain2.gain.setValueAtTime(0.35, t + 0.06);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc2.connect(gain2);
        gain2.connect(this.audioCtx.destination);
        osc2.start(t + 0.06);
        osc2.stop(t + 0.1);
      } catch (e) {
        console.warn('Audio playback error', e);
      }
    }
  };

  // --- 3. MOODBOARD / CLIENT FAVORITES MANAGER ---
  const Moodboard = {
    items: [],

    init() {
      try {
        const saved = localStorage.getItem('portfolio_favorites');
        this.items = saved ? JSON.parse(saved) : [];
      } catch (e) {
        this.items = [];
      }

      this.updateBadges();
      this.syncHeartIcons();
      this.bindEvents();
    },

    save() {
      try {
        localStorage.setItem('portfolio_favorites', JSON.stringify(this.items));
      } catch (e) {}
      this.updateBadges();
      this.syncHeartIcons();
    },

    toggle(photo) {
      const idx = this.items.findIndex(item => item.id === photo.id || item.src === photo.src);
      if (idx > -1) {
        this.items.splice(idx, 1);
        this.notify(`Removed "${photo.title}" from Moodboard`);
      } else {
        this.items.push(photo);
        SoundFX.playShutter();
        this.notify(`Added "${photo.title}" to Moodboard! ❤️`);
      }
      this.save();
      this.renderDrawerContent();
      
      if (GalleryFilter.currentCategory === 'moodboard') {
        GalleryFilter.apply();
      }
    },

    isFavorite(id, src) {
      return this.items.some(item => item.id === id || item.src === src);
    },

    updateBadges() {
      const count = this.items.length;
      document.querySelectorAll('.moodboard-count').forEach(el => {
        el.textContent = count;
        el.classList.toggle('hidden', count === 0);
      });

      const floatingPill = document.getElementById('moodboard-floating-pill');
      if (floatingPill) {
        floatingPill.classList.toggle('translate-y-24', count === 0);
        floatingPill.classList.toggle('opacity-0', count === 0);
        floatingPill.classList.toggle('pointer-events-none', count === 0);
      }
    },

    syncHeartIcons() {
      document.querySelectorAll('.favorite-btn').forEach(btn => {
        const id = btn.dataset.photoId;
        const src = btn.dataset.photoSrc;
        const isFav = this.isFavorite(id, src);
        btn.classList.toggle('is-favorited', isFav);
        const icon = btn.querySelector('.heart-icon');
        if (icon) {
          if (isFav) {
            icon.classList.remove('text-white', 'text-opacity-80', 'fill-transparent');
            icon.classList.add('text-rose-500', 'fill-rose-500');
            btn.classList.add('heart-pop');
            setTimeout(() => btn.classList.remove('heart-pop'), 400);
          } else {
            icon.classList.remove('text-rose-500', 'fill-rose-500');
            icon.classList.add('text-white', 'text-opacity-80', 'fill-transparent');
          }
        }
      });
    },

    openDrawer() {
      const drawer = document.getElementById('moodboard-drawer');
      const backdrop = document.getElementById('moodboard-backdrop');
      if (!drawer) return;
      this.renderDrawerContent();
      drawer.classList.remove('translate-x-full');
      if (backdrop) {
        backdrop.classList.remove('opacity-0', 'pointer-events-none');
      }
      document.body.classList.add('overflow-hidden');
    },

    closeDrawer() {
      const drawer = document.getElementById('moodboard-drawer');
      const backdrop = document.getElementById('moodboard-backdrop');
      if (!drawer) return;
      drawer.classList.add('translate-x-full');
      if (backdrop) {
        backdrop.classList.add('opacity-0', 'pointer-events-none');
      }
      document.body.classList.remove('overflow-hidden');
    },

    renderDrawerContent() {
      const container = document.getElementById('moodboard-items-container');
      const emptyState = document.getElementById('moodboard-empty-state');
      const footerActions = document.getElementById('moodboard-footer-actions');
      if (!container) return;

      if (this.items.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        if (footerActions) footerActions.classList.add('hidden');
        return;
      }

      if (emptyState) emptyState.classList.add('hidden');
      if (footerActions) footerActions.classList.remove('hidden');

      container.innerHTML = this.items.map(item => `
        <div class="flex items-center gap-4 p-3 bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-200/60 dark:border-neutral-800 group hover:border-neutral-300 dark:hover:border-neutral-700 transition">
          <img src="${item.src}" alt="${item.title}" class="w-16 h-16 object-cover rounded-lg shadow-sm" />
          <div class="flex-1 min-w-0">
            <h4 class="font-medium text-sm text-neutral-900 dark:text-neutral-100 truncate">${item.title}</h4>
            <p class="text-xs text-neutral-500 dark:text-neutral-400 capitalize">${item.category === 'art' ? '🎨 PicsArt Digital Art' : (item.category || 'Fine Art')}</p>
            ${item.camera ? `<p class="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 mt-0.5 truncate">${item.camera}</p>` : ''}
          </div>
          <button data-remove-id="${item.id || item.src}" class="moodboard-remove-btn p-2 text-neutral-400 hover:text-rose-500 transition rounded-lg hover:bg-neutral-200/50 dark:hover:bg-neutral-800" title="Remove from shortlist">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      `).join('');

      container.querySelectorAll('.moodboard-remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const targetId = btn.getAttribute('data-remove-id');
          const target = this.items.find(i => (i.id || i.src) === targetId);
          if (target) {
            this.toggle(target);
          }
        });
      });

      const inquireBtn = document.getElementById('moodboard-inquire-btn');
      if (inquireBtn) {
        const titles = this.items.map(i => i.title).join(', ');
        const isRoot = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/') || !window.location.pathname.includes('/dist/');
        const contactPath = isRoot ? 'dist/contact.html' : 'contact.html';
        inquireBtn.href = `${contactPath}?moodboard=${encodeURIComponent(titles)}`;
      }
    },

    clearAll() {
      if (confirm('Clear all photos from your moodboard?')) {
        this.items = [];
        this.save();
        this.renderDrawerContent();
        this.notify('Moodboard cleared');
      }
    },

    bindEvents() {
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('.favorite-btn');
        if (btn) {
          e.preventDefault();
          e.stopPropagation();
          const photo = {
            id: btn.dataset.photoId || btn.dataset.photoSrc,
            src: btn.dataset.photoSrc,
            title: btn.dataset.photoTitle || 'Untitled Photograph',
            category: btn.dataset.photoCategory || 'Fine Art',
            camera: btn.dataset.photoCamera || ''
          };
          this.toggle(photo);
        }
      });

      document.querySelectorAll('.open-moodboard-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.openDrawer();
        });
      });

      const closeBtn = document.getElementById('close-moodboard-btn');
      if (closeBtn) closeBtn.addEventListener('click', () => this.closeDrawer());

      const backdrop = document.getElementById('moodboard-backdrop');
      if (backdrop) backdrop.addEventListener('click', () => this.closeDrawer());

      const clearBtn = document.getElementById('clear-moodboard-btn');
      if (clearBtn) clearBtn.addEventListener('click', () => this.clearAll());
    },

    notify(msg) {
      let toast = document.getElementById('portfolio-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'portfolio-toast';
        toast.className = 'fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-neutral-900/90 dark:bg-white/95 text-white dark:text-neutral-900 text-xs sm:text-sm font-medium px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-md transition-all duration-300 pointer-events-none opacity-0 translate-y-4';
        document.body.appendChild(toast);
      }
      toast.textContent = msg;
      toast.classList.remove('opacity-0', 'translate-y-4');
      toast.classList.add('opacity-100', 'translate-y-0');
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'translate-y-4');
      }, 2500);
    }
  };

  // --- 4. GALLERY FILTER & SEARCH ---
  const GalleryFilter = {
    currentCategory: 'all',
    searchQuery: '',

    init() {
      document.querySelectorAll('.category-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const category = btn.dataset.category;
          this.setCategory(category);
        });
      });

      const searchInput = document.getElementById('gallery-search-input');
      const searchClear = document.getElementById('gallery-search-clear');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.searchQuery = e.target.value.trim().toLowerCase();
          if (searchClear) searchClear.classList.toggle('hidden', !this.searchQuery);
          this.apply();
        });
      }

      if (searchClear) {
        searchClear.addEventListener('click', () => {
          if (searchInput) {
            searchInput.value = '';
            this.searchQuery = '';
            searchClear.classList.add('hidden');
            this.apply();
          }
        });
      }
    },

    setCategory(category) {
      this.currentCategory = category;
      document.querySelectorAll('.category-filter-btn').forEach(btn => {
        const isMatch = btn.dataset.category === category;
        btn.classList.toggle('bg-black', isMatch);
        btn.classList.toggle('text-white', isMatch);
        btn.classList.toggle('dark:bg-white', isMatch);
        btn.classList.toggle('dark:text-black', isMatch);
        btn.classList.toggle('bg-neutral-100', !isMatch);
        btn.classList.toggle('text-neutral-700', !isMatch);
        btn.classList.toggle('dark:bg-neutral-900', !isMatch);
        btn.classList.toggle('dark:text-neutral-300', !isMatch);
      });
      this.apply();
    },

    apply() {
      const items = document.querySelectorAll('.gallery-item');
      let visibleCount = 0;

      items.forEach(item => {
        const itemCat = item.dataset.category || '';
        const itemTitle = (item.dataset.title || '').toLowerCase();
        const itemTags = (item.dataset.tags || '').toLowerCase();
        const itemCamera = (item.dataset.camera || '').toLowerCase();
        const photoId = item.dataset.photoId;
        const photoSrc = item.dataset.photoSrc;

        let matchesCategory = false;
        if (this.currentCategory === 'all') {
          matchesCategory = true;
        } else if (this.currentCategory === 'moodboard') {
          matchesCategory = Moodboard.isFavorite(photoId, photoSrc);
        } else if (this.currentCategory === 'series') {
          matchesCategory = item.dataset.isSeries === 'true';
        } else if (this.currentCategory === 'art') {
          matchesCategory = itemCat === 'art' || itemTags.includes('picsart');
        } else {
          matchesCategory = itemCat.toLowerCase() === this.currentCategory.toLowerCase();
        }

        let matchesSearch = true;
        if (this.searchQuery) {
          matchesSearch = itemTitle.includes(this.searchQuery) ||
                          itemTags.includes(this.searchQuery) ||
                          itemCamera.includes(this.searchQuery) ||
                          itemCat.toLowerCase().includes(this.searchQuery);
        }

        const show = matchesCategory && matchesSearch;
        if (show) {
          item.classList.remove('hidden');
          setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'scale(1)';
          }, 10);
          visibleCount++;
        } else {
          item.style.opacity = '0';
          item.style.transform = 'scale(0.96)';
          item.classList.add('hidden');
        }
      });

      const countEl = document.getElementById('gallery-results-count');
      if (countEl) {
        countEl.textContent = `Showing ${visibleCount} ${visibleCount === 1 ? 'Work' : 'Curated Works'}`;
      }

      const noResults = document.getElementById('gallery-no-results');
      if (noResults) {
        noResults.classList.toggle('hidden', visibleCount > 0);
      }
    }
  };

  // --- 5. VIEW LAYOUT SWITCHER ---
  const ViewSwitcher = {
    currentView: localStorage.getItem('portfolio_view') || 'masonry',

    init() {
      this.apply(this.currentView, false);

      document.querySelectorAll('.view-switcher-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const view = btn.dataset.view;
          this.apply(view, true);
        });
      });
    },

    apply(view, save = true) {
      this.currentView = view;
      if (save) localStorage.setItem('portfolio_view', view);

      const gallery = document.getElementById('portfolio-gallery');
      if (!gallery) return;

      document.querySelectorAll('.view-switcher-btn').forEach(btn => {
        const isMatch = btn.dataset.view === view;
        btn.classList.toggle('text-black', isMatch);
        btn.classList.toggle('dark:text-white', isMatch);
        btn.classList.toggle('bg-white', isMatch);
        btn.classList.toggle('dark:bg-neutral-800', isMatch);
        btn.classList.toggle('shadow-sm', isMatch);
        btn.classList.toggle('text-neutral-400', !isMatch);
      });

      gallery.className = gallery.className
        .replace(/columns-\S+/g, '')
        .replace(/grid-\S+/g, '')
        .replace(/grid\b/g, '')
        .replace(/space-y-\S+/g, '');

      if (view === 'masonry') {
        gallery.classList.add('columns-1', 'sm:columns-2', 'lg:columns-3', 'xl:columns-4', 'gap-4', 'space-y-4');
      } else if (view === 'editorial') {
        gallery.classList.add('columns-1', 'md:columns-2', 'gap-8', 'space-y-8');
      } else if (view === 'compact') {
        gallery.classList.add('columns-2', 'sm:columns-3', 'md:columns-4', 'xl:columns-5', 'gap-2.5', 'space-y-2.5');
      }
    }
  };

  // --- 6. ZEN EXHIBITION SLIDESHOW MODE ---
  const ZenMode = {
    isOpen: false,
    photos: [],
    currentIndex: 0,
    intervalTimer: null,
    isPlaying: false,

    init() {
      const items = document.querySelectorAll('.gallery-item');
      this.photos = Array.from(items).map(item => ({
        src: item.dataset.photoSrc,
        title: item.dataset.title || 'Untitled Work',
        category: item.dataset.category === 'art' ? '🎨 PicsArt Digital Art' : (item.dataset.category || 'Fine Art'),
        camera: item.dataset.camera || 'Canon EOS',
        location: item.dataset.location || 'Dhaka, Bangladesh'
      })).filter(p => p.src);

      document.querySelectorAll('.open-zen-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.open();
        });
      });

      const closeBtn = document.getElementById('zen-close-btn');
      if (closeBtn) closeBtn.addEventListener('click', () => this.close());

      const nextBtn = document.getElementById('zen-next-btn');
      if (nextBtn) nextBtn.addEventListener('click', () => this.next());

      const prevBtn = document.getElementById('zen-prev-btn');
      if (prevBtn) prevBtn.addEventListener('click', () => this.prev());

      const playBtn = document.getElementById('zen-play-btn');
      if (playBtn) playBtn.addEventListener('click', () => this.toggleAutoPlay());
    },

    open(startIndex = 0) {
      if (this.photos.length === 0) return;
      this.currentIndex = startIndex;
      this.isOpen = true;

      const modal = document.getElementById('zen-exhibition-modal');
      if (!modal) return;

      modal.classList.remove('hidden');
      setTimeout(() => {
        modal.classList.remove('opacity-0');
      }, 20);

      document.body.classList.add('overflow-hidden');
      this.render();
      SoundFX.playShutter();
    },

    close() {
      this.isOpen = false;
      this.stopAutoPlay();
      const modal = document.getElementById('zen-exhibition-modal');
      if (!modal) return;
      modal.classList.add('opacity-0');
      setTimeout(() => {
        modal.classList.add('hidden');
      }, 300);
      document.body.classList.remove('overflow-hidden');
    },

    next() {
      this.currentIndex = (this.currentIndex + 1) % this.photos.length;
      this.render();
      SoundFX.playShutter();
    },

    prev() {
      this.currentIndex = (this.currentIndex - 1 + this.photos.length) % this.photos.length;
      this.render();
      SoundFX.playShutter();
    },

    toggleAutoPlay() {
      if (this.isPlaying) {
        this.stopAutoPlay();
      } else {
        this.startAutoPlay();
      }
    },

    startAutoPlay() {
      this.isPlaying = true;
      this.updatePlayBtn();
      this.intervalTimer = setInterval(() => {
        this.next();
      }, 4500);
    },

    stopAutoPlay() {
      this.isPlaying = false;
      this.updatePlayBtn();
      if (this.intervalTimer) {
        clearInterval(this.intervalTimer);
        this.intervalTimer = null;
      }
    },

    updatePlayBtn() {
      const playIcon = document.getElementById('zen-play-icon');
      const pauseIcon = document.getElementById('zen-pause-icon');
      if (playIcon) playIcon.classList.toggle('hidden', this.isPlaying);
      if (pauseIcon) pauseIcon.classList.toggle('hidden', !this.isPlaying);
    },

    render() {
      const current = this.photos[this.currentIndex];
      if (!current) return;

      const img = document.getElementById('zen-main-img');
      const bg = document.getElementById('zen-ambient-bg');
      const title = document.getElementById('zen-photo-title');
      const meta = document.getElementById('zen-photo-meta');
      const counter = document.getElementById('zen-photo-counter');

      if (img) {
        img.style.opacity = '0';
        setTimeout(() => {
          img.src = current.src;
          img.alt = current.title;
          img.onload = () => {
            img.style.opacity = '1';
          };
        }, 150);
      }

      if (bg) {
        bg.style.backgroundImage = `url('${current.src}')`;
      }

      if (title) title.textContent = current.title;
      if (meta) {
        meta.textContent = `${current.category} · ${current.camera} · ${current.location}`;
      }
      if (counter) {
        counter.textContent = `${this.currentIndex + 1} / ${this.photos.length}`;
      }
    }
  };

  // --- 7. KEYBOARD SHORTCUTS ---
  const KeyboardShortcuts = {
    init() {
      window.addEventListener('keydown', (e) => {
        if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

        if (e.key === 'Escape') {
          if (ZenMode.isOpen) ZenMode.close();
          Moodboard.closeDrawer();
        } else if (e.key === 't' || e.key === 'T') {
          ThemeManager.toggle();
        } else if (e.key === 's' || e.key === 'S') {
          SoundFX.toggle();
        } else if (e.key === 'm' || e.key === 'M' || e.key === 'f' || e.key === 'F') {
          Moodboard.openDrawer();
        } else if (e.key === 'z' || e.key === 'Z') {
          if (ZenMode.isOpen) ZenMode.close();
          else ZenMode.open();
        } else if (ZenMode.isOpen) {
          if (e.key === 'ArrowRight' || e.key === ' ') {
            e.preventDefault();
            ZenMode.next();
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            ZenMode.prev();
          }
        }
      });
    }
  };

  // --- 8. BACK TO TOP BUTTON ---
  const BackToTop = {
    init() {
      const btn = document.getElementById('back-to-top-btn');
      if (!btn) return;

      window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
          btn.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
          btn.classList.add('opacity-100', 'translate-y-0');
        } else {
          btn.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
          btn.classList.remove('opacity-100', 'translate-y-0');
        }
      });

      btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  };

  // --- 9. CONTACT PAGE MOODBOARD AUTOFILL ---
  const ContactAutofill = {
    init() {
      const params = new URLSearchParams(window.location.search);
      const moodboardParam = params.get('moodboard') || params.get('selection');
      const subjectInput = document.getElementById('subject');
      const messageInput = document.getElementById('message');
      const moodboardPreview = document.getElementById('contact-moodboard-preview');
      const moodboardTags = document.getElementById('contact-moodboard-tags');

      if (moodboardParam) {
        if (subjectInput && !subjectInput.value) {
          subjectInput.value = 'Photography & Art Inquiry (Referencing Portfolio Moodboard)';
        }
        if (messageInput && !messageInput.value) {
          messageInput.value = `Hello Azmi,\n\nI was browsing your photography and digital art portfolio and loved your work! I am especially inspired by these selected styles/shots:\n• ${moodboardParam.split(', ').join('\n• ')}\n\nI would love to inquire about your availability and rates for an upcoming project.`;
        }
        if (moodboardPreview && moodboardTags) {
          moodboardPreview.classList.remove('hidden');
          const titles = moodboardParam.split(', ');
          moodboardTags.innerHTML = titles.map(t => `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">📷 ${t}</span>`).join('');
        }
      }
    }
  };

  // Initialize all smart modules when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    GalleryRenderer.render();
    RotatingHeadline.init();
    ThemeManager.init();
    SoundFX.init();
    Moodboard.init();
    GalleryFilter.init();
    ViewSwitcher.init();
    ZenMode.init();
    KeyboardShortcuts.init();
    BackToTop.init();
    ContactAutofill.init();
  });

  window.AzmiPortfolio = {
    ThemeManager,
    SoundFX,
    Moodboard,
    GalleryFilter,
    ViewSwitcher,
    ZenMode
  };
})();
