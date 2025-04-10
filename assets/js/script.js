class JobBoard {
  constructor() {
    this.jobs = [];
    this.filteredJobs = [];
    this.jobListings = document.getElementById('jobListings');
    this.init();
  }

  async init() {
    await this.fetchJobs();
    this.setupFilters();
    this.renderJobs();
  }

  async fetchJobs() {
    try {
      const res = await fetch('scraper/jobs.json');
      this.jobs = await res.json();
      this.filteredJobs = [...this.jobs];
    } catch (err) {
      console.error('Failed to load jobs:', err);
      this.jobs = [];
    }
  }

  setupFilters() {
    const search = document.getElementById('job-search');
    const type = document.getElementById('job-type-filter');
    const sort = document.getElementById('job-sort');

    search.addEventListener('input', () => this.updateJobs());
    type.addEventListener('change', () => this.updateJobs());
    sort.addEventListener('change', () => this.updateJobs());
  }

  updateJobs() {
    const searchVal = document.getElementById('job-search').value.toLowerCase();
    const jobType = document.getElementById('job-type-filter').value;
    const sortBy = document.getElementById('job-sort').value;

    this.filteredJobs = this.jobs
      .filter(job => {
        const title = job.title?.toLowerCase() || '';
        const location = job.location?.toLowerCase() || '';
        const summary = this.extractSummaryText(job.summary).toLowerCase();

        const matchesSearch = title.includes(searchVal) || location.includes(searchVal) || summary.includes(searchVal);
        const matchesType = !jobType || job.job_type === jobType;

        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        const aDate = new Date(a.date_posted || 0);
        const bDate = new Date(b.date_posted || 0);
        return sortBy === 'date_posted_asc' ? aDate - bDate : bDate - aDate;
      });

    this.renderJobs();
  }

  renderJobs() {
    this.jobListings.innerHTML = '';
    this.filteredJobs.forEach((job, index) => {
      const card = this.createJobCard(job, index);
      this.jobListings.insertAdjacentHTML('beforeend', card);
    });

    this.addToggleListeners();
  }

  createJobCard(job, index) {
    const posted = this.formatDate(job.date_posted);
    const summaryHTML = this.formatSummaryHTML(job.summary);
    const pay = job.pay && job.pay !== 'Not listed' ? `<div class="job-pay">💰 ${job.pay}</div>` : '';

    return `
      <div class="job-card">
        <div class="job-card-header">
          <h3 class="heading-style-h4">${job.title}</h3>
          <div class="job-card-meta">
            <span class="text-size-medium text-color-secondary">📍 ${job.location}</span>
            <span class="text-size-medium text-color-secondary">🕒 ${posted}</span>
          </div>
        </div>
        <div class="job-card-details">
          <div class="job-type-tag">💼 ${job.job_type}</div>
          ${pay}
        </div>
        <div id="summary-${index}" class="job-summary formatted-summary text-size-medium text-color-secondary collapsed">
          ${summaryHTML}
        </div>
        <button class="toggle-summary" data-target="summary-${index}">View more</button>
        <div class="job-card-actions">
          <a href="${job.url || '/contact'}" target="_blank" class="button-link-navbar">
            <div>Quick Apply</div>
            <div class="button-link-line"></div>
            <div class="button-link-line absolute"></div>
          </a>
        </div>
      </div>
    `;
  }

  addToggleListeners() {
    const buttons = document.querySelectorAll('.toggle-summary');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.target);
        const expanded = target.classList.toggle('expanded');
        target.classList.toggle('collapsed');
        btn.textContent = expanded ? 'View less' : 'View more';
      });
    });
  }

  formatDate(dateStr) {
    if (!dateStr || dateStr === 'Unknown') return 'Recently posted';
    const date = new Date(dateStr);
    const now = new Date();
    const daysAgo = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (daysAgo === 0) return 'Posted today';
    if (daysAgo === 1) return 'Posted yesterday';
    return `Posted ${daysAgo}d ago`;
  }

  extractSummaryText(summary) {
    if (!summary) return '';
    if (typeof summary === 'string') return summary;
    if (Array.isArray(summary)) return summary.join(' ');
    if (typeof summary === 'object') return Object.values(summary).join(' ');
    return '';
  }

  formatSummaryHTML(summary) {
    const raw = this.extractSummaryText(summary);
    const text = raw.replace(/\n/g, '\n');
    const lines = text.split(/\n/).map(line => line.trim()).filter(Boolean);

    const sectionHeadings = [
      'About the role',
      "What you'll be doing",
      'What We’re Looking For',
      'What we offer',
      'About us',
      'Start your career',
      'Position Overview',
      'Key Responsibilities',
      'Requirements',
      'Benefits',
      'Why Join Us?',
      'Company Overview:',
      'The Opportunity:'
    ];

    let html = '';
    let insideList = false;

    lines.forEach(line => {
      const isHeading = sectionHeadings.some(h => line.toLowerCase().startsWith(h.toLowerCase()));
      const isBullet = line.startsWith('-') || line.startsWith('•');

      if (isHeading) {
        if (insideList) {
          html += '</ul>';
          insideList = false;
        }
        html += `<h4>${line}</h4>`;
        return;
      }

      if (isBullet) {
        if (!insideList) {
          html += '<ul>';
          insideList = true;
        }
        html += `<li>${line.replace(/^[-•]\s*/, '')}</li>`;
        return;
      }

      if (insideList) {
        html += '</ul>';
        insideList = false;
      }

      html += `<p>${line}</p>`;
    });

    if (insideList) html += '</ul>';
    return html;
  }
}

document.addEventListener('DOMContentLoaded', () => new JobBoard());