/**
 * =========================================================================
 * Ambara Architects & Construction — Main Website Scripts (js/main.js)
 * Handles animations, 3D carousel, lightbox, and smart enquiry submissions
 * =========================================================================
 */

(function () {
  'use strict';

  // DOM Helpers
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  /* -------------------------------------------------------------
     1. Preloader Intro Animation
     ------------------------------------------------------------- */
  const pn = $('#pn');
  if (pn) {
    pn.innerHTML = [...'AMBARA'].map((c, i) =>
      `<span style="animation-delay:${1 + i * 0.09}s">${c}</span>`
    ).join('');
  }

  const pre = $('#pre');
  if (pre) {
    setTimeout(() => {
      pre.classList.add('go');
      document.body.classList.add('ready');
    }, 2800);
    setTimeout(() => {
      if (pre.parentNode) pre.remove();
    }, 4000);
  } else {
    document.body.classList.add('ready');
  }

  /* -------------------------------------------------------------
     2. Header Scroll & Reading Progress Bar
     ------------------------------------------------------------- */
  const bar = $('#bar');
  const hd = $('#hd');
  window.addEventListener('scroll', () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    if (bar && total > 0) {
      bar.style.width = (window.scrollY / total) * 100 + '%';
    }
    if (hd) {
      hd.classList.toggle('s', window.scrollY > 50);
    }
  }, { passive: true });

  /* -------------------------------------------------------------
     3. Mobile Navigation Menu
     ------------------------------------------------------------- */
  const mb = $('#mb');
  const mn = $('#menu');
  if (mb && mn) {
    mb.onclick = () => {
      mb.classList.toggle('o');
      mn.classList.toggle('o');
    };
    $$('#menu a').forEach(a => {
      a.onclick = () => {
        mb.classList.remove('o');
        mn.classList.remove('o');
      };
    });
  }

  /* -------------------------------------------------------------
     4. Scroll Reveal Animations (IntersectionObserver)
     ------------------------------------------------------------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  $$('.rv').forEach((e, i) => {
    e.style.transitionDelay = (i % 4) * 0.08 + 's';
    io.observe(e);
  });

  /* -------------------------------------------------------------
     5. Number Counting Animation
     ------------------------------------------------------------- */
  const runCounter = (el, target, duration) => {
    const start = performance.now();
    (function frame(now) {
      const p = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + '+';
      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        el.classList.remove('np');
        void el.offsetWidth;
        el.classList.add('np');
      }
    })(start);
  };

  const co = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        co.unobserve(e.target);
        runCounter(e.target, +e.target.dataset.n, 2000);
      }
    });
  }, { threshold: 0.3 });

  $$('[data-n]').forEach(e => co.observe(e));
  setTimeout(() => {
    $$('[data-h]').forEach((e, i) => {
      setTimeout(() => runCounter(e, +e.dataset.h, 2200), i * 250);
    });
  }, 3500);

  /* -------------------------------------------------------------
     6. Bento Card 3D Hover Tilt
     ------------------------------------------------------------- */
  $$('.tilt').forEach(c => {
    c.onmousemove = (e) => {
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      c.style.transform = `perspective(800px) rotateY(${(x - 0.5) * 8}deg) rotateX(${(0.5 - y) * 8}deg)`;
      c.style.setProperty('--mx', (x * 100) + '%');
      c.style.setProperty('--my', (y * 100) + '%');
    };
    c.onmouseleave = () => {
      c.style.transform = '';
    };
  });

  /* -------------------------------------------------------------
     7. 3D Carousel Gallery
     ------------------------------------------------------------- */
  const defaultProjects = [
    ['Shivalaya Villa', 'Completed', '#2a2418', 0],
    ['Modern Façade', 'Elevation', '#1a2430', 1],
    ['Sri Rameshta Residency', 'Interior', '#2b1f1a', 2],
    ['ARNA Residence', 'Completed', '#16262a', 3],
    ['Kodipalya G+2', 'Ongoing', '#262230', 4],
    ['Contemporary Duplex', 'Elevation', '#202a1f', 5]
  ];

  function loadGalleryData() {
    let stored = [];
    try {
      stored = JSON.parse(localStorage.getItem('wsite_proj') || '[]')
        .filter(x => x.on !== false && (x.img || x.url));
    } catch (e) {
      stored = [];
    }

    if (stored.length > 0) {
      return stored.map(x => [
        x.title || 'Project',
        x.cat || 'Completed',
        '#1a1f27',
        0,
        x.img || x.url
      ]);
    }
    return defaultProjects;
  }

  const galleryList = loadGalleryData();
  const cv = $('#cv');

  if (cv) {
    cv.innerHTML = galleryList.map(p => `
      <div class="it" style="--c:${p[2]}">
        ${p[4] 
          ? `<img src="${p[4]}" alt="${p[0]}" loading="lazy">` 
          : `<svg viewBox="0 0 200 260" preserveAspectRatio="xMidYMax slice"><use href="#hm" transform="translate(${p[3] * 6 - 10} ${p[3] * 4}) scale(${1 + p[3] % 3 * 0.08})"/></svg>`
        }
        <div>
          <small>${p[1]}</small>
          <h3>${p[0]}</h3>
        </div>
      </div>
    `).join('');
  }

  let isDragging = false;
  const its = $$('.it');
  let currentIdx = 0;
  let carouselTimer;

  function updateCarouselPositions() {
    its.forEach((el, i) => {
      let d = i - currentIdx;
      const n = its.length;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      const a = Math.abs(d);

      el.style.transform = `translateX(${d * 110 * (window.innerWidth < 600 ? 0.7 : 1)}%) translateZ(${-a * 140}px) rotateY(${-d * 38}deg) scale(${1 - a * 0.05})`;
      el.style.opacity = a > 2 ? 0 : 1 - a * 0.28;
      el.style.filter = `blur(${a * 3}px)`;
      el.style.zIndex = 10 - a;
      el.style.pointerEvents = a > 2 ? 'none' : 'auto';

      el.onclick = () => {
        if (isDragging) return;
        if (d === 0) openLightbox(i);
        else {
          goToSlide(currentIdx + d);
          resetCarouselTimer();
        }
      };
    });
  }

  function goToSlide(i) {
    if (!its.length) return;
    currentIdx = (i + its.length) % its.length;
    updateCarouselPositions();
  }

  function resetCarouselTimer() {
    clearInterval(carouselTimer);
    carouselTimer = setInterval(() => goToSlide(currentIdx + 1), 3500);
  }

  const btnNext = $('#nx');
  const btnPrev = $('#pv');
  if (btnNext) btnNext.onclick = () => { goToSlide(currentIdx + 1); resetCarouselTimer(); };
  if (btnPrev) btnPrev.onclick = () => { goToSlide(currentIdx - 1); resetCarouselTimer(); };

  let startX = null;
  if (cv) {
    cv.onpointerdown = (e) => { startX = e.clientX; };
    window.addEventListener('pointerup', (e) => {
      if (startX !== null && Math.abs(e.clientX - startX) > 40) {
        goToSlide(currentIdx + (e.clientX < startX ? 1 : -1));
        resetCarouselTimer();
        isDragging = true;
        setTimeout(() => { isDragging = false; }, 80);
      }
      startX = null;
    });
  }

  updateCarouselPositions();
  resetCarouselTimer();
  window.addEventListener('resize', updateCarouselPositions);

  /* -------------------------------------------------------------
     8. Fullscreen Lightbox
     ------------------------------------------------------------- */
  const lb = $('#lb');
  const ls = $('#lbs');
  let lbIdx = 0;
  let zoom = 1;
  let tx = 0, ty = 0;

  let lbItems = [];
  if (ls && its.length) {
    lbItems = its.map(el => {
      const d = document.createElement('div');
      d.className = 'lbit';
      d.style.setProperty('--c', el.style.getPropertyValue('--c'));
      d.innerHTML = el.querySelector('svg, img').outerHTML + el.querySelector('div').outerHTML;
      ls.appendChild(d);
      return d;
    });
  }

  function clampPan() {
    if (!lbItems[lbIdx]) return;
    const e = lbItems[lbIdx];
    const mx = Math.max(0, (e.offsetWidth * zoom - window.innerWidth) / 2 + 30);
    const my = Math.max(0, (e.offsetHeight * zoom - window.innerHeight) / 2 + 30);
    tx = Math.max(-mx, Math.min(mx, tx));
    ty = Math.max(-my, Math.min(my, ty));
  }

  function updateLightbox() {
    if (!lbItems.length) return;
    const n = lbItems.length;
    lbItems.forEach((el, i) => {
      let d = i - lbIdx;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      const a = Math.abs(d);
      const isCur = d === 0;

      el.style.transform = isCur
        ? `translate(${tx}px, ${ty}px) scale(${zoom})`
        : `translateX(${d * (window.innerWidth < 600 ? 80 : 98)}%) translateZ(${-a * 200}px) rotateY(${-d * 42}deg) scale(${1 - a * 0.06})`;

      el.style.opacity = a > 2 || (zoom > 1 && !isCur) ? 0 : 1 - a * 0.32;
      el.style.filter = isCur ? 'none' : `blur(${a * 3}px)`;
      el.style.zIndex = 10 - a;
      el.style.pointerEvents = a > 2 ? 'none' : 'auto';
      if (el.lastChild) el.lastChild.style.opacity = zoom > 1 ? 0 : 1;
    });

    if (ls) ls.classList.toggle('zz', zoom > 1);
    const zv = $('#zv');
    if (zv) zv.textContent = Math.round(zoom * 100) + '%';
    const lbc = $('#lbc');
    if (lbc) lbc.textContent = (lbIdx + 1) + ' / ' + lbItems.length;
  }

  function openLightbox(i) {
    if (!lb) return;
    lbIdx = i;
    zoom = 1;
    tx = ty = 0;
    updateLightbox();
    lb.classList.add('o');
    document.body.style.overflow = 'hidden';
    clearInterval(carouselTimer);
  }

  function closeLightbox() {
    if (!lb) return;
    lb.classList.remove('o');
    document.body.style.overflow = '';
    zoom = 1;
    tx = ty = 0;
    updateLightbox();
    goToSlide(lbIdx);
    resetCarouselTimer();
  }

  function navLightbox(d) {
    lbIdx = (lbIdx + d + lbItems.length) % lbItems.length;
    zoom = 1;
    tx = ty = 0;
    updateLightbox();
  }

  function setZoom(factor) {
    zoom = Math.min(4, Math.max(0.7, zoom * factor));
    if (zoom <= 1) { tx = ty = 0; }
    clampPan();
    updateLightbox();
  }

  if ($('#lbx')) $('#lbx').onclick = closeLightbox;
  if ($('#lbp')) $('#lbp').onclick = () => navLightbox(-1);
  if ($('#lbnx')) $('#lbnx').onclick = () => navLightbox(1);
  if ($('#zi')) $('#zi').onclick = () => setZoom(1.4);
  if ($('#zo')) $('#zo').onclick = () => setZoom(1 / 1.4);
  if ($('#zr')) $('#zr').onclick = () => { zoom = 1; tx = ty = 0; updateLightbox(); };

  if (ls) {
    ls.addEventListener('wheel', (e) => {
      e.preventDefault();
      setZoom(e.deltaY < 0 ? 1.18 : 0.85);
    }, { passive: false });
  }

  window.addEventListener('keydown', (e) => {
    if (!lb || !lb.classList.contains('o')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') navLightbox(1);
    if (e.key === 'ArrowLeft') navLightbox(-1);
    if (e.key === '+' || e.key === '=') setZoom(1.4);
    if (e.key === '-') setZoom(1 / 1.4);
  });

  /* -------------------------------------------------------------
     9. Testimonials Carousel
     ------------------------------------------------------------- */
  const tt = $('#tt');
  const tc = $$('.tc');
  const dt = $('#dt');

  if (dt && tc.length) {
    dt.innerHTML = tc.map(() => '<i></i>').join('');
    const dd = $$('#dt i');
    let ti = 0;
    let hold = false;

    const showTestimonial = (i) => {
      ti = (i + tc.length) % tc.length;
      tt.scrollTo({
        left: tc[ti].offsetLeft - (tt.clientWidth - tc[ti].clientWidth) / 2,
        behavior: 'smooth'
      });
    };

    tt.addEventListener('scroll', () => {
      let best = 0, minDist = 1e9;
      tc.forEach((c, i) => {
        const d = Math.abs(c.offsetLeft + c.clientWidth / 2 - tt.scrollLeft - tt.clientWidth / 2);
        if (d < minDist) { minDist = d; best = i; }
      });
      ti = best;
      tc.forEach((c, i) => c.classList.toggle('a', i === best));
      dd.forEach((d, i) => d.classList.toggle('a', i === best));
    }, { passive: true });

    dd.forEach((d, i) => { d.onclick = () => showTestimonial(i); });
    ['pointerenter', 'touchstart'].forEach(v => tt.addEventListener(v, () => { hold = true; }, { passive: true }));
    ['pointerleave', 'touchend'].forEach(v => tt.addEventListener(v, () => { setTimeout(() => { hold = false; }, 2500); }, { passive: true }));

    setInterval(() => { if (!hold) showTestimonial(ti + 1); }, 4500);
    if (dd[0]) dd[0].classList.add('a');
  }

  /* -------------------------------------------------------------
     10. Contact Form Submission (Direct to Dashboard & Google Sheets)
     ------------------------------------------------------------- */
  const fm = $('#fm');
  const ok = $('#ok');
  const btnSub = $('#btn-submit-enquiry');
  const enqModal = $('#enq-modal');
  const modalDesc = $('#modal-desc');
  const modalClose = $('#modal-close-btn');

  const closeModal = () => {
    if (enqModal) enqModal.classList.remove('active');
  };

  if (modalClose) modalClose.onclick = closeModal;
  if (enqModal) {
    enqModal.onclick = (e) => {
      if (e.target === enqModal) closeModal();
    };
  }

  if (fm) {
    fm.onsubmit = async (e) => {
      e.preventDefault();

      const name = ($('#fn')?.value || '').trim();
      const phone = ($('#ph')?.value || '').trim();
      const email = ($('#em')?.value || '').trim();
      const service = ($('#sv')?.value || 'Residential construction').trim();
      const msg = ($('#ms')?.value || '').trim();

      if (!name || !phone) {
        alert('Please provide your name and phone number so we can get in touch.');
        return;
      }

      const enquiryData = {
        id: Date.now().toString(),
        name: name,
        phone: phone,
        email: email,
        service: service,
        msg: msg,
        date: new Date().toISOString(),
        status: 'New',
        notes: ''
      };

      // 1. Loading state
      if (btnSub) {
        btnSub.disabled = true;
        btnSub.textContent = 'Submitting enquiry…';
      }
      if (ok) {
        ok.style.display = 'block';
        ok.textContent = 'Sending enquiry to Ambara Architects…';
      }

      // 2. Save directly to Google Sheets & local database
      try {
        if (window.AmbaraSheets) {
          await window.AmbaraSheets.saveEnquiry(enquiryData);
        } else {
          const list = JSON.parse(localStorage.getItem('wsite_enq') || '[]');
          list.unshift(enquiryData);
          localStorage.setItem('wsite_enq', JSON.stringify(list));
        }
      } catch (err) {
        console.warn('Enquiry save notice:', err);
      }

      // 3. Reset button & form
      if (btnSub) {
        btnSub.disabled = false;
        btnSub.textContent = 'Submit Enquiry';
      }
      if (ok) ok.style.display = 'none';
      fm.reset();

      // 4. Show confirmation popup message
      if (modalDesc) {
        modalDesc.innerHTML = `Thank you, <strong>${escapeHtml(name)}</strong>! Your enquiry for <strong>${escapeHtml(service)}</strong> has been received directly by our team. We will call you at <strong>${escapeHtml(phone)}</strong> shortly.`;
      }
      if (enqModal) {
        enqModal.classList.add('active');
      }
    };
  }

})();
