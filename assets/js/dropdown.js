const careerDropdowns = document.querySelectorAll('.career-dropdown');

careerDropdowns.forEach(dropdown => {
  const trigger = dropdown.querySelector('.career-trigger');
  const content = dropdown.querySelector('.career-content');

  trigger.addEventListener('click', () => {
    const isActive = dropdown.classList.contains('active');

    // Close all dropdowns
    careerDropdowns.forEach(d => {
      d.classList.remove('active');
      d.querySelector('.career-content').style.height = '0';
    });

    // Open clicked one
    if (!isActive) {
      dropdown.classList.add('active');
      content.style.height = `${content.scrollHeight}px`;
    }
  });
});
