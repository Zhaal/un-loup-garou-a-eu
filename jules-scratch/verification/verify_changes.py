from playwright.sync_api import sync_playwright, expect
import os
import json

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Mock the API response to avoid a live network call
        # and to provide the specific data needed for the test.
        mock_data = {
            "TestGroup": {
                "password": "1234",
                "data": {
                    "enigmaAnswers": {
                        "A": "Lune"
                    }
                }
            }
        }

        page.route(
            "https://api.github.com/repos/Zhaal/un-loup-garou-a-eu/contents/scores-loup-garou.json?ref=main",
            lambda route: route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(mock_data)
            )
        )

        # Get the absolute path to the HTML file
        file_path = os.path.abspath('groupe.html')

        # Navigate to the local file, passing "TestGroup" as the group name
        page.goto(f'file://{file_path}?name=TestGroup')

        # To bypass the login, we simulate an authenticated session
        # by setting the auth token in sessionStorage.
        page.evaluate("sessionStorage.setItem('auth_token_TestGroup', 'true')")

        # Reload the page. The script on the page will now find the auth token
        # and proceed to show the content and fetch the (mocked) data.
        page.reload()

        # The page's own 'checkEnigmas' function should now run and update the UI.
        # We'll wait for the input field to contain the expected text.
        expect(page.locator("#codeA")).to_have_value("Rencontré (Lune)")

        # Take a screenshot of the card to visually verify the change.
        screenshot_path = 'jules-scratch/verification/verification.png'
        page.locator('#cardA').screenshot(path=screenshot_path)

        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    run_verification()