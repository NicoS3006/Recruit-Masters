import json
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright, TimeoutError

OUTPUT_FILE = Path("jobs.json")
BASE_URL = "https://www.seek.com.au/Recruit-Masters-jobs/at-this-company"

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        await page.goto(BASE_URL)
        print("✅ Page loaded")

        # Scroll to load more job cards
        for _ in range(6):
            await page.mouse.wheel(0, 2000)
            await asyncio.sleep(1)

        await page.wait_for_selector('a[data-automation="jobTitle"]', timeout=10000)
        job_links = await page.locator('a[data-automation="jobTitle"]').all()
        print(f"🔗 Found {len(job_links)} job links")

        jobs = []

        for i, link in enumerate(job_links):
            try:
                href = await link.get_attribute("href")
                if not href:
                    print(f"⚠️ Skipping job {i+1}, no href")
                    continue

                full_url = f"https://www.seek.com.au{href}" if href.startswith("/") else href

                job_page = await context.new_page()
                await job_page.goto(full_url, timeout=20000)

                # Wait for job title
                await job_page.wait_for_selector('h1[data-automation="job-detail-title"]', timeout=10000)
                await job_page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                await asyncio.sleep(1)

                # Extract required fields
                title = await job_page.locator('h1[data-automation="job-detail-title"]').inner_text()
                location = await job_page.locator('[data-automation="job-detail-location"]').inner_text()
                description = await job_page.locator('div[data-automation="jobAdDetails"]').inner_text()

                # Date posted from the header
                try:
                    date_posted = await job_page.locator('span:below(button:has-text("Quick apply"))').inner_text()
                except:
                    try:
                        spans = await job_page.locator('div[data-automation="job-detail-header"] span').all_inner_texts()
                        date_posted = spans[-1].strip() if spans else "Unknown"
                    except:
                        date_posted = "Unknown"

                # Job type
                try:
                    job_type = await job_page.locator('[data-automation="job-detail-work-type"]').inner_text()
                except:
                    try:
                        job_type = await job_page.locator('strong:has-text("Employment Type") + span').inner_text()
                    except:
                        job_type = "Unknown"

                # Pay
                try:
                    salary = await job_page.locator('[data-automation="job-detail-salary"]').inner_text()
                except:
                    try:
                        salary = await job_page.locator('strong:has-text("Salary") + span').inner_text()
                    except:
                        salary = "Not listed"

                # ✅ Append all job data including the URL
                jobs.append({
                    "title": title,
                    "location": location,
                    "date_posted": date_posted,
                    "job_type": job_type,
                    "pay": salary,
                    "summary": description,
                    "url": full_url
                })

                print(f"✅ Scraped job {i+1}: {title}")
                await job_page.close()

            except TimeoutError:
                print(f"❌ Timeout on job {i+1}")
            except Exception as e:
                print(f"❌ Error on job {i+1}: {e}")
                await asyncio.sleep(1)

        await browser.close()
        OUTPUT_FILE.write_text(json.dumps(jobs, indent=2))
        print(f"📁 Saved {len(jobs)} jobs to {OUTPUT_FILE}")

if __name__ == "__main__":
    asyncio.run(run())
