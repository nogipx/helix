const KEY = 'qrm-results-v1';
const STATUSES = ['won','cashed','lost'];
export class Results {
  constructor(storage) {
    this.storage = storage;
    this.saved = true;
    this.entries = [];
    try {
      const entries = JSON.parse(storage?.getItem(KEY) || '[]');
      if (Array.isArray(entries)) this.entries = entries.filter(x => x && typeof x.id === 'string' && typeof x.date === 'string' && Number.isFinite(Date.parse(x.date)) && STATUSES.includes(x.status) && Number.isFinite(x.score) && x.score >= 0 && Number.isInteger(x.sector) && x.sector >= 1 && x.sector <= 4 && Array.isArray(x.modules) && x.modules.every(m => typeof m === 'string') && typeof x.reason === 'string').slice(0,50);
    } catch { this.saved = false; }
  }
  add(entry) {
    if (this.entries.some(x => x.id === entry.id)) return;
    this.entries = [entry, ...this.entries].slice(0,50);
    try {
      if (!this.storage) throw new Error('Browser storage unavailable');
      this.storage.setItem(KEY, JSON.stringify(this.entries));
      this.saved = true;
    } catch { this.saved = false; }
  }
}
