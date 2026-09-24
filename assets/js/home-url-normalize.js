(function () {
  'use strict';

  const isProduction = window.location.hostname === 'acidity.com.au' || window.location.hostname === 'www.acidity.com.au';
  if (!isProduction) return;

  const isIndexPath = /\/index\.html$/i.test(window.location.pathname);
  const isRootWithQuery = window.location.pathname === '/' && window.location.search.length > 1;
  if (isIndexPath || isRootWithQuery) {
    window.location.replace('/' + window.location.hash);
  }
})();
