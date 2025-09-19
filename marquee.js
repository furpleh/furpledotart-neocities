// Seamless JS marquee with smooth speed changes (no jump on faster/slower)
(function() {
  const track = document.getElementById('marquee-track');
  const viewport = track?.parentElement;
  if (!track || !viewport) return;

  const btnSlower = document.getElementById('marquee-slower');
  const btnFaster = document.getElementById('marquee-faster');
  const btnToggle = document.getElementById('marquee-toggle');

  // Base speed (pixels per second). Positive = leftward scroll.
  let speed = 80;          // default
  const minSpeed = 20;
  const maxSpeed = 400;
  const step = 20;

  let offset = 0;          // current translateX (negative going left)
  let contentWidth = 0;    // width of first sequence
  let playing = true;
  let lastTime = performance.now();
  let resizeTimer = 0;

  // Build duplicated content so we can loop seamlessly.
  function build() {
    // Keep only the original (first) logical set: assume first unique  (stop at 200 nodes safety)
    const originals = Array.from(track.children);
    // Remove any clones (heuristic: data-clone attr)
    originals.forEach(n => { if (n.dataset && n.dataset.clone === '1') n.remove(); });

    // Measure after ensuring layout
    track.style.transform = 'translateX(0)';
    offset = 0;

    // Force reflow
    void track.offsetWidth;

    contentWidth = track.getBoundingClientRect().width;

    // If content narrower than viewport, duplicate until it overflows
    const vpWidth = viewport.getBoundingClientRect().width;
    while (contentWidth < vpWidth && track.children.length < 400) {
      originals.forEach(n => {
        const c = n.cloneNode(true);
        c.dataset.clone = '1';
        track.appendChild(c);
      });
      contentWidth = track.getBoundingClientRect().width / 2; // width of one logical set
    }

    // Add one full duplicate sequence (for smooth wrap)
    originals.forEach(n => {
      const c = n.cloneNode(true);
      c.dataset.clone = '1';
      track.appendChild(c);
    });

    // Now contentWidth should represent single set (half of total)
    contentWidth = Math.round(track.getBoundingClientRect().width / 2);

    // Reset transform
    track.style.transform = 'translateX(0)';
  }

  function tick(now) {
    if (!playing) {
      lastTime = now;
      requestAnimationFrame(tick);
      return;
    }
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    // Move left
    offset -= speed * dt;

    // Wrap
    if (offset <= -contentWidth) {
      offset += contentWidth;
    }

    track.style.transform = `translateX(${offset}px)`;
    requestAnimationFrame(tick);
  }

  function updateSpeedDisplay() {
    // Optional: could show speed somewhere; currently just keeps buttons.
  }

  // Controls
  btnSlower?.addEventListener('click', () => {
    speed = Math.max(minSpeed, speed - step);
    updateSpeedDisplay();
  });
  btnFaster?.addEventListener('click', () => {
    speed = Math.min(maxSpeed, speed + step);
    updateSpeedDisplay();
  });
  btnToggle?.addEventListener('click', () => {
    playing = !playing;
    btnToggle.textContent = playing ? 'pause' : 'play';
  });

  // Handle visibility (pause in background to save CPU)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      playing = false;
      btnToggle && (btnToggle.textContent = 'play');
    } else {
      if (btnToggle && btnToggle.textContent === 'pause') {
        playing = true;
      }
      lastTime = performance.now();
    }
  });

  // Rebuild on resize (debounced)
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const wasPlaying = playing;
      playing = false;
      build();
      offset = 0;
      track.style.transform = 'translateX(0)';
      playing = wasPlaying;
      lastTime = performance.now();
    }, 150);
  });

  // Wait for images to load before measuring
  function allImagesLoaded() {
    const imgs = Array.from(track.querySelectorAll('img'));
    return imgs.every(i => i.complete);
  }

  function init() {
    build();
    lastTime = performance.now();
    requestAnimationFrame(tick);
  }

  if (allImagesLoaded()) {
    init();
  } else {
    const imgs = Array.from(track.querySelectorAll('img'));
    let loaded = 0;
    imgs.forEach(img => {
      const done = () => {
        loaded++;
        if (loaded === imgs.length) init();
      };
      if (img.complete) {
        done();
      } else {
        img.addEventListener('load', done);
        img.addEventListener('error', done);
      }
    });
  }
})();