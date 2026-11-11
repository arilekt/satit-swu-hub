window.AppVersion = {
  version: 'v1.8.1',
  build: '20261111-213000',
  buildDate: '11/11/2026 21:30 น.',
  display: function() { return this.version + ' · build ' + this.build; },
  full: function() { return this.version + ' · build ' + this.build + ' · อัปเดต ' + this.buildDate + ' (ไทย)'; }
};
