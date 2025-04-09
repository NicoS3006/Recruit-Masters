import json
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT_FILE = Path("jobs.json")
BASE_URL = "https://www.seek.com.au/Recruit-Masters-jobs/at-this-company"


async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        await page.goto(BASE_URL)
        print("✅ Loaded page")

        # Scroll down to load all jobs
        for _ in range(10):
            await page.mouse.wheel(0, 1000)
            await asyncio.sleep(1)

        job_cards = await page.locator('article[data-automation="job-card"]').all()
        print(f"🔍 Found {len(job_cards)} job cards")

        jobs = []

        for i, card in enumerate(job_cards):
            try:
                await card.click()
                await page.wait_for_selector('[data-automation="job-detail-title"]', timeout=5000)
                await asyncio.sleep(1.5)

                title = await page.locator('[data-automation="job-detail-title"]').text_content()
                location = await page.locator('[data-automation="job-detail-location"]').text_content()
                date = await page.locator('[data-automation="jobListingDate"]').text_content()
                description = await page.locator('[data-automation="jobAdDetails"]').text_content()

                job = {
                    "title": title.strip() if title else "",
                    "location": location.strip() if location else "",
                    "date": date.strip() if date else "",
                    "summary": description.strip()[:300] + "..."
                }

                jobs.append(job)
                print(f"✅ Scraped job {i+1}/{len(job_cards)}")

            except Exception as e:
                print(f"⚠️ Failed on job {i+1}: {e}")

        await browser.close()

        with open(OUTPUT_FILE, "w") as f:
            json.dump(jobs, f, indent=2)
        print(f"📝 Saved {len(jobs)} jobs to jobs.json")


if __name__ == "__main__":
    asyncio.run(run())
