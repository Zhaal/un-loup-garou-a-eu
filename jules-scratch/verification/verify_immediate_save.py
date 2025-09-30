import os
from playwright.sync_api import sync_playwright, expect

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Get the absolute path to the HTML file
        file_path = os.path.abspath("Scores.html")

        # Automatically dismiss alerts, which can block execution
        page.on("dialog", lambda dialog: dialog.dismiss())

        # Go to the local HTML file
        page.goto(f"file://{file_path}")

        # 1. Add a new group
        page.get_by_role("button", name="Ajouter un groupe").click()

        # Wait for the modal to be visible
        add_group_modal = page.locator("#addGroupModal")
        expect(add_group_modal).to_be_visible()

        # Fill in the group name and submit
        page.get_by_placeholder("Ex : Les Loups Sympas").fill("Groupe de Test")
        page.get_by_role("button", name="Créer").click()

        # The save will fail and show an alert (which is dismissed by the handler).
        # The modal stays open, so we manually close it.
        add_group_modal.get_by_role("button", name="Annuler").click()

        # Wait for the modal to disappear
        expect(add_group_modal).not_to_be_visible()

        # 2. Change the group status to 'Terminé' to show the score button
        group_item = page.locator(".group-item", has_text="Groupe de Test")
        status_select = group_item.get_by_role("combobox")
        status_select.select_option("Terminé")

        # 3. Open the score modal
        result_button = group_item.get_by_role("button", name="Résultat")
        expect(result_button).to_be_visible()
        result_button.click()

        # Wait for the score modal to be visible
        score_modal = page.locator("#scoreModal")
        expect(score_modal).to_be_visible()

        # 4. Change a value in the form
        # This action will trigger the 'change' event listener we modified
        capitaine_yes_radio = score_modal.get_by_label("Oui (-5 pts)")
        capitaine_yes_radio.check()
        expect(capitaine_yes_radio).to_be_checked()

        # 5. Take a screenshot to verify the UI state
        page.screenshot(path="jules-scratch/verification/verification.png")

        browser.close()

if __name__ == "__main__":
    run_verification()