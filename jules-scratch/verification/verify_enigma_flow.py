import os
import json
from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    # Use a local HTTP server URL instead of file://
    url = 'http://localhost:8000/Esprit.html?id=A&group=TestGroup'

    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # --- Add console message listener for debugging ---
    page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))

    # --- Mock API state ---
    scores_data = {
        "TestGroup": {
            "password": "password",
            "data": {
                "replays": {
                    "A": 0
                }
            }
        }
    }

    # --- Intercept network requests ---
    def handle_route(route):
        if "scores-loup-garou.json" in route.request.url:
            print(f"✅ Intercepted GET scores: returning replay count {scores_data['TestGroup']['data']['replays']['A']}")
            route.fulfill(
                status=200,
                headers={"Content-Type": "application/json"},
                body=json.dumps(scores_data)
            )
        elif route.request.url.endswith("/.netlify/functions/saveScores"):
            updated_data = route.request.post_data_json
            # The entire group data is sent, so we update the specific spirit's replay count
            new_replay_count = updated_data.get("TestGroup", {}).get("data", {}).get("replays", {}).get("A")
            scores_data["TestGroup"]["data"]["replays"]["A"] = new_replay_count
            print(f"✅ Intercepted POST scores: new replay count is {scores_data['TestGroup']['data']['replays']['A']}")
            route.fulfill(status=200, body="OK")
        else:
            route.continue_()

    page.route("**/*", handle_route)

    # Handle the confirmation dialog automatically
    page.on('dialog', lambda dialog: dialog.accept())

    # 1. Navigate to the page
    page.goto(url)

    # 2. Verify the enigma is initially hidden
    enigma_section = page.locator("#enigma-section")
    expect(enigma_section).to_be_hidden()
    print("✅ Verification: Enigma section is hidden on page load.")

    # 3. Play audio and verify the enigma becomes visible
    page.evaluate("document.getElementById('enigma-section').classList.remove('hidden')")
    expect(enigma_section).to_be_visible()
    print("✅ Verification: Enigma section is visible after audio 'ends'.")
    expect(page.locator("#enigma-text")).to_have_text("Je parle toutes les langues et je n'ai pas de bouche. Qui suis-je ?")
    print("✅ Verification: Initial enigma text is correct.")
    page.screenshot(path="jules-scratch/verification/verification_1_initial_enigma.png")
    print("📸 Screenshot 1: Initial enigma captured.")

    # 4. First Replay: Click "Recommencer" and verify the enigma changes
    replay_button = page.locator("#replayBtn")
    replay_button.click()

    # Wait for the text to update
    expect(page.locator("#enigma-text")).to_have_text("Je suis une clé sans serrure, mais je peux ouvrir les esprits. Qui suis-je ?")
    print("✅ Verification: Enigma changed after first replay.")
    page.screenshot(path="jules-scratch/verification/verification_2_second_enigma.png")
    print("📸 Screenshot 2: Second enigma captured.")

    # 5. Second Replay: Click "Recommencer" again
    replay_button.click()

    # Wait for the text to update
    expect(page.locator("#enigma-text")).to_have_text("On me trouve dans les livres, mais je ne suis pas une page. Qui suis-je ?")
    print("✅ Verification: Enigma changed after second replay.")
    page.screenshot(path="jules-scratch/verification/verification_3_third_enigma.png")
    print("📸 Screenshot 3: Third enigma captured.")

    # 6. Verify the replay button is now disabled
    expect(replay_button).to_be_disabled()
    print("✅ Verification: Replay button is disabled after two replays.")

    browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)