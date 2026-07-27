(function(){
  if(window.__lpQuoteInit) return; window.__lpQuoteInit=true;

  var PAGE_SOURCE="guam_car_shipping";
  var LANDING_PAGE="Guam Car Shipping";
  var WIDGET_ORIGIN="https://api.transcar.com";

  // Capture the original attribution ONCE from the landing URL (non-PII only).
  // Kept in memory for the page session and never overwritten by later interaction.
  var attribution=(function(){
    var out={}, keys=["utm_source","utm_medium","utm_campaign","utm_content","utm_term","gclid"];
    try{
      var qs=new URLSearchParams(window.location.search);
      keys.forEach(function(k){var v=qs.get(k); if(v) out[k]=v;});
    }catch(e){}
    return out;
  })();

  window.dataLayer=window.dataLayer||[];
  function push(evt,extra){
    var data={event:evt,page_source:PAGE_SOURCE,landing_page:LANDING_PAGE,page_url:window.location.href};
    var k; for(k in attribution){ if(attribution.hasOwnProperty(k)) data[k]=attribution[k]; }
    if(extra){ for(k in extra){ if(extra.hasOwnProperty(k)) data[k]=extra[k]; } }
    window.dataLayer.push(data);
  }

  var backdrop=null, isOpen=false, lastFocus=null, lifted=[];
  function ensureBackdrop(){
    if(backdrop) return backdrop;
    backdrop=document.createElement('div');
    backdrop.id='lp-quote-backdrop';
    backdrop.addEventListener('click',closeModal);
    document.body.appendChild(backdrop);
    return backdrop;
  }
  // Positioned ancestors of the host create stacking contexts that would trap the modal
  // below the body-level backdrop. Lift each above the backdrop via an inline !important
  // z-index (beats any stylesheet rule) and make it click-transparent so backdrop clicks
  // still close the modal. Originals are captured so close() restores them exactly.
  function saveProp(rec,el,prop){ rec['_'+prop]={v:el.style.getPropertyValue(prop),p:el.style.getPropertyPriority(prop)}; }
  function restoreProp(rec,prop){ var s=rec['_'+prop]; if(!s)return; if(s.v) rec.el.style.setProperty(prop,s.v,s.p); else rec.el.style.removeProperty(prop); }
  function liftAncestors(host){
    lifted=[];
    var n=host.parentElement;
    while(n && n.tagName!=='BODY' && n.tagName!=='HTML'){
      var cs=getComputedStyle(n);
      if(cs.position!=='static'){
        var rec={el:n, overlays:[]};
        // lift above the backdrop and make it click-transparent
        saveProp(rec,n,'z-index'); saveProp(rec,n,'pointer-events');
        n.style.setProperty('z-index','100001','important');
        n.style.setProperty('pointer-events','none','important');
        // hide this ancestor's own paint (its classic background box would otherwise
        // show above the backdrop at its absolute position) — the modal panel is the
        // only thing that should be visible.
        saveProp(rec,n,'background-color'); saveProp(rec,n,'background-image'); saveProp(rec,n,'box-shadow');
        n.style.setProperty('background-color','transparent','important');
        n.style.setProperty('background-image','none','important');
        n.style.setProperty('box-shadow','none','important');
        Array.prototype.forEach.call(n.children,function(ch){
          if(ch.classList && ch.classList.contains('elementor-background-overlay')){
            rec.overlays.push({el:ch, v:ch.style.getPropertyValue('opacity'), p:ch.style.getPropertyPriority('opacity')});
            ch.style.setProperty('opacity','0','important');
          }
        });
        lifted.push(rec);
      }
      n=n.parentElement;
    }
  }
  function restoreAncestors(){
    lifted.forEach(function(r){
      restoreProp(r,'z-index'); restoreProp(r,'pointer-events');
      restoreProp(r,'background-color'); restoreProp(r,'background-image'); restoreProp(r,'box-shadow');
      r.overlays.forEach(function(o){ if(o.v) o.el.style.setProperty('opacity',o.v,o.p); else o.el.style.removeProperty('opacity'); });
    });
    lifted=[];
  }
  function closeMobileMenu(){
    var mc=document.querySelector('.menu-container.open'); if(mc) mc.classList.remove('open');
    var mb=document.querySelector('.menu-backdrop.open'); if(mb) mb.classList.remove('open');
  }
  function openModal(location){
    if(isOpen) return;                 // already open -> do not re-fire modal_open
    var host=document.getElementById('lp-quote-host');
    if(!host) return;
    ensureBackdrop();
    lastFocus=document.activeElement;
    closeMobileMenu();
    liftAncestors(host);
    host.setAttribute('role','dialog');
    host.setAttribute('aria-modal','true');
    host.setAttribute('aria-label','Rate Quote Calculator');
    document.body.classList.add('lp-quote-open');
    isOpen=true;
    var closeBtn=document.getElementById('lp-quote-close');
    if(closeBtn){ try{closeBtn.focus();}catch(e){} }
    push('transcar_quote_modal_open',{cta_location:location});
  }
  function closeModal(){
    if(!isOpen) return;
    document.body.classList.remove('lp-quote-open');
    restoreAncestors();
    var host=document.getElementById('lp-quote-host');
    if(host){ host.removeAttribute('aria-modal'); }
    isOpen=false;
    if(lastFocus && lastFocus.focus){ try{lastFocus.focus();}catch(e){} }
  }

  function ctaHandler(location){
    return function(e){
      e.preventDefault();              // stay on the page, no #quote navigation
      push('transcar_quote_cta_click',{cta_location:location});
      openModal(location);
    };
  }

  function wire(){
    // Menu quote CTAs: every "Get a Quote" link in the header.
    Array.prototype.forEach.call(document.querySelectorAll('#header a[href="#quote"]'),function(a){
      if(a.getAttribute('data-lp-cta')) return; a.setAttribute('data-lp-cta','menu');
      a.addEventListener('click',ctaHandler('menu'));
    });
    // Hero quote CTA: the button inside the .banner hero.
    Array.prototype.forEach.call(document.querySelectorAll('.banner a[href="#quote"]'),function(a){
      if(a.getAttribute('data-lp-cta')) return; a.setAttribute('data-lp-cta','hero');
      a.addEventListener('click',ctaHandler('hero'));
    });
    var closeBtn=document.getElementById('lp-quote-close');
    if(closeBtn && !closeBtn.getAttribute('data-lp-bound')){ closeBtn.setAttribute('data-lp-bound','1'); closeBtn.addEventListener('click',closeModal); }
  }

  document.addEventListener('keydown',function(e){ if(isOpen && (e.key==='Escape'||e.key==='Esc')) closeModal(); });

  // Quote-submission tracking (best-effort, unverified). The calculator is a
  // cross-origin iframe (api.transcar.com); the only message it is known to emit
  // is 'transcar-widget-resize'. There is no confirmed success/redirect signal we
  // can observe, so we do NOT fabricate a submit event. If Transcar's widget emits
  // a submission message from its own origin (matching its 'transcar-widget-*'
  // convention) we forward it once; otherwise this stays dormant.
  var submitted=false;
  window.addEventListener('message',function(e){
    if(e.origin!==WIDGET_ORIGIN) return;
    var d=e.data; if(!d || typeof d!=='object') return;
    var t=String(d.type||d.event||'');
    if(/^transcar-widget-(submit|submitted|success|complete|completed|lead|conversion|thank)/i.test(t)){
      if(submitted) return; submitted=true;
      push('transcar_quote_submit');
    }
  });

  if(document.readyState!=='loading') wire();
  else document.addEventListener('DOMContentLoaded',wire);
  window.addEventListener('load',wire);
})();
