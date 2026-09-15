/* ==========================================================================
   Verlanglijst / moodboard — localStorage-gedreven.
   Infrastructuur klaar voor de productkaarten die in de volgende fase
   op de vloeren-, merk- en inspiratiepagina's komen.
   ========================================================================== */
(function () {
  "use strict";
  window.DVS = window.DVS || {};
  var KEY = "dvsWishlist";
  var listeners = [];

  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function write(items) {
    try { window.localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
    listeners.forEach(function (fn) { fn(items); });
  }

  var Wishlist = {
    getAll: read,
    count: function () { return read().length; },
    has: function (id) { return read().some(function (i) { return i.id === id; }); },
    add: function (item) {
      var items = read();
      if (items.some(function (i) { return i.id === item.id; })) return;
      item.addedAt = new Date().toISOString();
      items.unshift(item);
      write(items);
    },
    remove: function (id) {
      write(read().filter(function (i) { return i.id !== id; }));
    },
    toggle: function (item) {
      if (this.has(item.id)) this.remove(item.id);
      else this.add(item);
    },
    onChange: function (fn) { listeners.push(fn); }
  };

  DVS.Wishlist = Wishlist;
})();
