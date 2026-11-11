window.AppVersion = {
  version: 'v1.8.3',
  build: '20261111-220000',
  buildDate: '11/11/2026 22:00 น.',
  display: function() { return this.version + ' · build ' + this.build; },
  full: function() { return this.version + ' · build ' + this.build + ' · อัปเดต ' + this.buildDate + ' (ไทย)'; }
};
