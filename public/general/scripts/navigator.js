/* jshint esversion: 6 */

// client routing is based on page-wide div ID's of the format '#page-${page-name}'
// if those ID's are altered, update query selection format accordingly!

(function(){
  let imports = {
    home_js: require('./../../pages/home/home-scripts'),
    error_js: require('./../../pages/error/error-scripts'),
    // DEPRECATED --require('./../../pages/about/about-scripts'),
		//!JS_IMPORTS! (this comment is an important flag for gulp, DND!)
  };
  let pages = {
    home: {
      hash: '',
      divId: 'page-home',
      js: imports.home_js,
    },
		error: {
      hash: 'error',
      divId: 'page-error',
      js: imports.error_js,
    },
	//!PAGES! (this comment is an important flag for gulp, DND!)
  };
  let hash = window.location.href.split("#").splice(1).join('');
  window.addEventListener('hashchange', (event)=>{
    let newHash = event.newURL.split('#').splice(1).join('');
    renderPage(newHash);
  }, false);

  function renderPage(_hash) {
    // first we find page matching hash
    let activePage;
    let pageKey;
    for (let _pageKey in pages){
      if (pages[_pageKey].hash === _hash) {
        activePage = document.querySelector(`#${pages[_pageKey].divId}`);
        pageKey = _pageKey;
        break;
      }
    }
    // clear all pages
    for (let _pageKey in pages){
      let page = document.querySelector(`#${pages[_pageKey].divId}`);
      let pageClasses = page.classList.value.split(' ');
      if (!pageClasses.includes('hidden')) {
        // if it exists, this is a good place to fire a page.js.unmount()
        let pageJs = pages[_pageKey].js;
        if (pageJs.unmount) {
          pageJs.unmount();
        }
        page.classList.add('hidden');
      }
    }
    if (!activePage) {
      // if no page exists for that hash, show error page
      activePage = document.querySelector(`#${pages.home.divId}`);
      pageKey = 'home';
    }
    // show hash's page if it not already shown
    let activePageClasses = activePage.classList.value.split(' ');
    if (activePageClasses.includes('hidden')) {
      // mount js if page is setup for that
      let pageJs = pages[pageKey].js;
      if (pageJs.mount) {
        pageJs.mount();
      }
      activePage.classList.remove('hidden');
    }
  }
  //initial page render
  renderPage(hash);
  // we hide static content until navigator is ready
  document.querySelector("body").classList.remove('hidden');
}());
