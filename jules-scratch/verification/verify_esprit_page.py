from playwright.sync_api import sync_playwright, expect
import os
import json
import re

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Mock the GitHub API response for getGroupsData
        def mock_github_api(route):
            print(f"Intercepting GitHub API: {route.request.url}")
            mock_data = {
                "TestGroup": {
                    "password": "1234",
                    "data": {
                        "enigmaAnswers": {},
                        "replays": {}
                    }
                }
            }
            route.fulfill(
                status=200,
                headers={"Content-Type": "application/json"},
                body=json.dumps(mock_data)
            )

        page.route("https://api.github.com/**/scores-loup-garou.json?ref=main", mock_github_api)

        # Mock the Netlify function response for saveGroupsData
        def mock_netlify_save(route):
            print(f"Intercepting Netlify save: {route.request.url}")
            route.fulfill(status=200, body='"Save successful"')

        # Use a more generic regex to catch the saveScores call
        page.route(re.compile("saveScores"), mock_netlify_save)

        # Get the absolute path to the HTML file
        file_path = os.path.abspath('Esprit.html')
        url = f'file://{file_path}?id=A&group=TestGroup'

        page.goto(url)

        # 1. Verify the initial state and the warning message
        expect(page.locator('.replay-warning')).to_be_visible()
        expect(page.locator('.replay-warning')).to_have_text("!! Attention, chaque relecture audio vous déduira des points dans le tableau des scores !!")

        # 2. Click the play button and verify it becomes disabled
        play_button = page.locator('#playBtn')
        expect(play_button).to_be_enabled()
        play_button.click()
        expect(play_button).to_be_disabled()

        page.screenshot(path="jules-scratch/verification/01_play_button_disabled.png")

        # 3. Fill the form and submit
        enigma_answer_textarea = page.locator('#enigma-answer')
        enigma_answer_textarea.fill("This is a test answer.")

        submit_button = page.locator('#enigma-form button[type="submit"]')
        submit_button.click()

        # 4. Verify the loading spinner and saving message
        expect(page.locator('.loader')).to_be_visible()
        expect(page.locator('#save-status')).to_contain_text("Sauvegarde en cours...")
        page.screenshot(path="jules-scratch/verification/02_saving_state.png")

        # 5. Verify the success message after a short wait
        expect(page.locator('#save-status')).to_contain_text("Réponse sauvegardée ! Redirection dans 5 secondes...", timeout=10000)
        page.screenshot(path="jules-scratch/verification/03_success_state.png")

        browser.close()
        print("Verification script completed successfully.")

if __name__ == "__main__":
    run_verification()