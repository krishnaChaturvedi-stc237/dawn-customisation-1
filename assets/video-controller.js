// assets/video-controller.js
(function () {
  if (window.VideoController) return; // Singleton guard

  const players = new Map(); // id -> player object
  let currentPlayerId = null;
  let observer = null;

  function initObserver() {
    if (observer || !('IntersectionObserver' in window)) return;

    observer = new IntersectionObserver(handleIntersections, {
      threshold: 0.5, // ~50% visible
    });
  }

  function handleIntersections(entries) {
    entries.forEach((entry) => {
      const el = entry.target;
      const id = el.dataset.videoId;
      const player = players.get(id);
      if (!player) return;

      const isInView = entry.intersectionRatio >= 0.5;

      if (!isInView && player.isPlaying()) {
        // Pause when scrolled out
        player.autoResume = true;
        pause(id);
      } else if (isInView && player.autoResume) {
        // Auto-resume only if we paused due to scroll
        play(id);
        player.autoResume = false;
      }
    });
  }

  function setCurrent(id) {
    if (currentPlayerId && currentPlayerId !== id) {
      const prev = players.get(currentPlayerId);
      if (prev) {
        prev.autoResume = false;
        prev.pause();
      }
    }
    currentPlayerId = id;
  }

  function play(id) {
    const player = players.get(id);
    if (!player) return;

    setCurrent(id);
    player.play();
  }

  function pause(id) {
    const player = players.get(id);
    if (!player) return;

    player.pause();
    if (currentPlayerId === id) {
      currentPlayerId = null;
    }
  }

  function pauseAll() {
    players.forEach((player) => {
      player.autoResume = false;
      player.pause();
    });
    currentPlayerId = null;
  }

  // Build a player abstraction from a container element
  function createPlayerFromElement(container) {
    const id = container.dataset.videoId;
    if (!id) return null;

    // Try to find existing <video> or <iframe> inside
    let videoEl = container.querySelector('video');
    let iframeEl = container.querySelector('iframe');
    let type = null;

    if (videoEl) {
      type = 'html5';
    } else if (iframeEl) {
      const src = iframeEl.src || '';
      if (src.indexOf('youtube.com') !== -1) type = 'youtube';
      else if (src.indexOf('vimeo.com') !== -1) type = 'vimeo';
    }

    const player = {
      id,
      container,
      type,
      videoEl,
      iframeEl,
      autoResume: false,

      play() {
        if (this.type === 'html5' && this.videoEl) {
          this.videoEl
            .play()
            .catch(() => {
              // Swallow autoplay errors
            });
        } else if (this.type === 'youtube' && this.iframeEl && this.iframeEl.contentWindow) {
          this.iframeEl.contentWindow.postMessage(
            '{"event":"command","func":"playVideo","args":""}',
            '*',
          );
        } else if (this.type === 'vimeo' && this.iframeEl && this.iframeEl.contentWindow) {
          this.iframeEl.contentWindow.postMessage('{"method":"play"}', '*');
        }
      },

      pause() {
        if (this.type === 'html5' && this.videoEl) {
          this.videoEl.pause();
        } else if (this.type === 'youtube' && this.iframeEl && this.iframeEl.contentWindow) {
          this.iframeEl.contentWindow.postMessage(
            '{"event":"command","func":"pauseVideo","args":""}',
            '*',
          );
        } else if (this.type === 'vimeo' && this.iframeEl && this.iframeEl.contentWindow) {
          this.iframeEl.contentWindow.postMessage('{"method":"pause"}', '*');
        }
      },

      isPlaying() {
        if (this.type === 'html5' && this.videoEl) {
          return !this.videoEl.paused && !this.videoEl.ended;
        }
        // For iframes we can't easily query state; assume "playing" if it's current
        return currentPlayerId === this.id;
      },
    };

    return player;
  }

  function registerPlayerFromElement(container) {
    if (!container) return;
    initObserver();

    const id = container.dataset.videoId;
    if (!id || players.has(id)) return;

    const player = createPlayerFromElement(container);
    if (!player) return;

    players.set(id, player);

    if (observer) {
      observer.observe(container);
    }

    // Hook click on any element marked as play button inside this container
    container.addEventListener('click', function (event) {
      const trigger = event.target.closest('[data-video-play-button]');
      if (!trigger) return;

      // Re-scan for video/iframe in case deferred-media just injected it
      if (!player.videoEl && !player.iframeEl) {
        player.videoEl = container.querySelector('video');
        player.iframeEl = container.querySelector('iframe');
        if (player.videoEl) player.type = 'html5';
        else if (player.iframeEl) {
          const src = player.iframeEl.src || '';
          if (src.indexOf('youtube.com') !== -1) player.type = 'youtube';
          else if (src.indexOf('vimeo.com') !== -1) player.type = 'vimeo';
        }
      }

      play(id);
    });

    // For native videos, listen to manual pause
    const nativeVideo = container.querySelector('video');
    if (nativeVideo) {
      nativeVideo.addEventListener('pause', function () {
        if (currentPlayerId === id && !nativeVideo.ended) {
          currentPlayerId = null;
        }
      });
    }
  }

  function unregisterPlayerById(id) {
    const player = players.get(id);
    if (!player) return;

    if (observer) observer.unobserve(player.container);
    players.delete(id);
    if (currentPlayerId === id) currentPlayerId = null;
  }

  window.VideoController = {
    registerPlayerFromElement,
    unregisterPlayerById,
    play,
    pause,
    pauseAll,
  };
})();