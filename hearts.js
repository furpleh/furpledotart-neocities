      (function(){
        const track = document.getElementById('hearts-track');
        const item = document.getElementById('hearts-item');
        if (!track || !item) return;

        const ensureFill = () => {
          try {
            const itemH = item.getBoundingClientRect().height;
            if (itemH === 0) return; // not visible yet
            track.style.setProperty('--v-shift', itemH + 'px');
            // Fill track with single hearts until at least 2x item height
            while (track.getBoundingClientRect().height < itemH * 2 + 1) {
              const clone = item.cloneNode(true);
              clone.removeAttribute('id');
              track.appendChild(clone);
            }
          } catch (e) { /* no-op */ }
        };

        const raf = requestAnimationFrame || function(cb){ return setTimeout(cb,16); };
        raf(() => { ensureFill(); });
        window.addEventListener('resize', () => { ensureFill(); });
      })();