import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import json
import os
import time

BASE_URL = "https://www.seek.com.au/Recruit-Masters-jobs/at-this-company"
OUTPUT_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../assets/js/jobs.json'))
SCREENSHOT_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../debug_seek.png'))

def scroll_and_click_jobs(driver):
    print("📜 Scrolling to load job cards...")
    last_height = driver.execute_script("return document.body.scrollHeight")
    while True:
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height

    print("🧠 Attempting to click each job card...")
    job_links = driver.find_elements(By.CSS_SELECTOR, 'a[data-automation="jobTitle"]')
    for link in job_links:
        try:
            driver.execute_script("arguments[0].scrollIntoView(true);", link)
            driver.execute_script("arguments[0].click();", link)
            time.sleep(2)
        except Exception as e:
            print("⚠️ Could not click job card:", e)

def scrape_seek_jobs():
    options = uc.ChromeOptions()
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")

    profile_path = os.path.abspath("selenium_profile")
    driver = uc.Chrome(user_data_dir=profile_path, options=options, headless=False)

    print("🌐 Navigating to Seek...")
    driver.get(BASE_URL)

    try:
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, 'article[data-automation="job-card"]'))
        )
    except Exception:
        print("❌ Job cards did not load in time.")
        driver.save_screenshot(SCREENSHOT_PATH)
        driver.quit()
        return

    scroll_and_click_jobs(driver)

    soup = BeautifulSoup(driver.page_source, 'html.parser')
    job_cards = soup.select('article[data-automation="job-card"]')

    print(f"🔍 Found {len(job_cards)} job cards")

    jobs = []
    for card in job_cards:
        title_tag = card.select_one('a[data-automation="jobTitle"]')
        location_tag = card.select_one('[data-automation="job-detail-location"]')
        summary_tag = card.select_one('span[data-automation="jobShortDescription"]')
        date_tag = card.select_one('span[data-automation="jobListingDate"]')

        if not title_tag:
            continue

        jobs.append({
            "title": title_tag.get_text(strip=True),
            "link": f"https://www.seek.com.au{title_tag['href']}",
            "location": location_tag.get_text(strip=True) if location_tag else "N/A",
            "summary": summary_tag.get_text(strip=True) if summary_tag else "",
            "date": date_tag.get_text(strip=True) if date_tag else ""
        })

    with open(OUTPUT_PATH, 'w') as f:
        json.dump(jobs, f, indent=2)

    print(f"✅ Saved {len(jobs)} jobs to jobs.json")
    driver.save_screenshot(SCREENSHOT_PATH)
    driver.quit()

if __name__ == "__main__":
    scrape_seek_jobs()
