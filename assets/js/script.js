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
    this.setupExpandListeners();
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
    this.setupExpandListeners();
  }

  renderJobs() {
    this.jobListings.innerHTML = '';
    this.filteredJobs.forEach((job, index) => {
      const card = this.createJobCard(job, index);
      this.jobListings.insertAdjacentHTML('beforeend', card);
    });
  }

  createJobCard(job, index) {
    const posted = this.formatDate(job.date_posted);
    const fullSummaryHTML = this.formatSummaryHTML(job.summary);
    const collapsedSummaryHTML = this.generateFallbackPreview(fullSummaryHTML);
    const pay = job.pay && job.pay !== 'Not listed' ? `<div class="job-pay">💰 ${job.pay}</div>` : '';
  
    return `
      <div class="job-card collapsed" id="job-card-${index}">
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
        <div class="job-summary formatted-summary text-size-medium text-color-secondary">
          <div class="summary-collapsed">${collapsedSummaryHTML}</div>
          <div class="summary-full" style="display: none;">${fullSummaryHTML}</div>
        </div>
        <button class="toggle-summary" data-target="job-card-${index}">View more</button>
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
  
  generateFallbackPreview(html) {
    // Use only the first paragraph or first 300 characters as fallback
    const firstParagraph = html.match(/<p>(.*?)<\/p>/);
    if (firstParagraph && firstParagraph[0]) return firstParagraph[0];
  
    // Otherwise fallback to trimming raw text
    const div = document.createElement('div');
    div.innerHTML = html;
    const text = div.innerText.trim().slice(0, 300);
    return `<p>${text}...</p>`;
  }  

  setupExpandListeners() {
    document.querySelectorAll('.toggle-summary').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const card = document.getElementById(targetId);
        const full = card.querySelector('.summary-full');
        const collapsed = card.querySelector('.summary-collapsed');

        const isExpanded = card.classList.toggle('expanded');
        card.classList.toggle('collapsed', !isExpanded);
        full.style.display = isExpanded ? 'block' : 'none';
        collapsed.style.display = isExpanded ? 'none' : 'block';
        btn.textContent = isExpanded ? 'View less' : 'View more';
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

  extractSectionHTML(html, startHeading) {
    const start = html.indexOf(`<h4>${startHeading}`);
    if (start === -1) return html;

    const remaining = html.slice(start);
    const nextHeadingIndex = remaining.indexOf('<h4>', 4);
    return nextHeadingIndex !== -1 ? remaining.slice(0, nextHeadingIndex) : remaining;
  }
}

document.addEventListener('DOMContentLoaded', () => new JobBoard());
