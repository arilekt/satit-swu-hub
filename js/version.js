window.AppVersion = {
  version: 'v1.7.0',
  build: '20261110-100000',
  buildDate: '10/11/2026 10:00 น.',
  display: function() { return this.version + ' · build ' + this.build; },
  full: function() { return this.version + ' · build ' + this.build + ' · อัปเดต ' + this.buildDate + ' (ไทย)'; }
};
