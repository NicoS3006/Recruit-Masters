class JobBoard {
  constructor() {
    this.jobs = [];
    this.filteredJobs = [];
    this.selectedJobIndex = null;

    this.jobListings = document.getElementById('jobListings');
    this.jobDetails = document.getElementById('jobDetails');

    this.init();
  }

  async init() {
    await this.fetchJobs();
    this.setupFilters();
    this.updateJobs();
  }

  async fetchJobs() {
    try {
      const res = await fetch('scraper/jobs.json');
      this.jobs = await res.json();
    } catch (err) {
      console.error('Failed to load jobs:', err);
      this.jobs = [];
    }
  }

  setupFilters() {
    document.getElementById('job-search').addEventListener('input', () => this.updateJobs());
    document.getElementById('job-type-filter').addEventListener('change', () => this.updateJobs());
    document.getElementById('job-sort').addEventListener('change', () => this.updateJobs());
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

    // Preserve selection after filtering
    if (this.selectedJobIndex === null || this.selectedJobIndex >= this.filteredJobs.length) {
      this.selectedJobIndex = this.filteredJobs.length > 0 ? 0 : null;
    }

    this.renderJobs();

    if (this.selectedJobIndex !== null) {
      this.updateJobDetails(this.filteredJobs[this.selectedJobIndex]);
    } else {
      this.jobDetails.innerHTML = '<div class="no-job-selected">No jobs found matching your filters.</div>';
    }
  }

  renderJobs() {
    this.jobListings.innerHTML = '';

    this.filteredJobs.forEach((job, index) => {
      const card = this.createJobCard(job, index);
      this.jobListings.insertAdjacentHTML('beforeend', card);
    });

    this.setupExpandListeners();

    // Restore selected state
    if (this.selectedJobIndex !== null) {
      const selectedCard = document.querySelector(`.job-card[data-index="${this.selectedJobIndex}"]`);
      if (selectedCard) selectedCard.classList.add('selected');
    }
  }

  createJobCard(job, index) {
    const posted = this.formatDate(job.date_posted);
    const pay = job.pay && job.pay !== 'Not listed' ? `<div class="job-pay">${job.pay}</div>` : '';
    const companyName = job.company || 'Recruit Masters';
    const summary = this.extractSummaryText(job.summary).slice(0, 150);

    return `
        <div class="job-card" data-index="${index}">
          <div class="job-card-content">
            <div class="job-card-header">
              <h3>${job.title}</h3>
              <div class="job-card-meta">
                <div class="job-card-company">${companyName}</div>
                <div class="job-card-details">
                  <span>${job.location}</span>
                  <span>${posted}</span>
                  <div class="job-type-tag">${job.job_type}</div>
                  ${pay}
                </div>
                <div class="job-card-summary">${summary}...</div>
              </div>
            </div>
          </div>
        </div>
      `;
  }

  setupExpandListeners() {
    this.jobListings.querySelectorAll('.job-card').forEach(card => {
      card.addEventListener('click', () => {
        const index = parseInt(card.dataset.index);
        this.selectedJobIndex = index;

        document.querySelectorAll('.job-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        this.updateJobDetails(this.filteredJobs[index], card);
      });
    });
  }


  updateJobDetails(job, targetCard = null) {
    const isMobile = window.innerWidth <= 768;

    const posted = this.formatDate(job.date_posted);
    const fullSummaryHTML = this.formatSummaryHTML(job.summary);
    const pay = job.pay && job.pay !== 'Not listed' ? `<div class="job-pay">${job.pay}</div>` : '';
    const companyName = job.company || 'Recruit Masters';

    const jobDetailsHTML = `
      <div class="job-details-wrapper ${isMobile ? 'mobile' : 'desktop'}">
        <div class="job-details-header">
          <div class="job-details-company">
            <div class="company-info">
              <h2 class="heading-style-h3">${job.title}</h2>
              <div class="company-name">${companyName}</div>
            </div>
          </div>
          <div class="job-details-meta">
            <span>${job.location}</span>
            <span>${posted}</span>
            <div class="job-type-tag">${job.job_type}</div>
            ${pay}
          </div>
          <a href="${job.url || '/contact'}" target="_blank" class="button-link-navbar apply-button">
            <div>Apply Now</div>
          </a>
        </div>
        <div class="job-details-content job-details-sections">
          <div class="job-details-overview">
            <h4>Overview</h4>
            <p>${this.extractSummaryText(job.summary).slice(0, 300)}...</p>
          </div>
          ${fullSummaryHTML}
        </div>
      </div>
    `;

    // Clear any previously rendered mobile details
    document.querySelectorAll('.job-details-wrapper.mobile').forEach(el => el.remove());

    if (isMobile && targetCard) {
      const container = document.createElement('div');
      container.innerHTML = jobDetailsHTML;
      targetCard.insertAdjacentElement('afterend', container.firstElementChild);
      this.jobDetails.style.display = 'none'; // Hide fixed panel
    } else {
      this.jobDetails.style.display = 'block'; // Restore fixed panel
      this.jobDetails.innerHTML = jobDetailsHTML;
      this.jobDetails.scrollTop = 0;
    }
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
    const lines = raw.split(/\n/).map(line => line.trim()).filter(Boolean);

    let html = '';
    let insideList = false;

    lines.forEach(line => {
      const isHeading = /^(About|What|Key|Requirements|Benefits|Why|Position|Company)/i.test(line);
      const isBullet = line.startsWith('-') || line.startsWith('•');

      if (isHeading) {
        if (insideList) {
          html += '</ul>';
          insideList = false;
        }
        html += `<h4>${line}</h4>`;
      } else if (isBullet) {
        if (!insideList) {
          html += '<ul>';
          insideList = true;
        }
        html += `<li>${line.replace(/^[-•]\s*/, '')}</li>`;
      } else {
        if (insideList) {
          html += '</ul>';
          insideList = false;
        }
        html += `<p>${line}</p>`;
      }
    });

    if (insideList) html += '</ul>';
    return html;
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
}

document.addEventListener('DOMContentLoaded', () => new JobBoard());
